import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { rateLimit, getClientIdentifier } from "@/app/lib/rate-limiter";

export const runtime = "nodejs";
export const maxDuration = 60;

function chunkText(
  text: string,
  chunkSize = 1200,
  overlap = 200
) {
  const normalizedText = text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const paragraphs = normalizedText
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    if (
      currentChunk.length === 0 ||
      currentChunk.length + paragraph.length + 2 <= chunkSize
    ) {
      currentChunk +=
        currentChunk.length > 0
          ? `\n\n${paragraph}`
          : paragraph;

      continue;
    }

    chunks.push(currentChunk);

    const overlapText = currentChunk.slice(-overlap);

    currentChunk = `${overlapText}\n\n${paragraph}`;
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

export async function POST(request: Request) {
  try {
    const authHeader =
      request.headers.get("authorization") ||
      request.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Invalid user session." },
        { status: 401 }
      );
    }

    // Rate limiting: 5 embeddings per minute per user
    const clientId = getClientIdentifier(request, user.id);
    const rateCheck = rateLimit(`embed:${clientId}`, 5, 60_000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Embedding rate limit reached. Please wait ${rateCheck.retryAfterSeconds}s before processing another document.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateCheck.retryAfterSeconds),
            "X-RateLimit-Limit": String(rateCheck.limit),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { documentId } = body;

    if (!documentId || typeof documentId !== "string" || !documentId.trim()) {
      return NextResponse.json(
        { error: "documentId is required." },
        { status: 400 }
      );
    }

    // Verify document belongs to the authenticated user
    const { data: document, error: documentError } = await supabase
      .from("documents")
      .select("id, content")
      .eq("id", documentId.trim())
      .eq("user_id", user.id)
      .maybeSingle();

    if (documentError) {
      console.error("Document lookup error:", documentError.message);
      return NextResponse.json(
        { error: "Failed to verify document." },
        { status: 500 }
      );
    }

    if (!document) {
      return NextResponse.json(
        { error: "Document not found." },
        { status: 404 }
      );
    }

    const contentToEmbed = document.content;

    if (!contentToEmbed?.trim()) {
      return NextResponse.json(
        { error: "Document has no content." },
        { status: 400 }
      );
    }

    // Split text into chunks
    const chunks = chunkText(contentToEmbed);

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: "No text chunks were created." },
        { status: 400 }
      );
    }

    // Remove old chunks for this document and user if re-processing
    const { error: deleteError } = await supabase
      .from("document_chunks")
      .delete()
      .eq("document_id", document.id)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Old chunk cleanup error:", deleteError.message);
      return NextResponse.json(
        { error: "Failed to prepare document chunks." },
        { status: 500 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        {
          error: "AI embedding service is temporarily unavailable.",
        },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    // Generate embeddings with controlled concurrency (batches of 5)
    const BATCH_SIZE = 5;
    const recordsToInsert: Array<{
      document_id: string;
      user_id: string;
      content: string;
      embedding: number[];
      chunk_index: number;
    }> = [];

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (chunkContent, offset) => {
        const chunkIndex = i + offset;
        const result = await ai.models.embedContent({
          model: "gemini-embedding-001",
          contents: chunkContent,
          config: {
            outputDimensionality: 768,
          },
        });

        const embedding = result.embeddings?.[0]?.values;
        if (!embedding) {
          throw new Error(`Failed to generate embedding for chunk ${chunkIndex}.`);
        }

        return {
          document_id: document.id,
          user_id: user.id,
          content: chunkContent,
          embedding,
          chunk_index: chunkIndex,
        };
      });

      const batchResults = await Promise.all(batchPromises);
      recordsToInsert.push(...batchResults);
    }

    // Bulk insert all chunks into Supabase in a single operation
    const { error: insertError } = await supabase
      .from("document_chunks")
      .insert(recordsToInsert);

    if (insertError) {
      console.error("Bulk chunk insert error:", insertError.message);
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      documentId: document.id,
      chunks: chunks.length,
    });
  } catch (error: unknown) {
    console.error("Embedding error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { error: "Failed to create document embeddings." },
      { status: 500 }
    );
  }
}
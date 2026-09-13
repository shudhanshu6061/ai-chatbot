import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

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

    const body = await request.json().catch(() => ({}));
    const { query } = body;

    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json(
        { error: "Query is required." },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        {
          error: "Document search service is temporarily unavailable.",
        },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    // Create embedding for question
    const result = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: query.trim(),
      config: {
        outputDimensionality: 768,
      },
    });

    const queryEmbedding = result.embeddings?.[0]?.values;

    if (!queryEmbedding) {
      throw new Error("Failed to generate query embedding.");
    }

    // Vector search matching only authenticated user's chunks
    const { data, error } = await supabase.rpc(
      "match_document_chunks",
      {
        query_embedding: queryEmbedding,
        match_user_id: user.id,
        match_count: 5,
      }
    );

    if (error) {
      console.error("Vector search RPC error:", error.message);
      throw error;
    }

    // Preserve similarity threshold 0.65
    const filteredResults = (data ?? []).filter(
      (chunk: { similarity?: number }) =>
        chunk.similarity === undefined || chunk.similarity >= 0.65
    );

    return NextResponse.json({
      results: filteredResults,
    });
  } catch (error) {
    console.error("Vector search error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      {
        error: "Failed to search documents.",
      },
      { status: 500 }
    );
  }
}
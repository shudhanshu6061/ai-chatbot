import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { rateLimit, getClientIdentifier } from "@/app/lib/rate-limiter";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { messages, documentId } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Messages are required." }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const explabsApiKey = process.env.EXPLABS_API_KEY;
    if (!explabsApiKey) {
      return new Response(
        JSON.stringify({
          error: "AI chat service is temporarily unconfigured.",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Get authorization header
    const authHeader =
      request.headers.get("authorization") ||
      request.headers.get("Authorization");

    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    let supabase = null;
    let userId: string | null = null;
    let user = null;

    if (token) {
      // Fast path: decode JWT payload to get user ID without remote network round-trip
      try {
        const parts = token.split(".");
        if (parts.length >= 2) {
          const payload = JSON.parse(
            Buffer.from(parts[1], "base64url").toString("utf8")
          );
          if (payload?.sub) {
            userId = payload.sub;
          }
        }
      } catch {
        // Fallback if parsing fails
      }

      // If documentId is present, we need full Supabase client and verified user for RAG
      if (documentId) {
        supabase = createClient(
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
          data: { user: authenticatedUser },
          error: userError,
        } = await supabase.auth.getUser();

        if (!userError && authenticatedUser) {
          user = authenticatedUser;
          userId = authenticatedUser.id;
        }
      }
    }

    // Rate limiting: 20 requests per minute per user/client
    const clientId = getClientIdentifier(request, userId);
    const rateCheck = rateLimit(`chat:${clientId}`, 20, 60_000);
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: `Rate limit reached. Please wait ${rateCheck.retryAfterSeconds}s before sending another message.`,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(rateCheck.retryAfterSeconds),
            "X-RateLimit-Limit": String(rateCheck.limit),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    // If documentId is provided, authentication is strictly required
    if (documentId && !user) {
      return new Response(
        JSON.stringify({ error: "Authentication required to access document." }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Get the latest user question
    const latestUserMessage = [...messages]
      .reverse()
      .find(
        (message: { role: string; content: string }) =>
          message.role === "user"
      );

    let context = "";
    let documentName = "";

    // ONLY search documents when a documentId is explicitly provided and user is authenticated
    if (supabase && user && documentId && latestUserMessage?.content) {
      try {
        const { data: currentDoc, error: docError } = await supabase
          .from("documents")
          .select("id, filename, content")
          .eq("id", documentId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (currentDoc && !docError) {
          documentName = currentDoc.filename;

          // 1. Try semantic vector search if GEMINI_API_KEY is configured
          if (process.env.GEMINI_API_KEY) {
            const ai = new GoogleGenAI({
              apiKey: process.env.GEMINI_API_KEY,
            });

            const embeddingResult = await ai.models.embedContent({
              model: "gemini-embedding-001",
              contents: latestUserMessage.content,
              config: {
                outputDimensionality: 768,
              },
            });

            const queryEmbedding =
              embeddingResult.embeddings?.[0]?.values;

            if (queryEmbedding) {
              const { data: matchedChunks, error: searchError } =
                await supabase.rpc("match_document_chunks", {
                  query_embedding: queryEmbedding,
                  match_user_id: user.id,
                  match_count: 8,
                });

              if (!searchError && matchedChunks && matchedChunks.length > 0) {
                // Filter only chunks that belong to this document and have good similarity
                const filtered = matchedChunks.filter(
                  (chunk: { document_id: string; similarity?: number }) =>
                    chunk.document_id === documentId &&
                    (chunk.similarity === undefined || chunk.similarity > 0.45)
                );

                if (filtered.length > 0) {
                  const topChunks = filtered.slice(0, 5);
                  context = topChunks
                    .map(
                      (
                        chunk: {
                          content: string;
                          filename?: string;
                          similarity?: number;
                        },
                        index: number
                      ) =>
                        `[Source ${index + 1}]
File: ${currentDoc.filename}
${chunk.similarity !== undefined ? `Similarity: ${chunk.similarity.toFixed(3)}\n` : ""}${chunk.content}`
                    )
                    .join("\n\n");
                }
              }
            }
          }

          // 2. FALLBACK for broad queries on this specific document (e.g. "what is this document about?", "summarize this")
          if (!context) {
            const lowerQuery = latestUserMessage.content.toLowerCase();
            const isBroadDocQuery =
              lowerQuery.includes("document") ||
              lowerQuery.includes("pdf") ||
              lowerQuery.includes("file") ||
              lowerQuery.includes("summary") ||
              lowerQuery.includes("summarize") ||
              lowerQuery.includes("about") ||
              lowerQuery.includes("overview") ||
              lowerQuery.includes("explain this");

            if (isBroadDocQuery) {
              const { data: fallbackChunks } = await supabase
                .from("document_chunks")
                .select("content, chunk_index")
                .eq("document_id", documentId)
                .eq("user_id", user.id)
                .order("chunk_index", { ascending: true })
                .limit(5);

              if (fallbackChunks && fallbackChunks.length > 0) {
                context = fallbackChunks
                  .map(
                    (
                      chunk: { content: string; chunk_index: number },
                      index: number
                    ) =>
                      `[Source ${index + 1}]
File: ${currentDoc.filename} (Part ${chunk.chunk_index + 1})

${chunk.content}`
                  )
                  .join("\n\n");
              } else if (currentDoc.content) {
                context = `[Source 1]
File: ${currentDoc.filename}

${currentDoc.content.slice(0, 5000)}`;
              }
            }
          }
        }
      } catch (error) {
        console.error("RAG retrieval error:", error instanceof Error ? error.message : "Unknown error");
      }
    }

    // Build system instructions
    const systemPrompt = context
      ? `You are a helpful, knowledgeable AI assistant.

You were created and developed by Shudhanshu Prajapati, Founder & Full-Stack Developer.

If the user asks who created you, who developed you, who your founder is, or who built you, answer clearly:
"I was created and developed by Shudhanshu Prajapati, Founder & Full-Stack Developer."

Do not claim Shudhanshu created the underlying AI model or third-party services.

The user has attached the document "${documentName || "Uploaded Document"}". Relevant context from this document is provided below.

GUIDELINES:
- When the user's question relates to the attached document, prioritize the DOCUMENT CONTEXT and reference the document name.
- If the user specifically asks what the attached document contains or says and the information is not in the DOCUMENT CONTEXT, politely clarify that the document does not mention it.
- If the user asks general questions, greetings, or questions unrelated to the document, answer them normally and helpfully using your general knowledge without unnecessarily stating that the information was missing from the document.
- Never invent information as coming from the document.
- Keep answers clear and concise.

DOCUMENT CONTEXT:
${context}`
      : `You are a helpful, knowledgeable AI assistant.

You were created and developed by Shudhanshu Prajapati, Founder & Full-Stack Developer.

If the user asks who created you, who developed you, who your founder is, or who built you, answer clearly:
"I was created and developed by Shudhanshu Prajapati, Founder & Full-Stack Developer."

Do not claim Shudhanshu created the underlying AI model or third-party services.`;

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    ];

    // Supported ExperientialLabs models in priority order (fastest TTFT first), honoring EXPLABS_MODEL env var if configured
    const defaultModels = [
      "deepseek-v4-flash",
      "qwen3.8-27b",
      "gpt-5.6-luna",
      "deepseek-v4.1-flash",
    ];

    const explabsModel = process.env.EXPLABS_MODEL?.trim();
    const modelsToTry = explabsModel
      ? [explabsModel, ...defaultModels.filter((m) => m !== explabsModel)]
      : defaultModels;

    let activeResponse: Response | null = null;
    let lastError: unknown = null;

    for (const model of modelsToTry) {
      try {
        const res = await fetch(
          "https://api.experientiallabs.ai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${explabsApiKey}`,
            },
            body: JSON.stringify({
              model,
              messages: apiMessages,
              stream: true,
            }),
          }
        );

        if (!res.ok) {
          console.warn(`Model ${model} returned status ${res.status}`);
          lastError = new Error(`Model ${model} failed with status ${res.status}`);
          continue;
        }

        if (res.body) {
          activeResponse = res;
          break;
        }
      } catch (err) {
        console.warn(`Model ${model} request failed`);
        lastError = err;
      }
    }

    if (!activeResponse || !activeResponse.body) {
      throw (
        lastError ||
        new Error("All ExperientialLabs AI models failed to respond.")
      );
    }

    const upstreamReader = activeResponse.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await upstreamReader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data:")) continue;
              const dataStr = trimmed.replace(/^data:\s*/, "");
              if (dataStr === "[DONE]") {
                controller.close();
                return;
              }
              try {
                const parsed = JSON.parse(dataStr);
                const text = parsed.choices?.[0]?.delta?.content;
                if (text) {
                  controller.enqueue(encoder.encode(text));
                }
              } catch {
                // Ignore incomplete chunks
              }
            }
          }

          if (buffer.trim().startsWith("data:")) {
            const dataStr = buffer.trim().replace(/^data:\s*/, "");
            if (dataStr !== "[DONE]") {
              try {
                const parsed = JSON.parse(dataStr);
                const text = parsed.choices?.[0]?.delta?.content;
                if (text) {
                  controller.enqueue(encoder.encode(text));
                }
              } catch {
                // Ignore incomplete chunks
              }
            }
          }

          controller.close();
        } catch (error) {
          console.error("Streaming error:", error instanceof Error ? error.message : "Unknown error");
          controller.error(error);
        }
      },
      cancel() {
        upstreamReader.cancel();
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    console.error("Chat completion error:", error instanceof Error ? error.message : "Unknown error");

    return new Response(
      JSON.stringify({
        error:
          "Something went wrong while generating the response. Please try again.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
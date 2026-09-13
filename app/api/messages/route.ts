import { NextResponse } from "next/server";
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
    const { conversation_id, role, content } = body;

    if (
      !conversation_id ||
      typeof conversation_id !== "string" ||
      !conversation_id.trim()
    ) {
      return NextResponse.json(
        { error: "conversation_id is required." },
        { status: 400 }
      );
    }

    if (role !== "user" && role !== "assistant") {
      return NextResponse.json(
        { error: "role must be 'user' or 'assistant'." },
        { status: 400 }
      );
    }

    if (
      typeof content !== "string" ||
      !content.trim()
    ) {
      return NextResponse.json(
        { error: "content must be a non-empty string." },
        { status: 400 }
      );
    }

    // Verify conversation ownership
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversation_id.trim())
      .eq("user_id", user.id)
      .maybeSingle();

    if (convError) {
      console.error("Conversation verification error:", convError.message);
      return NextResponse.json(
        { error: "Failed to verify conversation." },
        { status: 500 }
      );
    }

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 }
      );
    }

    const { data: message, error: insertError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversation_id.trim(),
        user_id: user.id,
        role,
        content: content.trim(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Message insert error:", insertError.message);
      return NextResponse.json(
        { error: "Failed to save message." },
        { status: 500 }
      );
    }

    // Atomically update conversation's updated_at timestamp
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversation_id.trim())
      .eq("user_id", user.id);

    return NextResponse.json(
      {
        ...message,
        message,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Messages POST error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateConversationTitle } from "@/app/lib/title-generator";

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
    const rawTitle = typeof body?.title === "string" ? body.title.trim() : "";

    let cleanTitle: string;
    if (rawTitle.startsWith("📄 ")) {
      // Document-based title: preserve icon and clean filename
      const docName = rawTitle.replace(/^📄\s*/, "").replace(/\.pdf$/i, "").trim();
      const truncatedDoc = docName.length > 32 ? docName.slice(0, 32).trim() + "..." : docName;
      cleanTitle = `📄 ${truncatedDoc || "Document"}`;
    } else {
      cleanTitle = generateConversationTitle(rawTitle);
    }

    const { data: conversation, error } = await supabase
      .from("conversations")
      .insert({
        user_id: user.id,
        title: cleanTitle,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create conversation:", error.message);
      return NextResponse.json(
        { error: "Failed to create conversation." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ...conversation,
        conversation,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Conversations POST error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
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

    const { data: conversations, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch conversations:", error.message);
      return NextResponse.json(
        { error: "Failed to fetch conversations." },
        { status: 500 }
      );
    }

    return NextResponse.json({ conversations: conversations ?? [] });
  } catch (error) {
    console.error("Conversations GET error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

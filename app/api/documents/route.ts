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
    const filename = typeof body.filename === "string" ? body.filename.trim() : "";
    const content = typeof (body.content || body.text) === "string" ? (body.content || body.text).trim() : "";
    const pages = typeof body.pages === "number" && body.pages > 0 ? Math.floor(body.pages) : 1;

    if (!filename) {
      return NextResponse.json(
        { error: "Filename is required." },
        { status: 400 }
      );
    }

    if (!content) {
      return NextResponse.json(
        { error: "Content is required." },
        { status: 400 }
      );
    }

    // Strictly derive user_id from authenticated user session
    const { data: document, error } = await supabase
      .from("documents")
      .insert({
        user_id: user.id,
        filename,
        content,
        pages,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to insert document:", error.message);
      return NextResponse.json(
        { error: "Failed to create document." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...document,
      document,
    }, { status: 201 });
  } catch (error) {
    console.error("Documents POST error:", error instanceof Error ? error.message : "Unknown error");
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

    const { data: documents, error } = await supabase
      .from("documents")
      .select("id, filename, pages, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch documents:", error.message);
      return NextResponse.json(
        { error: "Failed to fetch documents." },
        { status: 500 }
      );
    }

    return NextResponse.json({ documents: documents ?? [] });
  } catch (error) {
    console.error("Documents GET error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

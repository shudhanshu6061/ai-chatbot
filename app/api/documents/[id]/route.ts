import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Document ID is required." },
        { status: 400 }
      );
    }

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

    // Verify document ownership
    const { data: existingDoc, error: checkError } = await supabase
      .from("documents")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (checkError) {
      console.error("Document check error:", checkError.message);
      return NextResponse.json(
        { error: "Failed to delete document." },
        { status: 500 }
      );
    }

    if (!existingDoc) {
      return NextResponse.json(
        { error: "Document not found." },
        { status: 404 }
      );
    }

    // Delete document row (cascades to document_chunks automatically)
    const { error: deleteError } = await supabase
      .from("documents")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Failed to delete document:", deleteError.message);
      return NextResponse.json(
        { error: "Failed to delete document." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Document and its chunks deleted successfully.",
    });
  } catch (error) {
    console.error("Delete document error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Message ID is required." },
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

    // Check message ownership
    const { data: existingMessage, error: findError } = await supabase
      .from("messages")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (findError) {
      console.error("Message lookup error:", findError.message);
      return NextResponse.json(
        { error: "Failed to delete message." },
        { status: 500 }
      );
    }

    if (!existingMessage) {
      return NextResponse.json(
        { error: "Message not found." },
        { status: 404 }
      );
    }

    const { error: deleteError } = await supabase
      .from("messages")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Message delete error:", deleteError.message);
      return NextResponse.json(
        { error: "Failed to delete message." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Message deleted successfully.",
    });
  } catch (error) {
    console.error("Delete message error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

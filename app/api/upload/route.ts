import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { createClient } from "@supabase/supabase-js";
import { rateLimit, getClientIdentifier } from "@/app/lib/rate-limiter";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    // 1. Require authentication
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

    // 2. Verify user session
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

    // Rate limiting: 5 uploads per minute per user
    const clientId = getClientIdentifier(request, user.id);
    const rateCheck = rateLimit(`upload:${clientId}`, 5, 60_000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Upload rate limit reached. Please wait ${rateCheck.retryAfterSeconds}s before uploading another PDF.`,
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

    // 3. Read uploaded file
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No PDF file provided." },
        { status: 400 }
      );
    }

    // 4. Validate PDF
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are supported." },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "The uploaded file must have a .pdf extension." },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "The uploaded PDF is empty." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: "PDF is too large. Maximum allowed size is 10 MB.",
        },
        { status: 413 }
      );
    }

    // 5. Parse PDF
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parser = new PDFParse({ data: buffer });
    let text = "";
    let pages = 1;
    try {
      const textResult = await parser.getText();
      text = textResult.text?.trim();
      pages = textResult.total || 1;
    } finally {
      try {
        await parser.destroy();
      } catch {
        // Ignore cleanup errors
      }
    }

    if (!text) {
      return NextResponse.json(
        {
          error:
            "No readable text was found in this PDF. Scanned/image-only PDFs are not supported yet.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      filename: file.name,
      text,
      pages,
    });
  } catch (error) {
    console.error("PDF upload error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process PDF." },
      { status: 500 }
    );
  }
}
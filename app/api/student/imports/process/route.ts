import { NextResponse } from "next/server";
import {
  createAuthenticatedRouteClient,
} from "../../../../lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProcessBody = {
  importId?: unknown;
};

type StudentImport = {
  id: string;
  owner_id: string;
  file_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  status: string;
};

function getAccessToken(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  return authHeader.replace("Bearer ", "").trim();
}

function decodeTextFile(buffer: ArrayBuffer) {
  return new TextDecoder("utf-8", { fatal: false }).decode(buffer);
}

export async function POST(request: Request) {
  try {
    const accessToken = getAccessToken(request);

    if (!accessToken) {
      return NextResponse.json(
        { error: "Missing authorization token." },
        { status: 401 }
      );
    }

    const body = (await request.json().catch(() => null)) as ProcessBody | null;
    const importId =
      typeof body?.importId === "string" ? body.importId.trim() : "";

    if (!importId) {
      return NextResponse.json(
        { error: "Missing importId." },
        { status: 400 }
      );
    }

    const supabase = createAuthenticatedRouteClient(accessToken);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be signed in to process an import." },
        { status: 401 }
      );
    }

    const { data, error: importError } = await supabase
      .from("student_imports")
      .select("id, owner_id, file_path, file_name, mime_type, status")
      .eq("id", importId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (importError) {
      return NextResponse.json(
        { error: importError.message },
        { status: 500 }
      );
    }

    const studentImport = (data || null) as StudentImport | null;

    if (!studentImport) {
      return NextResponse.json(
        { error: "Student import was not found." },
        { status: 404 }
      );
    }

    if (!studentImport.file_path) {
      return NextResponse.json(
        { error: "This import does not have an uploaded file." },
        { status: 400 }
      );
    }

    const supportedTextTypes = new Set([
      "text/plain",
      "text/markdown",
      "text/x-markdown",
    ]);

    if (!supportedTextTypes.has(studentImport.mime_type || "")) {
      await supabase
        .from("student_imports")
        .update({
          status: "needs_review",
          error_message:
            "Automatic PDF and DOCX extraction is not enabled yet. This file is saved safely and can be processed in a later phase.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", studentImport.id)
        .eq("owner_id", user.id);

      return NextResponse.json({
        status: "needs_review",
        message:
          "The file is saved, but automatic extraction currently supports TXT and Markdown files only.",
      });
    }

    await supabase
      .from("student_imports")
      .update({
        status: "processing",
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", studentImport.id)
      .eq("owner_id", user.id);

    const { data: fileData, error: downloadError } = await supabase.storage
      .from("student-imports")
      .download(studentImport.file_path);

    if (downloadError || !fileData) {
      await supabase
        .from("student_imports")
        .update({
          status: "failed",
          error_message:
            downloadError?.message || "The uploaded file could not be read.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", studentImport.id)
        .eq("owner_id", user.id);

      return NextResponse.json(
        { error: downloadError?.message || "Could not read uploaded file." },
        { status: 500 }
      );
    }

    const rawText = decodeTextFile(await fileData.arrayBuffer()).trim();

    if (!rawText) {
      await supabase
        .from("student_imports")
        .update({
          status: "failed",
          error_message: "No readable text was found in the uploaded file.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", studentImport.id)
        .eq("owner_id", user.id);

      return NextResponse.json(
        { error: "No readable text was found in the uploaded file." },
        { status: 422 }
      );
    }

    const { error: updateError } = await supabase
      .from("student_imports")
      .update({
        raw_text: rawText,
        status: "needs_review",
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", studentImport.id)
      .eq("owner_id", user.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "needs_review",
      message:
        "Text extracted successfully. The next phase will turn it into reviewable courses, assignments, and exams.",
      charactersExtracted: rawText.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not process import.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ProductShell from "../../../components/products/ProductShell";
import { studentNavItems } from "../../../lib/products/navigation";
import { createClient } from "../../../lib/supabase/client";

type StudentImport = {
  id: string;
  source_type: string;
  source_name: string | null;
  file_name: string | null;
  mime_type: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
};

const acceptedTypes = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
];

export default function StudentImportPage() {
  const supabase = useMemo(() => createClient(), []);
  const [imports, setImports] = useState<StudentImport[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadImports = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be signed in to use Student imports.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("student_imports")
      .select(
        "id, source_type, source_name, file_name, mime_type, status, error_message, created_at"
      )
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setImports((data || []) as StudentImport[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadImports();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadImports]);

  async function uploadSyllabus(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (!selectedFile) {
      setErrorMessage("Choose a syllabus file first.");
      return;
    }

    if (!acceptedTypes.includes(selectedFile.type)) {
      setErrorMessage("Use a PDF, DOCX, TXT, or Markdown file.");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setErrorMessage("The file must be 10 MB or smaller.");
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be signed in to upload a syllabus.");
      return;
    }

    setUploading(true);

    const safeName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const storagePath = `${user.id}/${crypto.randomUUID()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("student-imports")
      .upload(storagePath, selectedFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      setUploading(false);
      setErrorMessage(uploadError.message);
      return;
    }

    const { error: insertError } = await supabase
      .from("student_imports")
      .insert({
        owner_id: user.id,
        source_type: "syllabus",
        source_name: sourceName.trim() || null,
        file_name: selectedFile.name,
        file_path: storagePath,
        mime_type: selectedFile.type || null,
        status: "uploaded",
      });

    if (insertError) {
      await supabase.storage.from("student-imports").remove([storagePath]);
      setUploading(false);
      setErrorMessage(insertError.message);
      return;
    }

    setSelectedFile(null);
    setSourceName("");
    setUploading(false);
    setMessage("Syllabus uploaded successfully.");
    await loadImports();
  }

  async function processImport(importId: string) {
    setMessage("");
    setErrorMessage("");
    setProcessingId(importId);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      setProcessingId(null);
      setErrorMessage("Your session has expired. Sign in again.");
      return;
    }

    const response = await fetch("/api/student/imports/process", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ importId }),
    });

    const result = (await response.json().catch(() => null)) as
      | {
          error?: string;
          message?: string;
        }
      | null;

    setProcessingId(null);

    if (!response.ok) {
      setErrorMessage(result?.error || "Could not process this import.");
      return;
    }

    setMessage(result?.message || "Import processed.");
    await loadImports();
  }

  return (
    <ProductShell
      productName="SchedNest Student"
      productLabel="Student workspace"
      accent="sky"
      navItems={[...studentNavItems]}
    >
      <section className="rounded-[2rem] border border-sky-400/20 bg-sky-400/10 p-7">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-sky-300">
          Import processing
        </p>

        <h2 className="mt-3 text-4xl font-black">Import school information</h2>

        <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-300">
          Upload syllabi and begin extracting course information. TXT and
          Markdown extraction works now; PDF and DOCX processing remain staged
          for the next parser phase.
        </p>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        <form
          onSubmit={uploadSyllabus}
          className="rounded-[2rem] border border-sky-200/10 bg-white/[0.04] p-6"
        >
          <h3 className="text-xl font-black">Upload a syllabus</h3>

          <label className="mt-5 block">
            <span className="text-sm font-bold text-gray-300">
              Course or source name
            </span>
            <input
              value={sourceName}
              onChange={(event) => setSourceName(event.target.value)}
              placeholder="NURS 316 — Maternal Health"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-sky-300/40"
            />
          </label>

          <label className="mt-4 block">
            <span className="text-sm font-bold text-gray-300">
              Syllabus file
            </span>
            <input
              type="file"
              accept=".pdf,.docx,.txt,.md"
              onChange={(event) =>
                setSelectedFile(event.target.files?.[0] || null)
              }
              className="mt-2 block w-full rounded-2xl border border-dashed border-white/15 bg-black/20 px-4 py-5 text-sm text-gray-300 file:mr-4 file:rounded-xl file:border-0 file:bg-sky-300/10 file:px-4 file:py-2 file:font-black file:text-sky-100"
            />
          </label>

          <p className="mt-3 text-xs leading-5 text-gray-500">
            PDF, DOCX, TXT, or Markdown. Maximum size: 10 MB.
          </p>

          <button
            type="submit"
            disabled={uploading}
            className="mt-5 rounded-2xl border border-sky-300/20 bg-sky-300/10 px-5 py-3 text-sm font-black text-sky-100 transition hover:bg-sky-300/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload syllabus"}
          </button>
        </form>

        <section className="rounded-[2rem] border border-sky-200/10 bg-white/[0.04] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-black">Import history</h3>
              <p className="mt-1 text-sm text-gray-500">
                Process uploaded files and track their status
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadImports()}
              className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-black text-gray-300 transition hover:bg-white/[0.06] hover:text-white"
            >
              Refresh
            </button>
          </div>

          {message ? (
            <p className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
              {message}
            </p>
          ) : null}

          {errorMessage ? (
            <p className="mt-4 rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">
              {errorMessage}
            </p>
          ) : null}

          {loading ? (
            <p className="mt-6 text-sm text-gray-400">Loading imports...</p>
          ) : imports.length === 0 ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-white/10 p-8 text-center">
              <p className="font-black">No imports yet</p>
              <p className="mt-2 text-sm text-gray-500">
                Upload your first syllabus to begin.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {imports.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[1.5rem] border border-white/10 bg-black/10 p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h4 className="font-black">
                        {item.source_name || item.file_name || "Student import"}
                      </h4>

                      <p className="mt-1 text-sm text-gray-500">
                        {item.file_name || item.source_type}
                      </p>

                      <p className="mt-1 text-xs text-gray-600">
                        {new Date(item.created_at).toLocaleString()}
                      </p>

                      {item.error_message ? (
                        <p className="mt-3 max-w-2xl text-sm text-amber-200">
                          {item.error_message}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-col items-start gap-2 sm:items-end">
                      <span className="rounded-full border border-sky-300/15 bg-sky-300/10 px-3 py-1 text-xs font-black text-sky-100">
                        {item.status.replaceAll("_", " ")}
                      </span>

                      {item.status === "uploaded" ||
                      item.status === "failed" ? (
                        <button
                          type="button"
                          onClick={() => void processImport(item.id)}
                          disabled={processingId === item.id}
                          className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-gray-300 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {processingId === item.id
                            ? "Processing..."
                            : "Process file"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </ProductShell>
  );
}

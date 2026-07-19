"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "../lib/supabase/client";
import {
  buildPlatformFilePath,
  type PlatformFileProduct,
  type PlatformFileSensitivity,
} from "../lib/platform/files";

type PlatformFile = {
  id: string;
  product: PlatformFileProduct;
  folder: string;
  storage_path: string;
  original_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  sensitivity: PlatformFileSensitivity;
  sharing_scope: "private" | "approved_people" | "workspace";
  created_at: string;
};

function formatBytes(value: number | null) {
  if (!value) return "Unknown size";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function UniversalFilesPage() {
  const supabase = useMemo(() => createClient(), []);
  const [files, setFiles] = useState<PlatformFile[]>([]);
  const [product, setProduct] =
    useState<PlatformFileProduct>("platform");
  const [sensitivity, setSensitivity] =
    useState<PlatformFileSensitivity>("standard");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be signed in.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("platform_files")
      .select(
        "id, product, folder, storage_path, original_name, mime_type, size_bytes, sensitivity, sharing_scope, created_at"
      )
      .eq("owner_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setFiles((data || []) as PlatformFile[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadFiles();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadFiles]);

  async function uploadFile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (!selectedFile) {
      setErrorMessage("Choose a file first.");
      return;
    }

    if (selectedFile.size > 20 * 1024 * 1024) {
      setErrorMessage("Files must be 20 MB or smaller.");
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be signed in.");
      return;
    }

    setUploading(true);

    const storagePath = buildPlatformFilePath(
      user.id,
      product,
      selectedFile.name
    );

    const { error: uploadError } = await supabase.storage
      .from("platform-files")
      .upload(storagePath, selectedFile, {
        upsert: false,
        contentType: selectedFile.type || undefined,
      });

    if (uploadError) {
      setUploading(false);
      setErrorMessage(uploadError.message);
      return;
    }

    const { error: metadataError } = await supabase
      .from("platform_files")
      .insert({
        owner_id: user.id,
        created_by: user.id,
        product,
        folder: "/",
        storage_bucket: "platform-files",
        storage_path: storagePath,
        original_name: selectedFile.name,
        mime_type: selectedFile.type || null,
        size_bytes: selectedFile.size,
        sensitivity,
        sharing_scope: "private",
      });

    if (metadataError) {
      await supabase.storage
        .from("platform-files")
        .remove([storagePath]);

      setUploading(false);
      setErrorMessage(metadataError.message);
      return;
    }

    setSelectedFile(null);
    setUploading(false);
    setMessage("File uploaded.");
    await loadFiles();
  }

  async function openFile(file: PlatformFile) {
    const { data, error } = await supabase.storage
      .from("platform-files")
      .createSignedUrl(file.storage_path, 60);

    if (error || !data?.signedUrl) {
      setErrorMessage(error?.message || "Unable to open file.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function archiveFile(file: PlatformFile) {
    const { error } = await supabase
      .from("platform_files")
      .update({
        status: "archived",
        updated_at: new Date().toISOString(),
      })
      .eq("id", file.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setFiles((current) =>
      current.filter((item) => item.id !== file.id)
    );
  }

  return (
    <main className="min-h-screen bg-[#07090d] px-5 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-[2rem] border border-teal-400/20 bg-teal-400/10 p-7">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-teal-300">
            SchedNest Platform
          </p>

          <h1 className="mt-3 text-4xl font-black">
            Universal Files
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-300">
            One private file system for Student, Teams, Med, Business,
            Life, and Birdy.
          </p>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[0.8fr_1.4fr]">
          <form
            onSubmit={uploadFile}
            className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6"
          >
            <h2 className="text-xl font-black">Upload a file</h2>

            <div className="mt-5 space-y-4">
              <select
                value={product}
                onChange={(event) =>
                  setProduct(
                    event.target.value as PlatformFileProduct
                  )
                }
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3"
              >
                <option value="platform">Platform</option>
                <option value="student">Student</option>
                <option value="teams">Teams</option>
                <option value="med">Med</option>
                <option value="business">Business</option>
                <option value="life">Life</option>
              </select>

              <select
                value={sensitivity}
                onChange={(event) =>
                  setSensitivity(
                    event.target
                      .value as PlatformFileSensitivity
                  )
                }
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3"
              >
                <option value="standard">Standard</option>
                <option value="personal">Personal</option>
                <option value="sensitive">Sensitive</option>
                <option value="restricted">Restricted</option>
              </select>

              <input
                type="file"
                onChange={(event) =>
                  setSelectedFile(event.target.files?.[0] || null)
                }
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3"
              />
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="mt-5 w-full rounded-2xl border border-teal-300/20 bg-teal-300/10 px-5 py-3 text-sm font-black text-teal-100"
            >
              {uploading ? "Uploading..." : "Upload file"}
            </button>
          </form>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">Your files</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {files.length} active file(s)
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadFiles()}
                className="rounded-xl border border-white/10 px-3 py-2 text-sm font-black text-gray-300"
              >
                Refresh
              </button>
            </div>

            {message ? (
              <p className="mt-4 text-emerald-200">{message}</p>
            ) : null}

            {errorMessage ? (
              <p className="mt-4 text-red-200">{errorMessage}</p>
            ) : null}

            {loading ? (
              <p className="mt-6 text-sm text-gray-400">
                Loading files...
              </p>
            ) : files.length === 0 ? (
              <p className="mt-6 text-sm text-gray-500">
                No files uploaded yet.
              </p>
            ) : (
              <div className="mt-6 space-y-3">
                {files.map((file) => (
                  <article
                    key={file.id}
                    className="rounded-[1.5rem] border border-white/10 bg-black/10 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-teal-300/15 bg-teal-300/10 px-3 py-1 text-xs font-bold text-teal-100">
                            {file.product}
                          </span>

                          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-400">
                            {file.sensitivity}
                          </span>
                        </div>

                        <h3 className="mt-3 font-black">
                          {file.original_name}
                        </h3>

                        <p className="mt-2 text-sm text-gray-500">
                          {formatBytes(file.size_bytes)} ·{" "}
                          {formatDate(file.created_at)}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void openFile(file)}
                          className="rounded-xl border border-teal-300/20 bg-teal-300/10 px-3 py-2 text-xs font-black text-teal-100"
                        >
                          Open
                        </button>

                        <button
                          type="button"
                          onClick={() => void archiveFile(file)}
                          className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-gray-400"
                        >
                          Archive
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

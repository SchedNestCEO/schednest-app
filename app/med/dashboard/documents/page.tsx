"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ProductShell from "../../../components/products/ProductShell";
import { medNavItems } from "../../../lib/products/navigation";
import { createClient } from "../../../lib/supabase/client";

type MedProfile = { id: string };
type CareNest = { id: string; name: string };

type MedDocument = {
  id: string;
  title: string;
  document_type: string | null;
  file_url: string;
  notes: string | null;
  care_nest_id: string | null;
  created_at: string;
};

const allowedTypes = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "text/plain",
];

export default function MedDocumentsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<MedProfile | null>(null);
  const [careNests, setCareNests] = useState<CareNest[]>([]);
  const [documents, setDocuments] = useState<MedDocument[]>([]);
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [notes, setNotes] = useState("");
  const [careNestId, setCareNestId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be signed in to view documents.");
      setLoading(false);
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("med_profiles")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (profileError) {
      setErrorMessage(profileError.message);
      setLoading(false);
      return;
    }

    if (!profileData) {
      setErrorMessage("Open the Med dashboard first to create your profile.");
      setLoading(false);
      return;
    }

    setProfile(profileData as MedProfile);

    const [nestsResult, docsResult] = await Promise.all([
      supabase
        .from("med_care_nests")
        .select("id, name")
        .eq("owner_id", user.id)
        .eq("status", "active")
        .order("name"),
      supabase
        .from("med_documents")
        .select("id, title, document_type, file_url, notes, care_nest_id, created_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    const firstError = nestsResult.error || docsResult.error;

    if (firstError) {
      setErrorMessage(firstError.message);
      setLoading(false);
      return;
    }

    setCareNests((nestsResult.data || []) as CareNest[]);
    setDocuments((docsResult.data || []) as MedDocument[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadData]);

  async function uploadDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (!profile) {
      setErrorMessage("Med profile is not ready.");
      return;
    }

    if (!title.trim() || !file) {
      setErrorMessage("Document title and file are required.");
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      setErrorMessage("Use a PDF, PNG, JPG, or TXT file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("The file must be 10 MB or smaller.");
      return;
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be signed in.");
      return;
    }

    setUploading(true);

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("med-documents")
      .upload(path, file, { upsert: false });

    if (uploadError) {
      setUploading(false);
      setErrorMessage(uploadError.message);
      return;
    }

    const { error: insertError } = await supabase.from("med_documents").insert({
      owner_id: user.id,
      med_profile_id: profile.id,
      care_nest_id: careNestId || null,
      title: title.trim(),
      document_type: documentType.trim() || file.type || null,
      file_url: path,
      notes: notes.trim() || null,
    });

    if (insertError) {
      await supabase.storage.from("med-documents").remove([path]);
      setUploading(false);
      setErrorMessage(insertError.message);
      return;
    }

    setTitle("");
    setDocumentType("");
    setNotes("");
    setCareNestId("");
    setFile(null);
    setUploading(false);
    setMessage("Document uploaded.");
    await loadData();
  }

  async function openDocument(document: MedDocument) {
    const { data, error } = await supabase.storage
      .from("med-documents")
      .createSignedUrl(document.file_url, 60);

    if (error || !data?.signedUrl) {
      setErrorMessage(error?.message || "Could not open document.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function deleteDocument(document: MedDocument) {
    const { error: storageError } = await supabase.storage
      .from("med-documents")
      .remove([document.file_url]);

    if (storageError) {
      setErrorMessage(storageError.message);
      return;
    }

    const { error } = await supabase
      .from("med_documents")
      .delete()
      .eq("id", document.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setDocuments((current) =>
      current.filter((item) => item.id !== document.id)
    );
    setMessage("Document deleted.");
  }

  return (
    <ProductShell
      productName="SchedNest Med"
      productLabel="Patient workspace"
      navItems={[...medNavItems]}
    >
      <section className="rounded-[2rem] border border-edition-primary/20 bg-edition-primary/10 p-7">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-edition-primary">
          Private document storage
        </p>
        <h2 className="mt-3 text-4xl font-black">Documents</h2>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-white/75">
          Keep patient-uploaded instructions, forms, lab documents, and care files organized.
        </p>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        <form
          onSubmit={uploadDocument}
          className="rounded-[2rem] border border-edition-primary/10 bg-white/[0.04] p-6"
        >
          <h3 className="text-xl font-black">Upload a document</h3>

          <div className="mt-5 space-y-4">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Document title"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
            />

            <input
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value)}
              placeholder="Document type"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
            />

            <select
              value={careNestId}
              onChange={(event) => setCareNestId(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
            >
              <option value="">No Care Nest</option>
              {careNests.map((nest) => (
                <option key={nest.id} value={nest.id}>
                  {nest.name}
                </option>
              ))}
            </select>

            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Notes"
              rows={4}
              className="w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
            />

            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.txt"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              className="block w-full rounded-2xl border border-dashed border-white/15 bg-black/20 px-4 py-5 text-sm text-gray-300"
            />
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="mt-5 rounded-2xl border border-edition-primary/20 bg-edition-primary/10 px-5 py-3 text-sm font-black text-edition-primary-soft"
          >
            {uploading ? "Uploading..." : "Upload document"}
          </button>
        </form>

        <section className="rounded-[2rem] border border-edition-primary/10 bg-white/[0.04] p-6">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-xl font-black">Your documents</h3>
            <button
              type="button"
              onClick={() => void loadData()}
              className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-black text-gray-300"
            >
              Refresh
            </button>
          </div>

          {message ? <p className="mt-4 text-emerald-200">{message}</p> : null}
          {errorMessage ? <p className="mt-4 text-red-200">{errorMessage}</p> : null}

          {loading ? (
            <p className="mt-6 text-sm text-gray-400">Loading documents...</p>
          ) : documents.length === 0 ? (
            <p className="mt-6 text-sm text-gray-500">No documents yet.</p>
          ) : (
            <div className="mt-6 space-y-3">
              {documents.map((document) => (
                <article
                  key={document.id}
                  className="rounded-[1.5rem] border border-white/10 bg-black/10 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h4 className="font-black">{document.title}</h4>
                      <p className="mt-2 text-sm text-gray-500">
                        {document.document_type || "Document"}
                      </p>
                      {document.notes ? (
                        <p className="mt-2 text-sm text-gray-500">
                          {document.notes}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void openDocument(document)}
                        className="rounded-xl border border-edition-primary/20 bg-edition-primary/10 px-3 py-2 text-xs font-black text-edition-primary-soft"
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteDocument(document)}
                        className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-gray-400"
                      >
                        Delete
                      </button>
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

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "../lib/supabase/client";
import { connectorRegistry } from "../lib/platform/connectors/registry";

type ConnectorRecord = {
  id: string;
  provider: string;
  connector_type: string;
  product: string;
  display_name: string;
  status: "disconnected" | "connecting" | "connected" | "error" | "revoked";
  last_sync_at: string | null;
  error_message: string | null;
};

export default function ConnectorsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [connectors, setConnectors] = useState<ConnectorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadConnectors = useCallback(async () => {
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
      .from("platform_connectors")
      .select(
        "id, provider, connector_type, product, display_name, status, last_sync_at, error_message"
      )
      .eq("owner_id", user.id)
      .order("provider");

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setConnectors((data || []) as ConnectorRecord[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadConnectors();
  }, [loadConnectors]);

  async function addConnector(definition: (typeof connectorRegistry)[number]) {
    setMessage("");
    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be signed in.");
      return;
    }

    const { error } = await supabase
      .from("platform_connectors")
      .upsert(
        {
          owner_id: user.id,
          provider: definition.provider,
          connector_type: definition.connectorType,
          product: definition.product,
          display_name: definition.displayName,
          status: "disconnected",
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "owner_id,provider,product",
        }
      );

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMessage(`${definition.displayName} added to connector registry.`);
    await loadConnectors();
  }

  async function revokeConnector(id: string) {
    const { error } = await supabase.rpc(
      "revoke_platform_connector",
      {
        target_connector_id: id,
      }
    );

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setConnectors((current) =>
      current.map((item) =>
        item.id === id ? { ...item, status: "revoked" } : item
      )
    );
    setMessage("Connector revoked.");
  }

  function existingConnector(provider: string) {
    return connectors.find((item) => item.provider === provider);
  }

  return (
    <main className="min-h-screen bg-[#07090d] px-5 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-[2rem] border border-orange-400/20 bg-orange-400/10 p-7">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-orange-300">
            SchedNest Platform
          </p>

          <h1 className="mt-3 text-4xl font-black">
            Connected Apps
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-300">
            One connector framework for calendars, LMS platforms,
            communication tools, and future integrations.
          </p>
        </section>

        {message ? (
          <p className="mt-6 text-emerald-200">{message}</p>
        ) : null}

        {errorMessage ? (
          <p className="mt-6 text-red-200">{errorMessage}</p>
        ) : null}

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-xl font-black">Connector catalog</h2>

          {loading ? (
            <p className="mt-5 text-sm text-gray-400">
              Loading connectors...
            </p>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {connectorRegistry.map((definition) => {
                const existing = existingConnector(definition.provider);

                return (
                  <article
                    key={definition.provider}
                    className="rounded-[1.5rem] border border-white/10 bg-black/10 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-orange-300/15 bg-orange-300/10 px-3 py-1 text-xs font-bold text-orange-100">
                            {definition.product}
                          </span>

                          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-400">
                            {definition.connectorType}
                          </span>
                        </div>

                        <h3 className="mt-3 font-black">
                          {definition.displayName}
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-gray-500">
                          {definition.description}
                        </p>
                      </div>

                      {existing ? (
                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-black text-gray-400">
                          {existing.status}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4 flex gap-2">
                      {!existing ? (
                        <button
                          type="button"
                          onClick={() => void addConnector(definition)}
                          className="rounded-xl border border-orange-300/20 bg-orange-300/10 px-3 py-2 text-xs font-black text-orange-100"
                        >
                          Add connector
                        </button>
                      ) : existing.status !== "revoked" ? (
                        <button
                          type="button"
                          onClick={() => void revokeConnector(existing.id)}
                          className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-gray-400"
                        >
                          Revoke
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void addConnector(definition)}
                          className="rounded-xl border border-orange-300/20 bg-orange-300/10 px-3 py-2 text-xs font-black text-orange-100"
                        >
                          Re-add
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

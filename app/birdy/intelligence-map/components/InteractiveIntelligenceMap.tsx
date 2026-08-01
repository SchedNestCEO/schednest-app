"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import { BirdyModuleDetailPanel } from "./BirdyModuleDetailPanel";
import type { BirdyGraphResponse } from "./birdyGraphTypes";
import {
  intelligenceModules,
  type IntelligenceModule,
} from "./intelligenceModules";

function formatConfidence(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function InteractiveIntelligenceMap() {
  const supabase = useMemo(() => createClient(), []);

  const [selectedModule, setSelectedModule] =
    useState<IntelligenceModule | null>(null);
  const [graph, setGraph] = useState<BirdyGraphResponse | null>(null);
  const [graphLoading, setGraphLoading] = useState(true);
  const [graphError, setGraphError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadGraph() {
      setGraphLoading(true);
      setGraphError("");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (cancelled) {
        return;
      }

      if (sessionError || !session?.access_token) {
        setGraphLoading(false);
        setGraphError("Your session has expired. Sign in again.");
        return;
      }

      try {
        const response = await fetch("/api/platform/birdy/graph?product=all", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const result = (await response.json().catch(() => null)) as
          | BirdyGraphResponse
          | {
              error?: string;
            }
          | null;

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setGraphError(
            result && "error" in result && result.error
              ? result.error
              : "Birdy’s intelligence graph is temporarily unavailable.",
          );
          setGraphLoading(false);
          return;
        }

        setGraph(result as BirdyGraphResponse);
        setGraphLoading(false);
      } catch {
        if (!cancelled) {
          setGraphError(
            "Birdy’s intelligence graph is temporarily unavailable.",
          );
          setGraphLoading(false);
        }
      }
    }

    void loadGraph();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    if (!selectedModule) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedModule(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedModule]);

  return (
    <main className="min-h-screen bg-[#020508] p-0 text-white">
      <h1 className="sr-only">Birdy Intelligence Map</h1>

      <div className="mx-auto w-full max-w-[1600px]">
        <div
          className="relative aspect-[4/3] w-full overflow-hidden bg-[#020508]"
          data-testid="birdy-intelligence-map"
        >
          <Image
            src="/birdy/intelligence-map-reference.jpg"
            alt="Birdy Intelligence Map"
            fill
            priority
            sizes="100vw"
            className="object-contain"
          />

          <nav
            aria-label="Birdy intelligence modules"
            className="absolute inset-0"
          >
            {intelligenceModules.map((module) => (
              <button
                key={module.id}
                type="button"
                aria-label={`Open ${module.label}`}
                aria-pressed={selectedModule?.id === module.id}
                title={module.label}
                onClick={() => setSelectedModule(module)}
                className="absolute cursor-pointer bg-transparent opacity-0 outline-none transition-opacity focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                style={{
                  left: `${module.left}%`,
                  top: `${module.top}%`,
                  width: `${module.width}%`,
                  height: `${module.height}%`,
                }}
              />
            ))}
          </nav>

          {selectedModule ? (
            <BirdyModuleDetailPanel
              module={selectedModule}
              graph={graph}
              loading={graphLoading}
              error={graphError}
              onClose={() => setSelectedModule(null)}
            />
          ) : null}
        </div>
      </div>
    </main>
  );
}

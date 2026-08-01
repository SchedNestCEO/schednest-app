"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import type { BirdyGraphResponse } from "./birdyGraphTypes";
import {
  intelligenceModules,
  moduleEntityTypes,
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

  const selectedEntityCount = useMemo(() => {
    if (!selectedModule || !graph) {
      return 0;
    }

    const entityTypes = moduleEntityTypes[selectedModule.id];

    if (!entityTypes) {
      return graph.summary.entityCount;
    }

    return graph.entities.filter((entity) =>
      entityTypes.includes(entity.entity_type),
    ).length;
  }, [graph, selectedModule]);

  function moduleMetric() {
    if (!selectedModule || !graph) {
      return null;
    }

    switch (selectedModule.id) {
      case "routing-traces":
        return {
          label: "Active relationships",
          value: graph.summary.relationshipCount.toLocaleString(),
        };

      case "birdy-confidence":
        return {
          label: "Average confidence",
          value: formatConfidence(graph.summary.averageConfidence),
        };

      case "knowledge-base":
        return {
          label: "Evidence records",
          value: graph.summary.evidenceCount.toLocaleString(),
        };

      default:
        return {
          label: "Connected entities",
          value: selectedEntityCount.toLocaleString(),
        };
    }
  }

  const metric = moduleMetric();

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
            <section
              role="dialog"
              aria-modal="false"
              aria-labelledby="birdy-module-title"
              className="absolute bottom-[4%] right-[3%] z-20 w-[min(360px,30%)] rounded-xl border border-cyan-300/30 bg-black/90 p-5 shadow-2xl backdrop-blur-xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">
                    Intelligence module
                  </p>

                  <h2
                    id="birdy-module-title"
                    className="mt-2 text-lg font-semibold text-white"
                  >
                    {selectedModule.label}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedModule(null)}
                  aria-label={`Close ${selectedModule.label}`}
                  className="rounded-md px-2 py-1 text-sm text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                >
                  Close
                </button>
              </div>

              <p className="mt-3 text-sm leading-6 text-white/70">
                {selectedModule.description}
              </p>

              <div
                className="mt-4 border-t border-white/10 pt-4"
                aria-live="polite"
              >
                {graphLoading ? (
                  <p className="text-sm text-white/60">
                    Loading live intelligence…
                  </p>
                ) : graphError ? (
                  <p className="text-sm text-orange-300">{graphError}</p>
                ) : metric ? (
                  <>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/50">
                      {metric.label}
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-white">
                      {metric.value}
                    </p>
                  </>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}

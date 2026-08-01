"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type IntelligenceModule = {
  id: string;
  label: string;
  description: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

const intelligenceModules: IntelligenceModule[] = [
  {
    id: "memory-cluster",
    label: "Memory Cluster",
    description:
      "Explore the memories, observations, and retained context informing Birdy.",
    left: 19,
    top: 22,
    width: 15,
    height: 12,
  },
  {
    id: "strategic-goals",
    label: "Strategic Goals",
    description:
      "Review active goals, priorities, milestones, and intended outcomes.",
    left: 66,
    top: 22,
    width: 15,
    height: 12,
  },
  {
    id: "people-network",
    label: "People Network",
    description:
      "Explore people, roles, relationships, responsibilities, and collaboration signals.",
    left: 14,
    top: 40,
    width: 17,
    height: 13,
  },
  {
    id: "project-nexus",
    label: "Project Nexus",
    description:
      "Review connected projects, tasks, dependencies, blockers, and deadlines.",
    left: 69,
    top: 40,
    width: 17,
    height: 13,
  },
  {
    id: "knowledge-base",
    label: "Knowledge Base",
    description:
      "Explore verified knowledge, evidence, documentation, and operational context.",
    left: 16,
    top: 59,
    width: 17,
    height: 13,
  },
  {
    id: "decision-pathways",
    label: "Decision Pathways",
    description:
      "Inspect Birdy’s decisions, alternatives, evidence, confidence, and reasoning routes.",
    left: 67,
    top: 59,
    width: 18,
    height: 13,
  },
  {
    id: "activity-stream",
    label: "Activity Stream",
    description:
      "Review recent events and changes flowing into Birdy’s intelligence network.",
    left: 20,
    top: 77,
    width: 27,
    height: 16,
  },
  {
    id: "routing-traces",
    label: "Routing Traces",
    description:
      "Inspect how information and recommendations moved between products and modules.",
    left: 53,
    top: 77,
    width: 27,
    height: 16,
  },
  {
    id: "birdy-confidence",
    label: "Birdy Confidence",
    description:
      "Review the evidence strength, uncertainty, and confidence behind Birdy’s current view.",
    left: 78,
    top: 8,
    width: 16,
    height: 10,
  },
];

export function InteractiveIntelligenceMap() {
  const [selectedModule, setSelectedModule] =
    useState<IntelligenceModule | null>(null);

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
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}

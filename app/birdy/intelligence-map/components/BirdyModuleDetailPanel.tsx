import type { BirdyGraphResponse, GraphEntity } from "./birdyGraphTypes";
import {
  moduleEntityTypes,
  type IntelligenceModule,
} from "./intelligenceModules";

type BirdyModuleDetailPanelProps = {
  module: IntelligenceModule;
  graph: BirdyGraphResponse | null;
  loading: boolean;
  error: string;
  onClose: () => void;
};

function formatLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatConfidence(value: number) {
  return `${Math.round(value * 100)}%`;
}

function getMatchingEntities(
  module: IntelligenceModule,
  graph: BirdyGraphResponse,
): GraphEntity[] {
  const entityTypes = moduleEntityTypes[module.id];

  if (!entityTypes) {
    return graph.entities;
  }

  return graph.entities.filter((entity) =>
    entityTypes.includes(entity.entity_type),
  );
}

function countValues(values: string[]) {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3);
}

export function BirdyModuleDetailPanel({
  module,
  graph,
  loading,
  error,
  onClose,
}: BirdyModuleDetailPanelProps) {
  const entities = graph ? getMatchingEntities(module, graph) : [];
  const recentEntities = entities.slice(0, 3);

  const relationshipCounts = graph
    ? countValues(
        graph.relationships.map(
          (relationship) => relationship.relationship_type,
        ),
      )
    : [];

  const evidenceCounts = graph
    ? countValues(graph.evidence.map((item) => item.evidence_type))
    : [];

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby="birdy-module-title"
      className="absolute bottom-[4%] right-[3%] z-20 max-h-[70%] w-[min(390px,32%)] overflow-y-auto rounded-xl border border-cyan-300/30 bg-black/90 p-5 shadow-2xl backdrop-blur-xl"
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
            {module.label}
          </h2>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${module.label}`}
          className="rounded-md px-2 py-1 text-sm text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        >
          Close
        </button>
      </div>

      <p className="mt-3 text-sm leading-6 text-white/70">
        {module.description}
      </p>

      <div className="mt-4 border-t border-white/10 pt-4" aria-live="polite">
        {loading ? (
          <p className="text-sm text-white/60">Loading live intelligence…</p>
        ) : error ? (
          <p className="text-sm text-orange-300">{error}</p>
        ) : graph ? (
          <div className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-white/50">
                Connected entities
              </p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {entities.length.toLocaleString()}
              </p>
            </div>

            {module.id === "birdy-confidence" ? (
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/50">
                  Average confidence
                </p>
                <p className="mt-1 text-xl font-semibold text-white">
                  {formatConfidence(graph.summary.averageConfidence)}
                </p>
                <p className="mt-1 text-xs text-white/50">
                  {graph.confidenceAssessments.length.toLocaleString()}{" "}
                  confidence assessments
                </p>
              </div>
            ) : null}

            {recentEntities.length > 0 ? (
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/50">
                  Recent entities
                </p>

                <ul className="mt-2 space-y-2">
                  {recentEntities.map((entity) => (
                    <li
                      key={entity.id}
                      className="rounded-lg border border-white/10 bg-white/[0.03] p-3"
                    >
                      <p className="truncate text-sm font-medium text-white">
                        {entity.title}
                      </p>

                      <p className="mt-1 text-xs text-white/50">
                        {formatLabel(entity.entity_type)}
                        {typeof entity.confidence === "number"
                          ? ` · ${formatConfidence(entity.confidence)}`
                          : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-white/50">
                No matching entities are connected yet.
              </p>
            )}

            {module.id === "routing-traces" && relationshipCounts.length > 0 ? (
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/50">
                  Relationship routes
                </p>

                <ul className="mt-2 space-y-2 text-sm text-white/70">
                  {relationshipCounts.map(([type, count]) => (
                    <li
                      key={type}
                      className="flex items-center justify-between gap-4"
                    >
                      <span>{formatLabel(type)}</span>
                      <span className="text-white">{count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {module.id === "knowledge-base" && evidenceCounts.length > 0 ? (
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/50">
                  Evidence types
                </p>

                <ul className="mt-2 space-y-2 text-sm text-white/70">
                  {evidenceCounts.map(([type, count]) => (
                    <li
                      key={type}
                      className="flex items-center justify-between gap-4"
                    >
                      <span>{formatLabel(type)}</span>
                      <span className="text-white">{count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

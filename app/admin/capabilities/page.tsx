import Link from "next/link";
import {
  capabilityCounts,
  capabilityGraph,
  type CapabilityNode,
  type CapabilityStatus,
} from "../../lib/admin/capabilityGraph";

const statusStyles: Record<CapabilityStatus, string> = {
  active: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
  internal: "border-amber-300/20 bg-amber-300/10 text-amber-100",
  hidden: "border-sky-300/20 bg-sky-300/10 text-sky-100",
  foundation: "border-violet-300/20 bg-violet-300/10 text-violet-100",
  planned: "border-white/10 bg-white/[0.04] text-gray-300",
};

const typeLabels: Record<CapabilityNode["type"], string> = {
  product: "Product",
  feature: "Feature",
  platform: "Platform",
  operation: "Operation",
};

function EvidenceCount({ node }: { node: CapabilityNode }) {
  const total =
    (node.routeFiles?.length || 0) +
    (node.apiRoutes?.length || 0) +
    (node.migrations?.length || 0) +
    (node.validation?.length || 0);

  return (
    <span className="text-xs text-gray-500">
      {total} evidence item{total === 1 ? "" : "s"}
    </span>
  );
}

export default function CapabilityGraphPage() {
  const counts = capabilityCounts();
  const nodeMap = new Map(capabilityGraph.map((node) => [node.id, node]));

  const grouped = {
    product: capabilityGraph.filter((node) => node.type === "product"),
    feature: capabilityGraph.filter((node) => node.type === "feature"),
    platform: capabilityGraph.filter((node) => node.type === "platform"),
    operation: capabilityGraph.filter((node) => node.type === "operation"),
  };

  return (
    <main className="min-h-screen bg-[#050807] px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/admin"
          className="text-sm font-black text-cyan-300 hover:text-cyan-200"
        >
          ← Founder OS
        </Link>

        <section className="mt-6 rounded-[2.5rem] border border-cyan-400/20 bg-cyan-400/10 p-8">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-cyan-300">
            System Map v1.0
          </p>

          <h1 className="mt-5 text-4xl font-black">Capability Graph</h1>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-300">
            A repository-grounded view of SchedNest products, features, shared
            platform systems, operational tooling, dependencies, and validation
            coverage.
          </p>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {[
            ["Total", counts.total],
            ["Active", counts.active],
            ["Internal", counts.internal],
            ["Hidden", counts.hidden],
            ["Foundation", counts.foundation],
            ["Planned", counts.planned],
          ].map(([label, value]) => (
            <article
              key={label}
              className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5"
            >
              <p className="text-xs font-black uppercase tracking-wider text-gray-500">
                {label}
              </p>
              <p className="mt-3 text-3xl font-black">{value}</p>
            </article>
          ))}
        </section>

        {(
          ["product", "feature", "platform", "operation"] as const
        ).map((type) => (
          <section key={type} className="mt-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-gray-500">
                  {typeLabels[type]}
                </p>
                <h2 className="mt-2 text-2xl font-black">
                  {typeLabels[type]} capabilities
                </h2>
              </div>

              <span className="text-sm text-gray-500">
                {grouped[type].length} node
                {grouped[type].length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {grouped[type].map((node) => {
                const dependencies = (node.dependsOn || [])
                  .map((id) => nodeMap.get(id))
                  .filter((item): item is CapabilityNode => Boolean(item));

                return (
                  <article
                    key={node.id}
                    id={node.id}
                    className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                          {node.id}
                        </p>
                        <h3 className="mt-2 text-xl font-black">{node.name}</h3>
                      </div>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${statusStyles[node.status]}`}
                      >
                        {node.status}
                      </span>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-gray-400">
                      {node.description}
                    </p>

                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      {node.href ? (
                        <Link
                          href={node.href}
                          className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-white hover:bg-white/10"
                        >
                          Open capability
                        </Link>
                      ) : null}

                      <EvidenceCount node={node} />
                    </div>

                    {dependencies.length > 0 ? (
                      <div className="mt-5">
                        <p className="text-xs font-black uppercase tracking-wider text-gray-500">
                          Depends on
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2">
                          {dependencies.map((dependency) => (
                            <a
                              key={dependency.id}
                              href={`#${dependency.id}`}
                              className="rounded-full border border-white/10 bg-black/10 px-3 py-1 text-xs text-gray-300 hover:bg-white/10"
                            >
                              {dependency.name}
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <details className="mt-5 rounded-2xl border border-white/10 bg-black/10 p-4">
                      <summary className="cursor-pointer text-sm font-black">
                        Repository evidence
                      </summary>

                      <div className="mt-4 space-y-4 text-xs text-gray-400">
                        {node.routeFiles?.length ? (
                          <div>
                            <p className="font-black uppercase text-gray-500">
                              Pages
                            </p>
                            <ul className="mt-2 space-y-1">
                              {node.routeFiles.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {node.apiRoutes?.length ? (
                          <div>
                            <p className="font-black uppercase text-gray-500">
                              APIs
                            </p>
                            <ul className="mt-2 space-y-1">
                              {node.apiRoutes.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {node.migrations?.length ? (
                          <div>
                            <p className="font-black uppercase text-gray-500">
                              Migrations
                            </p>
                            <ul className="mt-2 space-y-1">
                              {node.migrations.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {node.validation?.length ? (
                          <div>
                            <p className="font-black uppercase text-gray-500">
                              Validation
                            </p>
                            <ul className="mt-2 space-y-1">
                              {node.validation.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {!node.routeFiles?.length &&
                        !node.apiRoutes?.length &&
                        !node.migrations?.length &&
                        !node.validation?.length ? (
                          <p>No repository evidence attached yet.</p>
                        ) : null}
                      </div>
                    </details>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

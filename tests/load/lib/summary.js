export function summary(name, data) {
  const path = `artifacts/load/${name}-summary.json`;
  return { stdout: `${name} complete. Summary: ${path}\n`, [path]: JSON.stringify({name, generated_at:new Date().toISOString(), metrics:data.metrics, state:data.state}, null, 2) };
}

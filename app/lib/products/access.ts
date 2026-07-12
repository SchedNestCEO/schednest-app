export type HiddenProductKey = "student" | "teams" | "med";

const envMap: Record<HiddenProductKey, string> = {
  student: "SCHEDNEST_ENABLE_STUDENT",
  teams: "SCHEDNEST_ENABLE_TEAMS",
  med: "SCHEDNEST_ENABLE_MED",
};

function isTruthy(value: string | undefined) {
  return value === "true" || value === "1" || value === "yes";
}

export function isHiddenProductEnabled(product: HiddenProductKey) {
  const envName = envMap[product];
  const explicitValue = process.env[envName];

  if (explicitValue !== undefined) {
    return isTruthy(explicitValue.toLowerCase());
  }

  return process.env.NODE_ENV !== "production";
}

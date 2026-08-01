import type {
  BirdyPermissionLevel,
  BirdyProduct,
  BirdyRiskLevel,
} from "./birdyContracts";

export type BirdyPolicyInput = {
  product: BirdyProduct;
  actionKey: string;
  learningAllowed: boolean;
  permissionLevel?: BirdyPermissionLevel | null;
  riskLevel?: BirdyRiskLevel | null;
  requiresConfirmation?: boolean | null;
};

export type BirdyPolicyResolution = {
  allowed: boolean;
  permissionLevel: BirdyPermissionLevel;
  riskLevel: BirdyRiskLevel;
  requiresConfirmation: boolean;
  reasonCode:
    | "BIRDY_POLICY_ALLOWED"
    | "BIRDY_LEARNING_DISABLED"
    | "BIRDY_PERMISSION_DENIED"
    | "BIRDY_ACTION_PROHIBITED"
    | "BIRDY_PERMISSION_MISSING";
};

type BirdyDefaultPolicy = {
  product: BirdyProduct;
  actionKey: string;
  permissionLevel: BirdyPermissionLevel;
  riskLevel: BirdyRiskLevel;
  requiresConfirmation: boolean;
};

const DEFAULT_POLICIES: BirdyDefaultPolicy[] = [
  {
    product: "platform",
    actionKey: "generate_schedule_recommendations",
    permissionLevel: "recommend",
    riskLevel: "medium",
    requiresConfirmation: true,
  },
];

function findDefaultPolicy(
  product: BirdyProduct,
  actionKey: string,
): BirdyDefaultPolicy | null {
  return (
    DEFAULT_POLICIES.find(
      (policy) => policy.product === product && policy.actionKey === actionKey,
    ) || null
  );
}

export function resolveBirdyPolicy(
  input: BirdyPolicyInput,
): BirdyPolicyResolution {
  if (!input.learningAllowed) {
    return {
      allowed: false,
      permissionLevel: input.permissionLevel || "never",
      riskLevel: input.riskLevel || "medium",
      requiresConfirmation: input.requiresConfirmation ?? true,
      reasonCode: "BIRDY_LEARNING_DISABLED",
    };
  }

  const defaultPolicy = findDefaultPolicy(input.product, input.actionKey);

  const permissionLevel =
    input.permissionLevel ?? defaultPolicy?.permissionLevel ?? "never";

  const riskLevel = input.riskLevel ?? defaultPolicy?.riskLevel ?? "prohibited";

  const requiresConfirmation =
    input.requiresConfirmation ?? defaultPolicy?.requiresConfirmation ?? true;

  if (!input.permissionLevel && !defaultPolicy) {
    return {
      allowed: false,
      permissionLevel,
      riskLevel,
      requiresConfirmation,
      reasonCode: "BIRDY_PERMISSION_MISSING",
    };
  }

  if (permissionLevel === "never" || permissionLevel === "observe") {
    return {
      allowed: false,
      permissionLevel,
      riskLevel,
      requiresConfirmation,
      reasonCode: "BIRDY_PERMISSION_DENIED",
    };
  }

  if (riskLevel === "prohibited") {
    return {
      allowed: false,
      permissionLevel,
      riskLevel,
      requiresConfirmation,
      reasonCode: "BIRDY_ACTION_PROHIBITED",
    };
  }

  return {
    allowed: true,
    permissionLevel,
    riskLevel,
    requiresConfirmation,
    reasonCode: "BIRDY_POLICY_ALLOWED",
  };
}

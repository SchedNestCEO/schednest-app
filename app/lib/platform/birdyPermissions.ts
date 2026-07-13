export type BirdyPermissionLevel =
  | "observe"
  | "recommend"
  | "ask"
  | "execute"
  | "never";

export type BirdyRiskLevel =
  | "low"
  | "medium"
  | "high"
  | "prohibited";

export type BirdyProduct =
  | "platform"
  | "student"
  | "teams"
  | "med"
  | "business"
  | "life";

export type BirdyPermission = {
  product: BirdyProduct;
  actionKey: string;
  permissionLevel: BirdyPermissionLevel;
  riskLevel: BirdyRiskLevel;
  requiresConfirmation: boolean;
  conditions?: Record<string, unknown>;
  notes?: string;
};

export const defaultBirdyPermissions: BirdyPermission[] = [
  {
    product: "student",
    actionKey: "move_study_block",
    permissionLevel: "execute",
    riskLevel: "low",
    requiresConfirmation: false,
    notes: "Only within user-approved study hours.",
  },
  {
    product: "teams",
    actionKey: "reschedule_team_meeting",
    permissionLevel: "ask",
    riskLevel: "medium",
    requiresConfirmation: true,
  },
  {
    product: "med",
    actionKey: "change_medication",
    permissionLevel: "never",
    riskLevel: "prohibited",
    requiresConfirmation: true,
  },
  {
    product: "business",
    actionKey: "approve_time_off",
    permissionLevel: "ask",
    riskLevel: "high",
    requiresConfirmation: true,
  },
];

export type OptimizerRecommendation = {
  id: string;
  product:
    | "platform"
    | "student"
    | "teams"
    | "med"
    | "business"
    | "life";
  action_key: string;
  recommendation: string;
  explanation: string | null;
  confidence: number;
  alternatives: unknown[];
  constraints: unknown[];
  status: string;
  created_at: string;
};

export function confidenceLabel(confidence: number) {
  if (confidence >= 0.85) return "High confidence";
  if (confidence >= 0.65) return "Moderate confidence";
  return "Low confidence";
}

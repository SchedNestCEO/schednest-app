export type IntelligenceModule = {
  id: string;
  label: string;
  description: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

export const intelligenceModules: IntelligenceModule[] = [
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

export const moduleEntityTypes: Record<string, string[]> = {
  "memory-cluster": ["memory"],
  "strategic-goals": ["goal"],
  "people-network": ["person", "customer", "team_record"],
  "project-nexus": ["project", "task", "schedule"],
  "knowledge-base": [
    "knowledge",
    "student_record",
    "med_record",
    "business_record",
    "life_record",
  ],
  "decision-pathways": ["decision", "suggestion", "recommendation"],
  "activity-stream": ["activity", "booking", "service"],
};

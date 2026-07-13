import type {
  ConnectorProduct,
  ConnectorType,
} from "./types";

export type ConnectorDefinition = {
  provider: string;
  displayName: string;
  connectorType: ConnectorType;
  product: ConnectorProduct;
  description: string;
  status: "available" | "planned";
};

export const connectorRegistry: ConnectorDefinition[] = [
  {
    provider: "google_calendar",
    displayName: "Google Calendar",
    connectorType: "calendar",
    product: "platform",
    description: "Import and sync personal and shared calendars.",
    status: "planned",
  },
  {
    provider: "microsoft_outlook",
    displayName: "Microsoft Outlook",
    connectorType: "calendar",
    product: "platform",
    description: "Sync Outlook calendars and work events.",
    status: "planned",
  },
  {
    provider: "canvas",
    displayName: "Canvas",
    connectorType: "lms",
    product: "student",
    description: "Import courses, assignments, exams, and due dates.",
    status: "planned",
  },
  {
    provider: "blackboard",
    displayName: "Blackboard",
    connectorType: "lms",
    product: "student",
    description: "Import academic schedules and coursework.",
    status: "planned",
  },
  {
    provider: "brightspace",
    displayName: "Brightspace",
    connectorType: "lms",
    product: "student",
    description: "Import classes and assignment deadlines.",
    status: "planned",
  },
  {
    provider: "slack",
    displayName: "Slack",
    connectorType: "communication",
    product: "teams",
    description: "Create tasks and schedule follow-ups from team messages.",
    status: "planned",
  },
  {
    provider: "microsoft_teams",
    displayName: "Microsoft Teams",
    connectorType: "communication",
    product: "teams",
    description: "Sync meetings and collaboration activity.",
    status: "planned",
  },
  {
    provider: "zoom",
    displayName: "Zoom",
    connectorType: "communication",
    product: "platform",
    description: "Attach meeting links and meeting metadata.",
    status: "planned",
  },
];

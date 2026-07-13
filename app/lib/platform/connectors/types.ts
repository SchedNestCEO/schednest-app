export type ConnectorType =
  | "calendar"
  | "lms"
  | "communication"
  | "storage"
  | "health"
  | "business"
  | "custom";

export type ConnectorProduct =
  | "platform"
  | "student"
  | "teams"
  | "med"
  | "business"
  | "life";

export type ConnectorStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error"
  | "revoked";

export type NormalizedConnectorItem = {
  externalId: string;
  title: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  dueAt?: string;
  status?: string;
  metadata?: Record<string, unknown>;
};

export interface SchedNestConnector {
  provider: string;
  type: ConnectorType;
  product: ConnectorProduct;

  authenticate(): Promise<void>;
  importItems(): Promise<NormalizedConnectorItem[]>;
  exportItem(item: NormalizedConnectorItem): Promise<void>;
  subscribeToChanges(): Promise<void>;
  revokeAccess(): Promise<void>;
}

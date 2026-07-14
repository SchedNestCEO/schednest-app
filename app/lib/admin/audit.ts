export type AdminAuditLog = {
  id: string;
  actor_user_id: string | null;
  actor_role: string | null;
  action_key: string;
  resource_type: string;
  resource_id: string | null;
  summary: string;
  created_at: string;
};

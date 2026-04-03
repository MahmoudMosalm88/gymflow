export type ActorType = "owner" | "staff";
export type AppRole = "owner" | "manager" | "staff" | "trainer";

export type SessionProfile = {
  id: string;
  actorType: ActorType;
  role: AppRole;
  name: string;
  email?: string | null;
  phone?: string | null;
  organizationId: string;
  organizationName?: string | null;
  branchId: string;
  branchName?: string | null;
};

export const SESSION_TOKEN_KEY = "session_token";
export const BRANCH_ID_KEY = "branch_id";
export const SESSION_PROFILE_KEY = "owner_profile";

// The 11 users the flow report runs, in display order. Roles here are what
// the system is expected to say — each test still asserts the role against
// the real /api/auth/me response, so a mismatch fails the run rather than
// quietly mislabeling the report.
//
// Roles (and the user rows themselves) come from the MariaDB seed:
//   user_001–user_020 → qa · user_021+ → member · alice/bob/… → admin
export type Role = "qa" | "admin" | "member";

export interface UserSpec {
  username: string;
  role: Role;
}

export const USERS: UserSpec[] = [
  { username: "user_001", role: "qa" },
  { username: "user_002", role: "qa" },
  { username: "user_003", role: "qa" },
  { username: "user_004", role: "qa" },
  { username: "user_005", role: "qa" },
  { username: "bob", role: "admin" },
  { username: "alice", role: "admin" },
  { username: "user_033", role: "member" },
  { username: "user_044", role: "member" },
  { username: "user_055", role: "member" },
  { username: "user_066", role: "member" },
];

export const ROLE_META: Record<Role, { icon: string; label: string }> = {
  qa: { icon: "🧪", label: "QA" },
  admin: { icon: "👑", label: "Admin" },
  member: { icon: "👤", label: "Member" },
};

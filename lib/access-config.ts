export type AppRole = "admin" | "coach" | "manager" | "player";

export const APP_ROLE_OPTIONS: Array<{ value: AppRole; label: string }> = [
  { value: "admin", label: "Admin" },
  { value: "coach", label: "Coach" },
  { value: "manager", label: "Manager" },
  { value: "player", label: "Player" },
];

export function getDefaultAccessDestination(role: AppRole) {
  return "/";
}

export type AppRole = "admin" | "cajero" | "supervisor";

export type AuthState = {
  user: { id: string; email: string } | null;
  loading: boolean;
  roles: AppRole[];
  fullName: string | null;
};

export function useAuth(): AuthState {
  return {
    user: { id: "local-user-1", email: "admin@local.com" },
    loading: false,
    roles: ["admin"],
    fullName: "Admin Local",
  };
}

export const hasRole = (roles: AppRole[], ...check: AppRole[]) =>
  roles.some((r) => check.includes(r));

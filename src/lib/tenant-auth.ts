import { createSessionToken, getSessionFromCookieHeader } from "@/lib/auth";

export const TENANT_COOKIE_NAME = "tenant_auth_token";

export const createTenantSessionToken = async (tenant: { id: number; name: string; email: string }) => {
  return await createSessionToken({ id: tenant.id, role: "tenant", name: tenant.name, email: tenant.email });
};

export const getTenantSessionFromRequest = async (req: Request) => {
  const cookieHeader = req.headers.get("cookie") || req.headers.get("Cookie") || "";
  const tokenMatch = cookieHeader
    .split(/;\s*/g)
    .find((part) => part.trim().startsWith(`${TENANT_COOKIE_NAME}=`));
  const token = tokenMatch ? tokenMatch.split("=").slice(1).join("=") : "";
  if (!token) return null;
  return await getSessionFromCookieHeader(token);
};

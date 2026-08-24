import {
  authUrl,
  decodeJwt,
  proxy,
  ROLE_COOKIE,
  TOKEN_COOKIE,
} from "@/lib/bff";

export async function POST(request: Request) {
  const res = await proxy(request, authUrl("/auth/login"));
  const body = await res.text();

  if (!res.ok) {
    return new Response(body, { status: res.status, headers: res.headers });
  }

  let token: string | undefined;
  let expiresAt: string | undefined;
  try {
    const data = JSON.parse(body);
    token = data.token;
    expiresAt = data.expires_at;
  } catch {}

  const headers = new Headers(res.headers);
  if (token) {
    const expires = expiresAt ? Date.parse(expiresAt) : NaN;
    const maxAge = Number.isNaN(expires)
      ? null
      : Math.max(0, Math.floor((expires - Date.now()) / 1000));

    const cookie = (name: string, value: string) => {
      const parts = [
        `${name}=${value}`,
        "Path=/",
        "HttpOnly",
        "Secure",
        "SameSite=Lax",
      ];
      if (maxAge !== null) parts.push(`Max-Age=${maxAge}`);
      return parts.join("; ");
    };

    headers.append("Set-Cookie", cookie(TOKEN_COOKIE, token));

    const role = decodeJwt(token)?.rol;
    if (typeof role === "string" && role) {
      headers.append("Set-Cookie", cookie(ROLE_COOKIE, role));
    }
  }

  return new Response(body, { status: res.status, headers });
}

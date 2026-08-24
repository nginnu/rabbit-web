import { ROLE_COOKIE, TOKEN_COOKIE } from "@/lib/bff";

export async function POST() {
  const headers = new Headers();
  for (const name of [TOKEN_COOKIE, ROLE_COOKIE]) {
    headers.append(
      "Set-Cookie",
      `${name}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`
    );
  }
  return new Response(null, { status: 204, headers });
}

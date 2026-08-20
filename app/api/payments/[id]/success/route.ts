import { orderUrl, proxy } from "@/lib/bff";

export const dynamic = "force-dynamic";

// params is a Promise from Next 15 on. Typed as a plain object it compiles
// under 14 and fails the 15 build with "not a valid type for the function's
// second argument" — the route is never reached because the build stops.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxy(request, orderUrl(`/payments/${id}/success`));
}

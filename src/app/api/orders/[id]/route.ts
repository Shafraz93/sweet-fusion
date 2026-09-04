import { prisma } from "@/lib/prisma";
import { apiError, apiFailure, rejectUnauthorized } from "@/lib/api/http";
import { toOrderDetail } from "@/lib/api/dto";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  ctx: RouteContext<"/api/orders/[id]">
) {
  const unauthorized = await rejectUnauthorized(request);
  if (unauthorized) return unauthorized;

  try {
    const { id } = await ctx.params;
    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
    });

    if (!order) return apiError("Order not found", 404);

    return Response.json({ order: toOrderDetail(order) });
  } catch (error) {
    return apiFailure(error);
  }
}

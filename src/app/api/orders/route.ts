import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSalesOrder } from "@/lib/actions/orders";
import { UnitOfMeasure } from "@/generated/prisma";
import { apiError, apiFailure, rejectUnauthorized } from "@/lib/api/http";
import { toOrderListItem } from "@/lib/api/dto";

export const dynamic = "force-dynamic";

const MAX_LIMIT = 100;

const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.enum(UnitOfMeasure),
  unitPrice: z.number().min(0),
  packaging: z
    .array(
      z.object({
        packagingMaterialId: z.string().min(1),
        quantityUsed: z.number().positive(),
        unit: z.enum(UnitOfMeasure),
      })
    )
    .optional(),
});

const createOrderSchema = z.object({
  customerId: z.string().min(1),
  orderDate: z.string().min(1),
  discount: z.number().min(0).optional(),
  paidAmount: z.number().min(0).optional(),
  notes: z.string().optional(),
  items: z.array(orderItemSchema).min(1),
});

export async function GET(request: Request) {
  const unauthorized = await rejectUnauthorized(request);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("q")?.trim();
    const limit = Math.min(
      Math.max(Number(searchParams.get("limit")) || 50, 1),
      MAX_LIMIT
    );
    const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);

    const where = search
      ? {
          OR: [
            { orderNumber: { contains: search, mode: "insensitive" as const } },
            {
              customer: {
                name: { contains: search, mode: "insensitive" as const },
              },
            },
          ],
        }
      : {};

    const [orders, total] = await Promise.all([
      prisma.salesOrder.findMany({
        where,
        include: { customer: true, items: true },
        orderBy: { orderDate: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.salesOrder.count({ where }),
    ]);

    return Response.json({
      orders: orders.map(toOrderListItem),
      total,
      limit,
      offset,
    });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  const unauthorized = await rejectUnauthorized(request);
  if (unauthorized) return unauthorized;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid order", details: z.treeifyError(parsed.error) },
      { status: 422 }
    );
  }

  try {
    const created = await createSalesOrder(parsed.data);
    const order = await prisma.salesOrder.findUniqueOrThrow({
      where: { id: created.id },
      include: { customer: true, items: true },
    });
    return Response.json({ order: toOrderListItem(order) }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}

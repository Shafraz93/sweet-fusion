import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { CustomerType } from "@/generated/prisma";
import { createCustomer, getCustomers } from "@/lib/actions/customers";
import { apiError, apiFailure, rejectUnauthorized } from "@/lib/api/http";
import { toCustomer } from "@/lib/api/dto";

export const dynamic = "force-dynamic";

const createCustomerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  address: z.string().optional(),
  type: z.enum(CustomerType).default(CustomerType.RETAIL),
  notes: z.string().optional(),
});

export async function GET(request: Request) {
  const unauthorized = await rejectUnauthorized(request);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("q")?.trim() || undefined;
    const customers = await getCustomers(search);
    return Response.json({ customers: customers.map(toCustomer) });
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

  const parsed = createCustomerSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid customer", details: z.treeifyError(parsed.error) },
      { status: 422 }
    );
  }

  try {
    const created = await createCustomer(parsed.data);
    const customer = await prisma.customer.findUniqueOrThrow({
      where: { id: created.id },
      include: { _count: { select: { salesOrders: true } } },
    });
    return Response.json({ customer: toCustomer(customer) }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}

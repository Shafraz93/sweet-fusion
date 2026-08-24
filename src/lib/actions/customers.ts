"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CustomerType } from "@/generated/prisma";
import { toNumber } from "@/lib/utils";

export async function getCustomers(search?: string, type?: CustomerType) {
  return prisma.customer.findMany({
    where: {
      AND: [
        search ? { name: { contains: search, mode: "insensitive" } } : {},
        type ? { type } : {},
      ],
    },
    include: {
      _count: { select: { salesOrders: true, wholesaleSupplies: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getCustomer(id: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      salesOrders: {
        orderBy: { orderDate: "desc" },
        include: { items: { include: { product: true } } },
      },
      wholesaleSupplies: {
        orderBy: { supplyDate: "desc" },
        include: { items: { include: { product: true } } },
      },
      payments: { orderBy: { paymentDate: "desc" } },
    },
  });
  if (!customer) return null;

  const orderTotal = customer.salesOrders.reduce(
    (s, o) => s + toNumber(o.totalAmount),
    0
  );
  const wholesaleTotal = customer.wholesaleSupplies.reduce(
    (s, w) => s + toNumber(w.totalAmount),
    0
  );
  const orderPaid = customer.salesOrders.reduce(
    (s, o) => s + toNumber(o.paidAmount),
    0
  );
  const wholesalePaid = customer.wholesaleSupplies.reduce(
    (s, w) => s + toNumber(w.paidAmount),
    0
  );

  return {
    ...customer,
    totalPurchases: orderTotal + wholesaleTotal,
    outstandingBalance: orderTotal + wholesaleTotal - orderPaid - wholesalePaid,
  };
}

export async function createCustomer(data: {
  name: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  type: CustomerType;
  notes?: string;
}) {
  const customer = await prisma.customer.create({ data });
  revalidatePath("/customers");
  return customer;
}

export async function updateCustomer(
  id: string,
  data: Partial<{
    name: string;
    phone: string;
    whatsapp: string;
    address: string;
    type: CustomerType;
    notes: string;
  }>
) {
  const customer = await prisma.customer.update({ where: { id }, data });
  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  return customer;
}

export async function deleteCustomer(id: string) {
  await prisma.customer.delete({ where: { id } });
  revalidatePath("/customers");
}

export async function updateCustomerFromForm(data: Record<string, string>) {
  const id = data.id;
  if (!id) throw new Error("Missing customer id");
  await updateCustomer(id, {
    name: data.name,
    phone: data.phone || undefined,
    whatsapp: data.whatsapp || undefined,
    address: data.address || undefined,
    type: data.type as CustomerType,
    notes: data.notes || undefined,
  });
}

export async function createCustomerFromForm(data: Record<string, string>) {
  await createCustomer({
    name: data.name,
    phone: data.phone || undefined,
    whatsapp: data.whatsapp || undefined,
    address: data.address || undefined,
    type: data.type as CustomerType,
    notes: data.notes || undefined,
  });
}

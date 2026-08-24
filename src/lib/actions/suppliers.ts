"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

export async function getSuppliers(search?: string) {
  return prisma.supplier.findMany({
    where: search
      ? { name: { contains: search, mode: "insensitive" } }
      : undefined,
    include: {
      purchases: { orderBy: { purchaseDate: "desc" }, take: 5 },
      _count: { select: { purchases: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getSupplier(id: string) {
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      purchases: {
        orderBy: { purchaseDate: "desc" },
        include: { items: { include: { product: true, rawMaterial: true, packagingMaterial: true } } },
      },
      payments: { orderBy: { paymentDate: "desc" } },
    },
  });
  if (!supplier) return null;

  const totalPurchased = supplier.purchases.reduce(
    (sum, p) => sum + toNumber(p.totalAmount),
    0
  );
  const totalPaid = supplier.purchases.reduce(
    (sum, p) => sum + toNumber(p.paidAmount),
    0
  );

  return {
    ...supplier,
    totalPurchased,
    outstandingBalance: totalPurchased - totalPaid,
  };
}

export async function createSupplier(data: {
  name: string;
  contactPerson?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  notes?: string;
}) {
  const supplier = await prisma.supplier.create({ data });
  revalidatePath("/suppliers");
  return supplier;
}

export async function updateSupplier(
  id: string,
  data: Partial<{
    name: string;
    contactPerson: string;
    phone: string;
    whatsapp: string;
    address: string;
    notes: string;
  }>
) {
  const supplier = await prisma.supplier.update({ where: { id }, data });
  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${id}`);
  return supplier;
}

export async function deleteSupplier(id: string) {
  await prisma.supplier.delete({ where: { id } });
  revalidatePath("/suppliers");
}

export async function updateSupplierFromForm(data: Record<string, string>) {
  const id = data.id;
  if (!id) throw new Error("Missing supplier id");
  await updateSupplier(id, {
    name: data.name,
    contactPerson: data.contactPerson || undefined,
    phone: data.phone || undefined,
    whatsapp: data.whatsapp || undefined,
    address: data.address || undefined,
    notes: data.notes || undefined,
  });
}

export async function createSupplierFromForm(data: Record<string, string>) {
  await createSupplier({
    name: data.name,
    contactPerson: data.contactPerson || undefined,
    phone: data.phone || undefined,
    whatsapp: data.whatsapp || undefined,
    address: data.address || undefined,
    notes: data.notes || undefined,
  });
}

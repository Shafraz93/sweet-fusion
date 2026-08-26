"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ExpenseCategory, PaymentEntityType } from "@/generated/prisma";
import { toNumber, generateNumber } from "@/lib/utils";

export async function getPayments() {
  return prisma.payment.findMany({
    include: { supplier: true, customer: true },
    orderBy: { paymentDate: "desc" },
  });
}

export async function createPayment(data: {
  entityType: PaymentEntityType;
  supplierId?: string;
  customerId?: string;
  amount: number;
  paymentDate: string;
  notes?: string;
}) {
  const count = await prisma.payment.count();
  const payment = await prisma.payment.create({
    data: {
      paymentNumber: await generateNumber("PAY", count),
      ...data,
      paymentDate: new Date(data.paymentDate),
    },
  });
  revalidatePath("/payments");
  return payment;
}

export async function getOutstandingBalances() {
  const [suppliers, customers] = await Promise.all([
    prisma.supplier.findMany({ include: { purchases: true } }),
    prisma.customer.findMany({
      include: { salesOrders: true },
    }),
  ]);

  const supplierBalances = suppliers.map((s) => {
    const total = s.purchases.reduce((acc, p) => acc + toNumber(p.totalAmount), 0);
    const paid = s.purchases.reduce((acc, p) => acc + toNumber(p.paidAmount), 0);
    return { id: s.id, name: s.name, type: "SUPPLIER" as const, total, paid, balance: total - paid };
  }).filter((s) => s.balance > 0);

  const customerBalances = customers.map((c) => {
    const orderTotal = c.salesOrders.reduce((acc, o) => acc + toNumber(o.totalAmount), 0);
    const orderPaid = c.salesOrders.reduce((acc, o) => acc + toNumber(o.paidAmount), 0);
    return { id: c.id, name: c.name, type: "CUSTOMER" as const, total: orderTotal, paid: orderPaid, balance: orderTotal - orderPaid };
  }).filter((c) => c.balance > 0);

  return { supplierBalances, customerBalances };
}

export async function getExpenses(category?: ExpenseCategory) {
  return prisma.expense.findMany({
    where: category ? { category } : undefined,
    include: { product: true, productionBatch: true },
    orderBy: { expenseDate: "desc" },
  });
}

export async function createExpense(data: {
  expenseDate: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  productId?: string;
  productionBatchId?: string;
  includeInProductionCost?: boolean;
}) {
  const expense = await prisma.expense.create({
    data: {
      ...data,
      expenseDate: new Date(data.expenseDate),
    },
  });

  if (data.includeInProductionCost && data.productionBatchId) {
    const batch = await prisma.productionBatch.findUniqueOrThrow({
      where: { id: data.productionBatchId },
    });
    const newOtherCost = toNumber(batch.otherCost) + data.amount;
    const newTotal = toNumber(batch.ingredientCost) + toNumber(batch.labourCost) + newOtherCost;
    const costPerUnit =
      toNumber(batch.outputQuantity) > 0
        ? newTotal / toNumber(batch.outputQuantity)
        : 0;

    await prisma.productionBatch.update({
      where: { id: data.productionBatchId },
      data: { otherCost: newOtherCost, totalCost: newTotal, costPerUnit },
    });
  }

  revalidatePath("/expenses");
  revalidatePath("/");
  return expense;
}

export async function deleteExpense(id: string) {
  await prisma.expense.delete({ where: { id } });
  revalidatePath("/expenses");
}

export async function getAdvertisingExpenses() {
  return prisma.expense.findMany({
    where: {
      category: {
        in: [
          "ADVERTISING",
          "FACEBOOK_ADS",
          "INSTAGRAM_ADS",
          "WHATSAPP_PROMO",
          "PRINTING",
          "MARKETING",
        ],
      },
    },
    orderBy: { expenseDate: "desc" },
  });
}

export async function getExpense(id: string) {
  return prisma.expense.findUnique({
    where: { id },
    include: { product: true, productionBatch: true },
  });
}

export async function updateExpense(
  id: string,
  data: {
    expenseDate?: string;
    category?: ExpenseCategory;
    amount?: number;
    description?: string;
    productId?: string | null;
    productionBatchId?: string | null;
    includeInProductionCost?: boolean;
  }
) {
  const expense = await prisma.expense.update({
    where: { id },
    data: {
      ...data,
      expenseDate: data.expenseDate ? new Date(data.expenseDate) : undefined,
      productId: data.productId === null ? null : data.productId,
      productionBatchId:
        data.productionBatchId === null ? null : data.productionBatchId,
    },
  });
  revalidatePath("/expenses");
  revalidatePath(`/expenses/${id}/edit`);
  revalidatePath("/");
  return expense;
}

export async function updateExpenseFromForm(data: Record<string, string>) {
  const id = data.id;
  if (!id) throw new Error("Missing expense id");
  await updateExpense(id, {
    expenseDate: data.expenseDate,
    category: data.category as ExpenseCategory,
    amount: parseFloat(data.amount) || 0,
    description: data.description,
    productId: data.productId || null,
    productionBatchId: data.productionBatchId || null,
    includeInProductionCost: data.includeInProductionCost === "true",
  });
}

export async function getPayment(id: string) {
  return prisma.payment.findUnique({
    where: { id },
    include: { supplier: true, customer: true },
  });
}

export async function updatePayment(
  id: string,
  data: {
    amount?: number;
    paymentDate?: string;
    notes?: string;
  }
) {
  const payment = await prisma.payment.update({
    where: { id },
    data: {
      ...data,
      paymentDate: data.paymentDate ? new Date(data.paymentDate) : undefined,
    },
  });
  revalidatePath("/payments");
  return payment;
}

export async function updatePaymentFromForm(data: Record<string, string>) {
  const id = data.id;
  if (!id) throw new Error("Missing payment id");
  await updatePayment(id, {
    amount: parseFloat(data.amount) || 0,
    paymentDate: data.paymentDate,
    notes: data.notes || undefined,
  });
}

export async function createExpenseFromForm(data: Record<string, string>) {
  await createExpense({
    expenseDate: data.expenseDate,
    category: data.category as ExpenseCategory,
    amount: parseFloat(data.amount) || 0,
    description: data.description,
    productId: data.productId || undefined,
    productionBatchId: data.productionBatchId || undefined,
    includeInProductionCost: data.includeInProductionCost === "true",
  });
}

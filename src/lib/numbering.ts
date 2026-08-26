import { prisma } from "@/lib/prisma";
import { nextSequentialNumber } from "@/lib/utils";

export async function getNextLotNumber(): Promise<string> {
  const latest = await prisma.productLot.findFirst({
    orderBy: { lotNumber: "desc" },
    select: { lotNumber: true },
  });
  return nextSequentialNumber("LOT", latest?.lotNumber);
}

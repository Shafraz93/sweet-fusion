import { prisma } from "@/lib/prisma";
import { apiFailure, rejectUnauthorized } from "@/lib/api/http";
import { toProduct } from "@/lib/api/dto";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = await rejectUnauthorized(request);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("q")?.trim();

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        ...(search
          ? { name: { contains: search, mode: "insensitive" as const } }
          : {}),
      },
      include: { category: true },
      orderBy: { name: "asc" },
    });

    return Response.json({ products: products.map(toProduct) });
  } catch (error) {
    return apiFailure(error);
  }
}

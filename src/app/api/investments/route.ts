import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { yahooFinanceProvider } from "@/lib/stock/yahoo-finance";

const FIFTEEN_MINUTES = 15 * 60 * 1000;

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value);
  if (value && typeof value === "object" && "toNumber" in value && typeof (value as { toNumber: () => number }).toNumber === "function") {
    return (value as { toNumber: () => number }).toNumber();
  }
  return 0;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const holdings = await prisma.investmentHolding.findMany({
    where: { userId: session.user.id },
    include: { account: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const enriched = await Promise.all(
    holdings.map(async (holding) => {
      let livePrice: number;
      const lastPriceAt = holding.lastPriceAt;
      const lastPrice = holding.lastPrice ? toNumber(holding.lastPrice) : null;

      if (
        lastPrice !== null &&
        lastPriceAt &&
        new Date().getTime() - new Date(lastPriceAt).getTime() < FIFTEEN_MINUTES
      ) {
        livePrice = lastPrice;
      } else {
        const quote = await yahooFinanceProvider.getQuote(holding.symbol);
        livePrice = quote?.price ?? lastPrice ?? 0;

        if (quote && quote.price > 0) {
          await prisma.investmentHolding.update({
            where: { id: holding.id },
            data: {
              lastPrice: livePrice,
              lastPriceAt: new Date(),
            },
          });
        }
      }

      const quantity = toNumber(holding.quantity);
      const avgCost = toNumber(holding.avgCost);
      const marketValue = quantity * livePrice;
      const costBasis = quantity * avgCost;
      const unrealizedGain = marketValue - costBasis;
      const unrealizedGainPercent = costBasis > 0 ? (unrealizedGain / costBasis) * 100 : 0;

      return {
        ...holding,
        quantity,
        avgCost,
        livePrice,
        marketValue,
        unrealizedGain,
        unrealizedGainPercent,
        lastPrice: livePrice,
      };
    })
  );

  const totalMarketValue = enriched.reduce((sum, h) => sum + h.marketValue, 0);
  const totalCostBasis = enriched.reduce((sum, h) => sum + h.quantity * h.avgCost, 0);
  const totalUnrealizedGain = totalMarketValue - totalCostBasis;
  const totalUnrealizedGainPercent = totalCostBasis > 0 ? (totalUnrealizedGain / totalCostBasis) * 100 : 0;

  return NextResponse.json({
    holdings: enriched,
    summary: {
      totalMarketValue,
      totalCostBasis,
      totalUnrealizedGain,
      totalUnrealizedGainPercent,
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { symbol, quantity, avgCost, accountId } = body;

  if (!symbol || typeof quantity !== "number" || typeof avgCost !== "number" || !accountId) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const account = await prisma.account.findFirst({
    where: { id: accountId, userId: session.user.id },
  });

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const holding = await prisma.investmentHolding.create({
    data: {
      symbol: symbol.toUpperCase().trim(),
      quantity,
      avgCost,
      accountId,
      userId: session.user.id,
    },
  });

  return NextResponse.json(holding, { status: 201 });
}

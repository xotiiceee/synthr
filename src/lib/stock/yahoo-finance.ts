import YahooFinance from "yahoo-finance2";
import { StockProvider, StockQuote } from "./provider";

const yahooFinance = new YahooFinance();

export class YahooFinanceProvider implements StockProvider {
  async getQuote(symbol: string): Promise<StockQuote | null> {
    try {
      const result = await yahooFinance.quote(symbol);
      if (!result || Array.isArray(result)) return null;
      const quote = result as {
        regularMarketPrice?: number;
        regularMarketChange?: number;
        regularMarketChangePercent?: number;
      };
      return {
        price: Number(quote.regularMarketPrice ?? 0),
        change: quote.regularMarketChange
          ? Number(quote.regularMarketChange)
          : undefined,
        changePercent: quote.regularMarketChangePercent
          ? Number(quote.regularMarketChangePercent)
          : undefined,
      };
    } catch {
      return null;
    }
  }
}

export const yahooFinanceProvider = new YahooFinanceProvider();

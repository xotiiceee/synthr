export interface StockQuote {
  price: number;
  change?: number;
  changePercent?: number;
}

export interface StockProvider {
  getQuote(symbol: string): Promise<StockQuote | null>;
}

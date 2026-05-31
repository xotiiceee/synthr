import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function generateBudgetPlan(financialData: {
  monthlyIncome: number;
  monthlyExpenses: number;
  recurringBills: { name: string; amount: number }[];
  categoryBreakdown: { name: string; total: number }[];
  debts: { name: string; balance: number; apr: number; minimumPayment: number }[];
  goals: { name: string; targetAmount: number; currentAmount: number }[];
  last30Days: { description: string; amount: number; category: string; date: string }[];
}) {
  if (!process.env.GEMINI_API_KEY) return null;

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `You are a financial advisor. Analyze this user's finances and create a personalized budget plan.

DATA:
- Monthly income: $${financialData.monthlyIncome}
- Monthly expenses: $${financialData.monthlyExpenses}
- Recurring bills: ${JSON.stringify(financialData.recurringBills)}
- Spending by category: ${JSON.stringify(financialData.categoryBreakdown)}
- Debts: ${JSON.stringify(financialData.debts)}
- Savings goals: ${JSON.stringify(financialData.goals)}

Return ONLY a JSON object with this exact structure (no markdown, no explanation):
{
  "safeToSpend": number,
  "recommendedSavings": number,
  "billTotal": number,
  "insights": ["string insight 1", "string insight 2", "string insight 3"],
  "warnings": ["string warning" or null],
  "suggestions": ["string suggestion 1", "string suggestion 2"],
  "budgetBreakdown": {
    "needs": number,
    "wants": number,
    "savings": number,
    "debtPayoff": number
  }
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return JSON.parse(text);
}

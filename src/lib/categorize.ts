// Smart auto-categorization for CSV imports
// Matches transaction descriptions to categories based on keywords

const merchantMap: Record<string, string[]> = {
  "Groceries": ["walmart", "kroger", "safeway", "publix", "aldi", "trader joe", "whole foods", "costco", "sams club", "target grocery", "meijer", "heb", "foodlion", "wegmans"],
  "Dining Out": ["mcdonalds", "starbucks", "chipotle", "doordash", "grubhub", "ubereats", "wendys", "tacobell", "burger king", "chick fil", "panera", "dominos", "pizza hut", "olive garden", "subway", "dunkin", "restaurant", "cafe", "diner", "sushi"],
  "Transportation": ["shell", "exxon", "bp ", "chevron", "mobile gas", "sunoco", "uber", "lyft", "amtrak", "metro", "parking", "toll", "gas", "fuel", "bus", "train", "transit"],
  "Shopping": ["amazon", "best buy", "home depot", "lowes", "ikea", "apple.com", "walmart.com", "etsy", "ebay", "nike", "adidas", "clothing", "macy", "nordstrom"],
  "Subscriptions": ["netflix", "spotify", "hulu", "disney+", "hbo max", "prime video", "youtube premium", "apple.com/bill", "patreon", "onlyfans", "subscription", "membership"],
  "Utilities": ["electric", "power", "water", "gas bill", "internet", "comcast", "xfinity", "verizon", "at&t", "t-mobile", "spectrum", "sewage", "utility"],
  "Healthcare": ["cvs", "walgreens", "doctor", "hospital", "clinic", "pharmacy", "dentist", "optometrist", "therapy", "insurance", "medical"],
  "Entertainment": ["amc", "regal", "cinema", "ticketmaster", "stubhub", "concerts", "bowling", "arcade", "gaming", "steam", "playstation", "xbox"],
  "Housing": ["rent", "mortgage", "hoa", "property tax", "maintenance", "plumber", "electrician", "apartment", "landlord"],
};

export function detectCategory(description: string): string | null {
  if (!description) return null;
  const desc = description.toLowerCase().trim();
  for (const [category, keywords] of Object.entries(merchantMap)) {
    if (keywords.some((kw) => desc.includes(kw))) {
      return category;
    }
  }
  return null;
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    "Groceries": "#22c55e",
    "Dining Out": "#f59e0b",
    "Transportation": "#3b82f6",
    "Shopping": "#a855f7",
    "Subscriptions": "#ec4899",
    "Utilities": "#ef4444",
    "Healthcare": "#14b8a6",
    "Entertainment": "#8b5cf6",
    "Housing": "#f97316",
  };
  return colors[category] || "#00d4aa";
}

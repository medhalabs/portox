export type TradeTemplate = {
  id: string;
  name: string;
  symbol: string;
  side: "BUY" | "SELL";
  quantity?: number;
  price?: number;
  fees?: number;
  createdAt: string;
};

const TEMPLATES_KEY = "portik_trade_templates";

export function getTemplates(): TradeTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(TEMPLATES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveTemplate(template: Omit<TradeTemplate, "id" | "createdAt">): TradeTemplate {
  const templates = getTemplates();
  const newTemplate: TradeTemplate = {
    ...template,
    id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
  };
  templates.push(newTemplate);
  window.localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  return newTemplate;
}

export function deleteTemplate(id: string): void {
  const templates = getTemplates();
  const filtered = templates.filter((t) => t.id !== id);
  window.localStorage.setItem(TEMPLATES_KEY, JSON.stringify(filtered));
}

export function applyTemplate(template: TradeTemplate): {
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  fees: number;
} {
  return {
    symbol: template.symbol,
    side: template.side,
    quantity: template.quantity ?? 1,
    price: template.price ?? 0,
    fees: template.fees ?? 0,
  };
}


export type Currency = "INR" | "USD" | "EUR" | "GBP" | "JPY";
export type MarketType = "indian_stocks" | "other_countries" | "forex" | "crypto";

export interface UserSettings {
  currency: Currency;
  marketType: MarketType;
  shortTermTaxRate: number; // Tax rate as percentage (e.g., 15 for 15%)
  longTermTaxRate: number; // Tax rate as percentage (e.g., 10 for 10%)
}

const SETTINGS_KEY = "portik_settings";
const DEFAULT_SETTINGS: UserSettings = {
  currency: "INR",
  marketType: "indian_stocks",
  shortTermTaxRate: 15, // Default 15% for short-term (common in India)
  longTermTaxRate: 10, // Default 10% for long-term (common in India)
};

export function getSettings(): UserSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  
  try {
    const stored = window.localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.error("Failed to parse settings:", e);
  }
  
  return DEFAULT_SETTINGS;
}

export function setSettings(settings: Partial<UserSettings>) {
  if (typeof window === "undefined") return;
  
  try {
    const current = getSettings();
    const updated = { ...current, ...settings };
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    // Dispatch event for other components to listen to
    window.dispatchEvent(new CustomEvent("settingsChanged", { detail: updated }));
  } catch (e) {
    console.error("Failed to save settings:", e);
  }
}

export function getCurrencySymbol(currency: Currency): string {
  const symbols: Record<Currency, string> = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
  };
  return symbols[currency];
}

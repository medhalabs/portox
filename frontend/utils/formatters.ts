import { getCurrencySymbol, getSettings } from "@/lib/settings";

export function formatCurrency(value: number) {
  const settings = getSettings();
  const currencySymbol = getCurrencySymbol(settings.currency);
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  
  // Format based on currency (some currencies don't use decimals traditionally)
  let formattedValue: string;
  if (settings.currency === "JPY") {
    formattedValue = abs.toFixed(0);
  } else {
    formattedValue = abs.toFixed(2);
  }
  
  return `${sign}${currencySymbol}${formattedValue}`;
}

export function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

export function formatDateTime(value: string) {
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleString();
}



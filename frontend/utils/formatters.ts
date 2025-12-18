export function formatCurrency(value: number) {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  return `${sign}₹${abs.toFixed(2)}`;
}

export function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

export function formatDateTime(value: string) {
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleString();
}



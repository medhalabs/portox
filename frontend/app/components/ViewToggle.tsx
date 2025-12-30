"use client";

type ViewType = "trades" | "mutual_funds";

export function ViewToggle({
  value,
  onChange,
}: {
  value: ViewType;
  onChange: (value: ViewType) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange("trades")}
        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors touch-manipulation ${
          value === "trades"
            ? "bg-brand-400/20 text-brand-300 border border-brand-400/30"
            : "bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800"
        }`}
      >
        Trades
      </button>
      <button
        type="button"
        onClick={() => onChange("mutual_funds")}
        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors touch-manipulation ${
          value === "mutual_funds"
            ? "bg-brand-400/20 text-brand-300 border border-brand-400/30"
            : "bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800"
        }`}
      >
        Mutual Funds
      </button>
    </div>
  );
}


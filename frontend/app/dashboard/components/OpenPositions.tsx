"use client";

import type { OpenPosition } from "@/types/portfolio";
import { formatCurrency } from "@/utils/formatters";

export function OpenPositions({ positions }: { positions: OpenPosition[] }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4 sm:p-5">
      <div className="text-sm font-semibold">Open Positions</div>
      {positions.length === 0 ? (
        <div className="mt-4 py-3 text-slate-400 text-sm">No open positions.</div>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="mt-4 space-y-3 md:hidden">
            {positions.map((p) => (
              <div key={`${p.symbol}-${p.side}`} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-base">{p.symbol}</div>
                  <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-medium">
                    {p.side}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-slate-400">Quantity</div>
                    <div className="font-medium mt-0.5">{p.quantity}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Avg Cost</div>
                    <div className="font-medium mt-0.5">{p.avg_cost.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Mark</div>
                    <div className="font-medium mt-0.5">{p.mark_price.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Unrealized</div>
                    <div className={`font-medium mt-0.5 ${p.unrealized_pnl >= 0 ? "text-emerald-200" : "text-rose-200"}`}>
                      {formatCurrency(p.unrealized_pnl)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table view */}
          <div className="mt-4 overflow-x-auto hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-400">
                <tr>
                  <th className="py-2">Symbol</th>
                  <th className="py-2">Side</th>
                  <th className="py-2">Qty</th>
                  <th className="py-2">Avg cost</th>
                  <th className="py-2">Mark</th>
                  <th className="py-2">Unrealized</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => (
                  <tr key={`${p.symbol}-${p.side}`} className="border-t border-slate-800">
                    <td className="py-2 font-medium">{p.symbol}</td>
                    <td className="py-2">{p.side}</td>
                    <td className="py-2">{p.quantity}</td>
                    <td className="py-2">{p.avg_cost.toFixed(2)}</td>
                    <td className="py-2">{p.mark_price.toFixed(2)}</td>
                    <td className={`py-2 ${p.unrealized_pnl >= 0 ? "text-emerald-200" : "text-rose-200"}`}>
                      {formatCurrency(p.unrealized_pnl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}



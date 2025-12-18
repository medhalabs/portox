"use client";

import type { OpenPosition } from "@/types/portfolio";
import { formatCurrency } from "@/utils/formatters";

export function OpenPositions({ positions }: { positions: OpenPosition[] }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
      <div className="text-sm font-semibold">Open Positions</div>
      <div className="mt-4 overflow-x-auto">
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
            {positions.length === 0 ? (
              <tr>
                <td className="py-3 text-slate-400" colSpan={6}>
                  No open positions.
                </td>
              </tr>
            ) : (
              positions.map((p) => (
                <tr key={`${p.symbol}-${p.side}`} className="border-t border-slate-800">
                  <td className="py-2 font-medium">{p.symbol}</td>
                  <td className="py-2">{p.side}</td>
                  <td className="py-2">{p.quantity}</td>
                  <td className="py-2">{p.avg_cost.toFixed(2)}</td>
                  <td className="py-2">{p.mark_price.toFixed(2)}</td>
                  <td className="py-2">{formatCurrency(p.unrealized_pnl)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}



"use client";

import type { OpenPosition } from "@/types/portfolio";
import { formatCurrency } from "@/utils/formatters";

export function OpenPositions({ positions }: { positions: OpenPosition[] }) {
  const getQty = (p: OpenPosition) => p.quantity || p.qty || 0;
  const getAvgPrice = (p: OpenPosition) => p.avg_cost || p.avg_price || 0;
  const getCurrentPrice = (p: OpenPosition) => p.mark_price || p.current_price || 0;
  const isMutualFund = (p: OpenPosition) => p.type === "mutual_fund" || !p.side;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4 sm:p-5">
      <div className="text-sm font-semibold">Open Positions</div>
      {positions.length === 0 ? (
        <div className="mt-4 py-3 text-slate-400 text-sm">No open positions.</div>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="mt-4 space-y-3 md:hidden">
            {positions.map((p, idx) => {
              const mf = isMutualFund(p);
              const qty = getQty(p);
              const avgPrice = getAvgPrice(p);
              const currentPrice = getCurrentPrice(p);
              return (
                <div key={mf ? `${p.symbol}-mf-${idx}` : `${p.symbol}-${p.side}`} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-base">{p.name || p.symbol}</div>
                      {mf && <div className="text-xs text-slate-400 mt-0.5">{p.symbol}</div>}
                    </div>
                    {p.side && (
                      <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-medium">
                        {p.side}
                      </span>
                    )}
                    {mf && (
                      <span className="rounded-full border border-blue-700 bg-blue-900/30 px-3 py-1 text-xs font-medium text-blue-200">
                        MF
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-slate-400">{mf ? "Units" : "Quantity"}</div>
                      <div className="font-medium mt-0.5">{qty.toFixed(4)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">{mf ? "Avg NAV" : "Avg Cost"}</div>
                      <div className="font-medium mt-0.5">{formatCurrency(avgPrice)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">{mf ? "Current NAV" : "Mark"}</div>
                      <div className="font-medium mt-0.5">{formatCurrency(currentPrice)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Unrealized</div>
                      <div className={`font-medium mt-0.5 ${p.unrealized_pnl >= 0 ? "text-emerald-200" : "text-rose-200"}`}>
                        {formatCurrency(p.unrealized_pnl)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table view */}
          <div className="mt-4 overflow-x-auto hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-400">
                <tr>
                  <th className="py-2">Symbol</th>
                  <th className="py-2">Name</th>
                  <th className="py-2">Side</th>
                  <th className="py-2">Qty</th>
                  <th className="py-2">Avg Price</th>
                  <th className="py-2">Current Price</th>
                  <th className="py-2">Unrealized</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p, idx) => {
                  const mf = isMutualFund(p);
                  const qty = getQty(p);
                  const avgPrice = getAvgPrice(p);
                  const currentPrice = getCurrentPrice(p);
                  return (
                    <tr key={mf ? `${p.symbol}-mf-${idx}` : `${p.symbol}-${p.side}`} className="border-t border-slate-800">
                      <td className="py-2 font-medium">{p.symbol}</td>
                      <td className="py-2 text-slate-300">{p.name || "—"}</td>
                      <td className="py-2">
                        {p.side ? (
                          <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-xs">
                            {p.side}
                          </span>
                        ) : (
                          <span className="rounded-full border border-blue-700 bg-blue-900/30 px-2 py-0.5 text-xs text-blue-200">
                            MF
                          </span>
                        )}
                      </td>
                      <td className="py-2">{qty.toFixed(4)}</td>
                      <td className="py-2">{formatCurrency(avgPrice)}</td>
                      <td className="py-2">{formatCurrency(currentPrice)}</td>
                      <td className={`py-2 ${p.unrealized_pnl >= 0 ? "text-emerald-200" : "text-rose-200"}`}>
                        {formatCurrency(p.unrealized_pnl)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}



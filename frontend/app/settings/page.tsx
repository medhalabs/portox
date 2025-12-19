"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getToken } from "@/lib/auth";
import { getSettings, setSettings, type Currency, type MarketType, type UserSettings } from "@/lib/settings";
import { apiFetch, apiPut } from "@/lib/api";

export default function SettingsPage() {
  const router = useRouter();
  const [currency, setCurrency] = useState<Currency>("INR");
  const [marketType, setMarketType] = useState<MarketType>("indian_stocks");
  const [shortTermTaxRate, setShortTermTaxRate] = useState(15);
  const [longTermTaxRate, setLongTermTaxRate] = useState(10);
  const [saved, setSaved] = useState(false);
  
  // Notification preferences
  const [notifications, setNotifications] = useState({
    daily_summary_enabled: false,
    daily_summary_time: "20:00:00",
    journal_reminder_enabled: false,
    journal_reminder_hours: 24,
    milestone_alerts_enabled: false,
    milestone_thresholds: { total_pnl: [] as number[] },
    position_alerts_enabled: false,
    unrealized_pnl_threshold: 0,
    email_enabled: false,
  });
  const [notificationSaved, setNotificationSaved] = useState(false);

  useEffect(() => {
    if (!getToken()) router.push("/login");
    const settings = getSettings();
    setCurrency(settings.currency);
    setMarketType(settings.marketType);
    setShortTermTaxRate(settings.shortTermTaxRate);
    setLongTermTaxRate(settings.longTermTaxRate);
    
    // Load notification preferences
    apiFetch<any>("/notifications/preferences")
      .then((prefs) => setNotifications(prefs))
      .catch((err) => console.error("Failed to load notification preferences:", err));
  }, [router]);

  function handleSave() {
    setSettings({ currency, marketType, shortTermTaxRate, longTermTaxRate });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }
  
  async function handleSaveNotifications() {
    try {
      await apiPut("/notifications/preferences", notifications);
      setNotificationSaved(true);
      setTimeout(() => setNotificationSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save notification preferences:", err);
      alert("Failed to save notification preferences");
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-slate-400">Manage your preferences and configuration</p>
      </div>

      <div className="space-y-6">
        {/* Currency Selection */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
          <div className="text-sm font-semibold">Currency</div>
          <div className="mt-1 text-xs text-slate-400">Select your preferred currency for displaying values</div>
          <div className="mt-4">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
            >
              <option value="INR">Indian Rupee (₹)</option>
              <option value="USD">US Dollar ($)</option>
              <option value="EUR">Euro (€)</option>
              <option value="GBP">British Pound (£)</option>
              <option value="JPY">Japanese Yen (¥)</option>
            </select>
          </div>
        </div>

        {/* Market Type Selection */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
          <div className="text-sm font-semibold">Market Type</div>
          <div className="mt-1 text-xs text-slate-400">Select the type of trading you primarily do</div>
          <div className="mt-4">
            <select
              value={marketType}
              onChange={(e) => setMarketType(e.target.value as MarketType)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
            >
              <option value="indian_stocks">Indian Stocks</option>
              <option value="other_countries">Other Countries (US, UK, etc.)</option>
              <option value="forex">Forex</option>
              <option value="crypto">Crypto</option>
            </select>
          </div>
          {marketType !== "indian_stocks" && (
            <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-xs text-slate-300">
              <div className="font-medium text-slate-200">Note:</div>
              <div className="mt-1 text-slate-400">
                Broker import is only available for Indian stocks. When using other market types, you'll need to manually add trades.
              </div>
            </div>
          )}
        </div>

        {/* Tax Rates */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
          <div className="text-sm font-semibold">Tax Rates</div>
          <div className="mt-1 text-xs text-slate-400">Set tax percentages for capital gains calculations</div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <div className="text-xs font-medium text-slate-300 mb-1">Short-Term Capital Gains (%)</div>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={shortTermTaxRate}
                onChange={(e) => setShortTermTaxRate(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
              />
            </label>
            <label className="block">
              <div className="text-xs font-medium text-slate-300 mb-1">Long-Term Capital Gains (%)</div>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={longTermTaxRate}
                onChange={(e) => setLongTermTaxRate(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
              />
            </label>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
          <div className="text-sm font-semibold mb-4">Notifications & Reminders</div>
          <div className="space-y-4">
            {/* Email Toggle */}
            <label className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-slate-300">Enable Email Notifications</div>
                <div className="text-xs text-slate-400 mt-0.5">Allow sending emails for notifications</div>
              </div>
              <input
                type="checkbox"
                checked={notifications.email_enabled}
                onChange={(e) => setNotifications({ ...notifications, email_enabled: e.target.checked })}
                className="h-4 w-4 rounded border-slate-700 bg-slate-950"
              />
            </label>
            
            {/* Daily Summary */}
            <div className="border-t border-slate-800 pt-4">
              <label className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs font-medium text-slate-300">Daily Summary Emails</div>
                  <div className="text-xs text-slate-400 mt-0.5">Receive daily portfolio summary</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.daily_summary_enabled}
                  onChange={(e) => setNotifications({ ...notifications, daily_summary_enabled: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950"
                />
              </label>
              {notifications.daily_summary_enabled && (
                <div className="mt-2">
                  <label className="block">
                    <div className="text-xs text-slate-400 mb-1">Time (HH:MM:SS)</div>
                    <input
                      type="time"
                      value={notifications.daily_summary_time.slice(0, 5)}
                      onChange={(e) => setNotifications({ ...notifications, daily_summary_time: `${e.target.value}:00` })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                    />
                  </label>
                </div>
              )}
            </div>
            
            {/* Journal Reminders */}
            <div className="border-t border-slate-800 pt-4">
              <label className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs font-medium text-slate-300">Journal Reminders</div>
                  <div className="text-xs text-slate-400 mt-0.5">Remind to journal trades</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.journal_reminder_enabled}
                  onChange={(e) => setNotifications({ ...notifications, journal_reminder_enabled: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950"
                />
              </label>
              {notifications.journal_reminder_enabled && (
                <div className="mt-2">
                  <label className="block">
                    <div className="text-xs text-slate-400 mb-1">Remind after (hours)</div>
                    <input
                      type="number"
                      min="1"
                      max="168"
                      value={notifications.journal_reminder_hours}
                      onChange={(e) => setNotifications({ ...notifications, journal_reminder_hours: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                    />
                  </label>
                </div>
              )}
            </div>
            
            {/* Milestone Alerts */}
            <div className="border-t border-slate-800 pt-4">
              <label className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs font-medium text-slate-300">Performance Milestone Alerts</div>
                  <div className="text-xs text-slate-400 mt-0.5">Alert when reaching P&L milestones</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.milestone_alerts_enabled}
                  onChange={(e) => setNotifications({ ...notifications, milestone_alerts_enabled: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950"
                />
              </label>
              {notifications.milestone_alerts_enabled && (
                <div className="mt-2">
                  <label className="block">
                    <div className="text-xs text-slate-400 mb-1">Total P&L Thresholds (comma-separated)</div>
                    <input
                      type="text"
                      placeholder="1000, 5000, 10000"
                      value={notifications.milestone_thresholds.total_pnl?.join(", ") || ""}
                      onChange={(e) => {
                        const values = e.target.value.split(",").map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
                        setNotifications({
                          ...notifications,
                          milestone_thresholds: { ...notifications.milestone_thresholds, total_pnl: values }
                        });
                      }}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                    />
                  </label>
                </div>
              )}
            </div>
            
            {/* Position Alerts */}
            <div className="border-t border-slate-800 pt-4">
              <label className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs font-medium text-slate-300">Position Alerts</div>
                  <div className="text-xs text-slate-400 mt-0.5">Alert when unrealized P&L exceeds threshold</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.position_alerts_enabled}
                  onChange={(e) => setNotifications({ ...notifications, position_alerts_enabled: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950"
                />
              </label>
              {notifications.position_alerts_enabled && (
                <div className="mt-2">
                  <label className="block">
                    <div className="text-xs text-slate-400 mb-1">Unrealized P&L Threshold (absolute value)</div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={notifications.unrealized_pnl_threshold}
                      onChange={(e) => setNotifications({ ...notifications, unrealized_pnl_threshold: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                    />
                  </label>
                </div>
              )}
            </div>
            
            <div className="border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={handleSaveNotifications}
                className="rounded-xl bg-brand-400 px-4 py-2 text-sm font-semibold text-black shadow-glow hover:bg-brand-300 transition-colors"
              >
                Save Notification Preferences
              </button>
              {notificationSaved && (
                <span className="ml-3 text-sm text-green-400">Preferences saved!</span>
              )}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleSave}
            className="rounded-xl bg-brand-400 px-6 py-2.5 text-sm font-semibold text-black shadow-glow hover:bg-brand-300 transition-colors"
          >
            Save Settings
          </button>
          {saved && (
            <span className="text-sm text-green-400">Settings saved!</span>
          )}
        </div>
      </div>
    </div>
  );
}

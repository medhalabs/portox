import { getToken } from "@/lib/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export async function downloadFile(url: string, filename: string) {
  const token = getToken();
  const headers: HeadersInit = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${url}`, { headers });
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.statusText}`);
  }

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
}

export async function exportTradesCSV() {
  await downloadFile("/trades/export/csv", `trades_export_${new Date().toISOString().split("T")[0]}.csv`);
}

export async function exportTradesExcel() {
  await downloadFile("/trades/export/excel", `trades_export_${new Date().toISOString().split("T")[0]}.xlsx`);
}

export async function exportJournalCSV() {
  await downloadFile("/journal/export/csv", `journal_export_${new Date().toISOString().split("T")[0]}.csv`);
}

export async function exportAnalyticsCSV() {
  await downloadFile("/analytics/export/csv", `analytics_export_${new Date().toISOString().split("T")[0]}.csv`);
}

export async function exportRealizedMatchesCSV() {
  await downloadFile("/analytics/realized-matches/export/csv", `realized_matches_${new Date().toISOString().split("T")[0]}.csv`);
}

export async function exportPerformancePDF() {
  await downloadFile("/analytics/export/pdf", `performance_report_${new Date().toISOString().split("T")[0]}.pdf`);
}


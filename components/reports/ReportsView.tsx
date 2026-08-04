"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Building2,
  Globe,
  AlertCircle,
  Clock,
  Zap,
  Shield,
  Bell,
  Plus,
  X,
  FileText,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type TabId = "overview" | "scheduled" | "history";
type ExportFormat = "csv" | "pdf";
type DatePreset = "7d" | "30d" | "90d" | "custom";

interface ReportType {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  iconBg: string;
}

const REPORT_TYPES: ReportType[] = [
  {
    id: "overall_uptime",
    title: "Overall Uptime",
    description: "Uptime % for all websites over a date range",
    icon: BarChart3,
    color: "text-blue-400",
    iconBg: "bg-blue-500/10 border-blue-500/20",
  },
  {
    id: "client_uptime",
    title: "Client Uptime",
    description: "Per-client uptime breakdown",
    icon: Building2,
    color: "text-emerald-400",
    iconBg: "bg-emerald-500/10 border-emerald-500/20",
  },
  {
    id: "website_uptime",
    title: "Website Uptime",
    description: "Individual website uptime details",
    icon: Globe,
    color: "text-blue-400",
    iconBg: "bg-blue-500/10 border-blue-500/20",
  },
  {
    id: "incident_history",
    title: "Incident History",
    description: "All incidents with duration and impact",
    icon: AlertCircle,
    color: "text-rose-400",
    iconBg: "bg-rose-500/10 border-rose-500/20",
  },
  {
    id: "downtime_duration",
    title: "Downtime Duration",
    description: "Total downtime per website",
    icon: Clock,
    color: "text-amber-400",
    iconBg: "bg-amber-500/10 border-amber-500/20",
  },
  {
    id: "response_time",
    title: "Response Time",
    description: "Average and P95 response times",
    icon: Zap,
    color: "text-violet-400",
    iconBg: "bg-violet-500/10 border-violet-500/20",
  },
  {
    id: "ssl_expiration",
    title: "SSL Expiration",
    description: "SSL certificates status and expiry",
    icon: Shield,
    color: "text-amber-400",
    iconBg: "bg-amber-500/10 border-amber-500/20",
  },
  {
    id: "alert_delivery",
    title: "Alert Delivery",
    description: "Alert delivery success rates",
    icon: Bell,
    color: "text-zinc-400",
    iconBg: "bg-zinc-800 border-zinc-700",
  },
];

interface ExportHistoryItem {
  id: string;
  name: string;
  type: string;
  format: ExportFormat;
  generatedAt: string;
  size: string;
}

const INITIAL_EXPORT_HISTORY: ExportHistoryItem[] = [
  {
    id: "eh_001",
    name: "Overall Uptime - Last 30 Days",
    type: "Overall Uptime",
    format: "pdf",
    generatedAt: "Jul 15, 2026 09:12:00",
    size: "1.2 MB",
  },
  {
    id: "eh_002",
    name: "Incident History - Q2 2026",
    type: "Incident History",
    format: "csv",
    generatedAt: "Jul 1, 2026 14:00:00",
    size: "48 KB",
  },
  {
    id: "eh_003",
    name: "Response Time - Last 7 Days",
    type: "Response Time",
    format: "csv",
    generatedAt: "Jun 30, 2026 08:45:00",
    size: "24 KB",
  },
];

interface GenerateModalProps {
  reportType: ReportType | null;
  open: boolean;
  onClose: () => void;
  onGenerated: (item: ExportHistoryItem) => void;
}

function GenerateModal({ reportType, open, onClose, onGenerated }: GenerateModalProps) {
  const [reportName, setReportName] = useState(reportType?.title ?? "");
  const [datePreset, setDatePreset] = useState<DatePreset>("30d");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("pdf");
  const [generating, setGenerating] = useState(false);

  // Reset when report type changes
  const currentTitle = reportType?.title ?? "";

  async function handleGenerate() {
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 2000));
    setGenerating(false);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const generatedAt = `${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    onGenerated({
      id: `eh_${Date.now()}`,
      name: reportName || currentTitle,
      type: currentTitle,
      format: exportFormat,
      generatedAt,
      size: exportFormat === "pdf" ? "0.8 MB" : "32 KB",
    });
    toast.success("Report ready", { description: `${reportName || currentTitle} has been generated.` });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#18181B] border-[#27272A] text-zinc-100 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-zinc-50">Generate Report</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Report Name</Label>
            <Input
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              placeholder={currentTitle}
              className="bg-[#27272A] border-[#3F3F46] text-zinc-100 placeholder:text-zinc-600"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Date Range</Label>
            <div className="grid grid-cols-4 gap-1.5">
              {(["7d", "30d", "90d", "custom"] as DatePreset[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setDatePreset(p)}
                  className={cn(
                    "px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                    datePreset === p
                      ? "bg-blue-600 border-blue-500 text-white"
                      : "bg-[#27272A] border-[#3F3F46] text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  {p === "7d" ? "Last 7 days" : p === "30d" ? "Last 30 days" : p === "90d" ? "Last 90 days" : "Custom"}
                </button>
              ))}
            </div>
            {datePreset === "custom" && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-500">From</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="bg-[#27272A] border-[#3F3F46] text-zinc-100"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-500">To</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="bg-[#27272A] border-[#3F3F46] text-zinc-100"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Export Format</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["csv", "pdf"] as ExportFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setExportFormat(fmt)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium border transition-colors uppercase tracking-wide",
                    exportFormat === fmt
                      ? "bg-blue-600 border-blue-500 text-white"
                      : "bg-[#27272A] border-[#3F3F46] text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-[#27272A] bg-transparent text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {generating ? "Generating report..." : "Generate Report"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ReportsView() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [exportHistory, setExportHistory] = useState<ExportHistoryItem[]>(INITIAL_EXPORT_HISTORY);

  function openGenerate(report: ReportType) {
    setSelectedReport(report);
    setModalOpen(true);
  }

  function handleGenerated(item: ExportHistoryItem) {
    setExportHistory((prev) => [item, ...prev]);
  }

  const TABS: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "scheduled", label: "Scheduled Reports" },
    { id: "history", label: "Export History" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-6 border-b border-[#27272A] flex items-start justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-50" style={{ fontFamily: "'Geist', 'Inter', sans-serif" }}>
            Reports
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Generate and export monitoring reports</p>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 text-sm">
            <Plus className="w-4 h-4" />
            New Report
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-8 border-b border-[#27272A] flex-shrink-0">
        <div className="flex gap-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.id
                  ? "text-zinc-50 border-blue-500"
                  : "text-zinc-500 border-transparent hover:text-zinc-300"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto px-8 py-6">
        {activeTab === "overview" && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {REPORT_TYPES.map((report) => {
              const Icon = report.icon;
              return (
                <div
                  key={report.id}
                  className="bg-[#18181B] border border-[#27272A] rounded-2xl p-5 flex flex-col gap-4 hover:border-zinc-700 transition-colors"
                >
                  <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0", report.iconBg)}>
                    <Icon className={cn("w-5 h-5", report.color)} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-zinc-100">{report.title}</p>
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{report.description}</p>
                  </div>
                  <Button
                    onClick={() => openGenerate(report)}
                    variant="outline"
                    size="sm"
                    className="w-full border-[#27272A] bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                  >
                    Generate
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "scheduled" && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
              <Clock className="w-5 h-5 text-zinc-600" />
            </div>
            <p className="text-sm font-medium text-zinc-400">No scheduled reports</p>
            <p className="text-xs text-zinc-600">Scheduled reports will appear here</p>
          </div>
        )}

        {activeTab === "history" && (
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl overflow-hidden">
            {exportHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-zinc-600" />
                </div>
                <p className="text-sm font-medium text-zinc-400">No exports yet</p>
              </div>
            ) : (
              <div className="divide-y divide-[#27272A]">
                {exportHistory.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-5 py-4 hover:bg-zinc-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-[#27272A] flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-zinc-500" />
                      </div>
                      <div>
                        <p className="text-sm text-zinc-200 font-medium">{item.name}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {item.type} · {item.format.toUpperCase()} · {item.size} · {item.generatedAt}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-[#27272A] bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <GenerateModal
        reportType={selectedReport}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onGenerated={handleGenerated}
      />
    </div>
  );
}

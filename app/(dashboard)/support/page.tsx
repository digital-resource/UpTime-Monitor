"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  BookOpen,
  MessageSquare,
  Zap,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Info Card ────────────────────────────────────────────────────────────────

function InfoCard({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  description,
  linkLabel,
  linkHref,
}: {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  linkLabel: string;
  linkHref: string;
}) {
  return (
    <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-6 flex flex-col gap-4">
      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", iconBg)}>
        <Icon className={cn("w-5 h-5", iconColor)} />
      </div>
      <div>
        <p className="text-sm font-semibold text-zinc-100">{title}</p>
        <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{description}</p>
      </div>
      <a
        href={linkHref}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-medium transition-colors mt-auto",
          iconColor,
          "hover:opacity-80"
        )}
      >
        {linkLabel}
        <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}

// ─── FAQ Item ─────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: "How do I add a website for monitoring?",
    a: "Go to Websites in the sidebar and click the Add Website button. Fill in the URL, name, environment, and provider. You can also configure check intervals, failure thresholds, and SSL monitoring options in the Advanced Settings step.",
  },
  {
    q: "How are incidents created?",
    a: "An incident is automatically created when a website exceeds its failure threshold — for example, 3 consecutive failed checks. You can configure this threshold per website. Once the site recovers past the recovery threshold, the incident is automatically resolved.",
  },
  {
    q: "How do I configure Slack alerts?",
    a: "Navigate to Settings → Integrations and connect your Slack workspace. Once connected, create a Notification Group (under Settings → Notifications) and assign a Slack channel. Then link that notification group to your monitored websites.",
  },
  {
    q: "What does 'Degraded' status mean?",
    a: "Degraded means the website is responding but with elevated response times or unexpected HTTP status codes — it's not fully down but is not performing normally. You can configure the degraded threshold per website using response time limits.",
  },
  {
    q: "How do I pause monitoring for a website?",
    a: "Open the website detail page and click the Pause button in the top-right action bar. Pausing stops all checks and suppresses alerts. You can resume monitoring at any time from the same location. For scheduled pauses (e.g., maintenance windows), use Settings → Maintenance Windows.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-[#18181B] border border-[#27272A] rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-800/40 transition-colors gap-4"
      >
        <span className="text-sm font-medium text-zinc-100">{q}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-zinc-500 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-500 flex-shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-4 border-t border-[#27272A] pt-3">
          <p className="text-sm text-zinc-400 leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SupportPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Support"
        subtitle="Help, documentation and contact information"
      />

      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {/* Info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <InfoCard
            icon={BookOpen}
            iconColor="text-blue-400"
            iconBg="bg-blue-500/10"
            title="Documentation"
            description="Full platform documentation covering all features, configuration options, and API reference."
            linkLabel="Open docs"
            linkHref="#"
          />
          <InfoCard
            icon={MessageSquare}
            iconColor="text-emerald-400"
            iconBg="bg-emerald-500/10"
            title="Contact IT Support"
            description="Reach your internal IT team for account issues, access requests, or escalations."
            linkLabel="Open ticket"
            linkHref="mailto:it-support@company.com"
          />
          <InfoCard
            icon={Zap}
            iconColor="text-amber-400"
            iconBg="bg-amber-500/10"
            title="System Status"
            description="Check current platform health, uptime history, and any ongoing maintenance windows."
            linkLabel="View status"
            linkHref="#"
          />
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">
            Frequently Asked Questions
          </h2>
          <div className="space-y-2">
            {FAQ_ITEMS.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

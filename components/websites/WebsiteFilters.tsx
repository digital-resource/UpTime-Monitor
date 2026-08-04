"use client";
import { useState } from "react";
import { Filter, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getStatusLabel, getProviderLabel, getSourceLabel } from "@/lib/utils/formatters";
import type { WebsiteStatus, Provider, Source, MonitoringState } from "@/lib/types";
import type { WebsiteFilters as WebsiteFiltersType } from "@/lib/types";

type SslState = "valid" | "expiring" | "expired" | "unknown";

interface ActiveFilters {
  status: WebsiteStatus[];
  provider: Provider[];
  source: Source[];
  monitoringState: MonitoringState[];
  sslState: SslState | undefined;
}

interface WebsiteFiltersProps {
  filters: ActiveFilters;
  onChange: (filters: Partial<WebsiteFiltersType>) => void;
  onClear: () => void;
}

const STATUS_OPTIONS: WebsiteStatus[] = [
  "up", "down", "degraded", "paused", "pending", "never_checked", "maintenance",
];

const PROVIDER_OPTIONS: Provider[] = [
  "rocket_net", "webflow", "wordpress", "wp_engine", "siteground",
  "cloudways", "squarespace", "wix", "shopify", "vercel", "aws", "custom_server", "other",
];

const SOURCE_OPTIONS: Source[] = [
  "manual", "cloudflare_import", "rocket_net_import", "webflow_import",
  "vercel_import", "github_import", "api",
];

const MONITORING_STATE_OPTIONS: MonitoringState[] = ["enabled", "paused", "disabled"];

const MONITORING_STATE_LABELS: Record<MonitoringState, string> = {
  enabled: "Enabled",
  paused: "Paused",
  disabled: "Disabled",
};

const SSL_STATE_OPTIONS: { label: string; value: SslState | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Valid", value: "valid" },
  { label: "Expiring (<30d)", value: "expiring" },
  { label: "Expired", value: "expired" },
  { label: "Unknown", value: "unknown" },
];

function FilterGroup<T extends string>({
  label,
  options,
  selected,
  getLabel,
  onChange,
}: {
  label: string;
  options: T[];
  selected: T[];
  getLabel: (v: T) => string;
  onChange: (selected: T[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const count = selected.length;

  function toggle(value: T) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 gap-1.5 text-xs border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100",
            count > 0 && "border-blue-600/50 bg-blue-600/10 text-blue-300"
          )}
        >
          {label}
          {count > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold leading-none">
              {count}
            </span>
          )}
          <ChevronDown className="w-3 h-3 ml-0.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-52 p-2 bg-[#1C1C1E] border-[#3F3F46] rounded-xl shadow-xl"
      >
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-2 py-1 mb-1">
          {label}
        </p>
        <div className="space-y-0.5">
          {options.map((option) => (
            <label
              key={option}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-zinc-700/50 cursor-pointer"
            >
              <Checkbox
                checked={selected.includes(option)}
                onCheckedChange={() => toggle(option)}
                className="border-zinc-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <span className="text-xs text-zinc-300">{getLabel(option)}</span>
            </label>
          ))}
        </div>
        {count > 0 && (
          <div className="mt-2 pt-2 border-t border-zinc-700/50">
            <button
              onClick={() => onChange([])}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors w-full text-left px-2"
            >
              Clear {label}
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function SslFilterGroup({
  selected,
  onChange,
}: {
  selected: SslState | undefined;
  onChange: (v: SslState | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasFilter = selected !== undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 gap-1.5 text-xs border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100",
            hasFilter && "border-blue-600/50 bg-blue-600/10 text-blue-300"
          )}
        >
          SSL
          {hasFilter && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold leading-none">
              1
            </span>
          )}
          <ChevronDown className="w-3 h-3 ml-0.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-44 p-2 bg-[#1C1C1E] border-[#3F3F46] rounded-xl shadow-xl"
      >
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-2 py-1 mb-1">
          SSL State
        </p>
        <div className="space-y-0.5">
          {SSL_STATE_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={cn(
                "w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors",
                selected === opt.value
                  ? "bg-blue-600/20 text-blue-300"
                  : "text-zinc-300 hover:bg-zinc-700/50"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function WebsiteFilters({ filters, onChange, onClear }: WebsiteFiltersProps) {
  const totalActive =
    filters.status.length +
    filters.provider.length +
    filters.source.length +
    filters.monitoringState.length +
    (filters.sslState !== undefined ? 1 : 0);

  return (
    <div className="space-y-2">
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-zinc-500">
          <Filter className="w-3.5 h-3.5" />
          <span className="text-[11px] font-medium uppercase tracking-wide">Filters</span>
          {totalActive > 0 && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold">
              {totalActive}
            </span>
          )}
        </div>

        <FilterGroup<WebsiteStatus>
          label="Status"
          options={STATUS_OPTIONS}
          selected={filters.status}
          getLabel={getStatusLabel}
          onChange={(status) => onChange({ status: status.length ? status : undefined })}
        />

        <FilterGroup<Provider>
          label="Provider"
          options={PROVIDER_OPTIONS}
          selected={filters.provider}
          getLabel={getProviderLabel}
          onChange={(provider) => onChange({ provider: provider.length ? provider : undefined })}
        />

        <FilterGroup<Source>
          label="Source"
          options={SOURCE_OPTIONS}
          selected={filters.source}
          getLabel={getSourceLabel}
          onChange={(source) => onChange({ source: source.length ? source : undefined })}
        />

        <FilterGroup<MonitoringState>
          label="Monitoring"
          options={MONITORING_STATE_OPTIONS}
          selected={filters.monitoringState}
          getLabel={(v) => MONITORING_STATE_LABELS[v]}
          onChange={(monitoringState) =>
            onChange({ monitoringState: monitoringState.length ? monitoringState : undefined })
          }
        />

        <SslFilterGroup
          selected={filters.sslState}
          onChange={(sslState) => onChange({ sslState })}
        />

        {totalActive > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-8 text-xs text-zinc-500 hover:text-zinc-100 gap-1"
          >
            <X className="w-3 h-3" /> Clear All
          </Button>
        )}
      </div>

      {/* Active filter chips */}
      {totalActive > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {filters.status.map((s) => (
            <ActiveChip
              key={`status-${s}`}
              label={`Status: ${getStatusLabel(s)}`}
              onRemove={() =>
                onChange({ status: filters.status.filter((x) => x !== s) })
              }
            />
          ))}
          {filters.provider.map((p) => (
            <ActiveChip
              key={`provider-${p}`}
              label={`Provider: ${getProviderLabel(p)}`}
              onRemove={() =>
                onChange({ provider: filters.provider.filter((x) => x !== p) })
              }
            />
          ))}
          {filters.source.map((s) => (
            <ActiveChip
              key={`source-${s}`}
              label={`Source: ${getSourceLabel(s)}`}
              onRemove={() =>
                onChange({ source: filters.source.filter((x) => x !== s) })
              }
            />
          ))}
          {filters.monitoringState.map((m) => (
            <ActiveChip
              key={`monitoring-${m}`}
              label={`Monitoring: ${MONITORING_STATE_LABELS[m]}`}
              onRemove={() =>
                onChange({ monitoringState: filters.monitoringState.filter((x) => x !== m) })
              }
            />
          ))}
          {filters.sslState !== undefined && (
            <ActiveChip
              label={`SSL: ${SSL_STATE_OPTIONS.find((o) => o.value === filters.sslState)?.label ?? filters.sslState}`}
              onRemove={() => onChange({ sslState: undefined })}
            />
          )}
          <button
            onClick={onClear}
            className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors underline underline-offset-2"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-[11px] text-zinc-300">
      {label}
      <button
        onClick={onRemove}
        className="ml-0.5 text-zinc-500 hover:text-zinc-100 transition-colors"
        aria-label={`Remove ${label} filter`}
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

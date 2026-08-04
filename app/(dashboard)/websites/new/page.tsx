"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Link from "next/link";
import {
  Check,
  ChevronRight,
  Plus,
  X,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { websiteService } from "@/lib/services/websiteService";
import { MOCK_WEBSITES_EXTENDED } from "@/lib/mock-data";

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const step1Schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  url: z.string().url("Please enter a valid URL"),
  client: z.string().optional(),
  environment: z.enum(["production", "staging", "development", "preview", "internal"]),
  source: z.enum(["manual", "cloudflare_import", "rocket_net_import", "webflow_import", "vercel_import", "github_import", "api"]),
  provider: z.enum(["rocket_net", "webflow", "wordpress", "wp_engine", "siteground", "cloudways", "squarespace", "wix", "shopify", "vercel", "aws", "custom_server", "unknown", "other"]),
  tags: z.array(z.string()),
  internalNotes: z.string().optional(),
});

const step2Schema = z.object({
  monitoringEnabled: z.boolean(),
  checkInterval: z.number(),
  timeout: z.number(),
  failureThreshold: z.number().min(1).max(20),
  recoveryThreshold: z.number().min(1).max(20),
  expectedHttpStatus: z.number().min(100).max(599),
  followRedirects: z.boolean(),
  httpMethod: z.enum(["GET", "HEAD", "POST"]),
  headers: z.array(z.object({ key: z.string(), value: z.string() })),
  contentKeyword: z.string().optional(),
  sslMonitoring: z.boolean(),
  sslExpirationWarning: z.number(),
});

const step3Schema = z.object({
  slackAlerts: z.boolean(),
  slackChannel: z.string().optional(),
  emailAlerts: z.boolean(),
  emailRecipients: z.array(z.string()),
  recoveryAlerts: z.boolean(),
  notificationGroupId: z.string().optional(),
  escalationRuleId: z.string().optional(),
  quietHoursEnabled: z.boolean(),
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),
  quietHoursTimezone: z.string().optional(),
  maintenanceSuppression: z.boolean(),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type Step3Data = z.infer<typeof step3Schema>;

// ─── Stepper Header ───────────────────────────────────────────────────────────

const STEPS = [
  { label: "Website Details" },
  { label: "Monitoring" },
  { label: "Notifications" },
  { label: "Review" },
];

function StepperHeader({
  currentStep,
  completedSteps,
  onStepClick,
}: {
  currentStep: number;
  completedSteps: Set<number>;
  onStepClick: (step: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {STEPS.map((step, idx) => {
        const num = idx + 1;
        const isCompleted = completedSteps.has(num);
        const isCurrent = currentStep === num;
        const isClickable = isCompleted;

        return (
          <div key={num} className="flex items-center">
            <button
              onClick={() => isClickable && onStepClick(num)}
              disabled={!isClickable}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all",
                  isCompleted
                    ? "bg-blue-600 border-blue-600 text-white cursor-pointer"
                    : isCurrent
                    ? "bg-blue-600/10 border-blue-500 text-blue-400"
                    : "bg-zinc-800 border-zinc-700 text-zinc-500"
                )}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : num}
              </div>
              <span
                className={cn(
                  "text-[11px] font-medium whitespace-nowrap",
                  isCurrent ? "text-zinc-100" : isCompleted ? "text-zinc-400" : "text-zinc-600"
                )}
              >
                {step.label}
              </span>
            </button>
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  "w-16 h-px mx-2 mb-5 transition-colors",
                  completedSteps.has(num) ? "bg-blue-600" : "bg-zinc-700"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Field Wrapper ────────────────────────────────────────────────────────────

function Field({
  label,
  error,
  children,
  hint,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-[11px] text-zinc-600">{hint}</p>}
      {error && <p className="text-[11px] text-rose-400">{error}</p>}
    </div>
  );
}

// ─── Step 1: Website Details ──────────────────────────────────────────────────

function Step1({
  onNext,
  defaultValues,
}: {
  onNext: (data: Step1Data) => void;
  defaultValues?: Partial<Step1Data>;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      name: "",
      url: "",
      client: "",
      environment: "production",
      source: "manual",
      provider: "unknown",
      tags: [],
      internalNotes: "",
      ...defaultValues,
    },
  });

  const tags = watch("tags");
  const url = watch("url");
  const [tagInput, setTagInput] = useState("");

  const isPrivateUrl = url
    ? /localhost|127\.0\.0\.1|^https?:\/\/10\.\d+\.\d+\.\d+/.test(url)
    : false;

  const isDuplicateUrl = url
    ? MOCK_WEBSITES_EXTENDED.some(
        (w) => w.url.toLowerCase() === url.toLowerCase()
      )
    : false;

  function handleUrlBlur() {
    const val = watch("url");
    if (val && !val.startsWith("http://") && !val.startsWith("https://")) {
      setValue("url", `https://${val}`, { shouldValidate: true });
    }
  }

  function addTag() {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setValue("tags", [...tags, t]);
      setTagInput("");
    }
  }

  function removeTag(tag: string) {
    setValue("tags", tags.filter((t) => t !== tag));
  }

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-5">
      {/* Name */}
      <Field label="Website Name *" error={errors.name?.message}>
        <Input
          {...register("name")}
          placeholder="Acme Corp - Homepage"
          className="bg-[#09090B] border-[#27272A] focus:border-blue-500 text-zinc-100 placeholder:text-zinc-600 rounded-lg"
        />
      </Field>

      {/* URL */}
      <Field label="URL *" error={errors.url?.message}>
        <Input
          {...register("url")}
          placeholder="https://example.com"
          onBlur={handleUrlBlur}
          className="bg-[#09090B] border-[#27272A] focus:border-blue-500 text-zinc-100 placeholder:text-zinc-600 rounded-lg font-mono"
        />
        {isPrivateUrl && !errors.url && (
          <div className="flex items-center gap-1.5 mt-1">
            <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />
            <p className="text-[11px] text-amber-400">
              This appears to be a private URL
            </p>
          </div>
        )}
        {isDuplicateUrl && !errors.url && !isPrivateUrl && (
          <div className="flex items-center gap-1.5 mt-1">
            <Info className="w-3 h-3 text-amber-400 flex-shrink-0" />
            <p className="text-[11px] text-amber-400">
              This URL already exists in your websites
            </p>
          </div>
        )}
      </Field>

      {/* Client */}
      <Field label="Client" error={errors.client?.message}>
        <Input
          {...register("client")}
          placeholder="Client or organization name"
          className="bg-[#09090B] border-[#27272A] focus:border-blue-500 text-zinc-100 placeholder:text-zinc-600 rounded-lg"
        />
      </Field>

      {/* Environment */}
      <Field label="Environment" error={errors.environment?.message}>
        <Select
          defaultValue={defaultValues?.environment ?? "production"}
          onValueChange={(v) => setValue("environment", v as Step1Data["environment"])}
        >
          <SelectTrigger className="bg-[#09090B] border-[#27272A] text-zinc-100 rounded-lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#18181B] border-[#27272A]">
            {["production", "staging", "development", "preview", "internal"].map((e) => (
              <SelectItem key={e} value={e} className="text-zinc-100 focus:bg-zinc-700 capitalize">
                {e.charAt(0).toUpperCase() + e.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* Source + Provider */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Source" error={errors.source?.message}>
          <Select
            defaultValue={defaultValues?.source ?? "manual"}
            onValueChange={(v) => setValue("source", v as Step1Data["source"])}
          >
            <SelectTrigger className="bg-[#09090B] border-[#27272A] text-zinc-100 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#18181B] border-[#27272A]">
              {[
                ["manual", "Manual"],
                ["cloudflare_import", "Cloudflare Import"],
                ["rocket_net_import", "Rocket.net Import"],
                ["webflow_import", "Webflow Import"],
                ["vercel_import", "Vercel Import"],
                ["github_import", "GitHub Import"],
                ["api", "API"],
              ].map(([val, label]) => (
                <SelectItem key={val} value={val} className="text-zinc-100 focus:bg-zinc-700">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Hosting Provider" error={errors.provider?.message}>
          <Select
            defaultValue={defaultValues?.provider ?? "unknown"}
            onValueChange={(v) => setValue("provider", v as Step1Data["provider"])}
          >
            <SelectTrigger className="bg-[#09090B] border-[#27272A] text-zinc-100 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#18181B] border-[#27272A]">
              {[
                ["rocket_net", "Rocket.net"],
                ["webflow", "Webflow"],
                ["wordpress", "WordPress"],
                ["wp_engine", "WP Engine"],
                ["siteground", "SiteGround"],
                ["cloudways", "Cloudways"],
                ["squarespace", "Squarespace"],
                ["wix", "Wix"],
                ["shopify", "Shopify"],
                ["vercel", "Vercel"],
                ["aws", "AWS"],
                ["custom_server", "Custom Server"],
                ["unknown", "Unknown"],
                ["other", "Other"],
              ].map(([val, label]) => (
                <SelectItem key={val} value={val} className="text-zinc-100 focus:bg-zinc-700">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <p className="text-[11px] text-zinc-600 -mt-2">
        Source is where this website was discovered. Provider is where it is hosted. These can be different.
      </p>

      {/* Tags */}
      <Field label="Tags">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded-full text-xs text-zinc-300"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-zinc-500 hover:text-zinc-100 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="Type a tag and press Enter"
            className="bg-[#09090B] border-[#27272A] focus:border-blue-500 text-zinc-100 placeholder:text-zinc-600 rounded-lg"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addTag}
            className="border-[#27272A] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </Field>

      {/* Internal Notes */}
      <Field label="Internal Notes">
        <Textarea
          {...register("internalNotes")}
          placeholder="Notes visible only to your team..."
          rows={3}
          className="bg-[#09090B] border-[#27272A] focus:border-blue-500 text-zinc-100 placeholder:text-zinc-600 rounded-lg resize-none"
        />
      </Field>

      <div className="flex justify-end pt-2">
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          Next: Monitoring <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </form>
  );
}

// ─── Step 2: Monitoring Configuration ────────────────────────────────────────

function Step2({
  onNext,
  onBack,
  defaultValues,
}: {
  onNext: (data: Step2Data) => void;
  onBack: () => void;
  defaultValues?: Partial<Step2Data>;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      monitoringEnabled: true,
      checkInterval: 120,
      timeout: 30,
      failureThreshold: 3,
      recoveryThreshold: 1,
      expectedHttpStatus: 200,
      followRedirects: true,
      httpMethod: "GET",
      headers: [],
      contentKeyword: "",
      sslMonitoring: true,
      sslExpirationWarning: 30,
      ...defaultValues,
    },
  });

  const { fields: headerFields, append: appendHeader, remove: removeHeader } = useFieldArray({
    control,
    name: "headers",
  });

  const monitoringEnabled = watch("monitoringEnabled");
  const sslMonitoring = watch("sslMonitoring");
  const followRedirects = watch("followRedirects");

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-5">
      {/* Monitoring Enabled */}
      <div className="flex items-center justify-between p-4 bg-[#18181B] border border-[#27272A] rounded-xl">
        <div>
          <p className="text-sm font-medium text-zinc-100">Monitoring Enabled</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">Enable automatic uptime checks</p>
        </div>
        <Switch
          checked={monitoringEnabled}
          onCheckedChange={(v) => setValue("monitoringEnabled", v)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Check Interval */}
        <Field label="Check Interval">
          <Select
            defaultValue="120"
            onValueChange={(v) => setValue("checkInterval", Number(v))}
          >
            <SelectTrigger className="bg-[#09090B] border-[#27272A] text-zinc-100 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#18181B] border-[#27272A]">
              {[
                [30, "30 seconds"],
                [60, "1 minute"],
                [120, "2 minutes"],
                [300, "5 minutes"],
                [600, "10 minutes"],
                [900, "15 minutes"],
                [1800, "30 minutes"],
                [3600, "1 hour"],
              ].map(([val, label]) => (
                <SelectItem key={val} value={String(val)} className="text-zinc-100 focus:bg-zinc-700">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {/* Timeout */}
        <Field label="Timeout">
          <Select
            defaultValue="30"
            onValueChange={(v) => setValue("timeout", Number(v))}
          >
            <SelectTrigger className="bg-[#09090B] border-[#27272A] text-zinc-100 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#18181B] border-[#27272A]">
              {[[5, "5s"], [10, "10s"], [15, "15s"], [30, "30s"], [60, "60s"]].map(([val, label]) => (
                <SelectItem key={val} value={String(val)} className="text-zinc-100 focus:bg-zinc-700">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Failure Threshold */}
        <Field label="Failure Threshold" hint="Consecutive failures before incident" error={errors.failureThreshold?.message}>
          <Input
            type="number"
            {...register("failureThreshold", { valueAsNumber: true })}
            className="bg-[#09090B] border-[#27272A] focus:border-blue-500 text-zinc-100 rounded-lg"
          />
        </Field>

        {/* Recovery Threshold */}
        <Field label="Recovery Threshold" hint="Successful checks before recovery" error={errors.recoveryThreshold?.message}>
          <Input
            type="number"
            {...register("recoveryThreshold", { valueAsNumber: true })}
            className="bg-[#09090B] border-[#27272A] focus:border-blue-500 text-zinc-100 rounded-lg"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Expected HTTP Status */}
        <Field label="Expected HTTP Status" error={errors.expectedHttpStatus?.message}>
          <Input
            type="number"
            {...register("expectedHttpStatus", { valueAsNumber: true })}
            className="bg-[#09090B] border-[#27272A] focus:border-blue-500 text-zinc-100 rounded-lg"
          />
        </Field>

        {/* HTTP Method */}
        <Field label="HTTP Method">
          <Select
            defaultValue="GET"
            onValueChange={(v) => setValue("httpMethod", v as "GET" | "HEAD" | "POST")}
          >
            <SelectTrigger className="bg-[#09090B] border-[#27272A] text-zinc-100 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#18181B] border-[#27272A]">
              {["GET", "HEAD", "POST"].map((m) => (
                <SelectItem key={m} value={m} className="text-zinc-100 focus:bg-zinc-700">
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {/* Follow Redirects */}
      <div className="flex items-center justify-between p-4 bg-[#18181B] border border-[#27272A] rounded-xl">
        <div>
          <p className="text-sm font-medium text-zinc-100">Follow Redirects</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">Automatically follow HTTP redirects</p>
        </div>
        <Switch
          checked={followRedirects}
          onCheckedChange={(v) => setValue("followRedirects", v)}
        />
      </div>

      {/* Custom Headers */}
      <div className="space-y-2">
        <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">
          Custom Headers
        </label>
        {headerFields.map((field, idx) => (
          <div key={field.id} className="flex gap-2">
            <Input
              {...register(`headers.${idx}.key`)}
              placeholder="Header name"
              className="bg-[#09090B] border-[#27272A] focus:border-blue-500 text-zinc-100 placeholder:text-zinc-600 rounded-lg"
            />
            <Input
              {...register(`headers.${idx}.value`)}
              placeholder="Header value"
              className="bg-[#09090B] border-[#27272A] focus:border-blue-500 text-zinc-100 placeholder:text-zinc-600 rounded-lg"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeHeader(idx)}
              className="text-zinc-500 hover:text-rose-400 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => appendHeader({ key: "", value: "" })}
          className="border-[#27272A] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 gap-2"
        >
          <Plus className="w-3.5 h-3.5" /> Add Header
        </Button>
      </div>

      {/* Content Keyword */}
      <Field label="Content Keyword" hint="Keyword that must appear in the response body">
        <Input
          {...register("contentKeyword")}
          placeholder="e.g. Welcome"
          className="bg-[#09090B] border-[#27272A] focus:border-blue-500 text-zinc-100 placeholder:text-zinc-600 rounded-lg"
        />
      </Field>

      {/* SSL Monitoring */}
      <div className="flex items-center justify-between p-4 bg-[#18181B] border border-[#27272A] rounded-xl">
        <div>
          <p className="text-sm font-medium text-zinc-100">SSL Monitoring</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">Monitor SSL certificate expiration</p>
        </div>
        <Switch
          checked={sslMonitoring}
          onCheckedChange={(v) => setValue("sslMonitoring", v)}
        />
      </div>

      {sslMonitoring && (
        <Field label="SSL Expiration Warning">
          <Select
            defaultValue="30"
            onValueChange={(v) => setValue("sslExpirationWarning", Number(v))}
          >
            <SelectTrigger className="bg-[#09090B] border-[#27272A] text-zinc-100 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#18181B] border-[#27272A]">
              {[[7, "7 days"], [14, "14 days"], [30, "30 days"], [60, "60 days"], [90, "90 days"]].map(
                ([val, label]) => (
                  <SelectItem key={val} value={String(val)} className="text-zinc-100 focus:bg-zinc-700">
                    {label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </Field>
      )}

      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          className="text-zinc-400 hover:text-zinc-100 gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          Next: Notifications <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </form>
  );
}

// ─── Step 3: Notifications ────────────────────────────────────────────────────

const MOCK_NOTIFICATION_GROUPS = [
  { id: "ng_001", name: "P1 Critical" },
  { id: "ng_002", name: "Standard" },
  { id: "ng_003", name: "Dev Team" },
];

const MOCK_ESCALATION_RULES = [
  { id: "er_001", name: "Escalate after 15min" },
  { id: "er_002", name: "Escalate after 30min" },
];

const TIMEZONES = ["UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Europe/London", "Europe/Paris", "Asia/Tokyo"];

function Step3({
  onNext,
  onBack,
  defaultValues,
}: {
  onNext: (data: Step3Data) => void;
  onBack: () => void;
  defaultValues?: Partial<Step3Data>;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      slackAlerts: false,
      slackChannel: "",
      emailAlerts: false,
      emailRecipients: [],
      recoveryAlerts: true,
      notificationGroupId: "",
      escalationRuleId: "",
      quietHoursEnabled: false,
      quietHoursStart: "22:00",
      quietHoursEnd: "08:00",
      quietHoursTimezone: "UTC",
      maintenanceSuppression: true,
      ...defaultValues,
    },
  });

  const slackAlerts = watch("slackAlerts");
  const emailAlerts = watch("emailAlerts");
  const recoveryAlerts = watch("recoveryAlerts");
  const quietHoursEnabled = watch("quietHoursEnabled");
  const maintenanceSuppression = watch("maintenanceSuppression");
  const emailRecipients = watch("emailRecipients");
  const [emailInput, setEmailInput] = useState("");

  function addEmail() {
    const e = emailInput.trim();
    if (e && !emailRecipients.includes(e)) {
      setValue("emailRecipients", [...emailRecipients, e]);
      setEmailInput("");
    }
  }

  function removeEmail(email: string) {
    setValue("emailRecipients", emailRecipients.filter((e) => e !== email));
  }

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-5">
      {/* Slack */}
      <div className="space-y-3">
        <div className="flex items-center justify-between p-4 bg-[#18181B] border border-[#27272A] rounded-xl">
          <div>
            <p className="text-sm font-medium text-zinc-100">Slack Alerts</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Send alerts to a Slack channel</p>
          </div>
          <Switch checked={slackAlerts} onCheckedChange={(v) => setValue("slackAlerts", v)} />
        </div>
        {slackAlerts && (
          <Field label="Slack Channel">
            <Input
              {...register("slackChannel")}
              placeholder="#alerts"
              className="bg-[#09090B] border-[#27272A] focus:border-blue-500 text-zinc-100 placeholder:text-zinc-600 rounded-lg"
            />
          </Field>
        )}
      </div>

      {/* Email */}
      <div className="space-y-3">
        <div className="flex items-center justify-between p-4 bg-[#18181B] border border-[#27272A] rounded-xl">
          <div>
            <p className="text-sm font-medium text-zinc-100">Email Alerts</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Send alert emails to recipients</p>
          </div>
          <Switch checked={emailAlerts} onCheckedChange={(v) => setValue("emailAlerts", v)} />
        </div>
        {emailAlerts && (
          <Field label="Email Recipients">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {emailRecipients.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded-full text-xs text-zinc-300"
                >
                  {email}
                  <button
                    type="button"
                    onClick={() => removeEmail(email)}
                    className="text-zinc-500 hover:text-zinc-100 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addEmail();
                  }
                }}
                placeholder="name@example.com and press Enter"
                className="bg-[#09090B] border-[#27272A] focus:border-blue-500 text-zinc-100 placeholder:text-zinc-600 rounded-lg"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEmail}
                className="border-[#27272A] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 flex-shrink-0"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </Field>
        )}
      </div>

      {/* Recovery Alerts */}
      <div className="flex items-center justify-between p-4 bg-[#18181B] border border-[#27272A] rounded-xl">
        <div>
          <p className="text-sm font-medium text-zinc-100">Recovery Alerts</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">Notify when website recovers</p>
        </div>
        <Switch checked={recoveryAlerts} onCheckedChange={(v) => setValue("recoveryAlerts", v)} />
      </div>

      {/* Notification Group */}
      <Field label="Notification Group">
        <Select
          defaultValue=""
          onValueChange={(v) => setValue("notificationGroupId", v)}
        >
          <SelectTrigger className="bg-[#09090B] border-[#27272A] text-zinc-100 rounded-lg">
            <SelectValue placeholder="Select a group..." />
          </SelectTrigger>
          <SelectContent className="bg-[#18181B] border-[#27272A]">
            <SelectItem value="none" className="text-zinc-400 focus:bg-zinc-700">None</SelectItem>
            {MOCK_NOTIFICATION_GROUPS.map((g) => (
              <SelectItem key={g.id} value={g.id} className="text-zinc-100 focus:bg-zinc-700">
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* Escalation Rule */}
      <Field label="Escalation Rule">
        <Select
          defaultValue=""
          onValueChange={(v) => setValue("escalationRuleId", v)}
        >
          <SelectTrigger className="bg-[#09090B] border-[#27272A] text-zinc-100 rounded-lg">
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent className="bg-[#18181B] border-[#27272A]">
            <SelectItem value="none" className="text-zinc-400 focus:bg-zinc-700">None</SelectItem>
            {MOCK_ESCALATION_RULES.map((r) => (
              <SelectItem key={r.id} value={r.id} className="text-zinc-100 focus:bg-zinc-700">
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* Quiet Hours */}
      <div className="space-y-3">
        <div className="flex items-center justify-between p-4 bg-[#18181B] border border-[#27272A] rounded-xl">
          <div>
            <p className="text-sm font-medium text-zinc-100">Quiet Hours</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Suppress alerts during certain hours</p>
          </div>
          <Switch
            checked={quietHoursEnabled}
            onCheckedChange={(v) => setValue("quietHoursEnabled", v)}
          />
        </div>
        {quietHoursEnabled && (
          <div className="space-y-3 pl-2">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Start Time">
                <Input
                  type="time"
                  {...register("quietHoursStart")}
                  className="bg-[#09090B] border-[#27272A] focus:border-blue-500 text-zinc-100 rounded-lg"
                />
              </Field>
              <Field label="End Time">
                <Input
                  type="time"
                  {...register("quietHoursEnd")}
                  className="bg-[#09090B] border-[#27272A] focus:border-blue-500 text-zinc-100 rounded-lg"
                />
              </Field>
            </div>
            <Field label="Timezone">
              <Select
                defaultValue="UTC"
                onValueChange={(v) => setValue("quietHoursTimezone", v)}
              >
                <SelectTrigger className="bg-[#09090B] border-[#27272A] text-zinc-100 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#18181B] border-[#27272A]">
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz} className="text-zinc-100 focus:bg-zinc-700">
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        )}
      </div>

      {/* Maintenance Suppression */}
      <div className="flex items-center justify-between p-4 bg-[#18181B] border border-[#27272A] rounded-xl">
        <div>
          <p className="text-sm font-medium text-zinc-100">Maintenance Suppression</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">Suppress alerts during maintenance windows</p>
        </div>
        <Switch
          checked={maintenanceSuppression}
          onCheckedChange={(v) => setValue("maintenanceSuppression", v)}
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          className="text-zinc-400 hover:text-zinc-100 gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          Next: Review <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </form>
  );
}

// ─── Step 4: Review ───────────────────────────────────────────────────────────

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-5 space-y-3">
      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[11px] text-zinc-500 uppercase tracking-wider flex-shrink-0">{label}</span>
      <span className="text-sm text-zinc-200 text-right">{value ?? "—"}</span>
    </div>
  );
}

function Step4({
  step1,
  step2,
  step3,
  onBack,
  onSave,
  onSaveAndTest,
}: {
  step1: Step1Data;
  step2: Step2Data;
  step3: Step3Data;
  onBack: () => void;
  onSave: () => Promise<void>;
  onSaveAndTest: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const INTERVAL_LABELS: Record<number, string> = {
    30: "30 seconds",
    60: "1 minute",
    120: "2 minutes",
    300: "5 minutes",
    600: "10 minutes",
    900: "15 minutes",
    1800: "30 minutes",
    3600: "1 hour",
  };

  const SSL_WARNING_LABELS: Record<number, string> = {
    7: "7 days",
    14: "14 days",
    30: "30 days",
    60: "60 days",
    90: "90 days",
  };

  async function handleSave() {
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAndTest() {
    setTesting(true);
    setTestResult(null);
    try {
      await onSaveAndTest();
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-5">
      <ReviewSection title="Website Details">
        <ReviewRow label="Name" value={step1.name} />
        <ReviewRow label="URL" value={<span className="font-mono text-xs">{step1.url}</span>} />
        <ReviewRow label="Client" value={step1.client || "—"} />
        <ReviewRow label="Environment" value={<span className="capitalize">{step1.environment}</span>} />
        <ReviewRow label="Source" value={step1.source.replace(/_/g, " ")} />
        <ReviewRow label="Provider" value={step1.provider.replace(/_/g, " ")} />
        <ReviewRow
          label="Tags"
          value={
            step1.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1 justify-end">
                {step1.tags.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded-full text-xs text-zinc-300"
                  >
                    {t}
                  </span>
                ))}
              </div>
            ) : (
              "None"
            )
          }
        />
        {step1.internalNotes && <ReviewRow label="Notes" value={step1.internalNotes} />}
      </ReviewSection>

      <ReviewSection title="Monitoring Configuration">
        <ReviewRow label="Monitoring" value={step2.monitoringEnabled ? "Enabled" : "Disabled"} />
        <ReviewRow label="Check Interval" value={INTERVAL_LABELS[step2.checkInterval] ?? `${step2.checkInterval}s`} />
        <ReviewRow label="Timeout" value={`${step2.timeout}s`} />
        <ReviewRow label="Failure Threshold" value={step2.failureThreshold} />
        <ReviewRow label="Recovery Threshold" value={step2.recoveryThreshold} />
        <ReviewRow label="Expected HTTP" value={step2.expectedHttpStatus} />
        <ReviewRow label="HTTP Method" value={step2.httpMethod} />
        <ReviewRow label="Follow Redirects" value={step2.followRedirects ? "Yes" : "No"} />
        {step2.contentKeyword && <ReviewRow label="Content Keyword" value={step2.contentKeyword} />}
        <ReviewRow label="SSL Monitoring" value={step2.sslMonitoring ? "Enabled" : "Disabled"} />
        {step2.sslMonitoring && (
          <ReviewRow
            label="SSL Warning"
            value={SSL_WARNING_LABELS[step2.sslExpirationWarning] ?? `${step2.sslExpirationWarning} days`}
          />
        )}
        {step2.headers.length > 0 && (
          <ReviewRow
            label="Custom Headers"
            value={
              <div className="text-xs space-y-0.5">
                {step2.headers.map((h, i) => (
                  <div key={i} className="font-mono">
                    {h.key}: {h.value}
                  </div>
                ))}
              </div>
            }
          />
        )}
      </ReviewSection>

      <ReviewSection title="Notification Settings">
        <ReviewRow label="Slack Alerts" value={step3.slackAlerts ? `Yes — ${step3.slackChannel || "#not set"}` : "No"} />
        <ReviewRow
          label="Email Alerts"
          value={
            step3.emailAlerts
              ? step3.emailRecipients.length > 0
                ? step3.emailRecipients.join(", ")
                : "No recipients set"
              : "No"
          }
        />
        <ReviewRow label="Recovery Alerts" value={step3.recoveryAlerts ? "Yes" : "No"} />
        <ReviewRow
          label="Notification Group"
          value={
            step3.notificationGroupId
              ? MOCK_NOTIFICATION_GROUPS.find((g) => g.id === step3.notificationGroupId)?.name ?? step3.notificationGroupId
              : "None"
          }
        />
        <ReviewRow label="Quiet Hours" value={step3.quietHoursEnabled ? `${step3.quietHoursStart} – ${step3.quietHoursEnd} (${step3.quietHoursTimezone})` : "Disabled"} />
        <ReviewRow label="Maintenance Suppression" value={step3.maintenanceSuppression ? "Enabled" : "Disabled"} />
      </ReviewSection>

      {testResult && (
        <div
          className={cn(
            "flex items-center gap-3 p-4 rounded-xl border",
            testResult.success
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-400"
          )}
        >
          {testResult.success ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{testResult.message}</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          className="text-zinc-400 hover:text-zinc-100 gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Notifications
        </Button>
        <div className="flex items-center gap-3">
          <Link
            href="/websites"
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors px-3 py-2"
          >
            Cancel
          </Link>
          <Button
            type="button"
            variant="outline"
            onClick={handleSave}
            disabled={saving || testing}
            className="border-[#27272A] text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Website
          </Button>
          <Button
            type="button"
            onClick={handleSaveAndTest}
            disabled={saving || testing}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save &amp; Run Test
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AddWebsitePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [step2Data, setStep2Data] = useState<Step2Data | null>(null);
  const [step3Data, setStep3Data] = useState<Step3Data | null>(null);

  function completeStep(num: number) {
    setCompletedSteps((prev) => new Set([...prev, num]));
  }

  function handleStep1(data: Step1Data) {
    setStep1Data(data);
    completeStep(1);
    setCurrentStep(2);
  }

  function handleStep2(data: Step2Data) {
    setStep2Data(data);
    completeStep(2);
    setCurrentStep(3);
  }

  function handleStep3(data: Step3Data) {
    setStep3Data(data);
    completeStep(3);
    setCurrentStep(4);
  }

  function handleStepClick(step: number) {
    setCurrentStep(step);
  }

  function buildWebsitePayload() {
    if (!step1Data || !step2Data || !step3Data) return {};
    const headersObj: Record<string, string> = {};
    step2Data.headers.forEach((h) => {
      if (h.key) headersObj[h.key] = h.value;
    });

    return {
      name: step1Data.name,
      url: step1Data.url,
      client: step1Data.client || null,
      environment: step1Data.environment,
      source: step1Data.source,
      provider: step1Data.provider,
      tags: step1Data.tags,
      internalNotes: step1Data.internalNotes || null,
      monitoringState: step2Data.monitoringEnabled ? ("enabled" as const) : ("disabled" as const),
      checkInterval: step2Data.checkInterval,
      timeout: step2Data.timeout,
      failureThreshold: step2Data.failureThreshold,
      recoveryThreshold: step2Data.recoveryThreshold,
      expectedHttpStatus: step2Data.expectedHttpStatus,
      followRedirects: step2Data.followRedirects,
      httpMethod: step2Data.httpMethod,
      headers: headersObj,
      contentKeyword: step2Data.contentKeyword || null,
      sslMonitoring: step2Data.sslMonitoring,
      sslExpirationWarning: step2Data.sslExpirationWarning,
      notificationGroupId:
        step3Data.notificationGroupId && step3Data.notificationGroupId !== "none"
          ? step3Data.notificationGroupId
          : null,
    };
  }

  async function handleSave() {
    const payload = buildWebsitePayload();
    await websiteService.create(payload);
    toast.success("Website added successfully");
    router.push("/websites");
  }

  async function handleSaveAndTest() {
    const payload = buildWebsitePayload();
    const website = await websiteService.create(payload);

    // Simulate a test with 80% success rate
    await new Promise((r) => setTimeout(r, 1500));
    const success = Math.random() > 0.2;

    if (success) {
      toast.success("Website added and test passed");
      router.push("/websites");
    } else {
      // Show result in Step4 — we need to handle this via state
      // For demo, we always redirect after showing result
      toast.error("Website saved but check failed — please review your URL");
      router.push(`/websites/${website.id}`);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-[#27272A] bg-[#09090B]">
        <div className="flex items-center gap-3">
          <Link
            href="/websites"
            className="text-zinc-500 hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-zinc-50">Add Website</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Set up monitoring for a new website</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl mx-auto">
          <StepperHeader
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={handleStepClick}
          />

          {/* Step panels */}
          {currentStep === 1 && (
            <Step1 onNext={handleStep1} defaultValues={step1Data ?? undefined} />
          )}
          {currentStep === 2 && (
            <Step2
              onNext={handleStep2}
              onBack={() => setCurrentStep(1)}
              defaultValues={step2Data ?? undefined}
            />
          )}
          {currentStep === 3 && (
            <Step3
              onNext={handleStep3}
              onBack={() => setCurrentStep(2)}
              defaultValues={step3Data ?? undefined}
            />
          )}
          {currentStep === 4 && step1Data && step2Data && step3Data && (
            <Step4
              step1={step1Data}
              step2={step2Data}
              step3={step3Data}
              onBack={() => setCurrentStep(3)}
              onSave={handleSave}
              onSaveAndTest={handleSaveAndTest}
            />
          )}
        </div>
      </div>
    </div>
  );
}

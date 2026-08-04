"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { websiteService } from "@/lib/services/websiteService";
import { toast } from "sonner";
import { Globe, Settings, Bell, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddWebsiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type Step = 1 | 2 | 3;

export function AddWebsiteDialog({ open, onOpenChange, onSuccess }: AddWebsiteDialogProps) {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    client: "",
    environment: "production",
    provider: "unknown",
    checkInterval: "120",
    sslMonitoring: true,
    monitoringEnabled: true,
  });

  const steps = [
    { num: 1, label: "Website Info", icon: Globe },
    { num: 2, label: "Monitoring", icon: Settings },
    { num: 3, label: "Alerts", icon: Bell },
  ];

  async function handleSubmit() {
    if (!formData.url || !formData.name) {
      toast.error("Name and URL are required");
      return;
    }
    setLoading(true);
    try {
      await websiteService.create({
        name: formData.name,
        url: formData.url.startsWith("http") ? formData.url : `https://${formData.url}`,
        client: formData.client || null,
        environment: formData.environment as never,
        provider: formData.provider as never,
        checkInterval: parseInt(formData.checkInterval),
        sslMonitoring: formData.sslMonitoring,
      });
      toast.success("Website added successfully", {
        description: `${formData.name} is now being monitored`,
      });
      onOpenChange(false);
      onSuccess?.();
      setStep(1);
      setFormData({ name: "", url: "", client: "", environment: "production", provider: "unknown", checkInterval: "120", sslMonitoring: true, monitoringEnabled: true });
    } catch {
      toast.error("Failed to add website");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#18181B] border-[#27272A] text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-zinc-50 font-display">Add Website</DialogTitle>
        </DialogHeader>

        {/* Steps */}
        <div className="flex items-center gap-2 pb-4">
          {steps.map((s, idx) => (
            <div key={s.num} className="flex items-center gap-2 flex-1">
              <button
                onClick={() => step > s.num && setStep(s.num as Step)}
                className={cn(
                  "flex items-center gap-1.5 text-xs font-medium transition-colors",
                  step === s.num
                    ? "text-blue-400"
                    : step > s.num
                    ? "text-emerald-400 cursor-pointer"
                    : "text-zinc-600 cursor-not-allowed"
                )}
              >
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0",
                  step === s.num
                    ? "bg-blue-600 text-white"
                    : step > s.num
                    ? "bg-emerald-500 text-white"
                    : "bg-zinc-800 text-zinc-600"
                )}>
                  {step > s.num ? "✓" : s.num}
                </div>
                {s.label}
              </button>
              {idx < steps.length - 1 && <div className="flex-1 h-px bg-zinc-800" />}
            </div>
          ))}
        </div>

        {/* Step 1: Website Info */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-300 text-xs">Website Name *</Label>
              <Input
                placeholder="Acme Corp - Main Website"
                value={formData.name}
                onChange={(e) => setFormData(d => ({ ...d, name: e.target.value }))}
                className="bg-[#27272A] border-[#3F3F46] text-zinc-100 placeholder:text-zinc-600"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300 text-xs">URL *</Label>
              <Input
                placeholder="https://example.com"
                value={formData.url}
                onChange={(e) => setFormData(d => ({ ...d, url: e.target.value }))}
                className="bg-[#27272A] border-[#3F3F46] text-zinc-100 placeholder:text-zinc-600 font-mono-data"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300 text-xs">Client / Organization</Label>
              <Input
                placeholder="Client name"
                value={formData.client}
                onChange={(e) => setFormData(d => ({ ...d, client: e.target.value }))}
                className="bg-[#27272A] border-[#3F3F46] text-zinc-100 placeholder:text-zinc-600"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-zinc-300 text-xs">Environment</Label>
                <Select value={formData.environment} onValueChange={(v) => setFormData(d => ({ ...d, environment: v }))}>
                  <SelectTrigger className="bg-[#27272A] border-[#3F3F46] text-zinc-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                    <SelectItem value="production" className="text-zinc-100">Production</SelectItem>
                    <SelectItem value="staging" className="text-zinc-100">Staging</SelectItem>
                    <SelectItem value="development" className="text-zinc-100">Development</SelectItem>
                    <SelectItem value="preview" className="text-zinc-100">Preview</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300 text-xs">Provider</Label>
                <Select value={formData.provider} onValueChange={(v) => setFormData(d => ({ ...d, provider: v }))}>
                  <SelectTrigger className="bg-[#27272A] border-[#3F3F46] text-zinc-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                    <SelectItem value="unknown" className="text-zinc-100">Unknown</SelectItem>
                    <SelectItem value="rocket_net" className="text-zinc-100">Rocket.net</SelectItem>
                    <SelectItem value="webflow" className="text-zinc-100">Webflow</SelectItem>
                    <SelectItem value="wordpress" className="text-zinc-100">WordPress</SelectItem>
                    <SelectItem value="vercel" className="text-zinc-100">Vercel</SelectItem>
                    <SelectItem value="aws" className="text-zinc-100">AWS</SelectItem>
                    <SelectItem value="shopify" className="text-zinc-100">Shopify</SelectItem>
                    <SelectItem value="custom_server" className="text-zinc-100">Custom Server</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Monitoring */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-[#27272A] rounded-lg">
              <div>
                <p className="text-sm font-medium text-zinc-100">Enable Monitoring</p>
                <p className="text-xs text-zinc-500 mt-0.5">Start checking this website immediately</p>
              </div>
              <Switch
                checked={formData.monitoringEnabled}
                onCheckedChange={(v) => setFormData(d => ({ ...d, monitoringEnabled: v }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300 text-xs">Check Interval</Label>
              <Select value={formData.checkInterval} onValueChange={(v) => setFormData(d => ({ ...d, checkInterval: v }))}>
                <SelectTrigger className="bg-[#27272A] border-[#3F3F46] text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                  <SelectItem value="60" className="text-zinc-100">Every 1 minute</SelectItem>
                  <SelectItem value="120" className="text-zinc-100">Every 2 minutes</SelectItem>
                  <SelectItem value="300" className="text-zinc-100">Every 5 minutes</SelectItem>
                  <SelectItem value="600" className="text-zinc-100">Every 10 minutes</SelectItem>
                  <SelectItem value="1800" className="text-zinc-100">Every 30 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#27272A] rounded-lg">
              <div>
                <p className="text-sm font-medium text-zinc-100">SSL Monitoring</p>
                <p className="text-xs text-zinc-500 mt-0.5">Alert when SSL certificate is expiring</p>
              </div>
              <Switch
                checked={formData.sslMonitoring}
                onCheckedChange={(v) => setFormData(d => ({ ...d, sslMonitoring: v }))}
              />
            </div>
          </div>
        )}

        {/* Step 3: Alerts */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <p className="text-sm font-medium text-emerald-300">Ready to add website</p>
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                Your website will be added with default notification settings. You can configure detailed alert rules after adding.
              </p>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-[#27272A] rounded-lg">
                <p className="text-xs text-zinc-500">Website Name</p>
                <p className="text-sm font-medium text-zinc-100 mt-0.5">{formData.name || "—"}</p>
              </div>
              <div className="p-3 bg-[#27272A] rounded-lg">
                <p className="text-xs text-zinc-500">URL</p>
                <p className="text-sm font-mono-data text-zinc-100 mt-0.5">{formData.url || "—"}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#27272A] rounded-lg">
                  <p className="text-xs text-zinc-500">Check Interval</p>
                  <p className="text-sm text-zinc-100 mt-0.5">{parseInt(formData.checkInterval) / 60}m</p>
                </div>
                <div className="p-3 bg-[#27272A] rounded-lg">
                  <p className="text-xs text-zinc-500">SSL Monitoring</p>
                  <p className="text-sm text-zinc-100 mt-0.5">{formData.sslMonitoring ? "Enabled" : "Disabled"}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="ghost"
            onClick={() => step > 1 ? setStep((step - 1) as Step) : onOpenChange(false)}
            className="text-zinc-400 hover:text-zinc-100"
          >
            {step > 1 ? "Back" : "Cancel"}
          </Button>
          <div className="flex items-center gap-2">
            {step < 3 ? (
              <Button
                onClick={() => setStep((step + 1) as Step)}
                disabled={step === 1 && (!formData.name || !formData.url)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? "Adding..." : "Add Website"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

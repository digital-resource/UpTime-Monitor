"use client";

import { useState } from "react";
import { RefreshCw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { OverviewDashboard } from "@/components/dashboard/OverviewDashboard";
import { AddWebsiteDialog } from "@/components/websites/AddWebsiteDialog";
import { toast } from "sonner";

export default function OverviewPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [runningChecks, setRunningChecks] = useState(false);

  async function handleRunChecks() {
    setRunningChecks(true);
    try {
      const res = await fetch("/api/checks/trigger", { method: "POST" });
      if (res.ok) {
        toast.success("Checks triggered", {
          description: "All websites are being checked now.",
        });
      } else {
        toast.error("Failed to trigger checks");
      }
    } catch {
      toast.error("Failed to trigger checks");
    } finally {
      setRunningChecks(false);
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader
        title="Overview"
        subtitle="Global infrastructure status and high-level metrics"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 bg-transparent"
              onClick={handleRunChecks}
              disabled={runningChecks}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-2${runningChecks ? " animate-spin" : ""}`} />
              {runningChecks ? "Running…" : "Run Checks"}
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="w-3.5 h-3.5 mr-2" />
              Add Website
            </Button>
          </>
        }
      />
      <div className="flex-1 p-8">
        <OverviewDashboard />
      </div>

      <AddWebsiteDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={() => {
          setAddOpen(false);
          toast.success("Website added successfully");
        }}
      />
    </div>
  );
}

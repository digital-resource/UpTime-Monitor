import { Suspense } from "react";
import { IntegrationsView } from "@/components/integrations/IntegrationsView";

export default function IntegrationsPage() {
  return (
    <div className="flex flex-col h-full">
      <Suspense fallback={null}>
        <IntegrationsView />
      </Suspense>
    </div>
  );
}

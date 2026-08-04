"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddWebsiteDialog } from "./AddWebsiteDialog";

export function AddWebsiteButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium gap-2"
      >
        <Plus className="w-4 h-4" />
        Add Website
      </Button>
      <AddWebsiteDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

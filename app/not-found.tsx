import Link from "next/link";
import { Monitor, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#18181B] border border-[#27272A] flex items-center justify-center mx-auto mb-6">
          <Monitor className="w-8 h-8 text-zinc-600" />
        </div>
        <h1
          className="text-4xl font-bold text-zinc-50 mb-2"
          style={{ fontFamily: "'Geist', sans-serif" }}
        >
          404
        </h1>
        <p className="text-zinc-500 text-sm mb-6">
          This page doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Link
          href="/overview"
          className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Overview
        </Link>
      </div>
    </div>
  );
}

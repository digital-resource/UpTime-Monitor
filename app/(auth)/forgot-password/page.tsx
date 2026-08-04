"use client";

import { useState } from "react";
import Link from "next/link";
import { Monitor, Mail, CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

type FormState = "idle" | "loading" | "success";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [submittedEmail, setSubmittedEmail] = useState("");

  const isLoading = formState === "loading";
  const isSuccess = formState === "success";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || isLoading) return;

    setFormState("loading");
    const trimmedEmail = email.trim();
    setSubmittedEmail(trimmedEmail);

    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    // Always show success regardless of whether the email exists —
    // avoids leaking which addresses have accounts.
    setFormState("success");
  }

  return (
    <div className="relative min-h-screen bg-[#09090B] flex items-center justify-center overflow-hidden">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Blue glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[700px] h-[700px] rounded-full bg-blue-600/5 blur-3xl" />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm mx-4">
        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
          {/* Brand header */}
          <div className="px-8 pt-8 pb-6 text-center border-b border-[#27272A]">
            <div className="flex justify-center mb-4">
              <div
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300",
                  isSuccess
                    ? "bg-emerald-600 shadow-emerald-600/25"
                    : "bg-blue-600 shadow-blue-600/25"
                )}
              >
                {isSuccess ? (
                  <CheckCircle2 className="w-6 h-6 text-white" />
                ) : (
                  <Monitor className="w-6 h-6 text-white" />
                )}
              </div>
            </div>
            <h1
              className="text-xl font-semibold text-zinc-50"
              style={{ fontFamily: "'Geist', 'Inter', sans-serif" }}
            >
              {isSuccess ? "Check your inbox" : "Reset Password"}
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              {isSuccess
                ? `We've sent reset instructions to ${submittedEmail}`
                : "Enter your email address and we'll send reset instructions"}
            </p>
          </div>

          {/* Content */}
          <div className="px-8 py-6">
            {isSuccess ? (
              <div className="space-y-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-xs text-emerald-300 leading-relaxed">
                  Reset instructions have been sent to{" "}
                  <span className="font-mono font-semibold">{submittedEmail}</span>. Check your
                  spam folder if you don&apos;t see it within a few minutes.
                </div>
                <Link href="/login">
                  <Button
                    variant="outline"
                    className="w-full h-10 border-[#27272A] text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 gap-2"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-zinc-100">Forgot your password?</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Enter the email address associated with your account.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs text-zinc-400 font-medium">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      autoComplete="email"
                      autoFocus
                      required
                      disabled={isLoading}
                      className={cn(
                        "pl-9 h-10 bg-[#09090B] border-[#27272A] text-zinc-200 text-sm",
                        "placeholder:text-zinc-600",
                        "focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  className="w-full h-10 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm shadow-lg shadow-blue-600/20 mt-2"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>

                <div className="text-center pt-1">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    <ArrowLeft className="w-3 h-3" /> Back to Sign In
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-[10px] text-zinc-700 mt-4">
          Monitoring Hub &copy; {new Date().getFullYear()} &mdash; Enterprise Edition
        </p>
      </div>
    </div>
  );
}

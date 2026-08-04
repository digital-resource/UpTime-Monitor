"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Monitor, Eye, EyeOff, Lock, User, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { mockLogin, isAuthenticated } from "@/lib/auth/mockAuth";

type FormState = "idle" | "loading" | "success" | "error" | "locked";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  // Redirect to overview if already logged in
  useEffect(() => {
    if (isAuthenticated()) {
      router.replace("/overview");
    }
  }, [router]);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [attempts, setAttempts] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (formState === "locked") return;
    if (!identifier.trim() || !password.trim()) return;

    setFormState("loading");
    setErrorMessage("");

    try {
      const result = await mockLogin(identifier.trim(), password);

      if (result.success) {
        setFormState("success");
        // Brief success flash then navigate
        setTimeout(() => {
          router.push("/overview");
        }, 600);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (newAttempts >= 5) {
          setFormState("locked");
          setErrorMessage("Account temporarily locked after 5 failed attempts. Contact IT Support.");
        } else {
          setFormState("error");
          setErrorMessage(
            `Invalid username or password. ${5 - newAttempts} attempt${5 - newAttempts === 1 ? "" : "s"} remaining before lockout.`
          );
        }
      }
    } catch {
      setFormState("error");
      setErrorMessage("An unexpected error occurred. Please try again.");
    }
  }

  const isLocked = formState === "locked";
  const isLoading = formState === "loading";
  const isSuccess = formState === "success";

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
        <div
          className={cn(
            "bg-[#18181B] border rounded-2xl shadow-2xl shadow-black/60 overflow-hidden transition-colors duration-300",
            isLocked ? "border-rose-500/30" : "border-[#27272A]"
          )}
        >
          {/* Brand header */}
          <div className="px-8 pt-8 pb-6 text-center border-b border-[#27272A]">
            <div className="flex justify-center mb-4">
              <div
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-colors",
                  isSuccess
                    ? "bg-emerald-600 shadow-emerald-600/25"
                    : isLocked
                    ? "bg-rose-600/80 shadow-rose-600/25"
                    : "bg-blue-600 shadow-blue-600/25"
                )}
              >
                {isSuccess ? (
                  <CheckCircle2 className="w-6 h-6 text-white" />
                ) : isLocked ? (
                  <Lock className="w-6 h-6 text-white" />
                ) : (
                  <Monitor className="w-6 h-6 text-white" />
                )}
              </div>
            </div>
            <h1
              className="text-xl font-semibold text-zinc-50"
              style={{ fontFamily: "'Geist', 'Inter', sans-serif" }}
            >
              Monitoring Hub
            </h1>
            <p className="text-xs text-zinc-500 mt-1">Enterprise Website Monitoring</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
            <div>
              <p className="text-sm font-medium text-zinc-100">
                {isLocked ? "Account Locked" : "Sign in to your account"}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {isLocked
                  ? "Contact IT Support to unlock your account."
                  : "Enter your username or email and password"}
              </p>
            </div>

            {/* Error banner */}
            {(formState === "error" || formState === "locked") && (
              <div className={cn(
                "flex items-start gap-2.5 px-3 py-2.5 rounded-lg border text-xs",
                isLocked
                  ? "bg-rose-500/10 border-rose-500/20 text-rose-300"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-300"
              )}>
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success banner */}
            {isSuccess && (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border bg-emerald-500/10 border-emerald-500/20 text-emerald-300 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Signed in successfully. Redirecting...</span>
              </div>
            )}

            {/* Username / Email */}
            <div className="space-y-1.5">
              <Label htmlFor="identifier" className="text-xs text-zinc-400 font-medium">
                Username or Email
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
                <Input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (formState === "error") setFormState("idle");
                  }}
                  placeholder="alex.rivera or alex.rivera@company.com"
                  autoComplete="username"
                  autoFocus
                  required
                  disabled={isLoading || isSuccess || isLocked}
                  className={cn(
                    "pl-9 h-10 bg-[#09090B] border-[#27272A] text-zinc-200 text-sm",
                    "placeholder:text-zinc-600",
                    "focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    formState === "error" && "border-rose-500/50"
                  )}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs text-zinc-400 font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (formState === "error") setFormState("idle");
                  }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  disabled={isLoading || isSuccess || isLocked}
                  className={cn(
                    "pl-9 pr-10 h-10 bg-[#09090B] border-[#27272A] text-zinc-200 text-sm",
                    "placeholder:text-zinc-600",
                    "focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    formState === "error" && "border-rose-500/50",
                    "[&]:font-mono [&]:tracking-widest [&]:placeholder:tracking-normal"
                  )}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                />
                {!isLocked && !isSuccess && (
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(v) => setRememberMe(v === true)}
                  disabled={isLocked || isSuccess}
                  className="border-zinc-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
                <Label
                  htmlFor="remember"
                  className="text-xs text-zinc-400 cursor-pointer select-none"
                >
                  Remember me
                </Label>
              </div>
              <Link
                href="/forgot-password"
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Sign in button */}
            <Button
              type="submit"
              disabled={isLoading || isSuccess || isLocked || !identifier.trim() || !password.trim()}
              className={cn(
                "w-full h-10 font-medium text-sm transition-all shadow-lg mt-2",
                isSuccess
                  ? "bg-emerald-600 hover:bg-emerald-600 text-white shadow-emerald-600/20"
                  : isLocked
                  ? "bg-zinc-700 text-zinc-400 cursor-not-allowed shadow-none"
                  : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20"
              )}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : isSuccess ? (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Signed in!
                </span>
              ) : isLocked ? (
                "Account Locked"
              ) : (
                "Sign In"
              )}
            </Button>

            {/* Login hint */}
            {!isLocked && (
              <div className="pt-1 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => {
                    setIdentifier("web1@yourdigitalresource.com");
                    if (formState === "error") setFormState("idle");
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg bg-[#09090B] border border-[#27272A] hover:border-zinc-600 transition-colors group"
                >
                  <span className="block text-[10px] text-zinc-500 mb-0.5">Sign in as</span>
                  <span
                    className="block text-[11px] text-zinc-300 group-hover:text-zinc-100 transition-colors"
                    style={{ fontFamily: "monospace" }}
                  >
                    web1@yourdigitalresource.com
                  </span>
                  <span className="block text-[9px] text-zinc-600">Super Admin</span>
                </button>
              </div>
            )}
          </form>

          {/* Footer */}
          <div className="px-8 pb-6 text-center">
            <p className="text-[11px] text-zinc-600">
              Need access?{" "}
              <button className="text-zinc-400 hover:text-zinc-200 transition-colors underline underline-offset-2">
                Contact IT Support
              </button>
            </p>
          </div>
        </div>

        <p className="text-center text-[10px] text-zinc-700 mt-4">
          Monitoring Hub &copy; {new Date().getFullYear()} &mdash; Enterprise Edition
        </p>
      </div>
    </div>
  );
}

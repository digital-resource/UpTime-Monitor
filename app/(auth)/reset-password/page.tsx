"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Monitor, Eye, EyeOff, Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

type FormState = "checking" | "invalid" | "idle" | "loading" | "success" | "error";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formState, setFormState] = useState<FormState>("checking");
  const [errorMessage, setErrorMessage] = useState("");

  // The recovery link redirects here with tokens in the URL fragment.
  // @supabase/ssr's browser client picks those up automatically and
  // establishes a session — we just need to wait for that to happen.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setFormState(session ? "idle" : "invalid");
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setFormState("idle");
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setFormState("error");
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setFormState("error");
      setErrorMessage("Passwords do not match.");
      return;
    }

    setFormState("loading");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setFormState("error");
      setErrorMessage(error.message);
      return;
    }

    setFormState("success");
    setTimeout(() => router.push("/overview"), 1200);
  }

  const isChecking = formState === "checking";
  const isInvalid = formState === "invalid";
  const isLoading = formState === "loading";
  const isSuccess = formState === "success";
  const isError = formState === "error";

  return (
    <div className="relative min-h-screen bg-[#09090B] flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[700px] h-[700px] rounded-full bg-blue-600/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm mx-4">
        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
          <div className="px-8 pt-8 pb-6 text-center border-b border-[#27272A]">
            <div className="flex justify-center mb-4">
              <div
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-colors",
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
              {isSuccess ? "Password updated" : "Set a new password"}
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              {isSuccess
                ? "Redirecting you to the dashboard..."
                : "Choose a new password for your account"}
            </p>
          </div>

          <div className="px-8 py-6">
            {isChecking ? (
              <div className="flex items-center justify-center gap-2.5 py-6 text-zinc-500 text-sm">
                <span className="w-4 h-4 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
                Verifying reset link...
              </div>
            ) : isInvalid ? (
              <div className="space-y-4">
                <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg border bg-rose-500/10 border-rose-500/20 text-rose-300 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>This reset link is invalid or has expired. Request a new one from the login page.</span>
                </div>
                <Button
                  onClick={() => router.push("/forgot-password")}
                  className="w-full h-10 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm"
                >
                  Request New Link
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {isError && (
                  <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg border bg-rose-500/10 border-rose-500/20 text-rose-300 text-xs">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}
                {isSuccess && (
                  <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border bg-emerald-500/10 border-emerald-500/20 text-emerald-300 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Your password has been updated.</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs text-zinc-400 font-medium">
                    New Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      autoFocus
                      required
                      disabled={isLoading || isSuccess}
                      className="pl-9 pr-10 h-10 bg-[#09090B] border-[#27272A] text-zinc-200 text-sm placeholder:text-zinc-600 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs text-zinc-400 font-medium">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      required
                      disabled={isLoading || isSuccess}
                      className="pl-9 h-10 bg-[#09090B] border-[#27272A] text-zinc-200 text-sm placeholder:text-zinc-600 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50 disabled:opacity-50"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || isSuccess || !password || !confirmPassword}
                  className="w-full h-10 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm shadow-lg shadow-blue-600/20 mt-2"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Updating...
                    </span>
                  ) : (
                    "Update Password"
                  )}
                </Button>
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

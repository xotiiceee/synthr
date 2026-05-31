"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { User, Mail, Lock, TrendingUp, Shield, Wallet } from "lucide-react";

const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type SignupData = z.infer<typeof signupSchema>;

function SynthrLogo() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="h-10 w-10">
      <rect width="40" height="40" rx="10" fill="#00d4aa" fillOpacity="0.15" />
      <path
        d="M12 28c0 0 4-16 8-16s4 8 0 8-4 8 0 8 8-16 8-16"
        stroke="#00d4aa"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const strength = useMemo(() => {
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  }, [password]);

  const labels = ["Weak", "Fair", "Good", "Strong", "Very Strong"];
  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-emerald-400",
    "bg-[#00d4aa]",
  ];

  if (!password) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              i < strength ? colors[strength - 1] : "bg-slate-700"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-slate-400">
        Strength: <span className="text-slate-300 font-medium">{labels[strength - 1] || "Weak"}</span>
      </p>
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<SignupData>({
    resolver: zodResolver(signupSchema),
  });

  const passwordValue = watch("password") || "";

  const onSubmit = async (data: SignupData) => {
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.message || "Something went wrong");
        return;
      }

      router.push("/auth/signin");
    } catch {
      setError("Something went wrong");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 flex flex-col lg:flex-row">
      {/* Form Section */}
      <div className="flex flex-1 items-center justify-center p-6 lg:p-12">
        <Card className="w-full max-w-md border-white/10 bg-slate-900/60 backdrop-blur-xl shadow-2xl">
          <CardContent className="p-8">
            <div className="flex flex-col items-center mb-8">
              <SynthrLogo />
              <h1 className="mt-4 text-3xl font-bold text-white tracking-tight">
                Create your account
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                Get started with synthr
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-300">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    className="pl-10 bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500 focus-visible:border-[#00d4aa] focus-visible:ring-[#00d4aa]/30"
                    {...register("name")}
                  />
                </div>
                {errors.name && (
                  <p className="text-sm text-red-400">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-10 bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500 focus-visible:border-[#00d4aa] focus-visible:ring-[#00d4aa]/30"
                    {...register("email")}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-400">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500 focus-visible:border-[#00d4aa] focus-visible:ring-[#00d4aa]/30"
                    {...register("password")}
                  />
                </div>
                <PasswordStrength password={passwordValue} />
                {errors.password && (
                  <p className="text-sm text-red-400">{errors.password.message}</p>
                )}
              </div>

              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#00d4aa] text-slate-950 font-semibold hover:bg-[#00b894] hover:shadow-[0_0_24px_rgba(0,212,170,0.35)] transition-all"
              >
                {isSubmitting ? "Creating account..." : "Create account"}
              </Button>

              <p className="text-center text-sm text-slate-400">
                Already have an account?{" "}
                <Link
                  href="/auth/signin"
                  className="text-[#00d4aa] hover:underline font-medium"
                >
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Decorative Side Panel */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden bg-gradient-to-br from-slate-800/40 to-slate-900/40 border-l border-white/5 items-center justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,212,170,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(0,212,170,0.05),transparent_50%)]" />

        <div className="relative z-10 max-w-md px-12 text-center">
          <div className="flex justify-center gap-6 mb-10">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[#00d4aa]/10 border border-[#00d4aa]/20">
              <TrendingUp className="h-7 w-7 text-[#00d4aa]" />
            </div>
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[#00d4aa]/10 border border-[#00d4aa]/20">
              <Wallet className="h-7 w-7 text-[#00d4aa]" />
            </div>
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[#00d4aa]/10 border border-[#00d4aa]/20">
              <Shield className="h-7 w-7 text-[#00d4aa]" />
            </div>
          </div>

          <h2 className="text-4xl font-bold text-white mb-6 tracking-tight">
            Track. Save. Grow.
          </h2>
          <p className="text-lg text-slate-400 leading-relaxed">
            Take control of your finances with smart insights, automated tracking, and beautiful visualizations—all in one place.
          </p>

          <div className="mt-12 flex items-center justify-center gap-3 text-sm text-slate-500">
            <span className="inline-block w-2 h-2 rounded-full bg-[#00d4aa] animate-pulse" />
            Trusted by thousands of users worldwide
          </div>
        </div>
      </div>
    </div>
  );
}

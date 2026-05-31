"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Lock, TrendingUp, Shield, Wallet } from "lucide-react";

const signinSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type SigninData = z.infer<typeof signinSchema>;

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

export default function SigninPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SigninData>({
    resolver: zodResolver(signinSchema),
  });

  const onSubmit = async (data: SigninData) => {
    setError("");
    const res = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (res?.error) {
      setError("Invalid email or password");
      return;
    }

    router.push("/dashboard");
    router.refresh();
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
                Welcome back
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                Sign in to your synthr account
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
                {isSubmitting ? "Signing in..." : "Sign in"}
              </Button>

              <p className="text-center text-sm text-slate-400">
                Don&apos;t have an account?{" "}
                <Link
                  href="/auth/signup"
                  className="text-[#00d4aa] hover:underline font-medium"
                >
                  Sign up
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

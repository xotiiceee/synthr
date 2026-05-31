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
import { User, Mail, Lock } from "lucide-react";

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
              i < strength ? colors[strength - 1] : "bg-zinc-700"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-zinc-400">
        Strength: <span className="text-zinc-300 font-medium">{labels[strength - 1] || "Weak"}</span>
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
    <div className="flex min-h-screen items-center justify-center bg-[#09090b] p-4">
      <Card className="w-full max-w-md border-white/5 bg-[#18181b] shadow-[0_0_20px_rgba(0,212,170,0.15)]">
        <CardContent className="p-8">
          <div className="flex flex-col items-center mb-8">
            <SynthrLogo />
            <h1 className="mt-4 text-3xl font-bold text-white tracking-tight">
              Create account
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Get started with synthr
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-zinc-400">
                Full Name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  className="pl-10 bg-[#18181b] border-white/10 text-white placeholder:text-zinc-400 focus-visible:border-[#00d4aa] focus-visible:ring-[#00d4aa]/30"
                  {...register("name")}
                />
              </div>
              {errors.name && (
                <p className="text-sm text-red-400">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-400">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="pl-10 bg-[#18181b] border-white/10 text-white placeholder:text-zinc-400 focus-visible:border-[#00d4aa] focus-visible:ring-[#00d4aa]/30"
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-400">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 bg-[#18181b] border-white/10 text-white placeholder:text-zinc-400 focus-visible:border-[#00d4aa] focus-visible:ring-[#00d4aa]/30"
                  {...register("password")}
                />
              </div>
              <PasswordStrength password={passwordValue} />
              {errors.password && (
                <p className="text-sm text-red-400">{errors.password.message}</p>
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 bg-[#00d4aa] text-black font-semibold rounded-lg hover:bg-[#00b894] hover:shadow-[0_0_24px_rgba(0,212,170,0.35)] transition-all"
            >
              {isSubmitting ? "Creating account..." : "Create account"}
            </Button>

            <p className="text-center text-sm text-zinc-400">
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
  );
}

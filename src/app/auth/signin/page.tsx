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
import { Mail, Lock } from "lucide-react";

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
    <div className="flex min-h-screen items-center justify-center bg-[#09090b] p-4">
      <Card className="w-full max-w-md border-white/5 bg-[#18181b] shadow-[0_0_20px_rgba(0,212,170,0.15)]">
        <CardContent className="p-8">
          <div className="flex flex-col items-center mb-8">
            <SynthrLogo />
            <h1 className="mt-4 text-3xl font-bold text-white tracking-tight">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Sign in to your synthr account
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>

            <p className="text-center text-sm text-zinc-400">
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
  );
}

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { TrendingUp, PiggyBank, Wallet, Receipt, BarChart3, Shield, ArrowRight, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const session = await auth();

  if (session?.user) {
    if (!session.user.setupComplete) redirect("/setup");
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00d4aa]/10">
            <div className="h-3.5 w-3.5 rounded-full bg-[#00d4aa]" />
          </div>
          <span className="text-lg font-bold tracking-tight">synthr</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/signin" className="text-sm text-zinc-400 hover:text-white transition-colors">Sign in</Link>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 rounded-lg bg-[#00d4aa] px-4 py-2 text-sm font-semibold text-black transition-all hover:shadow-[0_0_24px_rgba(0,212,170,0.25)]"
          >
            Get started
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 pt-28 pb-16 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-[#00d4aa] mb-8">
          <Sparkles className="h-4 w-4" />
          Your personal finance command center
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
          Track every{" "}
          <span className="bg-gradient-to-r from-[#00d4aa] to-[#22d3ee] bg-clip-text text-transparent">
            dollar.
          </span>
        </h1>
        <p className="text-lg text-zinc-400 max-w-2xl mb-10">
          The all-in-one finance tracker that helps you understand your spending,
          maximize your savings, and take control of your financial future.
        </p>
        <div className="flex gap-4">
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-[#00d4aa] px-8 py-3.5 text-base font-semibold text-black transition-all hover:shadow-[0_0_24px_rgba(0,212,170,0.25)]"
          >
            Start tracking free
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/auth/signin"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-8 py-3.5 text-base font-medium text-white hover:bg-white/5 transition-all"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* Stats ribbon */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <div className="rounded-2xl border border-white/5 bg-zinc-900 p-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: "10K+", label: "Transactions tracked" },
            { value: "$2M+", label: "Money managed" },
            { value: "5K+", label: "Active users" },
            { value: "99.9%", label: "Uptime" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl md:text-3xl font-bold tracking-tight text-white">{stat.value}</div>
              <div className="text-sm text-zinc-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Grid */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-bold tracking-tight text-center mb-4">Everything you need</h2>
        <p className="text-zinc-400 text-center mb-16 max-w-xl mx-auto">One dashboard. Complete control over your money.</p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: TrendingUp, title: "Savings Advisor", desc: "Get personalized savings recommendations based on your income and spending habits. See exactly how much you can safely save." },
            { icon: PiggyBank, title: "Smart Budgets", desc: "Set monthly budgets with real-time alerts. Track progress with visual indicators and get notified before you overspend." },
            { icon: Wallet, title: "Account Tracking", desc: "Monitor all your accounts in one place. Checking, savings, credit cards, investments — with running balances." },
            { icon: Receipt, title: "Transaction History", desc: "Log every expense automatically. Smart categorization detects where your money goes without manual input." },
            { icon: BarChart3, title: "Reports & Analytics", desc: "Beautiful charts and exportable reports. Understand spending patterns and track net worth over time." },
            { icon: Shield, title: "Debt Payoff Planner", desc: "Prioritize debts with avalanche or snowball strategies. See estimated payoff dates and save on interest." },
          ].map((feature) => (
            <div key={feature.title} className="group rounded-xl border border-white/5 bg-zinc-900 p-8 hover:border-[#00d4aa]/20 hover:shadow-[0_0_20px_rgba(0,212,170,0.15)] transition-all">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#00d4aa]/10 mb-5 group-hover:bg-[#00d4aa]/20 transition-colors">
                <feature.icon className="h-5 w-5 text-[#00d4aa]" />
              </div>
              <h3 className="text-lg font-semibold tracking-tight mb-2">{feature.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-white/5 py-24 px-6">
        <h2 className="text-3xl font-bold tracking-tight text-center mb-16">How it works</h2>
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-12">
          {[
            {
              step: "01",
              icon: Users,
              title: "Create your account",
              desc: "Sign up in seconds. The setup wizard gets you started with your accounts and preferences.",
            },
            {
              step: "02",
              icon: Layers,
              title: "Track your money",
              desc: "Log transactions or import from your bank. Smart categorization does the heavy lifting.",
            },
            {
              step: "03",
              icon: Zap,
              title: "Save smarter",
              desc: "Get personalized recommendations. See exactly where to cut spending and how much to save.",
            },
          ].map((item) => (
            <div key={item.step} className="text-center group">
              <span className="text-5xl font-black text-white/[0.04] select-none">{item.step}</span>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#00d4aa]/10 mb-4 -mt-4 group-hover:bg-[#00d4aa]/20 transition-colors">
                <item.icon className="h-5 w-5 text-[#00d4aa]" />
              </div>
              <h3 className="text-lg font-semibold tracking-tight mb-2">{item.title}</h3>
              <p className="text-sm text-zinc-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto text-center px-6 pb-24">
        <div className="rounded-2xl gradient-border p-12">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Ready to take control?</h2>
          <p className="text-zinc-400 mb-8 max-w-md mx-auto">Start tracking your finances today. No credit card required.</p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-[#00d4aa] px-8 py-3.5 text-base font-semibold text-black transition-all hover:shadow-[0_0_24px_rgba(0,212,170,0.25)]"
          >
            Start tracking free
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-sm text-zinc-500">
        synthr — Built for your financial future
      </footer>
    </div>
  );
}

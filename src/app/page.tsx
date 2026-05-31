import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { TrendingUp, PiggyBank, Wallet, Receipt, BarChart3, Shield, ArrowRight, Sparkles } from "lucide-react";

export default async function RootPage() {
  const session = await auth();

  if (session?.user) {
    if (!session.user.setupComplete) redirect("/setup");
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" rx="20" fill="#0f172a"/><path d="M20 60 Q 20 80 40 80 L 50 80 Q 70 80 70 60 Q 70 40 50 40 L 45 40 Q 35 40 35 30 Q 35 20 45 20 L 55 20 Q 75 20 75 40" stroke="#00d4aa" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
          <span className="text-xl font-bold">synthr</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/signin" className="text-sm text-muted-foreground hover:text-white transition-colors">Sign in</Link>
          <Link href="/auth/signup" className="inline-flex items-center gap-2 rounded-lg bg-[#00d4aa] px-4 py-2 text-sm font-semibold text-slate-950 hover:shadow-[0_0_24px_rgba(0,212,170,0.35)] transition-all">Get started <ArrowRight className="h-4 w-4"/></Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 py-24 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-[#00d4aa] mb-8">
          <Sparkles className="h-4 w-4" />
          Your personal finance command center
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
          Track. Save.
          <span className="text-[#00d4aa]"> Grow.</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10">
          The all-in-one finance tracker that helps you understand your spending, 
          maximize your savings, and take control of your financial future.
        </p>
        <div className="flex gap-4">
          <Link href="/auth/signup" className="inline-flex items-center gap-2 rounded-xl bg-[#00d4aa] px-8 py-4 text-lg font-bold text-slate-950 hover:shadow-[0_0_32px_rgba(0,212,170,0.4)] transition-all">Start free <ArrowRight className="h-5 w-5"/></Link>
          <Link href="/auth/signin" className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-8 py-4 text-lg font-semibold hover:bg-white/5 transition-all">Sign in</Link>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-bold text-center mb-4">Everything you need</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-xl mx-auto">One dashboard. Complete control over your money.</p>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: TrendingUp, title: "Savings Advisor", desc: "Get personalized savings recommendations based on your income and spending habits. See exactly how much you can safely save.", color: "text-[#00d4aa]" },
            { icon: PiggyBank, title: "Smart Budgets", desc: "Set monthly budgets with real-time alerts. Track progress with visual indicators and get notified before you overspend.", color: "text-emerald-400" },
            { icon: Wallet, title: "Account Tracking", desc: "Monitor all your accounts in one place. Checking, savings, credit cards, investments — with running balances.", color: "text-blue-400" },
            { icon: Receipt, title: "Transaction History", desc: "Log every expense automatically. Smart categorization detects where your money goes without manual input.", color: "text-amber-400" },
            { icon: BarChart3, title: "Reports & Analytics", desc: "Beautiful charts and exportable reports. Understand spending patterns and track net worth over time.", color: "text-purple-400" },
            { icon: Shield, title: "Debt Payoff Planner", desc: "Prioritize debts with avalanche or snowball strategies. See estimated payoff dates and save on interest.", color: "text-rose-400" },
          ].map((feature) => (
            <div key={feature.title} className="group rounded-2xl border border-white/10 bg-slate-800/30 p-8 hover:bg-slate-800/50 hover:border-[#00d4aa]/20 transition-all">
              <div className={`inline-flex rounded-xl bg-white/5 p-3 mb-4 group-hover:bg-[#00d4aa]/10 transition-colors`}>
                <feature.icon className={`h-6 w-6 ${feature.color}`} />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-white/5 py-24 px-6">
        <h2 className="text-3xl font-bold text-center mb-16">How it works</h2>
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8">
          {[
            { step: "01", title: "Create your account", desc: "Sign up in seconds. The setup wizard gets you started with your accounts and preferences." },
            { step: "02", title: "Track your money", desc: "Log transactions or import from your bank. Smart categorization does the heavy lifting." },
            { step: "03", title: "Save smarter", desc: "Get personalized recommendations. See exactly where to cut spending and how much to save." },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <span className="text-5xl font-black text-white/5">{item.step}</span>
              <h3 className="text-lg font-semibold mt-4 mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto text-center px-6 pb-24">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-slate-800/50 to-slate-900/50 p-12">
          <h2 className="text-3xl font-bold mb-4">Ready to take control?</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">Start tracking your finances today. No credit card required.</p>
          <Link href="/auth/signup" className="inline-flex items-center gap-2 rounded-xl bg-[#00d4aa] px-8 py-4 text-lg font-bold text-slate-950 hover:shadow-[0_0_32px_rgba(0,212,170,0.4)] transition-all">Get started free <ArrowRight className="h-5 w-5"/></Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-sm text-muted-foreground">
        synthr — Built for your financial future
      </footer>
    </div>
  );
}

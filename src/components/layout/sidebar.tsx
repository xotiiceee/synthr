"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Receipt,
  Target,
  Wallet,
  PiggyBank,
  TrendingUp,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  Landmark,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NotificationsBell } from "@/components/notifications/notifications-bell";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/budget-planner", label: "Plan", icon: Target },
  { href: "/monthly-expenses", label: "Monthly", icon: Receipt },
  { href: "/budgets", label: "Budgets", icon: PiggyBank },
  { href: "/savings-advisor", label: "Savings Advisor", icon: TrendingUp },
  { href: "/investments", label: "Investments", icon: Landmark },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-col border-r border-border bg-card md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <svg width="28" height="28" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="120" height="120" rx="28" fill="#0f172a"/>
          <path d="M30 38 L75 38" stroke="#00d4aa" strokeWidth="3.5" strokeLinecap="round"/>
          <path d="M75 38 C95 38 95 60 75 60 L45 60" stroke="#00d4aa" strokeWidth="3.5" strokeLinecap="round"/>
          <path d="M45 60 C25 60 25 82 45 82 L90 82" stroke="#00d4aa" strokeWidth="3.5" strokeLinecap="round"/>
          <path d="M90 82 L82 76 M90 82 L82 88" stroke="#00d4aa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="text-xl font-bold tracking-tight">synthr</span>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-4">
        <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground" onClick={() => signOut({ callbackUrl: "/auth/signin" })}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <Sheet>
      <SheetTrigger>
        <Button variant="ghost" size="icon" className="md:hidden">
          <LayoutDashboard className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 bg-card p-0">
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <span className="text-xl font-bold tracking-tight">synthr</span>
        </div>
        <nav className="space-y-1 p-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

export function DashboardHeader() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-6">
      <div className="flex items-center gap-4">
        <MobileNav />
        <h1 className="text-lg font-semibold md:text-xl">Dashboard</h1>
      </div>
      <div className="flex items-center gap-4">
        <NotificationsBell />
      </div>
    </header>
  );
}

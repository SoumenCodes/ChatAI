"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  Settings,
  User,
  Key,
  CreditCard,
  LogOut,
  Bot,
  Sun,
  Moon
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  currentProjectId?: string;
}

export function Sidebar({ currentProjectId }: SidebarProps) {
  const pathname = usePathname();
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const shouldBeDark = savedTheme !== "light";
    setIsDarkMode(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = !isDarkMode;
    setIsDarkMode(nextTheme);
    if (nextTheme) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const mainNav = [
    { name: "Overview", href: "/", icon: LayoutDashboard },
    { name: "Projects", href: "/", icon: FolderKanban, active: pathname === "/" || pathname.startsWith("/project") },
    { name: "Documents", href: "#", icon: FileText, disabled: true },
    { name: "Settings", href: "#", icon: Settings, disabled: true },
  ];

  const accountNav = [
    { name: "Profile", href: "#", icon: User, disabled: true },
    { name: "API Keys", href: "#", icon: Key, disabled: true },
    { name: "Billing", href: "#", icon: CreditCard, disabled: true },
    { name: "Logout", href: "#", icon: LogOut, disabled: true },
  ];

  return (
    <div className="flex h-screen w-64 flex-col bg-slate-900 text-white border-r border-slate-800">
      {/* Logo Area */}
      <Link href="/" className="flex h-16 items-center gap-2 px-6 border-b border-slate-800 hover:bg-slate-800/20 transition-colors cursor-pointer">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
          <Bot className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-sm leading-tight">SoumenWidget</h1>
          <span className="text-[10px] text-slate-400 font-medium">RAG Chat Platform</span>
        </div>
      </Link>

      {/* Nav Content */}
      <div className="flex flex-1 flex-col justify-between overflow-y-auto px-4 py-6">
        <div>
          <span className="px-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Platform
          </span>
          <nav className="mt-2 space-y-1">
            {mainNav.map((item) => {
              const isActive = item.active !== undefined ? item.active : pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.disabled ? "#" : item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200",
                    item.disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <item.icon className="h-4.5 w-4.5 flex-shrink-0" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div>
          <span className="px-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Account
          </span>
          <nav className="mt-2 space-y-1">
            {accountNav.map((item) => (
              <Link
                key={item.name}
                href={item.disabled ? "#" : item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                  "text-slate-400 hover:bg-slate-800 hover:text-slate-200",
                  item.disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <item.icon className="h-4.5 w-4.5 flex-shrink-0" />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>

        {/* Theme Toggle at Bottom */}
        <div className="mt-6 border-t border-slate-800 pt-4">
          <button
            onClick={toggleTheme}
            className="flex w-full items-center justify-between rounded-lg bg-slate-800/50 hover:bg-slate-800 hover:text-slate-100 px-3 py-2 text-sm font-medium transition-all duration-200 text-slate-300"
          >
            <div className="flex items-center gap-3">
              {isDarkMode ? (
                <>
                  <Moon className="h-4.5 w-4.5 text-yellow-400 fill-yellow-400/20" />
                  <span>Dark Mode</span>
                </>
              ) : (
                <>
                  <Sun className="h-4.5 w-4.5 text-amber-500" />
                  <span>Light Mode</span>
                </>
              )}
            </div>
            <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
          </button>
        </div>

      </div>
    </div>
  );
}

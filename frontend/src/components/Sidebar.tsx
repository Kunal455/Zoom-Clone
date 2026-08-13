"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Video, Users, History, Settings } from "lucide-react";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Meetings", href: "/meetings", icon: Video },
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Recordings", href: "/recordings", icon: History },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  // Determine if we should show the sidebar (hide on meeting room, join page, auth pages)
  const hideSidebarPaths = ["/join", "/meeting", "/login", "/signup"];
  if (hideSidebarPaths.some(path => pathname?.startsWith(path))) {
    return null;
  }

  return (
    <aside className="w-64 bg-[#0a0d14] border-r border-[var(--color-border)] h-screen flex flex-col pt-6 hidden md:flex">
      <div className="px-6 mb-8 flex items-center gap-2">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <Video className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-semibold text-white tracking-wide">MeetFlow</span>
      </div>
      
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-200 ${
                isActive
                  ? "bg-[#151a23] text-blue-500 font-medium"
                  : "text-gray-400 hover:text-gray-200 hover:bg-[#121622]"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

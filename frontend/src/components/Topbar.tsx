"use client";

import { Bell, Search, Settings, LogOut } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

interface Notification {
  id: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  const notifRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // WebSocket for real-time notifications
  useEffect(() => {
    if (!user) return;
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/api/ws/notifications";
    const ws = new WebSocket(`${wsUrl}/${user.id}`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "notification") {
          const newNotif: Notification = {
            id: Date.now().toString() + Math.random().toString(),
            message: data.message,
            timestamp: data.timestamp,
            read: false,
          };
          setNotifications(prev => [newNotif, ...prev]);
        }
      } catch (e) {
        console.error("Failed to parse notification", e);
      }
    };
    
    return () => { ws.close(); };
  }, [user]);

  // Hide topbar on full-screen pages like Join, Meeting Room, or Auth pages
  const hideTopbarPaths = ["/join", "/meeting", "/login", "/signup"];
  if (hideTopbarPaths.some(path => pathname?.startsWith(path))) {
    return null;
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <header className="h-20 border-b border-[var(--color-border)] bg-[var(--color-background)] flex items-center justify-between px-8 relative">
      <div className="flex-1 max-w-xl">
        <div className="relative group">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            placeholder="Search meetings, contacts..."
            className="w-full bg-[#121622] text-gray-200 pl-12 pr-4 py-3 rounded-2xl border border-transparent focus:border-blue-500/50 focus:bg-[#151a23] outline-none transition-all placeholder-gray-500"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        
        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="text-gray-400 hover:text-white transition-colors relative focus:outline-none"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full border border-[var(--color-background)] px-1">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 top-full mt-4 w-80 bg-[#111520] border border-[var(--color-border)] rounded-xl shadow-2xl overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-[#151a23]">
                <h3 className="font-medium text-white">Notifications</h3>
                <div className="flex gap-2">
                  <button onClick={markAllAsRead} className="text-gray-400 hover:text-white p-1 rounded">
                    <span className="text-xs">Mark Read</span>
                  </button>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((notif) => (
                  <div key={notif.id} className="px-4 py-3 border-b border-gray-800/50">
                    <p className="text-sm text-gray-300">{notif.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <Link href="/settings" className="text-gray-400 hover:text-white transition-colors">
          <Settings className="w-5 h-5" />
        </Link>
        
        {/* User Profile */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-3 hover:bg-[var(--color-surface)] p-1.5 pr-3 rounded-full transition-colors border border-transparent hover:border-[var(--color-border)] focus:outline-none"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-sm font-semibold text-white shadow-md">
              {user ? user.name.substring(0, 2).toUpperCase() : "U"}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-gray-200">{user ? user.name : "Loading..."}</p>
              <p className="text-xs text-gray-500">Free Plan</p>
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-[#12151C] border border-gray-800 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-2 border-b border-gray-800 mb-2">
                <p className="text-sm text-white font-medium">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              <button 
                onClick={() => {
                  setShowProfileMenu(false);
                  logout();
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:text-red-400 hover:bg-[#1a202c] transition-colors text-left"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

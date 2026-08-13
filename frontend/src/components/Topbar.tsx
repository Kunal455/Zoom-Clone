"use client";

import { Search, Bell, Settings, LogOut, User, Check, Trash2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";

interface Notification {
  id: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [profile, setProfile] = useState<{name: string, photoUrl: string | null}>({ name: "Kunal Kumar", photoUrl: null });
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch profile
  useEffect(() => {
    fetch(process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/users/profile` : "http://localhost:8000/api/users/profile")
      .then(res => res.json())
      .then(data => {
        if (data.name) setProfile(prev => ({ ...prev, name: data.name }));
        if (data.photo_url) setProfile(prev => ({ ...prev, photoUrl: data.photo_url }));
      })
      .catch(err => console.error("Failed to load profile", err));
  }, []);

  // WebSocket for real-time notifications
  useEffect(() => {
    const userId = "kunal"; // Hardcoded for this assignment until Auth is added
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/api/ws/notifications";
    const ws = new WebSocket(`${wsUrl}/${userId}`);

    ws.onopen = () => console.log("WebSocket Connected for notifications");
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
    
    // In React strict mode, the component unmounts and remounts immediately,
    // which closes the socket before it opens. We swallow this error to avoid console noise.
    ws.onerror = () => {}; 
    ws.onclose = () => {};

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, []);

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

  const toggleNotifDropdown = () => {
    setIsNotifOpen(!isNotifOpen);
    if (!isNotifOpen && unreadCount > 0) {
      // Optional: automatically mark all as read when opened
      // markAllAsRead(); 
    }
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
            onClick={toggleNotifDropdown}
            className="text-gray-400 hover:text-white transition-colors relative focus:outline-none"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full border border-[var(--color-background)] px-1">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {isNotifOpen && (
            <div className="absolute right-0 top-full mt-4 w-80 bg-[#111520] border border-[var(--color-border)] rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-[#151a23]">
                <h3 className="font-medium text-white">Notifications</h3>
                <div className="flex gap-2">
                  <button onClick={markAllAsRead} className="text-gray-400 hover:text-white p-1 rounded" title="Mark all as read">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={clearNotifications} className="text-gray-400 hover:text-red-400 p-1 rounded" title="Clear all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-gray-500">
                    No new notifications
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        className={`px-4 py-3 border-b border-gray-800/50 hover:bg-[#1a202c] transition-colors ${!notif.read ? 'bg-[#151a23]/50' : ''}`}
                        onClick={() => {
                          if (!notif.read) {
                            setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                          }
                        }}
                      >
                        <p className={`text-sm mb-1 ${!notif.read ? 'text-white font-medium' : 'text-gray-300'}`}>{notif.message}</p>
                        <p className="text-[10px] text-gray-500">
                          {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <Link href="/settings" className="text-gray-400 hover:text-white transition-colors">
          <Settings className="w-5 h-5" />
        </Link>
        
        <div className="relative" ref={dropdownRef}>
          <div 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 pl-6 border-l border-[var(--color-border)] cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm border-2 border-transparent hover:border-blue-500 transition-all overflow-hidden shrink-0">
              {profile.photoUrl ? (
                <img src={profile.photoUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                profile.name.substring(0, 2).toUpperCase()
              )}
            </div>
            <span className="text-gray-200 font-medium text-sm hidden sm:block truncate max-w-[150px]">{profile.name}</span>
          </div>

          {/* Profile Dropdown */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-[#111520] border border-[var(--color-border)] rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <Link 
                href="/settings"
                onClick={() => setIsDropdownOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-[#1a202c] transition-colors"
              >
                <User className="w-4 h-4" />
                Update Profile
              </Link>
              <button 
                onClick={() => {
                  setIsDropdownOpen(false);
                  router.push('/login');
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

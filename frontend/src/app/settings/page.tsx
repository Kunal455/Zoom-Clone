"use client";

import { Settings as SettingsIcon, LogOut, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";

export default function Settings() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [name, setName] = useState("Kunal Kumar");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [lastSaved, setLastSaved] = useState<string>("Never");

  // Audio & Video
  const [microphone, setMicrophone] = useState("MacBook Pro Microphone (Built-in)");
  const [camera, setCamera] = useState("FaceTime HD Camera (Built-in)");
  const [mirrorVideo, setMirrorVideo] = useState(true);
  const [hdVideo, setHdVideo] = useState(true);

  // Notifications
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [meetingReminders, setMeetingReminders] = useState(true);
  const [chatNotifs, setChatNotifs] = useState(false);

  // General
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguage] = useState("English (US)");
  const [timeZone, setTimeZone] = useState("Asia/Kolkata (GMT+5:30)");

  useEffect(() => {
    // Load local settings
    const savedSettings = localStorage.getItem('userSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        if (parsed.microphone !== undefined) setMicrophone(parsed.microphone);
        if (parsed.camera !== undefined) setCamera(parsed.camera);
        if (parsed.mirrorVideo !== undefined) setMirrorVideo(parsed.mirrorVideo);
        if (parsed.hdVideo !== undefined) setHdVideo(parsed.hdVideo);
        if (parsed.emailNotifs !== undefined) setEmailNotifs(parsed.emailNotifs);
        if (parsed.meetingReminders !== undefined) setMeetingReminders(parsed.meetingReminders);
        if (parsed.chatNotifs !== undefined) setChatNotifs(parsed.chatNotifs);
        if (parsed.darkMode !== undefined) setDarkMode(parsed.darkMode);
        if (parsed.language !== undefined) setLanguage(parsed.language);
        if (parsed.timeZone !== undefined) setTimeZone(parsed.timeZone);
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
    
    // Fetch existing profile
    fetch(process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/users/profile` : "http://localhost:8000/api/users/profile")
      .then(res => res.json())
      .then(data => {
        if (data.name) setName(data.name);
        if (data.photo_url) setPhotoUrl(data.photo_url);
      })
      .catch(err => console.error("Failed to load profile", err));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setToast({ message: "File is too large. Max 5MB.", type: "error" });
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setToast(null);
    try {
      const formData = new FormData();
      formData.append("name", name);
      if (selectedFile) {
        formData.append("photo", selectedFile);
      }

      const res = await fetch(process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/users/profile` : "http://localhost:8000/api/users/profile", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to save profile");
      }

      const data = await res.json();
      setPhotoUrl(data.photo_url);
      setName(data.name);

      // Save local settings
      localStorage.setItem('userSettings', JSON.stringify({
        microphone, camera, mirrorVideo, hdVideo,
        emailNotifs, meetingReminders, chatNotifs,
        darkMode, language, timeZone
      }));
      setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

      setToast({ message: "Settings updated successfully!", type: "success" });
    } catch (err: any) {
      setToast({ message: err.message, type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-8">
        <SettingsIcon className="w-7 h-7 text-gray-200" />
        <h1 className="text-[28px] font-bold text-gray-200">Settings</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column */}
        <div className="space-y-8">
          
          {/* Profile Settings */}
          <div className="bg-[#111520] border border-[var(--color-border)] rounded-2xl p-6 relative">
            {toast && (
              <div className={`absolute top-4 right-4 px-4 py-2 rounded-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                {toast.message}
              </div>
            )}
            <h3 className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-6">Profile Settings</h3>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-semibold text-xl border-2 border-gray-700 overflow-hidden shrink-0">
                  {(previewUrl || photoUrl) ? (
                    <img src={previewUrl || photoUrl!} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    name.substring(0, 2).toUpperCase()
                  )}
                </div>
                <div className="flex-1 max-w-[200px]">
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="font-semibold text-gray-200 text-lg bg-transparent border-b border-transparent hover:border-gray-600 focus:border-blue-500 focus:outline-none w-full px-1 py-0.5 transition-colors"
                    placeholder="Display Name"
                  />
                  <p className="text-sm text-gray-500 px-1 mt-1">kunal@example.com</p>
                </div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/jpeg,image/png,image/webp" 
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-[#1a202c] hover:bg-[#252f3f] border border-[var(--color-border)] text-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0"
              >
                Change Photo
              </button>
            </div>
            
            <div className="pt-4 border-t border-gray-800 flex justify-end">
              <button 
                onClick={() => router.push('/login')}
                className="text-[#FF4D4D] hover:text-red-400 font-medium text-sm transition-colors flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Log Out
              </button>
            </div>
          </div>

          {/* Audio & Video */}
          <div className="bg-[#111520] border border-[var(--color-border)] rounded-2xl p-6">
            <h3 className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-6">Audio & Video</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase mb-2">Default Microphone</label>
                <select 
                  value={microphone}
                  onChange={(e) => setMicrophone(e.target.value)}
                  className="w-full bg-[#1a202c] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm text-gray-300 focus:outline-none focus:border-blue-500 appearance-none outline-none"
                >
                  <option>MacBook Pro Microphone (Built-in)</option>
                  <option>External Microphone (USB)</option>
                  <option>System Default</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase mb-2">Default Camera</label>
                <select 
                  value={camera}
                  onChange={(e) => setCamera(e.target.value)}
                  className="w-full bg-[#1a202c] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm text-gray-300 focus:outline-none focus:border-blue-500 appearance-none outline-none"
                >
                  <option>FaceTime HD Camera (Built-in)</option>
                  <option>External Webcam (1080p)</option>
                  <option>System Default</option>
                </select>
              </div>

              <div className="pt-2 space-y-4">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => setMirrorVideo(!mirrorVideo)}>
                  <span className="text-sm font-medium text-gray-200">Mirror my video</span>
                  <div className={`w-11 h-6 rounded-full relative shadow-inner transition-colors ${mirrorVideo ? 'bg-blue-600' : 'bg-[#2a303f]'}`}>
                    <div className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-all ${mirrorVideo ? 'right-1' : 'left-1'}`}></div>
                  </div>
                </div>
                <div className="flex items-center justify-between cursor-pointer" onClick={() => setHdVideo(!hdVideo)}>
                  <span className="text-sm font-medium text-gray-200">HD Video (1080p stream)</span>
                  <div className={`w-11 h-6 rounded-full relative shadow-inner transition-colors ${hdVideo ? 'bg-blue-600' : 'bg-[#2a303f]'}`}>
                    <div className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-all ${hdVideo ? 'right-1' : 'left-1'}`}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          
          {/* Notifications */}
          <div className="bg-[#111520] border border-[var(--color-border)] rounded-2xl p-6">
            <h3 className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-6">Notifications</h3>
            
            <div className="space-y-5">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setEmailNotifs(!emailNotifs)}>
                <div>
                  <h4 className="text-sm font-medium text-gray-200">Email notifications</h4>
                  <p className="text-xs text-gray-500 mt-1">Get summaries and weekly reports</p>
                </div>
                <div className={`w-11 h-6 rounded-full relative shadow-inner transition-colors ${emailNotifs ? 'bg-blue-600' : 'bg-[#2a303f]'}`}>
                  <div className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-all ${emailNotifs ? 'right-1' : 'left-1'}`}></div>
                </div>
              </div>
              
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setMeetingReminders(!meetingReminders)}>
                <div>
                  <h4 className="text-sm font-medium text-gray-200">Meeting reminders</h4>
                  <p className="text-xs text-gray-500 mt-1">Send alert 10 minutes before syncs</p>
                </div>
                <div className={`w-11 h-6 rounded-full relative shadow-inner transition-colors ${meetingReminders ? 'bg-blue-600' : 'bg-[#2a303f]'}`}>
                  <div className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-all ${meetingReminders ? 'right-1' : 'left-1'}`}></div>
                </div>
              </div>

              <div className="flex items-center justify-between cursor-pointer" onClick={() => setChatNotifs(!chatNotifs)}>
                <div>
                  <h4 className="text-sm font-medium text-gray-200">Chat notifications</h4>
                  <p className="text-xs text-gray-500 mt-1">Notify for new messages during call</p>
                </div>
                <div className={`w-11 h-6 rounded-full relative shadow-inner transition-colors ${chatNotifs ? 'bg-blue-600' : 'bg-[#2a303f]'}`}>
                  <div className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-all ${chatNotifs ? 'right-1' : 'left-1'}`}></div>
                </div>
              </div>
            </div>
          </div>

          {/* General Configurations */}
          <div className="bg-[#111520] border border-[var(--color-border)] rounded-2xl p-6">
            <h3 className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-6">General Configurations</h3>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setDarkMode(!darkMode)}>
                <span className="text-sm font-medium text-gray-200">Dark Mode theme</span>
                <div className={`w-11 h-6 rounded-full relative shadow-inner transition-colors ${darkMode ? 'bg-blue-600' : 'bg-[#2a303f]'}`}>
                  <div className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-all ${darkMode ? 'right-1' : 'left-1'}`}></div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase mb-2">System Language</label>
                <select 
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-[#1a202c] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm text-gray-300 focus:outline-none focus:border-blue-500 appearance-none outline-none"
                >
                  <option>English (US)</option>
                  <option>English (UK)</option>
                  <option>Spanish</option>
                  <option>French</option>
                  <option>German</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase mb-2">Time Zone</label>
                <select 
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  className="w-full bg-[#1a202c] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm text-gray-300 focus:outline-none focus:border-blue-500 appearance-none outline-none"
                >
                  <option>Asia/Kolkata (GMT+5:30)</option>
                  <option>America/New_York (GMT-4:00)</option>
                  <option>America/Los_Angeles (GMT-7:00)</option>
                  <option>Europe/London (GMT+1:00)</option>
                  <option>Europe/Paris (GMT+2:00)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Save Action */}
          <div className="bg-[#111520] border border-[var(--color-border)] rounded-2xl p-6 flex items-center justify-between">
            <span className="text-sm text-gray-500">Last saved: {lastSaved}</span>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-medium px-6 py-2.5 rounded-xl transition-colors shadow-lg shadow-blue-500/20 text-sm flex items-center gap-2"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

"use client";

import { X, ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getMeeting } from "@/lib/api";

function JoinMeetingContent() {
  const [meetingId, setMeetingId] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams?.get("error") === "invalid_meeting") {
      setError(true);
    }
  }, [searchParams]);

  const handleJoin = async () => {
    if (!meetingId.trim() || !name.trim()) return;
    
    // Clean up meeting ID (remove spaces, hyphens, 'MF-')
    const cleanId = meetingId.replace(/[^0-9]/g, '');
    
    if (cleanId.length !== 9) {
      setError(true);
      return;
    }

    setLoading(true);
    try {
      await getMeeting(cleanId);
      router.push(`/meeting/${cleanId}?name=${encodeURIComponent(name)}`);
    } catch (err) {
      setError(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
      <div className="w-full max-w-[460px] px-6">
        
        {/* Header section */}
        <div className="flex flex-col items-center mb-10">
          <Link href="/" className="w-12 h-12 bg-blue-500 hover:bg-blue-600 transition-colors rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
            <X className="w-6 h-6 text-white" />
          </Link>
          <h1 className="text-[28px] font-bold text-white mb-2">Join Meeting</h1>
          <p className="text-gray-400 text-sm">Enter meeting credentials to connect instantly</p>
        </div>

        {/* Form Box */}
        <div className="bg-[#111520] border border-[var(--color-border)] rounded-2xl p-8">
          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleJoin(); }}>
            
            {/* Meeting ID Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Meeting ID or Link
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={meetingId}
                  onChange={(e) => {
                    setMeetingId(e.target.value);
                    if (error) setError(false);
                  }}
                  className={`w-full bg-[#1a202c] text-white px-4 py-3 rounded-xl border ${
                    error ? "border-red-500 focus:border-red-500" : "border-transparent focus:border-blue-500"
                  } focus:outline-none transition-colors pr-10`}
                  placeholder="e.g. MF-123-456-789"
                />
                {error && (
                  <AlertCircle className="w-5 h-5 text-red-500 absolute right-3 top-1/2 -translate-y-1/2" />
                )}
              </div>
              {error && (
                <p className="text-red-500 text-xs mt-2">Invalid Meeting ID. Please check and try again.</p>
              )}
            </div>

            {/* Name Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="E.g. Arjun Singh"
                className="w-full bg-[#1a202c] text-white px-4 py-3 rounded-xl border border-transparent focus:border-blue-500 focus:outline-none transition-colors placeholder-gray-600"
              />
            </div>

            {/* Join Button */}
            <button
              type="submit"
              disabled={loading || !meetingId || !name}
              className="w-full flex justify-center items-center bg-blue-500 hover:bg-blue-400 disabled:bg-blue-500/50 text-white font-medium py-3.5 rounded-xl transition-colors shadow-lg shadow-blue-500/20"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Join Meeting"}
            </button>

            {/* Back Link */}
            <div className="pt-2 text-center">
              <Link 
                href="/" 
                className="inline-flex items-center gap-2 text-sm text-blue-500 hover:text-blue-400 font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Link>
            </div>
            
          </form>
        </div>
      </div>
    </div>
  );
}

export default function JoinMeeting() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>}>
      <JoinMeetingContent />
    </Suspense>
  );
}

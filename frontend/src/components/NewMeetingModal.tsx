"use client";

import { X, Video, Copy, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { createMeeting } from "@/lib/api";
import { useRouter } from "next/navigation";

interface NewMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewMeetingModal({ isOpen, onClose }: NewMeetingModalProps) {
  const [loading, setLoading] = useState(false);
  const [meetingId, setMeetingId] = useState("");
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const inviteLink = typeof window !== 'undefined' && meetingId 
    ? `${window.location.origin}/meeting/${meetingId}` 
    : `meetflow.app/join/${meetingId}`;

  const handleCopy = () => {
    if (!meetingId) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      createMeeting("Instant Meeting", 60, true)
        .then(data => {
          setMeetingId(data.meeting_id);
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to create meeting", err);
          setLoading(false);
        });
    } else {
      setMeetingId(""); // Reset when closed
    }
  }, [isOpen]);
  
  if (!isOpen) return null;

  const handleStart = () => {
    if (meetingId) {
      router.push(`/meeting/${meetingId}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div 
        className="bg-[#151a23] w-full max-w-md rounded-2xl border border-[var(--color-border)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center">
              <Video className="w-5 h-5 text-blue-500" />
            </div>
            <h2 className="text-xl font-semibold text-white">New Meeting</h2>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold tracking-wider text-gray-400 uppercase mb-2">Meeting ID</label>
              <div className="bg-[#0a0d14] border border-[var(--color-border)] rounded-xl px-4 py-3 flex items-center min-h-[52px]">
                {loading ? <Loader2 className="w-5 h-5 text-blue-500 animate-spin" /> : <span className="text-white font-mono text-lg tracking-wider">MF-{meetingId.slice(0,3)}-{meetingId.slice(3,6)}-{meetingId.slice(6)}</span>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold tracking-wider text-gray-400 uppercase mb-2">Invite Link</label>
              <div className="flex gap-2">
                <div className="bg-[#0a0d14] border border-[var(--color-border)] rounded-xl px-4 py-3 flex-1 overflow-hidden min-h-[52px] flex items-center">
                  {loading ? <div className="w-32 h-4 bg-gray-800 rounded animate-pulse"></div> : <span className="text-gray-300 text-sm truncate block">{inviteLink}</span>}
                </div>
                <button 
                  onClick={handleCopy}
                  className="bg-transparent border border-blue-500/30 hover:border-blue-500 text-blue-400 hover:text-blue-300 px-4 rounded-xl flex items-center justify-center transition-colors min-w-[80px]"
                >
                  <span className="text-sm font-medium">{copied ? "Copied!" : "Copy"}</span>
                </button>
              </div>
            </div>
            
            <div className="pt-2">
              <div className="flex items-center justify-between py-3 border-b border-[var(--color-border)]">
                <div>
                  <h4 className="text-sm font-medium text-gray-200">Enable Waiting Room</h4>
                  <p className="text-xs text-gray-500 mt-1">Participants need permission to join</p>
                </div>
                <div className="w-11 h-6 bg-blue-600 rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 bg-white w-4 h-4 rounded-full transition-transform"></div>
                </div>
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <h4 className="text-sm font-medium text-gray-200">Require Passcode</h4>
                  <p className="text-xs text-gray-500 mt-1">Only invited users can connect directly</p>
                </div>
                <div className="w-11 h-6 bg-[#2a303f] rounded-full relative cursor-pointer">
                  <div className="absolute left-1 top-1 bg-gray-400 w-4 h-4 rounded-full transition-transform"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#121622] p-6 border-t border-[var(--color-border)] flex items-center justify-between gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl font-medium text-gray-300 hover:text-white bg-[#1a202c] hover:bg-[#222938] transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleStart}
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 transition-colors shadow-lg shadow-blue-500/20"
          >
            Start Meeting
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { X, Calendar, Clock, Type, Loader2 } from "lucide-react";
import { useState } from "react";
import { scheduleMeeting } from "@/lib/api";

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ScheduleMeetingModal({ isOpen, onClose, onSuccess }: ScheduleMeetingModalProps) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);

  if (!isOpen) return null;

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !time) return;

    setLoading(true);
    try {
      // Combine date and time into a single ISO string
      const datetime = new Date(`${date}T${time}`).toISOString();
      await scheduleMeeting(title, datetime, duration);
      setLoading(false);
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to schedule meeting", err);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div 
        className="bg-[#151a23] w-full max-w-md rounded-2xl border border-[var(--color-border)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <h2 className="text-xl font-semibold text-white">Schedule Meeting</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-800 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSchedule} className="space-y-4">
            
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold tracking-wider text-gray-400 uppercase mb-2">Meeting Topic</label>
              <div className="relative">
                <Type className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="E.g. Weekly Sync"
                  className="w-full bg-[#0a0d14] text-white pl-11 pr-4 py-3 rounded-xl border border-[var(--color-border)] focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold tracking-wider text-gray-400 uppercase mb-2">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full bg-[#0a0d14] text-white px-4 py-3 rounded-xl border border-[var(--color-border)] focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold tracking-wider text-gray-400 uppercase mb-2">Time</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                  className="w-full bg-[#0a0d14] text-white px-4 py-3 rounded-xl border border-[var(--color-border)] focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-semibold tracking-wider text-gray-400 uppercase mb-2">Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full bg-[#0a0d14] text-white px-4 py-3 rounded-xl border border-[var(--color-border)] focus:border-blue-500 focus:outline-none transition-colors appearance-none"
              >
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes</option>
                <option value={60}>1 Hour</option>
                <option value={120}>2 Hours</option>
              </select>
            </div>

            <div className="pt-4 flex items-center justify-between gap-4">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl font-medium text-gray-300 hover:text-white bg-[#1a202c] hover:bg-[#222938] transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={loading || !title || !date || !time}
                className="flex-1 py-3 px-4 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 transition-colors shadow-lg shadow-blue-500/20 flex justify-center items-center"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Schedule"}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}

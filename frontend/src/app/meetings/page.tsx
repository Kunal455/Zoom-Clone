"use client";

import { Video, Calendar, Clock, Copy, MoreHorizontal, Loader2, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { getMeetings } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import ScheduleMeetingModal from "@/components/ScheduleMeetingModal";

export default function MeetingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const data = await getMeetings();
      if (Array.isArray(data)) {
        setMeetings(data);
      } else {
        console.error("Expected array from /meetings API, got:", data);
        setMeetings([]);
      }
    } catch (err) {
      console.error("Failed to fetch meetings", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(date);
  };

  const copyToClipboard = (meetingId: string) => {
    const link = `${window.location.origin}/join?id=${meetingId}`;
    navigator.clipboard.writeText(link);
    alert("Meeting link copied to clipboard!");
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Video className="w-7 h-7 text-gray-200" />
          <h1 className="text-[28px] font-bold text-gray-200">All Meetings</h1>
        </div>
        <button 
          onClick={() => setIsScheduleModalOpen(true)}
          className="bg-blue-500 hover:bg-blue-400 text-white font-medium px-5 py-2.5 rounded-xl transition-colors shadow-lg shadow-blue-500/20 text-sm flex items-center gap-2"
        >
          <Calendar className="w-4 h-4" /> Schedule New
        </button>
      </div>

      <div className="bg-[#111520] border border-[var(--color-border)] rounded-2xl overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
            <p>Loading your meetings...</p>
          </div>
        ) : meetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-gray-500">
            <Calendar className="w-12 h-12 text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">No meetings scheduled</h3>
            <p className="text-sm text-gray-500 mb-6">You don't have any upcoming meetings.</p>
            <button 
              onClick={() => setIsScheduleModalOpen(true)}
              className="bg-[#1a202c] hover:bg-[#252f3f] border border-[var(--color-border)] text-gray-300 px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              Schedule a Meeting
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/50">
            {meetings.map((meeting) => (
              <div key={meeting.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between hover:bg-[#151a23] transition-colors gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center shrink-0 border border-blue-500/20">
                    <Video className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-200 mb-1">{meeting.title}</h3>
                    <p className="text-gray-500 text-sm flex items-center gap-2">
                      <Clock className="w-4 h-4" /> {formatDateTime(meeting.date)} &bull; {meeting.duration} mins
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                  <button 
                    onClick={() => copyToClipboard(meeting.meeting_id)}
                    className="flex-1 md:flex-none bg-[#1a202c] hover:bg-[#252f3f] border border-[var(--color-border)] text-gray-300 font-medium px-4 py-2.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <Copy className="w-4 h-4" /> Copy ID
                  </button>
                  <button 
                    onClick={() => router.push(`/meeting/${meeting.meeting_id}`)}
                    className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-2.5 rounded-lg transition-colors text-sm"
                  >
                    Start
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ScheduleMeetingModal 
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onSuccess={fetchMeetings}
      />
    </div>
  );
}

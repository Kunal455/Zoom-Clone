"use client";

import { Video, Plus, Calendar, Clock, Copy, MoreHorizontal, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import NewMeetingModal from "@/components/NewMeetingModal";
import ScheduleMeetingModal from "@/components/ScheduleMeetingModal";
import Link from "next/link";
import { getMeetings } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [isNewMeetingModalOpen, setIsNewMeetingModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const data = await getMeetings();
      setMeetings(data);
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
      <h1 className="text-3xl font-semibold text-gray-200 mb-8 tracking-tight">
        Good Morning{user ? `, ${user.name.split(' ')[0]}` : ''}
      </h1>

      {/* Primary Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <button 
          onClick={() => setIsNewMeetingModalOpen(true)}
          className="group relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl p-8 flex flex-col items-start text-left hover:scale-[1.02] transition-transform duration-300 shadow-xl shadow-blue-500/20"
        >
          <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
            <Video className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">New Meeting</h3>
          <p className="text-blue-100/80 text-sm">Start an instant meeting</p>
          <div className="absolute right-6 top-6 bg-white/20 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Plus className="w-5 h-5 text-white" />
          </div>
        </button>

        <Link href="/join" className="group relative overflow-hidden bg-[#151a23] border border-[var(--color-border)] rounded-3xl p-8 flex flex-col items-start text-left hover:bg-[#1a202c] transition-all duration-300 hover:border-gray-600">
          <div className="w-14 h-14 bg-gray-800 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600/20 transition-colors">
            <Plus className="w-7 h-7 text-gray-300 group-hover:text-blue-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-200 mb-2">Join Meeting</h3>
          <p className="text-gray-500 text-sm">Join via ID or link</p>
        </Link>

        <button 
          onClick={() => setIsScheduleModalOpen(true)}
          className="group relative overflow-hidden bg-[#151a23] border border-[var(--color-border)] rounded-3xl p-8 flex flex-col items-start text-left hover:bg-[#1a202c] transition-all duration-300 hover:border-gray-600"
        >
          <div className="w-14 h-14 bg-gray-800 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600/20 transition-colors">
            <Calendar className="w-7 h-7 text-gray-300 group-hover:text-blue-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-200 mb-2">Schedule</h3>
          <p className="text-gray-500 text-sm">Plan ahead</p>
        </button>
      </div>

      {/* Upcoming Meetings Section */}
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-200">Upcoming Meetings</h2>
        <button onClick={fetchMeetings} className="text-sm text-blue-500 font-medium hover:text-blue-400">Refresh</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : meetings.length === 0 ? (
        <div className="bg-[#151a23] border border-[var(--color-border)] rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <Calendar className="w-12 h-12 text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">No upcoming meetings</h3>
          <p className="text-sm text-gray-500">Schedule a new meeting to see it here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {meetings.map((meeting) => (
            <div key={meeting.id} className="bg-[#151a23] border border-[var(--color-border)] rounded-2xl p-6 flex flex-col hover:border-gray-600 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-200 mb-1">{meeting.title}</h3>
                  <p className="text-gray-500 text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4" /> {formatDateTime(meeting.date)} ({meeting.duration} mins)
                  </p>
                </div>
                <button className="text-gray-400 hover:text-white p-2">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex items-center gap-4 mt-auto pt-6">
                <button 
                  onClick={() => router.push(`/meeting/${meeting.meeting_id}`)}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-xl transition-colors text-sm"
                >
                  Start
                </button>
                <button 
                  onClick={() => copyToClipboard(meeting.meeting_id)}
                  className="flex-1 bg-[#1a202c] hover:bg-[#222938] border border-[var(--color-border)] text-gray-300 font-medium py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" /> Copy Link
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <NewMeetingModal 
        isOpen={isNewMeetingModalOpen} 
        onClose={() => setIsNewMeetingModalOpen(false)} 
      />
      <ScheduleMeetingModal 
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onSuccess={fetchMeetings}
      />
    </div>
  );
}

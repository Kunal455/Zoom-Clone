"use client";

import { Users, Search, Video, ArrowUpRight, MoreVertical, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { getContacts, removeContact, createMeeting } from "@/lib/api";
import AddContactModal from "@/components/AddContactModal";
import { useRouter } from "next/navigation";

export default function Contacts() {
  const router = useRouter();
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const data = await getContacts();
      if (Array.isArray(data)) {
        setContacts(data);
      } else {
        console.error("Expected array from /contacts API, got:", data);
        setContacts([]);
      }
    } catch (err) {
      console.error("Failed to load contacts", err);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const getColor = (str: string) => {
    if (!str) return "bg-gray-600";
    const colors = ["bg-blue-600", "bg-indigo-600", "bg-purple-600", "bg-pink-600", "bg-teal-600", "bg-orange-600"];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const getInitials = (name: string) => {
    if (!name) return "??";
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  const handleVideoCall = async (contactName: string) => {
    try {
      // Create an instant meeting
      const meeting = await createMeeting(`Meeting with ${contactName || "Contact"}`, 60, true);
      router.push(`/meeting/${meeting.meeting_id}`);
    } catch (err) {
      console.error("Failed to start meeting", err);
      alert("Failed to start meeting");
    }
  };

  const handleRemoveContact = async (userId: string) => {
    if (confirm("Are you sure you want to remove this contact?")) {
      try {
        await removeContact(userId);
        fetchContacts(); // Refresh the list
      } catch (err) {
        console.error("Failed to remove contact", err);
        alert("Failed to remove contact");
      }
    }
  };

  const handleViewProfile = () => {
    alert("Profile page coming soon!");
  };

  return (
    <div className="p-8 max-w-6xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Users className="w-7 h-7 text-gray-200" />
          <h1 className="text-[28px] font-bold text-gray-200">Contacts</h1>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-blue-500 hover:bg-blue-400 text-white font-medium px-5 py-2.5 rounded-xl transition-colors shadow-lg shadow-blue-500/20 text-sm"
        >
          Add Contact
        </button>
      </div>

      <div className="bg-[#111520] border border-[var(--color-border)] rounded-2xl p-4 flex items-center gap-4 mb-8">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            className="w-full bg-[#1a202c] text-white pl-11 pr-4 py-2.5 rounded-xl border border-transparent focus:border-blue-500 focus:outline-none transition-colors text-sm placeholder-gray-500"
          />
        </div>
        <div className="flex items-center gap-2 bg-[#1a202c] p-1 rounded-xl">
          <button className="px-4 py-1.5 rounded-lg bg-[#252f3f] text-gray-200 text-sm font-medium shadow-sm">All Contacts</button>
          <button className="px-4 py-1.5 rounded-lg text-gray-400 hover:text-gray-200 text-sm font-medium transition-colors">Online</button>
          <button className="px-4 py-1.5 rounded-lg text-gray-400 hover:text-gray-200 text-sm font-medium transition-colors">Offline</button>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
            <p>Loading contacts...</p>
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 bg-[#111520] border border-[var(--color-border)] rounded-2xl">
            <Users className="w-12 h-12 mb-4 text-gray-600" />
            <p className="text-lg font-medium text-gray-300">No contacts found</p>
            <p className="text-sm mt-1">Add a new contact to get started</p>
          </div>
        ) : (
          contacts.map((contact, i) => (
            <div key={i} className="bg-[#111520] border border-[var(--color-border)] rounded-2xl p-4 flex items-center justify-between hover:border-gray-700 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className={`w-12 h-12 rounded-full ${getColor(contact.name || contact.email)} flex items-center justify-center text-white font-medium shadow-inner overflow-hidden border-2 border-gray-700`}>
                    {contact.photo_url ? (
                      <img src={contact.photo_url} alt={contact.name} className="w-full h-full object-cover" />
                    ) : (
                      getInitials(contact.name || contact.email)
                    )}
                  </div>
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-[#111520] rounded-full"></div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-200">{contact.name || "Unknown User"}</h4>
                  <p className="text-sm text-gray-500">{contact.email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleVideoCall(contact.name)}
                  title="Video Call"
                  className="w-10 h-10 rounded-full bg-[#1a202c] hover:bg-blue-600 flex items-center justify-center text-gray-300 hover:text-white transition-colors border border-gray-800 hover:border-transparent"
                >
                  <Video className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleViewProfile}
                  title="View Profile"
                  className="w-10 h-10 rounded-full bg-[#1a202c] hover:bg-[#252f3f] flex items-center justify-center text-gray-300 transition-colors border border-gray-800"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleRemoveContact(contact.user_id)}
                  title="Remove Contact"
                  className="w-10 h-10 rounded-full bg-[#1a202c] hover:bg-red-600 flex items-center justify-center text-gray-300 hover:text-white transition-colors border border-gray-800 hover:border-transparent"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <AddContactModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={fetchContacts} 
      />
    </div>
  );
}

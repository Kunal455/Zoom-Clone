"use client";

import { X, Search, UserPlus, Loader2, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { searchUsers, addContact } from "@/lib/api";

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddContactModal({ isOpen, onClose, onSuccess }: AddContactModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const data = await searchUsers(query);
      setResults(data);
    } catch (err) {
      console.error("Search failed", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (userId: string) => {
    setAddingId(userId);
    try {
      await addContact(userId);
      onSuccess();
    } catch (err) {
      console.error("Failed to add contact", err);
    } finally {
      setAddingId(null);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "??";
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div 
        className="bg-[#151a23] w-full max-w-md rounded-2xl border border-[var(--color-border)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-[var(--color-border)] shrink-0">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-blue-500" />
              </div>
              <h2 className="text-xl font-semibold text-white">Add Contact</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-800 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSearch} className="relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full bg-[#0a0d14] text-white pl-11 pr-24 py-3 rounded-xl border border-[var(--color-border)] focus:border-blue-500 focus:outline-none transition-colors text-sm"
            />
            <button 
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin mb-3 text-blue-500" />
              <p className="text-sm">Searching...</p>
            </div>
          ) : results.length === 0 && query ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 text-center">
              <p className="text-sm">No users found.</p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {results.map((user) => (
                <div key={user.user_id} className="bg-[#111520] border border-[var(--color-border)] rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-medium overflow-hidden shrink-0">
                      {user.photo_url ? (
                        <img src={user.photo_url} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(user.name || user.email)
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-200 text-sm">{user.name || "Unknown User"}</h4>
                      <p className="text-xs text-gray-500 truncate max-w-[150px]">{user.email}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleAdd(user.user_id)}
                    disabled={addingId === user.user_id}
                    className="bg-[#1a202c] hover:bg-blue-600 border border-[var(--color-border)] hover:border-transparent text-gray-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 min-w-[70px] justify-center"
                  >
                    {addingId === user.user_id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

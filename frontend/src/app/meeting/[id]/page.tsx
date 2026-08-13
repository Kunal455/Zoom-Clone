"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { 
  Mic, MicOff, Video as VideoIcon, VideoOff, MonitorUp, 
  Users, MessageSquare, MoreVertical, X, Loader2, Copy, Check
} from "lucide-react";
import Link from "next/link";
import { getMeeting } from "@/lib/api";
import { VideoPlayer } from "@/components/VideoPlayer";
import { useAuth } from "@/context/AuthContext";

// Configure STUN/TURN servers for WebRTC
const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { 
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject"
    },
    { 
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject"
    }
  ]
};

function MeetingRoomContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const id = params?.id as string;
  const name = user?.name || searchParams?.get("name") || "Guest";
  
  // Use a stable, random user ID for this tab session
  const [userId] = useState(() => Math.random().toString(36).substring(2, 10));

  const [isMicOn, setIsMicOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [activePanel, setActivePanel] = useState<'none' | 'chat'>('none');
  const [currentTime, setCurrentTime] = useState("");
  const [meeting, setMeeting] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // WebRTC & Media States
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [participants, setParticipants] = useState<Record<string, { name: string, isMicOn: boolean, isVideoOn: boolean }>>({});
  const [chatMessages, setChatMessages] = useState<{sender: string, text: string, time: string, isMe: boolean}[]>([]);
  const [chatInput, setChatInput] = useState("");

  const wsRef = useRef<WebSocket | null>(null);
  const peersRef = useRef<Record<string, RTCPeerConnection>>({});
  const pendingCandidates = useRef<Record<string, RTCIceCandidateInit[]>>({});

  // 1. Fetch meeting info
  useEffect(() => {
    const fetchMeeting = async () => {
      try {
        const data = await getMeeting(id);
        setMeeting(data);
      } catch (err) {
        console.error("Meeting not found", err);
        router.push("/join?error=invalid_meeting");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchMeeting();
  }, [id, router]);

  // 2. Timer
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 3. Setup Media and WebSocket
  useEffect(() => {
    let stream: MediaStream;
    let ws: WebSocket;

    const setupMediaAndSignaling = async () => {
      try {
        // Get local media with echo cancellation for clearer audio
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        
        // Initial state is off
        stream.getVideoTracks().forEach(track => track.enabled = false);
        stream.getAudioTracks().forEach(track => track.enabled = false);
        
        setLocalStream(stream);

        // Connect WebSocket
        const baseWsUrl = (process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000").replace(/\/$/, '').replace(/\/api\/ws\/meeting.*$/, '');
        const wsUrl = `${baseWsUrl}/api/ws/meeting/${id}/${userId}`;
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          // Announce initial media state
          ws.send(JSON.stringify({
            type: "toggle-media",
            media: "video",
            state: false,
            name: name
          }));
        };

        ws.onmessage = async (event) => {
          const data = JSON.parse(event.data);
          
          if (data.type === "user-joined") {
            const newUserId = data.userId;
            createPeerConnection(newUserId, stream, true);
          } 
          else if (data.type === "offer") {
            await handleOffer(data, stream);
          } 
          else if (data.type === "answer") {
            await handleAnswer(data);
          } 
          else if (data.type === "ice-candidate") {
            await handleIceCandidate(data);
          }
          else if (data.type === "user-left") {
            handleUserLeft(data.userId);
          }
          else if (data.type === "chat-message") {
            setChatMessages(prev => [...prev, {
              sender: data.senderName,
              text: data.text,
              time: data.timestamp,
              isMe: false
            }]);
          }
          else if (data.type === "toggle-media") {
            setParticipants(prev => ({
              ...prev,
              [data.sender]: {
                name: data.name || prev[data.sender]?.name || "Unknown",
                isMicOn: data.media === "audio" ? data.state : (prev[data.sender]?.isMicOn || false),
                isVideoOn: data.media === "video" ? data.state : (prev[data.sender]?.isVideoOn || false)
              }
            }));
          }
        };

      } catch (err) {
        console.error("Error accessing media devices", err);
      }
    };

    if (id) {
      setupMediaAndSignaling();
    }

    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (ws) ws.close();
      Object.values(peersRef.current).forEach(peer => peer.close());
    };
  }, [id, userId, name]);


  // WebRTC Helper Functions
  const createPeerConnection = async (targetUserId: string, currentStream: MediaStream, isInitiator: boolean) => {
    const peer = new RTCPeerConnection(rtcConfig);
    peersRef.current[targetUserId] = peer;

    // Add local tracks
    currentStream.getTracks().forEach(track => {
      peer.addTrack(track, currentStream);
    });

    // Handle remote tracks
    peer.ontrack = (event) => {
      setRemoteStreams(prev => ({
        ...prev,
        [targetUserId]: event.streams[0]
      }));
    };

    // Handle ICE candidates
    peer.onicecandidate = (event) => {
      if (event.candidate && wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: "ice-candidate",
          target: targetUserId,
          data: event.candidate
        }));
      }
    };

    if (isInitiator) {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      wsRef.current?.send(JSON.stringify({
        type: "offer",
        target: targetUserId,
        data: offer,
        name: name
      }));
    }

    return peer;
  };

  const handleOffer = async (data: any, currentStream: MediaStream) => {
    const targetUserId = data.sender;
    const peer = await createPeerConnection(targetUserId, currentStream, false);
    
    await peer.setRemoteDescription(new RTCSessionDescription(data.data));
    
    // Process queued candidates
    if (pendingCandidates.current[targetUserId]) {
      for (const candidate of pendingCandidates.current[targetUserId]) {
        try {
          await peer.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("Error adding queued ice candidate", e);
        }
      }
      pendingCandidates.current[targetUserId] = [];
    }

    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    
    wsRef.current?.send(JSON.stringify({
      type: "answer",
      target: targetUserId,
      data: answer,
      name: name
    }));

    // Save participant name
    if (data.name) {
      setParticipants(prev => ({
        ...prev,
        [targetUserId]: { ...prev[targetUserId], name: data.name }
      }));
    }
  };

  const handleAnswer = async (data: any) => {
    const targetUserId = data.sender;
    const peer = peersRef.current[targetUserId];
    if (peer) {
      await peer.setRemoteDescription(new RTCSessionDescription(data.data));
      
      // Process queued candidates
      if (pendingCandidates.current[targetUserId]) {
        for (const candidate of pendingCandidates.current[targetUserId]) {
          try {
            await peer.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.error("Error adding queued ice candidate", e);
          }
        }
        pendingCandidates.current[targetUserId] = [];
      }
    }
    if (data.name) {
      setParticipants(prev => ({
        ...prev,
        [data.sender]: { ...prev[data.sender], name: data.name }
      }));
    }
  };

  const handleIceCandidate = async (data: any) => {
    const targetUserId = data.sender;
    const peer = peersRef.current[targetUserId];
    if (peer) {
      if (peer.remoteDescription) {
        try {
          await peer.addIceCandidate(new RTCIceCandidate(data.data));
        } catch (e) {
          console.error("Error adding ice candidate", e);
        }
      } else {
        if (!pendingCandidates.current[targetUserId]) {
          pendingCandidates.current[targetUserId] = [];
        }
        pendingCandidates.current[targetUserId].push(data.data);
      }
    }
  };

  const handleUserLeft = (targetUserId: string) => {
    if (peersRef.current[targetUserId]) {
      peersRef.current[targetUserId].close();
      delete peersRef.current[targetUserId];
    }
    setRemoteStreams(prev => {
      const next = { ...prev };
      delete next[targetUserId];
      return next;
    });
    setParticipants(prev => {
      const next = { ...prev };
      delete next[targetUserId];
      return next;
    });
  };

  // Toggle handlers
  const toggleMic = () => {
    const newState = !isMicOn;
    setIsMicOn(newState);
    if (localStream) {
      localStream.getAudioTracks().forEach(track => track.enabled = newState);
    }
    wsRef.current?.send(JSON.stringify({
      type: "toggle-media",
      media: "audio",
      state: newState,
      name: name
    }));
  };

  const toggleVideo = () => {
    const newState = !isVideoOn;
    setIsVideoOn(newState);
    if (localStream) {
      localStream.getVideoTracks().forEach(track => track.enabled = newState);
    }
    wsRef.current?.send(JSON.stringify({
      type: "toggle-media",
      media: "video",
      state: newState,
      name: name
    }));
  };

  const sendChat = () => {
    if (!chatInput.trim() || !wsRef.current) return;
    
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Add locally
    setChatMessages(prev => [...prev, {
      sender: name,
      text: chatInput,
      time: now,
      isMe: true
    }]);

    // Broadcast
    wsRef.current.send(JSON.stringify({
      type: "chat-message",
      text: chatInput,
      senderName: name,
      timestamp: now
    }));

    setChatInput("");
  };

  if (loading) {
    return (
      <div className="h-screen bg-[#080B11] flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const participantIds = Object.keys(remoteStreams);
  const totalParticipants = participantIds.length + 1; // +1 for local user

  const getGridClass = (total: number) => {
    if (total === 1) return "grid-cols-1 grid-rows-1";
    if (total === 2) return "grid-cols-2 grid-rows-1";
    if (total <= 4) return "grid-cols-2 grid-rows-2";
    if (total <= 6) return "grid-cols-3 grid-rows-2";
    return "grid-cols-3 grid-rows-3";
  };

  return (
    <div className="h-screen bg-[#080B11] flex flex-col text-white font-sans overflow-hidden">
      
      {/* Top Bar */}
      <header className="h-16 flex items-center justify-between px-6 bg-[#080B11] shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-200 tracking-wide">{meeting?.title || "Meeting Room"}</h2>
          <div className="text-sm font-medium text-blue-500 bg-blue-500/10 px-3 py-1 rounded-md">
            {currentTime}
          </div>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(id);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="flex items-center gap-2 text-sm font-medium text-gray-400 bg-[#1A1D24] border border-gray-800 hover:bg-[#252830] hover:text-white transition-colors px-3 py-1 rounded-md"
            title="Copy Meeting ID"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            ID: {id}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1A1D24] rounded-lg text-sm font-medium border border-gray-800">
            <Users className="w-4 h-4 text-gray-400" />
            <span>{totalParticipants}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 border border-red-500/30 rounded-lg text-sm font-medium text-red-500">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            REC
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden px-6 pb-24">
        
        {/* Video Grid */}
        <div className={`flex-1 grid gap-4 p-4 min-h-0 w-full ${getGridClass(totalParticipants)}`}>
          
          {/* Local User */}
          <VideoPlayer 
            stream={localStream} 
            isLocal={true} 
            name={name} 
            isMicOn={isMicOn} 
            isVideoOn={isVideoOn} 
          />

          {/* Remote Users */}
          {participantIds.map(pid => (
            <VideoPlayer 
              key={pid}
              stream={remoteStreams[pid]} 
              isLocal={false} 
              name={participants[pid]?.name || "Unknown"} 
              isMicOn={participants[pid]?.isMicOn ?? false} 
              isVideoOn={participants[pid]?.isVideoOn ?? false} 
            />
          ))}
          
        </div>

        {/* Chat Panel */}
        {activePanel === 'chat' && (
          <div className="w-[360px] bg-[#12151C] ml-6 rounded-2xl border border-gray-800 flex flex-col overflow-hidden shadow-2xl shrink-0">
            <div className="h-14 border-b border-gray-800 flex items-center justify-between px-5 shrink-0">
              <h3 className="font-semibold text-gray-200">
                In-Call Chat
              </h3>
              <button onClick={() => setActivePanel('none')} className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-gray-800 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {chatMessages.length === 0 ? (
                <div className="text-center text-gray-500 text-sm mt-10">
                  No messages yet. Say hello!
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div key={i} className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${msg.isMe ? 'text-blue-400' : 'text-gray-400'}`}>
                        {msg.isMe ? "You" : msg.sender}
                      </span>
                      <span className="text-[10px] text-gray-500 font-medium">{msg.time}</span>
                    </div>
                    <div className="text-sm text-gray-300 leading-relaxed bg-[#1A1D24] p-2.5 rounded-lg border border-gray-800/50">
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-gray-800 shrink-0 bg-[#0F1218]">
              <div className="relative">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                  placeholder="Send a message..." 
                  className="w-full bg-[#1A1D24] border border-gray-700 rounded-xl pl-4 pr-10 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors placeholder-gray-500" 
                />
                <button 
                  onClick={sendChat}
                  disabled={!chatInput.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-400 p-2 disabled:opacity-50 disabled:hover:text-blue-500 transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Control Bar (Bottom Floating) */}
      <footer className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center justify-center gap-3 bg-[#12151C]/90 backdrop-blur-md px-6 py-3 rounded-2xl border border-gray-800/50 shadow-2xl">
        
        <button 
          onClick={toggleMic}
          className={`flex items-center justify-center w-12 h-12 rounded-full transition-all ${
            !isMicOn ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20' : 'bg-[#1A1D24] hover:bg-[#252830] text-gray-300 border border-gray-700'
          }`}
        >
          {!isMicOn ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        <button 
          onClick={toggleVideo}
          className={`flex items-center justify-center w-12 h-12 rounded-full transition-all ${
            !isVideoOn ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20' : 'bg-[#1A1D24] hover:bg-[#252830] text-gray-300 border border-gray-700'
          }`}
        >
          {!isVideoOn ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
        </button>

        <button className="flex items-center justify-center w-12 h-12 rounded-full bg-[#1A1D24] hover:bg-[#252830] text-gray-300 transition-colors border border-gray-700">
          <MonitorUp className="w-5 h-5" />
        </button>

        <button 
          onClick={() => setActivePanel(activePanel === 'chat' ? 'none' : 'chat')}
          className={`flex items-center justify-center w-12 h-12 rounded-full transition-colors border ${
            activePanel === 'chat' ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-[#1A1D24] border-gray-700 hover:bg-[#252830] text-gray-300'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
        </button>

        <button className="flex items-center justify-center w-12 h-12 rounded-full bg-[#1A1D24] hover:bg-[#252830] text-gray-300 transition-colors border border-gray-700">
          <MoreVertical className="w-5 h-5" />
        </button>

        <div className="w-px h-8 bg-gray-800 mx-2"></div>

        <Link href="/" className="bg-[#FF4D4D] hover:bg-red-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-red-500/20 flex items-center gap-2">
          Leave Meeting
        </Link>
      </footer>
    </div>
  );
}

export default function MeetingRoom() {
  return (
    <Suspense fallback={<div className="h-screen bg-[#080B11] flex items-center justify-center text-white"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>}>
      <MeetingRoomContent />
    </Suspense>
  );
}

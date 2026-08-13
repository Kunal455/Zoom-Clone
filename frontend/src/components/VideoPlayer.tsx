"use client";

import { useEffect, useRef } from "react";
import { MicOff } from "lucide-react";

interface VideoPlayerProps {
  stream: MediaStream | null;
  isLocal?: boolean;
  name: string;
  isMicOn: boolean;
  isVideoOn: boolean;
}

export function VideoPlayer({ stream, isLocal = false, name, isMicOn, isVideoOn }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream && isVideoOn) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, isVideoOn]);

  const initials = name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

  return (
    <div className="bg-[#12151C] rounded-2xl border border-gray-800 overflow-hidden relative group flex items-center justify-center shadow-lg w-full h-full">
      {/* Video Element */}
      {isVideoOn && stream ? (
        <video 
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        /* Fallback Avatar */
        <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-gray-700 bg-gray-800 flex items-center justify-center">
          <span className="text-3xl font-semibold text-white">{initials || "??"}</span>
        </div>
      )}

      {/* Name and Mic Status overlay */}
      <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-2 border border-white/5">
        <span className="text-sm font-medium text-gray-200">{name} {isLocal && "(You)"}</span>
        {!isMicOn && (
          <div className="w-5 h-5 bg-red-500 rounded flex items-center justify-center">
            <MicOff className="w-3.5 h-3.5 text-white" />
          </div>
        )}
      </div>
    </div>
  );
}

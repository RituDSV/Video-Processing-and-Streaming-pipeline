"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import io, { Socket } from "socket.io-client";

export type VideoEvent = {
  videoId: string;
  status: "READY" | "FAILED";
  errorMessage?: string;
  ts: number; // 👈 must be here
  timestamp: Date;
};

interface VideoContextValue {
  // subscribe to updates for a specific videoId
  useVideoStatus: (videoId: string) => VideoEvent | null;
  notifications: Array<VideoEvent & { ts: number }>;
}

const VideoContext = createContext<VideoContextValue | null>(null);

let socket: Socket;

export function VideoProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<Record<string, VideoEvent>>({});
  const [notifications, setNotifications] = useState<
    Array<VideoEvent & { ts: number }>
  >([]);

  useEffect(() => {
    socket = io("http://localhost:3000");

    const handle = (data: VideoEvent) => {
      // Update the event map so any subscribed component re-renders
      setEvents((prev) => ({ ...prev, [data.videoId]: data }));
      setNotifications((prev) => [
        { ...data, ts: Date.now() },
        ...prev.slice(0, 9),
      ]);
    };

    socket.on("video.ready", (data) => {
      const event = {
        ...data,
        status: "READY" as const,
        ts: Date.now(),
        timestamp: new Date(),
      };
      setEvents((prev) => ({ ...prev, [data.videoId]: event }));
      setNotifications((prev) => [event, ...prev.slice(0, 9)]);
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.ts !== event.ts));
      }, 4000);
    });

    socket.on("video.failed", (data) => {
      const event = {
        ...data,
        status: "FAILED" as const,
        ts: Date.now(),
        timestamp: new Date(),
      };
      setEvents((prev) => ({ ...prev, [data.videoId]: event }));
      setNotifications((prev) => [event, ...prev.slice(0, 9)]);
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.ts !== event.ts));
      }, 4000);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const useVideoStatus = (videoId: string) => events[videoId] ?? null;

  return (
    <VideoContext.Provider value={{ useVideoStatus, notifications }}>
      {children}
    </VideoContext.Provider>
  );
}

export function useVideoContext() {
  const ctx = useContext(VideoContext);
  if (!ctx)
    throw new Error("useVideoContext must be used inside VideoProvider");
  return ctx;
}

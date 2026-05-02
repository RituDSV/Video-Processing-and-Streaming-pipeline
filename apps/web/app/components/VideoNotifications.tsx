"use client";

import { useEffect, useState } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:3000");

type Notification = {
  id: number;
  type: "ready" | "failed";
  message: string;
  timestamp: Date;
};

interface Props {
  onVideoReady: (url: string) => void;
}

export default function VideoNotifications(props: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  let counter = 0;

  useEffect(() => {
    socket.on("video.ready", async (data) => {
      setNotifications((prev) => [
        {
          id: counter++,
          type: "ready",
          message: `Video ${data.videoId} is ready`,
          timestamp: new Date(),
        },
        ...prev.slice(0, 9),
      ]);
      const res = await fetch(`http://localhost:3000/videos/${data.videoId}`);
      const video = await res.json();
      props.onVideoReady(video.url); 
    });

    socket.on("video.failed", (data) => {
      setNotifications((prev) => [
        {
          id: counter++,
          type: "failed",
          message: `Video ${data.videoId} failed: ${data.errorMessage}`,
          timestamp: new Date(),
        },
        ...prev.slice(0, 9),
      ]);
    });

    return () => {
      socket.off("video.ready");
      socket.off("video.failed");
    };
  }, []);

  if (notifications.length === 0) return null;

  return (
    <div className="notifications-wrapper">
      {notifications.map((n) => (
        <div key={n.id} className={`notification notification--${n.type}`}>
          <span className="notification__dot" />
          <span className="notification__message">{n.message}</span>
          <span className="notification__time">
            {n.timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      ))}

      <style>{`
        .notifications-wrapper {
          position: fixed;
          top: 1.5rem;
          right: 1.5rem;
          z-index: 50;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-width: 22rem;
        }
        .notification {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          background: rgba(15, 15, 20, 0.92);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.08);
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          font-family: 'DM Sans', sans-serif;
        }
        .notification--ready { border-left: 3px solid #22c55e; }
        .notification--failed { border-left: 3px solid #ef4444; }
        .notification__dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .notification--ready .notification__dot { background: #22c55e; }
        .notification--failed .notification__dot { background: #ef4444; }
        .notification__message {
          flex: 1;
          font-size: 0.8125rem;
          color: rgba(255,255,255,0.85);
          line-height: 1.4;
        }
        .notification__time {
          font-size: 0.6875rem;
          color: rgba(255,255,255,0.35);
          flex-shrink: 0;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(1rem); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

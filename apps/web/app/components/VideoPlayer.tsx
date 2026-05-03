"use client";

import { useState, useEffect, useRef } from "react";
import Hls from "hls.js";

interface VideoPlayerProps {
  videoUrl: string;
}

export default function VideoPlayer({ videoUrl }: VideoPlayerProps) {
  const [src, setSrc] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!src) return;
    const video = videoRef.current;
    if (!video) return;

    if (src.endsWith(".m3u8")) {
      if (Hls.isSupported()) {
        console.log("hls supported video");
        const hls = new Hls();
        hls.loadSource(src);
        hls.attachMedia(video);
        return () => hls.destroy(); // cleanup on unmount
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari supports HLS natively
        video.src = src;
      }
    } else {
      // Regular MP4 — just set src directly
      video.src = src;
    }
  }, [src]);

  return (
    <div className="player-wrapper">
      {src ? (
        <div className="player-container">
          <video ref={videoRef} src={src} controls className="video-el">
            Your browser does not support the video tag.
          </video>
          <div className="player-footer">
            <span className="player-badge">
              <span className="player-badge__dot" />
              Ready
            </span>
            <a href={src} download className="player-download">
              Download
            </a>
          </div>
        </div>
      ) : (
        <div className="player-empty">
          <div className="player-empty__icon">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
          <p className="player-empty__text">No video to display</p>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500&display=swap');
        .player-wrapper {
          font-family: 'DM Sans', sans-serif;
          width: 100%;
        }
        .player-container {
          background: #0a0a0f;
          border-radius: 0.75rem;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.06);
        }
        .video-el {
          width: 100%;
          display: block;
          max-height: 480px;
          background: #000;
        }
        .player-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .player-badge {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.75rem;
          color: #22c55e;
          font-weight: 500;
          letter-spacing: 0.02em;
        }
        .player-badge__dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 6px #22c55e;
          animation: pulse 2s infinite;
        }
        .player-download {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.4);
          text-decoration: none;
          transition: color 0.15s;
        }
        .player-download:hover { color: rgba(255,255,255,0.75); }
        .player-empty {
          aspect-ratio: 16/9;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          background: #0a0a0f;
          border-radius: 0.75rem;
          border: 1px dashed rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.2);
        }
        .player-empty__icon { opacity: 0.3; }
        .player-empty__text { font-size: 0.875rem; }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

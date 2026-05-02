"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const API = "http://localhost:3000";

type VideoStatus = "UPLOAD_PENDING" | "UPLOADED" | "PROCESSING" | "READY" | "FAILED";

interface VideoItem {
  videoId: string;
  originalName: string;
  status: VideoStatus;
  durationSec: number | null;
  width: number | null;
  height: number | null;
  sizeBytes: number;
  createdAt: string;
  url: string | null;
}

interface ApiResponse {
  data: VideoItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/* ── helpers ─────────────────────────────────────────────── */
const fmtDuration = (s: number | null) => {
  if (!s) return null;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const fmtSize = (b: number) => {
  if (b >= 1024 ** 3) return `${(b / 1024 ** 3).toFixed(1)} GB`;
  if (b >= 1024 ** 2) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024).toFixed(0)} KB`;
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const statusConfig: Record<VideoStatus, { label: string; color: string }> = {
  UPLOAD_PENDING: { label: "Pending",    color: "rgba(255,255,255,0.25)" },
  UPLOADED:       { label: "Uploaded",   color: "#60a5fa" },
  PROCESSING:     { label: "Processing", color: "#f59e0b" },
  READY:          { label: "Ready",      color: "#22c55e" },
  FAILED:         { label: "Failed",     color: "#ef4444" },
};

/* ── modal player ────────────────────────────────────────── */
function Modal({ video, onClose }: { video: VideoItem; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [buffered, setBuffered] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === " ") { e.preventDefault(); togglePlay(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    if (v.buffered.length > 0)
      setBuffered((v.buffered.end(v.buffered.length - 1) / v.duration) * 100);
  };

  const fmt = (s: number) => {
    if (!isFinite(s)) return "0:00";
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-name">{video.originalName}</span>
            <div className="modal-meta">
              {video.width && video.height && (
                <span className="modal-chip">{video.width}×{video.height}</span>
              )}
              {fmtDuration(video.durationSec) && (
                <span className="modal-chip">{fmtDuration(video.durationSec)}</span>
              )}
              <span className="modal-chip">{fmtSize(video.sizeBytes)}</span>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Video */}
        {video.url ? (
          <div className="vp">
            <video
              ref={videoRef}
              src={video.url}
              className="vp__video"
              onClick={togglePlay}
              onTimeUpdate={onTimeUpdate}
              onLoadedMetadata={() => videoRef.current && setDuration(videoRef.current.duration)}
              onEnded={() => setPlaying(false)}
              playsInline
            />

            {!playing && (
              <button className="vp__big-play" onClick={togglePlay}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              </button>
            )}

            <div className="vp__controls">
              {/* seek */}
              <div className="vp__seek-wrap">
                <div className="vp__seek-track">
                  <div className="vp__seek-buf" style={{ width: `${buffered}%` }} />
                  <div className="vp__seek-prog" style={{ width: `${progress}%` }} />
                  <div className="vp__seek-thumb" style={{ left: `${progress}%` }} />
                </div>
                <input type="range" className="vp__seek-input" min={0} max={duration || 100}
                  step={0.1} value={currentTime}
                  onChange={e => { const t = +e.target.value; if (videoRef.current) videoRef.current.currentTime = t; setCurrentTime(t); }} />
              </div>
              {/* bar */}
              <div className="vp__bar">
                <div className="vp__bar-l">
                  <button className="vp__btn" onClick={togglePlay}>
                    {playing
                      ? <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                      : <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    }
                  </button>
                  <button className="vp__btn" onClick={() => { setMuted(m => !m); if (videoRef.current) videoRef.current.muted = !muted; }}>
                    {muted
                      ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                      : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                    }
                  </button>
                  <input type="range" className="vp__vol" min={0} max={1} step={0.05} value={muted ? 0 : volume}
                    onChange={e => { const v = +e.target.value; setVolume(v); if (videoRef.current) videoRef.current.volume = v; setMuted(v === 0); }} />
                  <span className="vp__time">{fmt(currentTime)} / {fmt(duration)}</span>
                </div>
                <a href={video.url} download className="vp__btn" title="Download">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="modal-not-ready">
            <div className="modal-spinner" />
            <span>Video is {video.status.toLowerCase()}…</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── main page ───────────────────────────────────────────── */
export default function VideosPage() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<VideoItem | null>(null);
  const LIMIT = 12;

  const fetchVideos = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/videos?page=${p}&limit=${LIMIT}`);
      const data: ApiResponse = await res.json();
      setVideos(data.data);
      setTotalPages(data.totalPages);
      setTotal(data.total);
      setPage(data.page);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVideos(1); }, [fetchVideos]);

  return (
    <div className="page">
      {/* Header */}
      <header className="page-header">
        <div className="page-header-inner">
          <div className="page-logo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </div>
          <div>
            <h1 className="page-title">Library</h1>
            <p className="page-sub">{total} video{total !== 1 ? "s" : ""}</p>
          </div>
          <a href="/upload" className="page-upload-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Upload
          </a>
        </div>
      </header>

      {/* Grid */}
      <main className="page-main">
        {loading ? (
          <div className="page-loading">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ animationDelay: `${i * 0.05}s` }} />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="page-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            <p>No videos yet</p>
            <a href="/" className="page-empty-link">Upload your first video →</a>
          </div>
        ) : (
          <div className="grid">
            {videos.map((v, i) => {
              const sc = statusConfig[v.status];
              return (
                <button
                  key={v.videoId}
                  className="card"
                  onClick={() => setSelected(v)}
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  {/* Thumbnail / placeholder */}
                  <div className="card-thumb">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                    {fmtDuration(v.durationSec) && (
                      <span className="card-duration">{fmtDuration(v.durationSec)}</span>
                    )}
                    {v.status === "READY" && (
                      <div className="card-play-overlay">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="5 3 19 12 5 21 5 3"/>
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="card-body">
                    <p className="card-name">{v.originalName}</p>
                    <div className="card-footer">
                      <span className="card-status" style={{ color: sc.color }}>
                        <span className="card-dot" style={{ background: sc.color }} />
                        {sc.label}
                      </span>
                      <span className="card-date">{fmtDate(v.createdAt)}</span>
                    </div>
                    <div className="card-meta">
                      <span>{fmtSize(v.sizeBytes)}</span>
                      {v.width && v.height && <span>{v.width}×{v.height}</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="page-btn"
              disabled={page === 1}
              onClick={() => fetchVideos(page - 1)}
            >
              ← Prev
            </button>
            <div className="page-numbers">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  className={`page-num ${page === i + 1 ? "page-num--active" : ""}`}
                  onClick={() => fetchVideos(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              className="page-btn"
              disabled={page === totalPages}
              onClick={() => fetchVideos(page + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </main>

      {/* Modal */}
      {selected && <Modal video={selected} onClose={() => setSelected(null)} />}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .page {
          min-height: 100vh;
          background: #080810;
          font-family: 'DM Sans', sans-serif;
          color: #fff;
        }

        /* Header */
        .page-header {
          border-bottom: 1px solid rgba(255,255,255,0.06);
          position: sticky;
          top: 0;
          background: rgba(8,8,16,0.9);
          backdrop-filter: blur(12px);
          z-index: 10;
        }
        .page-header-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 1rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.875rem;
        }
        .page-logo {
          width: 36px; height: 36px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          color: rgba(255,255,255,0.6);
          flex-shrink: 0;
        }
        .page-title {
          font-size: 1rem; font-weight: 500;
          color: #fff; letter-spacing: -0.01em;
        }
        .page-sub {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.3);
          margin-top: 1px;
        }
        .page-upload-btn {
          margin-left: auto;
          display: flex; align-items: center; gap: 0.375rem;
          padding: 0.5rem 0.875rem;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 0.5rem;
          color: rgba(255,255,255,0.7);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.8125rem;
          text-decoration: none;
          transition: background 0.15s, color 0.15s;
        }
        .page-upload-btn:hover {
          background: rgba(255,255,255,0.1);
          color: #fff;
        }

        /* Main */
        .page-main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem 1.5rem;
        }

        /* Skeleton */
        .page-loading {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 1rem;
        }
        .skeleton {
          height: 220px;
          border-radius: 0.75rem;
          background: rgba(255,255,255,0.04);
          animation: shimmer 1.4s ease-in-out infinite;
        }
        @keyframes shimmer {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }

        /* Empty */
        .page-empty {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 1rem;
          padding: 5rem 0;
          color: rgba(255,255,255,0.15);
        }
        .page-empty p { font-size: 0.875rem; }
        .page-empty-link {
          font-size: 0.8125rem;
          color: rgba(255,255,255,0.4);
          text-decoration: none;
          transition: color 0.15s;
        }
        .page-empty-link:hover { color: rgba(255,255,255,0.75); }

        /* Grid */
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 1rem;
        }

        .card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 0.75rem;
          overflow: hidden;
          cursor: pointer;
          text-align: left;
          padding: 0;
          transition: background 0.15s, border-color 0.15s, transform 0.15s;
          animation: fadeUp 0.35s ease both;
        }
        .card:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.14);
          transform: translateY(-2px);
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .card-thumb {
          aspect-ratio: 16/9;
          background: rgba(0,0,0,0.5);
          display: flex; align-items: center; justify-content: center;
          color: rgba(255,255,255,0.1);
          position: relative;
          overflow: hidden;
        }
        .card-duration {
          position: absolute; bottom: 6px; right: 8px;
          font-size: 0.6875rem;
          color: rgba(255,255,255,0.7);
          background: rgba(0,0,0,0.6);
          padding: 2px 6px;
          border-radius: 4px;
          font-variant-numeric: tabular-nums;
        }
        .card-play-overlay {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          background: rgba(0,0,0,0);
          color: #fff;
          opacity: 0;
          transition: opacity 0.15s, background 0.15s;
        }
        .card-play-overlay svg {
          width: 36px; height: 36px;
          background: rgba(255,255,255,0.12);
          border-radius: 50%;
          padding: 10px;
          border: 1px solid rgba(255,255,255,0.15);
        }
        .card:hover .card-play-overlay {
          opacity: 1;
          background: rgba(0,0,0,0.3);
        }

        .card-body { padding: 0.75rem; }
        .card-name {
          font-size: 0.8125rem;
          color: rgba(255,255,255,0.8);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          margin-bottom: 0.375rem;
          font-weight: 500;
        }
        .card-footer {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 0.25rem;
        }
        .card-status {
          display: flex; align-items: center; gap: 5px;
          font-size: 0.6875rem; font-weight: 500;
        }
        .card-dot {
          width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0;
        }
        .card-date {
          font-size: 0.6875rem;
          color: rgba(255,255,255,0.25);
        }
        .card-meta {
          display: flex; gap: 0.5rem;
          font-size: 0.6875rem;
          color: rgba(255,255,255,0.2);
        }

        /* Pagination */
        .pagination {
          display: flex; align-items: center; justify-content: center;
          gap: 0.5rem; margin-top: 2.5rem;
        }
        .page-btn {
          padding: 0.5rem 0.875rem;
          background: none;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 0.5rem;
          color: rgba(255,255,255,0.4);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.8125rem;
          cursor: pointer;
          transition: color 0.15s, border-color 0.15s;
        }
        .page-btn:hover:not(:disabled) {
          color: rgba(255,255,255,0.75);
          border-color: rgba(255,255,255,0.2);
        }
        .page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .page-numbers { display: flex; gap: 4px; }
        .page-num {
          width: 32px; height: 32px;
          border-radius: 6px;
          background: none;
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.35);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.8125rem;
          cursor: pointer;
          transition: all 0.15s;
        }
        .page-num:hover { color: #fff; border-color: rgba(255,255,255,0.2); }
        .page-num--active {
          background: #fff; color: #080810;
          border-color: #fff; font-weight: 500;
        }

        /* ── Modal ── */
        .modal-backdrop {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.75);
          backdrop-filter: blur(6px);
          z-index: 100;
          display: flex; align-items: center; justify-content: center;
          padding: 1.5rem;
          animation: fadeIn 0.15s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; } to { opacity: 1; }
        }
        .modal {
          width: 100%;
          max-width: 820px;
          background: #0f0f18;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 1rem;
          overflow: hidden;
          animation: scaleIn 0.18s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1); }
        }
        .modal-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          padding: 1rem 1.125rem;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          gap: 1rem;
        }
        .modal-title-group { min-width: 0; }
        .modal-name {
          display: block;
          font-size: 0.9375rem; font-weight: 500;
          color: rgba(255,255,255,0.85);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          margin-bottom: 0.375rem;
        }
        .modal-meta { display: flex; gap: 0.375rem; flex-wrap: wrap; }
        .modal-chip {
          font-size: 0.6875rem;
          color: rgba(255,255,255,0.35);
          background: rgba(255,255,255,0.06);
          border-radius: 4px;
          padding: 2px 7px;
        }
        .modal-close {
          width: 30px; height: 30px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 6px;
          color: rgba(255,255,255,0.5);
          cursor: pointer; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s, color 0.15s;
        }
        .modal-close:hover { background: rgba(255,255,255,0.1); color: #fff; }

        .modal-not-ready {
          aspect-ratio: 16/9;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 1rem;
          background: #000;
          color: rgba(255,255,255,0.25);
          font-size: 0.8125rem;
        }
        .modal-spinner {
          width: 24px; height: 24px;
          border: 2px solid rgba(255,255,255,0.1);
          border-top-color: rgba(255,255,255,0.4);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Inline video player ── */
        .vp {
          position: relative;
          background: #000;
          cursor: pointer;
          user-select: none;
        }
        .vp__video {
          width: 100%; display: block;
          aspect-ratio: 16/9; object-fit: contain;
        }
        .vp__big-play {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          background: rgba(0,0,0,0.3);
          border: none; cursor: pointer; color: #fff;
        }
        .vp__big-play svg {
          width: 52px; height: 52px;
          background: rgba(255,255,255,0.1);
          border-radius: 50%; padding: 15px;
          border: 1px solid rgba(255,255,255,0.15);
          transition: background 0.15s, transform 0.12s;
        }
        .vp__big-play:hover svg {
          background: rgba(255,255,255,0.18);
          transform: scale(1.06);
        }
        .vp__controls {
          background: rgba(0,0,0,0.7);
          padding: 0.5rem 0.875rem 0.75rem;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .vp__seek-wrap {
          position: relative; height: 16px;
          display: flex; align-items: center;
          margin-bottom: 0.375rem;
        }
        .vp__seek-track {
          position: absolute; left: 0; right: 0;
          height: 3px; background: rgba(255,255,255,0.12);
          border-radius: 999px; pointer-events: none;
        }
        .vp__seek-buf {
          position: absolute; left: 0; top: 0; bottom: 0;
          background: rgba(255,255,255,0.18);
          border-radius: 999px; transition: width 0.4s;
        }
        .vp__seek-prog {
          position: absolute; left: 0; top: 0; bottom: 0;
          background: #fff; border-radius: 999px;
        }
        .vp__seek-thumb {
          position: absolute; top: 50%;
          transform: translate(-50%, -50%);
          width: 11px; height: 11px;
          background: #fff; border-radius: 50%;
        }
        .vp__seek-input {
          position: absolute; left: 0; right: 0;
          width: 100%; opacity: 0; cursor: pointer; height: 16px; margin: 0;
        }
        .vp__bar {
          display: flex; align-items: center; justify-content: space-between;
        }
        .vp__bar-l {
          display: flex; align-items: center; gap: 2px;
        }
        .vp__btn {
          width: 28px; height: 28px;
          display: flex; align-items: center; justify-content: center;
          background: none; border: none;
          color: rgba(255,255,255,0.65);
          cursor: pointer; border-radius: 5px;
          transition: color 0.15s, background 0.15s;
          text-decoration: none; flex-shrink: 0;
        }
        .vp__btn:hover { color: #fff; background: rgba(255,255,255,0.08); }
        .vp__vol {
          width: 56px; height: 3px;
          cursor: pointer; accent-color: #fff;
          opacity: 0.6; transition: opacity 0.15s; margin: 0 4px;
        }
        .vp__vol:hover { opacity: 1; }
        .vp__time {
          font-size: 0.6875rem;
          color: rgba(255,255,255,0.4);
          padding-left: 4px;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}

"use client";

import { useState } from "react";
import VideoNotifications from "../components/VideoNotifications";
import VideoPlayer from "../components/VideoPlayer";

type UploadState = "idle" | "uploading" | "success" | "error";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [message, setMessage] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type.startsWith("video/")) setFile(dropped);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploadState("uploading");
    setProgress(0);
    setMessage("");

    // Simulate progress
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 18, 90));
    }, 300);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("http://localhost:3000/videos/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(interval);
      setProgress(100);

      if (res.ok) {
        const data = await res.json();
        setUploadState("success");
        setMessage("Upload complete — processing has started.");
      } else {
        setUploadState("error");
        setMessage("Upload failed. Please try again.");
      }
    } catch {
      clearInterval(interval);
      setUploadState("error");
      setMessage("Connection error. Check your network.");
    }
  };

  const reset = () => {
    setFile(null);
    setUploadState("idle");
    setMessage("");
    setVideoUrl(null);
    setProgress(0);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <VideoNotifications onVideoReady={(url) => setVideoUrl(url)}/>

      <main className="main">
        <div className="container">
          {/* Header */}
          <div className="header">
            <div className="logo">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
            <h1 className="title">Video Upload</h1>
            <p className="subtitle">Transcode and stream your videos instantly</p>
          </div>

          {/* Upload zone */}
          {uploadState === "idle" && (
            <div
              className={`dropzone ${dragOver ? "dropzone--active" : ""} ${file ? "dropzone--has-file" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <input
                id="file-input"
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
              {file ? (
                <div className="file-info">
                  <div className="file-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="2" y="2" width="20" height="20" rx="3" />
                      <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
                    </svg>
                  </div>
                  <div className="file-details">
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">{formatSize(file.size)}</span>
                  </div>
                  <button
                    className="file-remove"
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="dropzone-inner">
                  <div className="dropzone-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <p className="dropzone-label">Drop video here or <span className="dropzone-link">browse</span></p>
                  <p className="dropzone-hint">MP4, MOV, AVI, MKV up to 5 GB</p>
                </div>
              )}
            </div>
          )}

          {/* Upload button */}
          {uploadState === "idle" && (
            <button
              className={`upload-btn ${!file ? "upload-btn--disabled" : ""}`}
              onClick={handleUpload}
              disabled={!file}
            >
              Upload & Process
            </button>
          )}

          {/* Progress */}
          {uploadState === "uploading" && (
            <div className="progress-wrap">
              <div className="progress-header">
                <span className="progress-label">Uploading{file ? ` ${file.name}` : ""}…</span>
                <span className="progress-pct">{Math.round(progress)}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-bar" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* Message */}
          {message && (
            <p className={`message message--${uploadState}`}>{message}</p>
          )}

          {/* Success actions */}
          {uploadState === "success" && (
            <button className="reset-btn" onClick={reset}>
              Upload another
            </button>
          )}

          {/* Video player */}
          {videoUrl && (
            <div className="player-section">
              <VideoPlayer videoUrl={videoUrl} />
            </div>
          )}
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;1,400&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .main {
          min-height: 100vh;
          background: #080810;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
          font-family: 'DM Sans', sans-serif;
        }

        .container {
          width: 100%;
          max-width: 480px;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .header {
          text-align: center;
          margin-bottom: 0.5rem;
        }

        .logo {
          width: 44px;
          height: 44px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.7);
          margin: 0 auto 1rem;
        }

        .title {
          font-size: 1.375rem;
          font-weight: 500;
          color: #fff;
          letter-spacing: -0.02em;
          margin-bottom: 0.375rem;
        }

        .subtitle {
          font-size: 0.875rem;
          color: rgba(255,255,255,0.35);
        }

        .dropzone {
          border: 1px dashed rgba(255,255,255,0.12);
          border-radius: 0.75rem;
          background: rgba(255,255,255,0.02);
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
          min-height: 160px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .dropzone:hover,
        .dropzone--active {
          border-color: rgba(255,255,255,0.25);
          background: rgba(255,255,255,0.04);
        }
        .dropzone--has-file {
          border-style: solid;
          border-color: rgba(255,255,255,0.1);
          min-height: auto;
          padding: 1rem;
        }

        .dropzone-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.625rem;
          padding: 2rem;
        }
        .dropzone-icon { color: rgba(255,255,255,0.2); }
        .dropzone-label {
          font-size: 0.875rem;
          color: rgba(255,255,255,0.5);
        }
        .dropzone-link { color: rgba(255,255,255,0.75); text-decoration: underline; }
        .dropzone-hint {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.2);
        }

        .file-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
        }
        .file-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: rgba(255,255,255,0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.5);
          flex-shrink: 0;
        }
        .file-details { flex: 1; min-width: 0; }
        .file-name {
          display: block;
          font-size: 0.8125rem;
          color: rgba(255,255,255,0.75);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .file-size {
          display: block;
          font-size: 0.75rem;
          color: rgba(255,255,255,0.3);
          margin-top: 2px;
        }
        .file-remove {
          background: none;
          border: none;
          color: rgba(255,255,255,0.25);
          cursor: pointer;
          font-size: 0.75rem;
          padding: 0.25rem;
          transition: color 0.15s;
        }
        .file-remove:hover { color: rgba(255,255,255,0.6); }

        .upload-btn {
          width: 100%;
          padding: 0.75rem;
          border-radius: 0.5rem;
          background: #fff;
          color: #080810;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.875rem;
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.1s;
        }
        .upload-btn:hover { opacity: 0.9; }
        .upload-btn:active { transform: scale(0.99); }
        .upload-btn--disabled {
          opacity: 0.25;
          cursor: not-allowed;
        }

        .progress-wrap {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .progress-label {
          font-size: 0.8125rem;
          color: rgba(255,255,255,0.5);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 80%;
        }
        .progress-pct {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.3);
          flex-shrink: 0;
        }
        .progress-track {
          height: 3px;
          background: rgba(255,255,255,0.08);
          border-radius: 999px;
          overflow: hidden;
        }
        .progress-bar {
          height: 100%;
          background: #fff;
          border-radius: 999px;
          transition: width 0.3s ease;
        }

        .message {
          font-size: 0.8125rem;
          text-align: center;
          padding: 0.625rem 0;
        }
        .message--success { color: #22c55e; }
        .message--error { color: #ef4444; }

        .reset-btn {
          background: none;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 0.5rem;
          color: rgba(255,255,255,0.4);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.8125rem;
          padding: 0.625rem;
          width: 100%;
          cursor: pointer;
          transition: color 0.15s, border-color 0.15s;
        }
        .reset-btn:hover {
          color: rgba(255,255,255,0.7);
          border-color: rgba(255,255,255,0.2);
        }

        .player-section {
          margin-top: 0.5rem;
        }
      `}</style>
    </>
  );
}

"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useVideoContext, VideoEvent } from "../context/VideoContext";

const NAV = [
  {
    href: "/videos",
    label: "Library",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="2" width="8" height="8" rx="1.5" />
        <rect x="14" y="2" width="8" height="8" rx="1.5" />
        <rect x="2" y="14" width="8" height="8" rx="1.5" />
        <rect x="14" y="14" width="8" height="8" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/upload",
    label: "Upload",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
  },
  {
    href: "/dlq",
    label: "Dead Letter",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    badge: true,
  },
];

const PAGE_TITLES: Record<string, string> = {
  "/videos": "Library",
  "/upload": "Upload",
  "/dlq": "Dead Letter Queue",
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [dlqCount, setDlqCount] = useState(0);
  const { notifications } = useVideoContext();
  const latestTs = notifications[0]?.ts;

  useEffect(() => {
    console.log("notifications updated", notifications);
  }, [notifications]);

  // Fetch DLQ count for badge
  useEffect(() => {
    fetch("http://localhost:3000/videos/dlq/count")
      .then((r) => r.json())
      .then((d) => setDlqCount(d.count ?? 0))
      .catch(() => {});
  }, [pathname]);

  const title = PAGE_TITLES[pathname] ?? "Streamline";

  useEffect(() => {
    if (!notifications[0]) return;
    const t = setTimeout(() => {
    }, 3500);
    return () => clearTimeout(t);
  }, [latestTs]);

  return (
    <>
      {notifications.length > 0 && (
        <div className="notifications-wrapper">
          {notifications.map((n, i) => (
            <div
              key={n.ts}
              className={`notification notification--${n.status === "READY" ? "ready" : "failed"}`}
            >
              <span className="notification__dot" />
              <span className="notification__message">
                {n.status === "READY"
                  ? `Video ready`
                  : `Video failed${n.errorMessage ? `: ${n.errorMessage}` : ""}`}
              </span>
              <span className="notification__time">
                {n.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className={`shell ${collapsed ? "shell--collapsed" : ""}`}>
        {/* Sidebar */}
        <aside className="sidebar">
          {/* Logo */}
          <div className="sidebar-logo">
            <div className="logo-icon">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
            {!collapsed && <span className="logo-text">Streamline</span>}
          </div>

          {/* Nav */}
          <nav className="sidebar-nav">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item ${active ? "nav-item--active" : ""}`}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {!collapsed && (
                    <span className="nav-label">{item.label}</span>
                  )}
                  {!collapsed && item.badge && dlqCount > 0 && (
                    <span className="nav-badge">{dlqCount}</span>
                  )}
                  {collapsed && item.badge && dlqCount > 0 && (
                    <span className="nav-badge-dot" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Collapse toggle */}
          <button
            className="sidebar-toggle"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand" : "Collapse"}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: collapsed ? "rotate(180deg)" : "none",
                transition: "transform 0.2s",
              }}
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </aside>

        {/* Main area */}
        <div className="main-area">
          {/* Header */}
          <header className="topbar">
            <h1 className="topbar-title">{title}</h1>
            <div className="topbar-right">
              <div className="status-dot" title="API connected" />
            </div>
          </header>

          {/* Page content */}
          <main className="content">{children}</main>
        </div>

        <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #080810;
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          height: 100vh;
          overflow: hidden;
        }

        .shell {
          display: flex;
          height: 100vh;
          --sidebar-w: 200px;
        }
        .shell--collapsed { --sidebar-w: 56px; }

        .notifications-wrapper {
          position: fixed;
          top: 1rem;
          left: 50%;
          transform: translateX(-50%);
          z-index: 999;
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
          min-width: 320px;
          max-width: 420px;
          pointer-events: none;
        }
        .notification {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.625rem 1rem;
          border-radius: 0.5rem;
          background: rgba(15,15,22,0.96);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.08);
          animation: dropIn 0.3s cubic-bezier(0.16,1,0.3,1);
        }
        .notification--ready { border-left: 3px solid #22c55e; }
        .notification--failed { border-left: 3px solid #ef4444; }
        .notification__dot {
          width: 6px; height: 6px;
          border-radius: 50%; flex-shrink: 0;
        }
        .notification--ready .notification__dot { background: #22c55e; }
        .notification--failed .notification__dot { background: #ef4444; }
        .notification__message {
          flex: 1;
          font-size: 0.8125rem;
          color: rgba(255,255,255,0.8);
        }
        .notification__time {
          font-size: 0.6875rem;
          color: rgba(255,255,255,0.3);
          flex-shrink: 0;
        }
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-0.5rem); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .global-toast {
          position: fixed;
          bottom: 1.25rem; right: 1.25rem;
          z-index: 999;
          display: flex; align-items: center; gap: 0.5rem;
          padding: 0.625rem 1rem;
          border-radius: 0.5rem;
          font-size: 0.8125rem;
          background: rgba(15,15,22,0.95);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.08);
          animation: slideUp 0.25s cubic-bezier(0.16,1,0.3,1);
        }
        .global-toast--ok  { border-left: 3px solid #22c55e; color: rgba(255,255,255,0.8); }
        .global-toast--err { border-left: 3px solid #ef4444; color: rgba(255,255,255,0.8); }
        .global-toast__dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .global-toast--ok  .global-toast__dot { background: #22c55e; }
        .global-toast--err .global-toast__dot { background: #ef4444; }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(0.5rem); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Sidebar ── */
        .sidebar {
          width: var(--sidebar-w);
          flex-shrink: 0;
          background: #0c0c16;
          border-right: 1px solid rgba(255,255,255,0.06);
          display: flex;
          flex-direction: column;
          transition: width 0.22s cubic-bezier(0.4,0,0.2,1);
          overflow: hidden;
          position: relative;
          z-index: 20;
        }

        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 1.125rem 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          min-height: 57px;
          overflow: hidden;
          white-space: nowrap;
        }
        .logo-icon {
          width: 28px; height: 28px;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          color: rgba(255,255,255,0.7);
          flex-shrink: 0;
        }
        .logo-text {
          font-size: 0.9375rem;
          font-weight: 500;
          color: rgba(255,255,255,0.85);
          letter-spacing: -0.02em;
        }

        .sidebar-nav {
          flex: 1;
          padding: 0.75rem 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow: hidden;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.5rem 0.625rem;
          border-radius: 0.5rem;
          color: rgba(255,255,255,0.4);
          text-decoration: none;
          font-size: 0.8125rem;
          font-weight: 400;
          white-space: nowrap;
          position: relative;
          transition: background 0.12s, color 0.12s;
          overflow: hidden;
        }
        .nav-item:hover {
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.75);
        }
        .nav-item--active {
          background: rgba(255,255,255,0.08);
          color: #fff;
          font-weight: 500;
        }
        .nav-icon { flex-shrink: 0; display: flex; align-items: center; }
        .nav-label { flex: 1; }

        .nav-badge {
          font-size: 0.625rem;
          font-weight: 500;
          background: #ef4444;
          color: #fff;
          border-radius: 999px;
          padding: 1px 6px;
          min-width: 18px;
          text-align: center;
          flex-shrink: 0;
        }
        .nav-badge-dot {
          position: absolute;
          top: 6px; right: 6px;
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #ef4444;
          flex-shrink: 0;
        }

        .sidebar-toggle {
          margin: 0.5rem;
          padding: 0.5rem;
          background: none;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 0.5rem;
          color: rgba(255,255,255,0.25);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.12s, color 0.12s, border-color 0.12s;
        }
        .sidebar-toggle:hover {
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.6);
          border-color: rgba(255,255,255,0.12);
        }

        /* ── Main area ── */
        .main-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          overflow: hidden;
        }

        .topbar {
          height: 57px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 1.5rem;
          background: rgba(8,8,16,0.8);
          backdrop-filter: blur(8px);
          flex-shrink: 0;
        }
        .topbar-title {
          font-size: 0.9375rem;
          font-weight: 500;
          color: rgba(255,255,255,0.75);
          letter-spacing: -0.01em;
        }
        .topbar-right {
          display: flex; align-items: center; gap: 0.75rem;
        }
        .status-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 6px #22c55e66;
          animation: pulse 3s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .content {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
        }
        .content::-webkit-scrollbar { width: 4px; }
        .content::-webkit-scrollbar-track { background: transparent; }
        .content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 999px; }
      `}</style>
      </div>
    </>
  );
}

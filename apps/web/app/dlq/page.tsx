"use client";

import { useState, useEffect, useCallback } from "react";

const API = "http://localhost:3000";

interface DlqEntry {
  id: string;
  videoId: string;
  topic: string;
  errorMessage: string;
  retryCount: number;
  payload: Record<string, any>;
  resolvedAt: string | null;
  createdAt: string;
}

interface ApiResponse {
  data: DlqEntry[];
  total: number;
  page: number;
  totalPages: number;
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

const fmtId = (id: string) => id.slice(0, 8) + "…";

export default function DlqPage() {
  const [entries, setEntries] = useState<DlqEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchEntries = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/videos/dlq?page=${p}&limit=15`);
      const data: ApiResponse = await res.json();
      setEntries(data.data ?? []);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setPage(data.page);
    } catch {
      showToast("Failed to fetch DLQ entries", "err");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEntries(1); }, [fetchEntries]);

  const handleRetry = async (id: string) => {
    setRetrying(id);
    try {
      const res = await fetch(`${API}/videos/dlq/${id}/retry`, { method: "POST" });
      if (!res.ok) throw new Error();
      showToast("Event re-queued successfully");
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setTotal((t) => t - 1);
    } catch {
      showToast("Retry failed", "err");
    } finally {
      setRetrying(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`${API}/videos/dlq/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      showToast("Entry deleted");
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setTotal((t) => t - 1);
    } catch {
      showToast("Delete failed", "err");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="dlq-page">
      {/* Toast */}
      {toast && (
        <div className={`toast toast--${toast.type}`}>{toast.msg}</div>
      )}

      {/* Stats bar */}
      <div className="stats-bar">
        <div className="stat">
          <span className="stat-val">{total}</span>
          <span className="stat-label">Unresolved</span>
        </div>
        <div className="stat-divider" />
        <div className="stat">
          <span className="stat-val" style={{ color: "#f59e0b" }}>
            {entries.reduce((s, e) => Math.max(s, e.retryCount), 0)}
          </span>
          <span className="stat-label">Max retries</span>
        </div>
        <div className="stat-divider" />
        <div className="stat">
          <span className="stat-val" style={{ color: "#60a5fa" }}>
            {[...new Set(entries.map((e) => e.topic))].length}
          </span>
          <span className="stat-label">Topics</span>
        </div>
        <button className="refresh-btn" onClick={() => fetchEntries(page)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="table-wrap">
        {loading ? (
          <div className="loading-rows">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton-row" style={{ animationDelay: `${i * 0.06}s` }} />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <p>No dead letter events</p>
            <span>All events processed successfully</span>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Video ID</th>
                <th>Topic</th>
                <th>Error</th>
                <th>Retries</th>
                <th>Failed at</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <>
                  <tr
                    key={entry.id}
                    className={`row ${expanded === entry.id ? "row--expanded" : ""}`}
                    style={{ animationDelay: `${i * 0.04}s` }}
                  >
                    {/* Video ID */}
                    <td>
                      <div className="cell-id">
                        <span className="id-chip">{fmtId(entry.videoId)}</span>
                      </div>
                    </td>

                    {/* Topic */}
                    <td>
                      <span className="topic-chip">{entry.topic}</span>
                    </td>

                    {/* Error */}
                    <td>
                      <div className="error-cell">
                        <span className="error-text">{entry.errorMessage}</span>
                        <button
                          className="expand-btn"
                          onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                          title="View payload"
                        >
                          <svg
                            width="12" height="12" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                            style={{ transform: expanded === entry.id ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
                          >
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </button>
                      </div>
                    </td>

                    {/* Retries */}
                    <td>
                      <div className="retry-pips">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div
                            key={i}
                            className="pip"
                            style={{ background: i < entry.retryCount ? "#ef4444" : "rgba(255,255,255,0.1)" }}
                          />
                        ))}
                        <span className="retry-num">{entry.retryCount}</span>
                      </div>
                    </td>

                    {/* Date */}
                    <td>
                      <span className="date-text">{fmtDate(entry.createdAt)}</span>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="actions">
                        <button
                          className="action-btn action-btn--retry"
                          onClick={() => handleRetry(entry.id)}
                          disabled={retrying === entry.id || deleting === entry.id}
                          title="Retry"
                        >
                          {retrying === entry.id ? (
                            <div className="spinner" />
                          ) : (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="23 4 23 10 17 10"/>
                              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                            </svg>
                          )}
                          Retry
                        </button>
                        <button
                          className="action-btn action-btn--delete"
                          onClick={() => handleDelete(entry.id)}
                          disabled={retrying === entry.id || deleting === entry.id}
                          title="Delete"
                        >
                          {deleting === entry.id ? (
                            <div className="spinner" />
                          ) : (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                            </svg>
                          )}
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded payload */}
                  {expanded === entry.id && (
                    <tr key={`${entry.id}-payload`} className="payload-row">
                      <td colSpan={6}>
                        <div className="payload-wrap">
                          <div className="payload-header">
                            <span>Payload</span>
                            <button
                              className="copy-btn"
                              onClick={() => {
                                navigator.clipboard.writeText(JSON.stringify(entry.payload, null, 2));
                                showToast("Copied to clipboard");
                              }}
                            >
                              Copy
                            </button>
                          </div>
                          <pre className="payload-pre">
                            {JSON.stringify(entry.payload, null, 2)}
                          </pre>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button className="page-btn" disabled={page === 1} onClick={() => fetchEntries(page - 1)}>← Prev</button>
          <span className="page-info">Page {page} of {totalPages}</span>
          <button className="page-btn" disabled={page === totalPages} onClick={() => fetchEntries(page + 1)}>Next →</button>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500&family=DM+Mono:wght@400&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .dlq-page {
          padding: 1.5rem;
          font-family: 'DM Sans', sans-serif;
          color: #fff;
          min-height: 100%;
          position: relative;
        }

        /* Toast */
        .toast {
          position: fixed;
          top: 1.25rem; right: 1.25rem;
          z-index: 200;
          padding: 0.625rem 1rem;
          border-radius: 0.5rem;
          font-size: 0.8125rem;
          backdrop-filter: blur(12px);
          animation: slideIn 0.25s cubic-bezier(0.16,1,0.3,1);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .toast--ok { background: rgba(34,197,94,0.15); color: #4ade80; border-color: rgba(34,197,94,0.2); }
        .toast--err { background: rgba(239,68,68,0.15); color: #f87171; border-color: rgba(239,68,68,0.2); }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(0.75rem); }
          to   { opacity: 1; transform: translateX(0); }
        }

        /* Stats bar */
        .stats-bar {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          padding: 1rem 1.25rem;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 0.75rem;
          margin-bottom: 1rem;
        }
        .stat { display: flex; flex-direction: column; gap: 2px; }
        .stat-val { font-size: 1.125rem; font-weight: 500; color: #fff; line-height: 1; }
        .stat-label { font-size: 0.6875rem; color: rgba(255,255,255,0.3); }
        .stat-divider { width: 1px; height: 28px; background: rgba(255,255,255,0.08); }
        .refresh-btn {
          margin-left: auto;
          display: flex; align-items: center; gap: 0.375rem;
          padding: 0.4rem 0.75rem;
          background: none;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 0.5rem;
          color: rgba(255,255,255,0.4);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.15s;
        }
        .refresh-btn:hover { color: rgba(255,255,255,0.75); border-color: rgba(255,255,255,0.2); }

        /* Table */
        .table-wrap {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 0.75rem;
          overflow: hidden;
        }

        .loading-rows { display: flex; flex-direction: column; gap: 1px; padding: 0.5rem; }
        .skeleton-row {
          height: 48px; border-radius: 6px;
          background: rgba(255,255,255,0.04);
          animation: shimmer 1.4s ease-in-out infinite;
        }
        @keyframes shimmer { 0%,100%{opacity:.4} 50%{opacity:.7} }

        .empty {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 0.5rem;
          padding: 4rem 0;
        }
        .empty-icon {
          width: 52px; height: 52px;
          background: rgba(34,197,94,0.08);
          border: 1px solid rgba(34,197,94,0.15);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: #22c55e; margin-bottom: 0.5rem;
        }
        .empty p { font-size: 0.9375rem; color: rgba(255,255,255,0.6); }
        .empty span { font-size: 0.8125rem; color: rgba(255,255,255,0.25); }

        .table {
          width: 100%; border-collapse: collapse;
          font-size: 0.8125rem;
        }
        .table thead tr {
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .table th {
          padding: 0.625rem 1rem;
          text-align: left;
          font-size: 0.6875rem;
          font-weight: 500;
          color: rgba(255,255,255,0.3);
          letter-spacing: 0.04em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .row {
          border-bottom: 1px solid rgba(255,255,255,0.04);
          animation: fadeUp 0.3s ease both;
          transition: background 0.12s;
        }
        .row:hover { background: rgba(255,255,255,0.03); }
        .row--expanded { background: rgba(255,255,255,0.03); }
        .row:last-child { border-bottom: none; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .table td { padding: 0.75rem 1rem; vertical-align: middle; }

        .id-chip {
          font-family: 'DM Mono', monospace;
          font-size: 0.75rem;
          color: rgba(255,255,255,0.45);
          background: rgba(255,255,255,0.05);
          padding: 2px 7px;
          border-radius: 4px;
        }

        .topic-chip {
          font-size: 0.6875rem;
          color: #60a5fa;
          background: rgba(96,165,250,0.1);
          border: 1px solid rgba(96,165,250,0.2);
          padding: 2px 8px;
          border-radius: 999px;
          white-space: nowrap;
        }

        .error-cell {
          display: flex; align-items: center; gap: 0.5rem;
          max-width: 280px;
        }
        .error-text {
          color: rgba(255,255,255,0.5);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          flex: 1;
        }
        .expand-btn {
          background: none; border: none;
          color: rgba(255,255,255,0.25);
          cursor: pointer; padding: 3px;
          display: flex; align-items: center;
          border-radius: 4px;
          transition: color 0.12s;
          flex-shrink: 0;
        }
        .expand-btn:hover { color: rgba(255,255,255,0.6); }

        .retry-pips {
          display: flex; align-items: center; gap: 4px;
        }
        .pip {
          width: 6px; height: 6px; border-radius: 50%;
          transition: background 0.15s;
        }
        .retry-num {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.3);
          margin-left: 4px;
          font-variant-numeric: tabular-nums;
        }

        .date-text {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.3);
          white-space: nowrap;
        }

        .actions { display: flex; align-items: center; gap: 0.375rem; }
        .action-btn {
          display: flex; align-items: center; gap: 0.3rem;
          padding: 0.3rem 0.625rem;
          border-radius: 5px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.75rem;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .action-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .action-btn--retry {
          background: rgba(96,165,250,0.08);
          border-color: rgba(96,165,250,0.2);
          color: #60a5fa;
        }
        .action-btn--retry:hover:not(:disabled) {
          background: rgba(96,165,250,0.15);
          border-color: rgba(96,165,250,0.35);
        }

        .action-btn--delete {
          background: rgba(239,68,68,0.07);
          border-color: rgba(239,68,68,0.18);
          color: #f87171;
        }
        .action-btn--delete:hover:not(:disabled) {
          background: rgba(239,68,68,0.14);
          border-color: rgba(239,68,68,0.3);
        }

        .spinner {
          width: 11px; height: 11px;
          border: 1.5px solid currentColor;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Payload */
        .payload-row td { padding: 0; }
        .payload-wrap {
          border-top: 1px solid rgba(255,255,255,0.06);
          background: rgba(0,0,0,0.3);
        }
        .payload-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.5rem 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .payload-header span {
          font-size: 0.6875rem;
          color: rgba(255,255,255,0.25);
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .copy-btn {
          background: none; border: none;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.6875rem;
          color: rgba(255,255,255,0.3);
          cursor: pointer;
          transition: color 0.12s;
        }
        .copy-btn:hover { color: rgba(255,255,255,0.65); }
        .payload-pre {
          font-family: 'DM Mono', monospace;
          font-size: 0.75rem;
          color: rgba(255,255,255,0.45);
          padding: 0.875rem 1rem;
          overflow-x: auto;
          line-height: 1.6;
          max-height: 220px;
          overflow-y: auto;
        }

        /* Pagination */
        .pagination {
          display: flex; align-items: center; justify-content: center;
          gap: 1rem; margin-top: 1.25rem;
        }
        .page-btn {
          padding: 0.4rem 0.875rem;
          background: none;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 0.5rem;
          color: rgba(255,255,255,0.4);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.8125rem;
          cursor: pointer;
          transition: all 0.15s;
        }
        .page-btn:hover:not(:disabled) { color: rgba(255,255,255,0.75); border-color: rgba(255,255,255,0.2); }
        .page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .page-info { font-size: 0.8125rem; color: rgba(255,255,255,0.25); }
      `}</style>
    </div>
  );
}

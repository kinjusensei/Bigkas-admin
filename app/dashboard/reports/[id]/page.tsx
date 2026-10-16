"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  FormEvent,
  Fragment,
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import AdminGate from "@/components/admin/AdminGate";
import StatusBadge from "@/components/admin/StatusBadge";
import { emptyStyle, mutedStyle } from "@/components/admin/styles";
import {
  BugReport,
  ReportMessage,
  ReportReceipts,
  errorMessage,
  getBugReport,
  getReportMessages,
  getReportReceipts,
  getScreenshotUrl,
  markReportSeen,
  replyToReport,
  updateReportStatus,
} from "@/lib/admin/adminService";
import { REPORT_STATUSES, formatDateTime, statusLabel } from "@/lib/admin/reportStatus";
import { supabase } from "@/lib/supabase";

const REPLY_MAX = 2000;

// Canned starting points. Picking one also suggests a status, which the admin can still drop.
const QUICK_REPLIES: { label: string; text: string; status?: string }[] = [
  {
    label: "Acknowledge",
    text: "Thanks for reporting this! We're looking into it now.",
    status: "in_progress",
  },
  {
    label: "Ask for details",
    text: "Could you tell us a bit more? What were you doing when this happened, and does it happen every time?",
  },
  {
    label: "Fixed",
    text: "This is fixed in the latest update. Please update the app and let us know if you still see it.",
    status: "resolved",
  },
  {
    label: "Can't reproduce",
    text: "We couldn't reproduce this on our side. If it happens again, please send us a new report with a screenshot.",
  },
];

type Notice = { kind: "success" | "error"; text: string } | null;

type ChatEntry = {
  id: string;
  from: ReportMessage["sender_role"];
  body: string;
  createdAt: string;
  state?: "sending" | "failed";
  status?: string | null;
  error?: string;
};

type PendingMessage = Omit<ChatEntry, "id">;

function sameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

function timeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ReportDetailPage() {
  return (
    <AdminGate>
      <ReportDetailContent />
    </AdminGate>
  );
}

function ReportDetailContent() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [report, setReport] = useState<BugReport | null>(null);
  const [messages, setMessages] = useState<ReportMessage[]>([]);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [alsoStatus, setAlsoStatus] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingMessage | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [receipts, setReceipts] = useState<ReportReceipts>({
    admin_seen_at: null,
    user_seen_at: null,
  });

  const formRef = useRef<HTMLFormElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const loadMessages = useCallback(async () => {
    if (!id) return;
    setMessages(await getReportMessages(id));
  }, [id]);

  // Tells the user we have read their messages, then picks up their side of the receipt.
  // Skipped while the tab is in the background, so "Seen" only appears once someone looks.
  const markSeen = useCallback(async () => {
    if (!id) return;
    if (document.visibilityState !== "visible") return;
    try {
      await markReportSeen(id);
    } catch {
      // Receipts are a nice-to-have; never block the page on them.
    }
    setReceipts(await getReportReceipts(id));
  }, [id]);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const r = await getBugReport(id);
      setReport(r);
      if (r) {
        const [messageList, url] = await Promise.all([
          getReportMessages(r.id),
          r.screenshot_path ? getScreenshotUrl(r.screenshot_path) : Promise.resolve(null),
        ]);
        setMessages(messageList);
        setScreenshotUrl(url);
        markSeen();
      }
      setLoadError(null);
    } catch (e) {
      setLoadError(errorMessage(e, "Couldn't load this report."));
    } finally {
      setLoading(false);
    }
  }, [id, markSeen]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") markSeen();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [markSeen]);

  // Show the user's follow-ups as they arrive.
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`admin-report-thread-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bug_report_messages",
          filter: `report_id=eq.${id}`,
        },
        () => {
          loadMessages().catch(() => {});
          markSeen();
        }
      )
      // The user opening the thread moves user_seen_at, which flips our replies to "Seen".
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bug_reports",
          filter: `id=eq.${id}`,
        },
        () => {
          getReportReceipts(id)
            .then(setReceipts)
            .catch(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, loadMessages, markSeen]);

  // Keep the newest message in view.
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pending]);

  // Grow the message box with its content, up to the CSS max-height.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [message]);

  if (loading) {
    return <p style={emptyStyle}>Loading report…</p>;
  }

  if (loadError || !report) {
    return (
      <>
        <BackLink />
        <div className="flash flash-error">
          {loadError ?? "This report doesn't exist or was deleted."}
        </div>
      </>
    );
  }

  const trimmed = message.trim();
  const canSend = !saving && trimmed.length > 0;
  const waitingForAdmin =
    report.needs_admin_reply ||
    (messages.length > 0 && messages[messages.length - 1].sender_role === "user");

  // Keep the report's current status selectable even if it isn't in the standard list.
  const statusOptions = REPORT_STATUSES.includes(report.status as (typeof REPORT_STATUSES)[number])
    ? [...REPORT_STATUSES]
    : [report.status, ...REPORT_STATUSES];

  // The original report opens the conversation, followed by every reply.
  const entries: ChatEntry[] = [
    {
      id: "report",
      from: "user",
      body: report.description?.trim()
        ? `${report.title}\n\n${report.description.trim()}`
        : report.title,
      createdAt: report.created_at,
    },
    ...messages.map((m) => ({
      id: m.id,
      from: m.sender_role,
      body: m.body,
      createdAt: m.created_at,
    })),
    ...(pending ? [{ ...pending, id: "pending" }] : []),
  ];

  // The receipt goes under the newest delivered admin message only, like most chat apps.
  const lastAdminIndex = entries.findLastIndex((e) => e.from === "admin" && !e.state);
  const seenAt = receipts.user_seen_at;
  const lastAdminSeen =
    lastAdminIndex >= 0 &&
    seenAt !== null &&
    new Date(seenAt) >= new Date(entries[lastAdminIndex].createdAt);

  const applyQuickReply = (q: (typeof QUICK_REPLIES)[number]) => {
    setMessage((current) => {
      const next = current.trim() ? `${current.trimEnd()}\n\n${q.text}` : q.text;
      return next.slice(0, REPLY_MAX);
    });
    if (q.status && q.status !== report.status) setAlsoStatus(q.status);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift + Enter adds a new line, like any chat app.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  const send = async (body: string, status: string | null) => {
    setSaving(true);
    setNotice(null);
    setPending({
      from: "admin",
      body,
      createdAt: new Date().toISOString(),
      state: "sending",
    });
    try {
      await replyToReport(report.id, body, status ?? undefined);
      setAlsoStatus(null);
      await load();
      setPending(null);
    } catch (err) {
      setPending({
        from: "admin",
        body,
        createdAt: new Date().toISOString(),
        state: "failed",
        status,
        error: errorMessage(err, "Check your connection and try again."),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    setMessage("");
    await send(trimmed, alsoStatus);
    inputRef.current?.focus();
  };

  const retry = () => {
    if (pending?.state === "failed") send(pending.body, pending.status ?? null);
  };

  const editFailed = () => {
    if (pending?.state !== "failed") return;
    setMessage(pending.body);
    setPending(null);
    inputRef.current?.focus();
  };

  const changeStatus = async (status: string) => {
    if (status === report.status) return;
    setStatusSaving(true);
    setNotice(null);
    try {
      await updateReportStatus(report.id, status);
      setReport({ ...report, status });
      if (alsoStatus === status) setAlsoStatus(null);
      setNotice({
        kind: "success",
        text: `Status changed to ${statusLabel(status)}. The user wasn't notified.`,
      });
    } catch (err) {
      setNotice({
        kind: "error",
        text: `Status not updated. ${errorMessage(err, "Check your connection and try again.")}`,
      });
    } finally {
      setStatusSaving(false);
    }
  };

  return (
    <>
      <BackLink />

      <div className="grid-2" style={{ alignItems: "start" }}>
        <section className="card" aria-label="Report details">
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 10,
              marginBottom: 10,
              fontSize: 12,
              color: "#6B7280",
            }}
          >
            <StatusBadge status={report.status} />
            <span>{report.category}</span>
            <span>{formatDateTime(report.created_at)}</span>
          </div>
          <h1
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#111827",
              marginBottom: 10,
            }}
          >
            {report.title}
          </h1>

          {report.description ? (
            <p
              style={{
                fontSize: 13,
                color: "#374151",
                whiteSpace: "pre-wrap",
                marginBottom: 16,
              }}
            >
              {report.description}
            </p>
          ) : (
            <p style={{ ...mutedStyle, marginBottom: 16 }}>No description given.</p>
          )}

          {screenshotUrl ? (
            <a
              href={screenshotUrl}
              target="_blank"
              rel="noreferrer"
              title="Open full size in a new tab"
              style={{ display: "inline-block", marginBottom: 16 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- signed URL, not optimisable */}
              <img
                src={screenshotUrl}
                alt="Screenshot attached to the report"
                style={{
                  display: "block",
                  maxWidth: "100%",
                  maxHeight: 420,
                  border: "1px solid #E5E7EB",
                  borderRadius: 6,
                }}
              />
            </a>
          ) : (
            <p style={{ ...mutedStyle, marginBottom: 16 }}>Screenshot unavailable.</p>
          )}

          <p
            style={{
              ...mutedStyle,
              fontFamily: "var(--font-geist-mono), monospace",
            }}
          >
            Reporter ID: {report.user_id}
          </p>
        </section>

        <section className="card chat" aria-labelledby="thread-heading">
          <div className="chat-header">
            <div>
              <h2 id="thread-heading" className="card-title">
                Conversation
              </h2>
              <span style={mutedStyle}>
                {messages.length === 1 ? "1 reply" : `${messages.length} replies`}
              </span>
            </div>
            <label className="chat-status" title="Change the status without messaging the user">
              <span className="sr-only">Report status</span>
              <select
                value={report.status}
                disabled={statusSaving}
                onChange={(e) => changeStatus(e.target.value)}
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {notice && (
            <div
              role="status"
              className={`flash ${notice.kind === "success" ? "flash-success" : "flash-error"}`}
              style={{ marginBottom: 10 }}
            >
              {notice.text}
            </div>
          )}

          <div ref={threadRef} className="thread" aria-live="polite">
            {entries.map((m, i) => {
              const prev = entries[i - 1];
              const next = entries[i + 1];
              const newDay = !prev || !sameDay(prev.createdAt, m.createdAt);
              // Consecutive messages from the same side share one timestamp, under the last one.
              const groupedWithNext =
                next && next.from === m.from && !next.state && sameDay(m.createdAt, next.createdAt);
              const fromAdmin = m.from === "admin";
              return (
                <Fragment key={m.id}>
                  {newDay && (
                    <div className="day-sep">
                      <span>{dayLabel(m.createdAt)}</span>
                    </div>
                  )}
                  <div
                    className={`msg ${fromAdmin ? "msg-admin" : "msg-user"}${
                      m.state ? ` msg-${m.state}` : ""
                    }${groupedWithNext ? " msg-grouped" : ""}`}
                  >
                    {m.id === "report" && <span className="msg-tag">Original report</span>}
                    <div className="msg-bubble">{m.body}</div>
                    {m.state === "sending" ? (
                      <span className="msg-meta">Sending…</span>
                    ) : m.state === "failed" ? (
                      <span className="msg-meta msg-error">
                        Not sent. {m.error}{" "}
                        <button
                          type="button"
                          className="link-btn"
                          onClick={retry}
                          disabled={saving}
                        >
                          Retry
                        </button>
                        {" · "}
                        <button type="button" className="link-btn" onClick={editFailed}>
                          Edit
                        </button>
                      </span>
                    ) : (
                      (!groupedWithNext || i === lastAdminIndex) && (
                        <span className="msg-meta" title={formatDateTime(m.createdAt)}>
                          {fromAdmin ? "Bigkas team" : "User"} · {timeOfDay(m.createdAt)}
                          {i === lastAdminIndex &&
                            (lastAdminSeen && seenAt ? (
                              <span
                                className="receipt receipt-seen"
                                title={`Seen ${formatDateTime(seenAt)}`}
                              >
                                {" · Seen ✓✓"}
                              </span>
                            ) : (
                              <span className="receipt" title="Sent to the user's notifications">
                                {" · Delivered ✓"}
                              </span>
                            ))}
                        </span>
                      )
                    )}
                  </div>
                </Fragment>
              );
            })}
            {messages.length === 0 && !pending && (
              <p className="thread-hint">
                Reply below. The user sees it in their notifications and can answer you from there.
              </p>
            )}
          </div>

          <form ref={formRef} onSubmit={handleSubmit} className="composer">
            {waitingForAdmin && !pending && (
              <div className="waiting" role="status">
                The user is waiting for your answer.
              </div>
            )}

            <div role="group" aria-label="Quick replies" className="chip-row">
              {QUICK_REPLIES.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  className="chip"
                  onClick={() => applyQuickReply(q)}
                >
                  {q.label}
                </button>
              ))}
            </div>

            <div className="chat-input">
              <label htmlFor="report-reply" className="sr-only">
                Message the user
              </label>
              <textarea
                id="report-reply"
                ref={inputRef}
                rows={1}
                value={message}
                maxLength={REPLY_MAX}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message…"
              />
              <button
                type="submit"
                className="send-btn"
                disabled={!canSend}
                aria-label="Send message"
                title="Send (Enter)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M4 12l16-8-6 16-2.5-6.5L4 12z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            <div className="composer-foot">
              {alsoStatus ? (
                <span className="also-status">
                  Also mark as <strong>{statusLabel(alsoStatus)}</strong>
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => setAlsoStatus(null)}
                    aria-label="Don't change the status"
                    title="Don't change the status"
                  >
                    ×
                  </button>
                </span>
              ) : (
                <span>Enter to send · Shift + Enter for a new line</span>
              )}
              {message.length > REPLY_MAX * 0.8 && (
                <span>
                  {message.length}/{REPLY_MAX}
                </span>
              )}
            </div>
          </form>
        </section>
      </div>
    </>
  );
}

function BackLink() {
  return (
    <Link href="/dashboard/reports" className="btn sm" style={{ marginBottom: 16 }}>
      ‹ All reports
    </Link>
  );
}

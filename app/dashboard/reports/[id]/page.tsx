"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import AdminGate from "@/components/admin/AdminGate";
import StatusBadge from "@/components/admin/StatusBadge";
import {
  emptyStyle,
  fieldFootStyle,
  fieldStyle,
  inputStyle,
  labelStyle,
  mutedStyle,
  textareaStyle,
} from "@/components/admin/styles";
import {
  BugReport,
  ReportReply,
  errorMessage,
  getBugReport,
  getReportReplies,
  getScreenshotUrl,
  replyToReport,
  updateReportStatus,
} from "@/lib/admin/adminService";
import {
  REPORT_STATUSES,
  formatDateTime,
  statusLabel,
} from "@/lib/admin/reportStatus";

const REPLY_MAX = 2000;

type Notice = { kind: "success" | "error"; text: string } | null;

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
  const [replies, setReplies] = useState<ReportReply[]>([]);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [nextStatus, setNextStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const r = await getBugReport(id);
      setReport(r);
      if (r) {
        setNextStatus(r.status);
        const [replyList, url] = await Promise.all([
          getReportReplies(r.id),
          r.screenshot_path ? getScreenshotUrl(r.screenshot_path) : Promise.resolve(null),
        ]);
        setReplies(replyList);
        setScreenshotUrl(url);
      }
      setLoadError(null);
    } catch (e) {
      setLoadError(errorMessage(e, "Couldn't load this report."));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

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
  const statusChanged = nextStatus !== report.status;
  const canSubmit = !saving && (trimmed.length > 0 || statusChanged);
  const submitLabel = trimmed.length > 0 ? "Send reply" : "Update status";

  // Keep the report's current status selectable even if it isn't in the standard list.
  const statusOptions = REPORT_STATUSES.includes(report.status as (typeof REPORT_STATUSES)[number])
    ? [...REPORT_STATUSES]
    : [report.status, ...REPORT_STATUSES];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSaving(true);
    setNotice(null);
    try {
      if (trimmed.length > 0) {
        await replyToReport(report.id, trimmed, statusChanged ? nextStatus : undefined);
        setMessage("");
        setNotice({ kind: "success", text: "Reply sent. The user will see it in their notifications." });
      } else {
        await updateReportStatus(report.id, nextStatus);
        setNotice({ kind: "success", text: `Status updated to ${statusLabel(nextStatus)}.` });
      }
      await load();
    } catch (err) {
      setNotice({
        kind: "error",
        text: `${trimmed.length > 0 ? "Reply not sent." : "Status not updated."} ${errorMessage(
          err,
          "Check your connection and try again."
        )}`,
      });
    } finally {
      setSaving(false);
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
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 10 }}>
            {report.title}
          </h1>

          {report.description ? (
            <p style={{ fontSize: 13, color: "#374151", whiteSpace: "pre-wrap", marginBottom: 16 }}>
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

          <p style={{ ...mutedStyle, fontFamily: "var(--font-geist-mono), monospace" }}>
            Reporter ID: {report.user_id}
          </p>
        </section>

        <section className="card" aria-labelledby="reply-heading">
          <div className="card-header">
            <h2 id="reply-heading" className="card-title">
              {replies.length === 0 ? "No replies yet" : "Replies sent"}
            </h2>
          </div>

          {replies.length > 0 && (
            <ul style={{ listStyle: "none", marginBottom: 16 }}>
              {replies.map((r) => (
                <li key={r.id} className="activity-item" style={{ flexDirection: "column", gap: 2 }}>
                  <p className="activity-text" style={{ whiteSpace: "pre-wrap" }}>
                    {r.body}
                  </p>
                  <span className="activity-time">{formatDateTime(r.created_at)}</span>
                </li>
              ))}
            </ul>
          )}

          {notice && (
            <div
              role="status"
              className={`flash ${notice.kind === "success" ? "flash-success" : "flash-error"}`}
            >
              {notice.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={fieldStyle}>
              <label htmlFor="report-status" style={labelStyle}>
                Status
              </label>
              <select
                id="report-status"
                style={inputStyle}
                value={nextStatus}
                onChange={(e) => setNextStatus(e.target.value)}
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            </div>

            <div style={fieldStyle}>
              <label htmlFor="report-reply" style={labelStyle}>
                Reply to the user
              </label>
              <textarea
                id="report-reply"
                style={textareaStyle}
                value={message}
                maxLength={REPLY_MAX}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Thanks for reporting this. We fixed it in the latest update."
              />
              <div style={fieldFootStyle}>
                <span>Leave empty to change the status without notifying the user.</span>
                <span>
                  {message.length}/{REPLY_MAX}
                </span>
              </div>
            </div>

            <button type="submit" className="btn primary" disabled={!canSubmit}>
              {saving ? "Saving…" : submitLabel}
            </button>
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

"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import AdminGate from "@/components/admin/AdminGate";
import {
  emptyStyle,
  fieldFootStyle,
  fieldStyle,
  inputStyle,
  labelStyle,
  leadStyle,
  textareaStyle,
} from "@/components/admin/styles";
import {
  Announcement,
  deleteAnnouncement,
  errorMessage,
  getAnnouncements,
  sendAnnouncement,
} from "@/lib/admin/adminService";
import { formatDateTime } from "@/lib/admin/reportStatus";

const TITLE_MAX = 120;
const BODY_MAX = 2000;

type Notice = { kind: "success" | "error"; text: string } | null;

export default function AnnouncementsPage() {
  return (
    <AdminGate>
      <AnnouncementsContent />
    </AdminGate>
  );
}

function AnnouncementsContent() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await getAnnouncements());
      setListError(null);
    } catch (e) {
      setListError(errorMessage(e, "Couldn't load announcements."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const canSend = title.trim().length > 0 && body.trim().length > 0 && !sending;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    if (!window.confirm("Send this to every Bigkas user? It can't be edited after sending.")) {
      return;
    }

    setSending(true);
    setNotice(null);
    try {
      await sendAnnouncement(title.trim(), body.trim());
      setTitle("");
      setBody("");
      setNotice({ kind: "success", text: "Announcement sent to all users." });
      load();
    } catch (err) {
      setNotice({
        kind: "error",
        text: `Announcement not sent. ${errorMessage(err, "Check your connection and try again.")}`,
      });
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (item: Announcement) => {
    if (!window.confirm(`Delete "${item.title}"? It will disappear from every user's inbox.`)) {
      return;
    }
    setDeletingId(item.id);
    try {
      await deleteAnnouncement(item.id);
      setItems((prev) => prev.filter((a) => a.id !== item.id));
    } catch (err) {
      setNotice({
        kind: "error",
        text: `Announcement not deleted. ${errorMessage(err, "Try again.")}`,
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <p style={leadStyle}>
        Announcements go to every user&apos;s notifications in the Bigkas app.
      </p>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <section className="card" aria-labelledby="new-announcement">
          <div className="card-header">
            <h2 id="new-announcement" className="card-title">
              New announcement
            </h2>
          </div>

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
              <label htmlFor="announcement-title" style={labelStyle}>
                Title
              </label>
              <input
                id="announcement-title"
                style={inputStyle}
                value={title}
                maxLength={TITLE_MAX}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="New Waray lessons are live"
              />
              <div style={fieldFootStyle}>
                <span>Shown in bold in the notification list.</span>
                <span>
                  {title.length}/{TITLE_MAX}
                </span>
              </div>
            </div>

            <div style={fieldStyle}>
              <label htmlFor="announcement-body" style={labelStyle}>
                Message
              </label>
              <textarea
                id="announcement-body"
                style={textareaStyle}
                value={body}
                maxLength={BODY_MAX}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What do users need to know?"
              />
              <div style={fieldFootStyle}>
                <span>Users see the first two lines until they tap it.</span>
                <span>
                  {body.length}/{BODY_MAX}
                </span>
              </div>
            </div>

            <button type="submit" className="btn primary" disabled={!canSend}>
              {sending ? "Sending…" : "Send announcement"}
            </button>
          </form>
        </section>

        <section className="card" aria-labelledby="sent-announcements">
          <div className="card-header">
            <h2 id="sent-announcements" className="card-title">
              Sent
            </h2>
          </div>

          {loading ? (
            <p style={emptyStyle}>Loading…</p>
          ) : listError ? (
            <p className="flash flash-error">{listError}</p>
          ) : items.length === 0 ? (
            <p style={emptyStyle}>No announcements sent yet.</p>
          ) : (
            <ul style={{ listStyle: "none" }}>
              {items.map((item) => (
                <li
                  key={item.id}
                  className="activity-item"
                  style={{ flexDirection: "column", gap: 4 }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 12,
                      width: "100%",
                    }}
                  >
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
                      {item.title}
                    </p>
                    <button
                      type="button"
                      className="btn sm danger"
                      onClick={() => handleDelete(item)}
                      disabled={deletingId === item.id}
                    >
                      {deletingId === item.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                  <p className="activity-text" style={{ whiteSpace: "pre-wrap" }}>
                    {item.body}
                  </p>
                  <span className="activity-time">{formatDateTime(item.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

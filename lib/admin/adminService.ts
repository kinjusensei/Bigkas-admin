import { supabase } from "@/lib/supabase";
import { ACTIVE_STATUSES } from "./reportStatus";

// Matches what the mobile app's services/reportService.ts writes.
export type BugReport = {
  id: string;
  user_id: string;
  category: string;
  title: string;
  description: string | null;
  screenshot_path: string | null;
  status: string;
  needs_admin_reply: boolean;
  created_at: string;
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

export type ReportMessage = {
  id: string;
  sender_role: "user" | "admin";
  body: string;
  created_at: string;
};

/** Supabase errors aren't always `instanceof Error`, so read .message defensively. */
export function errorMessage(e: unknown, fallback: string): string {
  const msg = (e as { message?: unknown } | null)?.message;
  return typeof msg === "string" && msg.length > 0 ? msg : fallback;
}

// --- Session -----------------------------------------------------------------

export async function getSignedInUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_admin");
  if (error) return false;
  return data === true;
}

// --- Announcements -----------------------------------------------------------

export async function sendAnnouncement(title: string, body: string): Promise<string> {
  const { data, error } = await supabase.rpc("send_global_notification", {
    p_title: title,
    p_body: body,
  });
  if (error) throw error;
  return data as string;
}

export async function getAnnouncements(limit = 50): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, body, created_at")
    .eq("kind", "global")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Announcement[];
}

/** Removes it from every user's inbox. */
export async function deleteAnnouncement(id: string): Promise<void> {
  const { error } = await supabase.from("notifications").delete().eq("id", id);
  if (error) throw error;
}

// --- Bug reports -------------------------------------------------------------

// needs_admin_reply comes from sql/fix_reply_functions.sql in the mobile repo.
const REPORT_COLUMNS =
  "id, user_id, category, title, description, screenshot_path, status, needs_admin_reply, created_at";

/** Reports waiting on an admin come first. Pass `needsReply` to show only those. */
export async function getBugReports(
  filter: { status?: string; needsReply?: boolean } = {}
): Promise<BugReport[]> {
  let query = supabase
    .from("bug_reports")
    .select(REPORT_COLUMNS)
    .order("needs_admin_reply", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(300);
  if (filter.status) query = query.eq("status", filter.status);
  if (filter.needsReply) query = query.eq("needs_admin_reply", true);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as BugReport[];
}

export async function getActiveReportCount(): Promise<number> {
  const { count, error } = await supabase
    .from("bug_reports")
    .select("id", { count: "exact", head: true })
    .in("status", ACTIVE_STATUSES);
  if (error) return 0;
  return count ?? 0;
}

export async function getBugReport(id: string): Promise<BugReport | null> {
  const { data, error } = await supabase
    .from("bug_reports")
    .select(REPORT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as BugReport | null;
}

export type ReportReceipts = {
  admin_seen_at: string | null;
  user_seen_at: string | null;
};

// Read receipts come from sql/report_seen.sql in the mobile repo. Kept out of
// REPORT_COLUMNS so the rest of the site still works before that script is run.
export async function getReportReceipts(id: string): Promise<ReportReceipts> {
  const { data, error } = await supabase
    .from("bug_reports")
    .select("admin_seen_at, user_seen_at")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return { admin_seen_at: null, user_seen_at: null };
  return data as ReportReceipts;
}

/** Tells the reporter an admin has looked. The first call also sends them a notification. */
export async function markReportSeen(id: string): Promise<void> {
  const { error } = await supabase.rpc("mark_bug_report_seen_by_admin", {
    p_report_id: id,
  });
  if (error) throw error;
}

/** The bucket is private, so screenshots are shown through a 1-hour signed URL. */
export async function getScreenshotUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from("bug-reports").createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data.signedUrl;
}

/** Every message on a report — admin replies and the user's follow-ups — oldest first. */
export async function getReportMessages(reportId: string): Promise<ReportMessage[]> {
  const { data, error } = await supabase
    .from("bug_report_messages")
    .select("id, sender_role, body, created_at")
    .eq("report_id", reportId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ReportMessage[];
}

/** Notifies the reporter; pass `status` to change the report's status in the same step. */
export async function replyToReport(
  reportId: string,
  message: string,
  status?: string
): Promise<string> {
  const { data, error } = await supabase.rpc("respond_to_bug_report", {
    p_report_id: reportId,
    p_message: message,
    p_status: status ?? null,
  });
  if (error) throw error;
  return data as string;
}

/** Changes the status without notifying the reporter. */
export async function updateReportStatus(reportId: string, status: string): Promise<void> {
  const { error } = await supabase.from("bug_reports").update({ status }).eq("id", reportId);
  if (error) throw error;
}

// --- Activity ----------------------------------------------------------------

export type ActivityEvent = {
  id: string;
  user_id: string | null;
  user_name: string;
  user_email: string | null;
  action: string;
  description: string;
  created_at: string;
};

/**
 * Every user's activity, newest first. Comes from admin_activity_feed() in
 * sql/admin_activity_feed.sql, which reads all users' rows (RLS
 * would otherwise limit the admin to their own). Pass `before` to page back.
 */
export async function getActivityFeed(limit = 200, before?: string): Promise<ActivityEvent[]> {
  const { data, error } = await supabase.rpc("admin_activity_feed", {
    p_limit: limit,
    p_before: before ?? null,
  });
  if (error) throw error;
  return (data ?? []) as ActivityEvent[];
}

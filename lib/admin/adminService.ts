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
  created_at: string;
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

export type ReportReply = {
  id: string;
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

export async function getBugReports(status?: string): Promise<BugReport[]> {
  let query = supabase
    .from("bug_reports")
    .select("id, user_id, category, title, description, screenshot_path, status, created_at")
    .order("created_at", { ascending: false })
    .limit(300);
  if (status) query = query.eq("status", status);

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
    .select("id, user_id, category, title, description, screenshot_path, status, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as BugReport | null;
}

/** The bucket is private, so screenshots are shown through a 1-hour signed URL. */
export async function getScreenshotUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("bug-reports")
    .createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data.signedUrl;
}

export async function getReportReplies(reportId: string): Promise<ReportReply[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, body, created_at")
    .eq("report_id", reportId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ReportReply[];
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

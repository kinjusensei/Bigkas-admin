-- ============================================================================
-- Bigkas — Admin activity feed (every user's activity, for the admin website)
--
-- Run AFTER the mobile repo's sql/notifications.sql (needs public.is_admin())
-- and sql/report_messages.sql (needs bug_report_messages). Safe to re-run.
--
-- Called by lib/admin/adminService.ts getActivityFeed(). Keyset pagination:
-- the first page passes p_before = null; "Load older" passes the created_at
-- of the oldest row on screen. The boundary is inclusive (<=) so events that
-- share that exact timestamp aren't skipped; the page drops the repeats by id.
--
-- Why: the app never writes to activity_logs, and each user can only read
-- their own rows in the progress tables. So the admin Activity page showed
-- almost nothing. This function builds the feed from what the app really
-- records, for all users, and only admins can call it.
--
-- Sources:
--   register     auth.users.created_at
--   login        auth.users.last_sign_in_at (latest sign-in per user only)
--   practice     practice_history (one row per finished practice)
--   pretest      pretest_progress (latest attempt per lesson; it's an upsert)
--   bug_report   bug_reports
--   report_reply bug_report_messages sent by the user
--   (any)        activity_logs, if anything writes to it
-- ============================================================================

create or replace function public.admin_activity_feed(
  p_limit  int default 200,
  p_before timestamptz default null
)
returns table (
  id          text,
  user_id     uuid,
  user_name   text,
  user_email  text,
  action      text,
  description text,
  created_at  timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can read the activity feed' using errcode = '42501';
  end if;

  return query
  with events as (
    select 'register:' || u.id::text as id, u.id as user_id,
           'register'::text as action,
           'Created an account'::text as description,
           u.created_at::timestamptz as created_at
    from auth.users u

    union all
    select 'login:' || u.id::text, u.id, 'login',
           'Signed in',
           u.last_sign_in_at::timestamptz
    from auth.users u
    where u.last_sign_in_at is not null

    union all
    select 'practice:' || ph.id::text, ph.user_id, 'lesson_complete',
           'Practiced ' || initcap(replace(ph.lesson_id::text, '_', ' '))
             || ' (' || coalesce(ph.correct_answers, 0) || '/' || coalesce(ph.total_questions, 0)
             || ' correct, +' || coalesce(ph.xp_earned, 0) || ' XP)',
           ph.played_at::timestamptz
    from public.practice_history ph

    union all
    select 'pretest:' || pp.user_id::text || ':' || pp.lesson_id::text, pp.user_id, 'pretest',
           'Took the pretest for ' || initcap(replace(pp.lesson_id::text, '_', ' '))
             || ' (' || coalesce(pp.score, 0) || '/' || coalesce(pp.total_questions, 0)
             || case when pp.passed then ', passed)' else ', not passed)' end,
           pp.completed_at::timestamptz
    from public.pretest_progress pp

    union all
    select 'bug_report:' || br.id::text, br.user_id, 'bug_report',
           'Reported a problem: ' || left(br.title, 80),
           br.created_at::timestamptz
    from public.bug_reports br

    union all
    select 'report_reply:' || m.id::text, m.sender_id, 'report_reply',
           'Replied on a bug report: ' || left(m.body, 80),
           m.created_at::timestamptz
    from public.bug_report_messages m
    where m.sender_role = 'user'

    union all
    select 'log:' || al.id::text, al.user_id, al.action::text, al.description::text,
           al.created_at::timestamptz
    from public.activity_logs al
  )
  select e.id, e.user_id,
         coalesce(p.display_name, '')::text,
         coalesce(p.email, u.email)::text,
         e.action, e.description, e.created_at
  from events e
  left join public.profiles p on p.id = e.user_id
  left join auth.users u on u.id = e.user_id
  where e.created_at is not null
    and (p_before is null or e.created_at <= p_before)
  order by e.created_at desc, e.id
  limit least(greatest(p_limit, 1), 1000);
end;
$$;

revoke all on function public.admin_activity_feed(int, timestamptz) from public, anon;
grant execute on function public.admin_activity_feed(int, timestamptz) to authenticated;

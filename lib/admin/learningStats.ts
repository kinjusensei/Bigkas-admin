import { supabase } from "@/lib/supabase";

// Learning Analytics numbers, worked out from what the mobile app saves:
// - lesson_completions: structured lessons (best_score %, passed)
// - lesson_progress: practice games and story chapters (best correct
//   answers, accuracy %, last_review)
// One "progress record" is one learner + one lesson or story chapter.

export const DIALECTS = ["Kapampangan", "Tagalog", "Waray"] as const;
export type DialectName = (typeof DIALECTS)[number];

// A completed lesson not practiced again for this many days counts as due
// for review. The app has no spaced-repetition schedule, so this is a
// simple "hasn't been back in a week" measure.
export const REVIEW_AFTER_DAYS = 7;

export const SCORE_BANDS = ["<60", "60-70", "70-80", "80-90", "90+"] as const;

type ProgressRow = {
  user_id: string;
  lesson_id: string;
  correct_answers: number | null;
  total_questions: number | null;
  accuracy: number | null;
  last_review: string | null;
  completed_at: string | null;
};

type CompletionRow = {
  user_id: string;
  lesson_id: string;
  best_score: number | null;
  passed: boolean | null;
  completed_at: string | null;
  updated_at: string | null;
};

export type ProfileRow = {
  id: string;
  display_name?: string | null;
  email?: string | null;
  xp?: number | null;
  level?: number | null;
  role?: string | null;
  active_dialect?: string | null;
  deleted_at?: string | null;
};

export type LearningStats = {
  total: number;
  completed: number;
  learning: number;
  due: number;
  learnersByDialect: Record<DialectName, number>;
  scoreBands: number[]; // records per SCORE_BANDS entry
  topLearners: ProfileRow[];
};

// Same pass rules as the app: story chapters need 60% correct; other
// practice games need 3 correct (or all, if there are fewer than 3).
function progressPassed(row: ProgressRow): boolean {
  const correct = row.correct_answers ?? 0;
  const total = row.total_questions ?? 0;
  if (total <= 0) return false;
  if (row.lesson_id.startsWith("story_")) {
    return correct >= Math.ceil(total * 0.6);
  }
  return correct >= Math.min(3, total);
}

function bandFor(score: number): number {
  if (score < 60) return 0;
  if (score < 70) return 1;
  if (score < 80) return 2;
  if (score < 90) return 3;
  return 4;
}

export function dialectOf(value: string | null | undefined): DialectName | null {
  const lower = (value ?? "").toLowerCase();
  return DIALECTS.find((d) => lower.includes(d.toLowerCase())) ?? null;
}

const isLearner = (p: ProfileRow) => p.role !== "admin" && !p.deleted_at;

export function computeLearningStats(
  progress: ProgressRow[],
  completions: CompletionRow[],
  profiles: ProfileRow[],
  now: Date = new Date(),
): LearningStats {
  type Rec = { passed: boolean; score: number | null; lastActive: number };
  const records = new Map<string, Rec>();
  const time = (value: string | null) => (value ? Date.parse(value) || 0 : 0);

  for (const row of progress) {
    const key = `${row.user_id}|${row.lesson_id}`;
    records.set(key, {
      passed: progressPassed(row),
      score: row.accuracy ?? null,
      lastActive: Math.max(time(row.last_review), time(row.completed_at)),
    });
  }
  // A structured lesson's completion row decides it (the app does the same).
  for (const row of completions) {
    const key = `${row.user_id}|${row.lesson_id}`;
    const before = records.get(key);
    records.set(key, {
      passed: !!row.passed,
      score: row.best_score ?? before?.score ?? null,
      lastActive: Math.max(
        before?.lastActive ?? 0,
        time(row.updated_at),
        time(row.completed_at),
      ),
    });
  }

  const reviewCutoff = now.getTime() - REVIEW_AFTER_DAYS * 24 * 60 * 60 * 1000;
  let completed = 0;
  let due = 0;
  const scoreBands = SCORE_BANDS.map(() => 0);
  for (const rec of records.values()) {
    if (rec.passed) {
      completed += 1;
      if (rec.lastActive > 0 && rec.lastActive < reviewCutoff) due += 1;
    }
    if (rec.score !== null) scoreBands[bandFor(rec.score)] += 1;
  }

  const learners = profiles.filter(isLearner);
  const learnersByDialect = Object.fromEntries(
    DIALECTS.map((d) => [d, 0]),
  ) as Record<DialectName, number>;
  for (const p of learners) {
    // The app treats an empty choice as Tagalog.
    const dialect = dialectOf(p.active_dialect) ?? "Tagalog";
    learnersByDialect[dialect] += 1;
  }

  const topLearners = [...learners]
    .sort((a, b) => (b.xp ?? 0) - (a.xp ?? 0))
    .slice(0, 5);

  return {
    total: records.size,
    completed,
    learning: records.size - completed,
    due,
    learnersByDialect,
    scoreBands,
    topLearners,
  };
}

// Supabase returns at most 1000 rows per request, so read in pages.
async function fetchAll<T>(table: string, columns: string): Promise<T[]> {
  const pageSize = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < pageSize) return rows;
  }
}

export async function loadLearningStats(): Promise<LearningStats> {
  const [progress, completions, profiles] = await Promise.all([
    fetchAll<ProgressRow>(
      "lesson_progress",
      "user_id, lesson_id, correct_answers, total_questions, accuracy, last_review, completed_at",
    ),
    // Missing table (lesson_completions.sql not run): treat as empty.
    fetchAll<CompletionRow>(
      "lesson_completions",
      "user_id, lesson_id, best_score, passed, completed_at, updated_at",
    ).catch((error) => {
      console.warn("lesson_completions unavailable:", error?.message ?? error);
      return [] as CompletionRow[];
    }),
    // "*" so a column that doesn't exist can't break the whole read.
    fetchAll<ProfileRow>("profiles", "*"),
  ]);
  return computeLearningStats(progress, completions, profiles);
}

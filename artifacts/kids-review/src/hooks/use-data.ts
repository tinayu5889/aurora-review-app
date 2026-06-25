import { useState, useEffect } from "react";
import { supabase, getFamilyId, syncTable, fetchTable } from "@/lib/supabase";

export type Subject = {
  id: string;
  name: string;
  color: string;
  emoji: string;
};

export type ReviewRecord = {
  date: string;
  difficulty: "easy" | "normal" | "hard";
  understanding: number;
  notes: string;
  completedAt: string;
};

export type LearningType = "video" | "quiz" | "reading";

export type TimeSlot = "none" | "morning" | "afternoon" | "evening";

export const TIME_SLOT_LABELS: Record<TimeSlot, { label: string; emoji: string }> = {
  none:      { label: "不指定時段", emoji: "📋" },
  morning:   { label: "上午",       emoji: "🌅" },
  afternoon: { label: "下午",       emoji: "☀️" },
  evening:   { label: "晚上",       emoji: "🌙" },
};

export const TIME_SLOT_ORDER: TimeSlot[] = ["morning", "afternoon", "evening", "none"];

export type ReviewSession = {
  id: string;
  subjectId: string;
  scope: string;
  firstDate: string;
  learningType: LearningType;
  timeSlot: TimeSlot;
  reviewDates: string[];
  completedDates: string[];
  records: ReviewRecord[];
  planCompletedDate?: string;
};

export type Goal = {
  id: string;
  content: string;
  targetDate: string;
  isCompleted: boolean;
};

export type ExcludedPeriod = {
  id: string;
  startDate: string;
  endDate: string;
  note: string;
};

const INITIAL_SUBJECTS: Subject[] = [
  { id: "1", name: "數學", color: "bg-blue-400", emoji: "📐" },
  { id: "2", name: "國語", color: "bg-red-400", emoji: "📖" },
  { id: "3", name: "自然", color: "bg-green-400", emoji: "🔬" },
];

function migrateSession(s: ReviewSession): ReviewSession {
  return {
    ...s,
    records: s.records ?? [],
    reviewDates: s.reviewDates ?? [],
    completedDates: s.completedDates ?? [],
    learningType: s.learningType ?? "reading",
    timeSlot: s.timeSlot ?? "none",
  };
}

function purgeExpiredPeriods(periods: ExcludedPeriod[]): ExcludedPeriod[] {
  const today = new Date().toISOString().slice(0, 10);
  return periods.filter(p => p.endDate >= today);
}

function purgeCompletedSingleDaySessions(sessions: ReviewSession[]): ReviewSession[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 3);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return sessions.filter(s => {
    if (s.reviewDates.length > 0) return true;
    if (!s.planCompletedDate) return true;
    return s.planCompletedDate > cutoffStr;
  });
}

export function useData() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sessions, setSessions] = useState<ReviewSession[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [excludedPeriods, setExcludedPeriods] = useState<ExcludedPeriod[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const familyId = getFamilyId();

      /* ── No family ID: use localStorage only (shouldn't happen after gate) ── */
      if (!familyId) {
        loadFromLocalStorage();
        return;
      }

      /* ── Try Supabase ── */
      try {
        const [sbSubjects, sbSessions, sbGoals, sbExcluded] = await Promise.all([
          fetchTable<Subject>("kr_subjects", familyId),
          fetchTable<ReviewSession>("kr_sessions", familyId),
          fetchTable<Goal>("kr_goals", familyId),
          fetchTable<ExcludedPeriod>("kr_excluded_periods", familyId),
        ]);

        const isNewFamily = sbSubjects.length === 0 && sbSessions.length === 0 && sbGoals.length === 0;

        if (isNewFamily) {
          /* ── Migrate existing localStorage data to Supabase ── */
          const localSubjects: Subject[] = (() => {
            const s = localStorage.getItem("kr_subjects");
            return s ? JSON.parse(s) : INITIAL_SUBJECTS;
          })();
          const localSessions: ReviewSession[] = (() => {
            const s = localStorage.getItem("kr_sessions");
            return s ? (JSON.parse(s) as ReviewSession[]).map(migrateSession) : [];
          })();
          const localGoals: Goal[] = (() => {
            const s = localStorage.getItem("kr_goals");
            return s ? JSON.parse(s) : [];
          })();
          const localExcluded: ExcludedPeriod[] = (() => {
            const s = localStorage.getItem("kr_excluded_periods");
            const parsed: ExcludedPeriod[] = s ? JSON.parse(s) : [];
            return purgeExpiredPeriods(parsed);
          })();

          await Promise.all([
            syncTable("kr_subjects", familyId, localSubjects),
            syncTable("kr_sessions", familyId, localSessions),
            syncTable("kr_goals", familyId, localGoals),
            syncTable("kr_excluded_periods", familyId, localExcluded),
          ]);

          applyState(localSubjects, localSessions, localGoals, localExcluded);
        } else {
          /* ── Use Supabase data ── */
          const subjects = sbSubjects.length > 0 ? sbSubjects : INITIAL_SUBJECTS;
          const sessions = sbSessions.map(migrateSession);
          const goals = sbGoals;
          const excluded = purgeExpiredPeriods(sbExcluded);

          if (excluded.length !== sbExcluded.length) {
            syncTable("kr_excluded_periods", familyId, excluded).catch(() => {});
          }

          applyState(subjects, sessions, goals, excluded);
        }
      } catch {
        /* ── Supabase failed: fallback to localStorage ── */
        loadFromLocalStorage();
      }
    }

    function applyState(
      subjects: Subject[],
      sessions: ReviewSession[],
      goals: Goal[],
      excluded: ExcludedPeriod[]
    ) {
      setSubjects(subjects);
      setSessions(sessions);
      setGoals(goals);
      setExcludedPeriods(excluded);
      localStorage.setItem("kr_subjects", JSON.stringify(subjects));
      localStorage.setItem("kr_sessions", JSON.stringify(sessions));
      localStorage.setItem("kr_goals", JSON.stringify(goals));
      localStorage.setItem("kr_excluded_periods", JSON.stringify(excluded));
      setIsLoaded(true);
    }

    function loadFromLocalStorage() {
      const storedSubjects = localStorage.getItem("kr_subjects");
      const storedSessions = localStorage.getItem("kr_sessions");
      const storedGoals = localStorage.getItem("kr_goals");
      const storedExcluded = localStorage.getItem("kr_excluded_periods");

      const subjects: Subject[] = storedSubjects ? JSON.parse(storedSubjects) : INITIAL_SUBJECTS;
      if (!storedSubjects) localStorage.setItem("kr_subjects", JSON.stringify(INITIAL_SUBJECTS));

      const sessions: ReviewSession[] = storedSessions
        ? (JSON.parse(storedSessions) as ReviewSession[]).map(migrateSession)
        : [];

      const goals: Goal[] = storedGoals ? JSON.parse(storedGoals) : [];

      const excluded: ExcludedPeriod[] = (() => {
        const parsed: ExcludedPeriod[] = storedExcluded ? JSON.parse(storedExcluded) : [];
        const active = purgeExpiredPeriods(parsed);
        if (active.length !== parsed.length) {
          localStorage.setItem("kr_excluded_periods", JSON.stringify(active));
        }
        return active;
      })();

      setSubjects(subjects);
      setSessions(sessions);
      setGoals(goals);
      setExcludedPeriods(excluded);
      setIsLoaded(true);
    }

    load();
  }, []);

  /* ── Save helpers: update state + localStorage immediately, sync Supabase in background ── */

  function bgSync<T extends { id: string }>(table: string, items: T[]) {
    const familyId = getFamilyId();
    if (familyId) syncTable(table, familyId, items).catch(() => {});
  }

  const saveSubjects = (newSubjects: Subject[]) => {
    setSubjects(newSubjects);
    localStorage.setItem("kr_subjects", JSON.stringify(newSubjects));
    bgSync("kr_subjects", newSubjects);
  };

  const saveSessions = (newSessions: ReviewSession[]) => {
    setSessions(newSessions);
    localStorage.setItem("kr_sessions", JSON.stringify(newSessions));
    window.dispatchEvent(new Event("kr-sessions-updated"));
    bgSync("kr_sessions", newSessions);
  };

  const saveGoals = (newGoals: Goal[]) => {
    setGoals(newGoals);
    localStorage.setItem("kr_goals", JSON.stringify(newGoals));
    bgSync("kr_goals", newGoals);
  };

  const saveExcludedPeriods = (newPeriods: ExcludedPeriod[]) => {
    setExcludedPeriods(newPeriods);
    localStorage.setItem("kr_excluded_periods", JSON.stringify(newPeriods));
    bgSync("kr_excluded_periods", newPeriods);
  };

  return {
    subjects,
    sessions,
    goals,
    excludedPeriods,
    saveSubjects,
    saveSessions,
    saveGoals,
    saveExcludedPeriods,
    isLoaded,
  };
}

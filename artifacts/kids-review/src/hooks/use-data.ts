import { useState, useEffect } from "react";

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

export type ReviewSession = {
  id: string;
  subjectId: string;
  scope: string;
  firstDate: string;
  learningType: LearningType;
  reviewDates: string[];
  completedDates: string[];
  records: ReviewRecord[];
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
  return { ...s, records: s.records ?? [], learningType: s.learningType ?? "reading" };
}

function purgeExpiredPeriods(periods: ExcludedPeriod[]): ExcludedPeriod[] {
  const today = new Date().toISOString().slice(0, 10);
  return periods.filter(p => p.endDate >= today);
}

export function useData() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sessions, setSessions] = useState<ReviewSession[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [excludedPeriods, setExcludedPeriods] = useState<ExcludedPeriod[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedSubjects = localStorage.getItem("kr_subjects");
    const storedSessions = localStorage.getItem("kr_sessions");
    const storedGoals = localStorage.getItem("kr_goals");
    const storedExcluded = localStorage.getItem("kr_excluded_periods");

    if (storedSubjects) {
      setSubjects(JSON.parse(storedSubjects));
    } else {
      setSubjects(INITIAL_SUBJECTS);
      localStorage.setItem("kr_subjects", JSON.stringify(INITIAL_SUBJECTS));
    }

    if (storedSessions) {
      const parsed: ReviewSession[] = JSON.parse(storedSessions);
      setSessions(parsed.map(migrateSession));
    } else {
      setSessions([]);
    }

    if (storedGoals) {
      setGoals(JSON.parse(storedGoals));
    }

    if (storedExcluded) {
      const parsed: ExcludedPeriod[] = JSON.parse(storedExcluded);
      const active = purgeExpiredPeriods(parsed);
      if (active.length !== parsed.length) {
        localStorage.setItem("kr_excluded_periods", JSON.stringify(active));
      }
      setExcludedPeriods(active);
    }

    setIsLoaded(true);
  }, []);

  const saveSubjects = (newSubjects: Subject[]) => {
    setSubjects(newSubjects);
    localStorage.setItem("kr_subjects", JSON.stringify(newSubjects));
  };

  const saveSessions = (newSessions: ReviewSession[]) => {
    setSessions(newSessions);
    localStorage.setItem("kr_sessions", JSON.stringify(newSessions));
    window.dispatchEvent(new Event("kr-sessions-updated"));
  };

  const saveGoals = (newGoals: Goal[]) => {
    setGoals(newGoals);
    localStorage.setItem("kr_goals", JSON.stringify(newGoals));
  };

  const saveExcludedPeriods = (newPeriods: ExcludedPeriod[]) => {
    setExcludedPeriods(newPeriods);
    localStorage.setItem("kr_excluded_periods", JSON.stringify(newPeriods));
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

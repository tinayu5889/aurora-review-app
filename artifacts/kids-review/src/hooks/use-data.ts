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

export type ReviewSession = {
  id: string;
  subjectId: string;
  scope: string;
  firstDate: string;
  reviewDates: string[];
  completedDates: string[];
  records: ReviewRecord[];
};

const INITIAL_SUBJECTS: Subject[] = [
  { id: "1", name: "數學", color: "bg-blue-400", emoji: "📐" },
  { id: "2", name: "國語", color: "bg-red-400", emoji: "📖" },
  { id: "3", name: "自然", color: "bg-green-400", emoji: "🔬" },
];

function migrateSession(s: ReviewSession): ReviewSession {
  return { ...s, records: s.records ?? [] };
}

export function useData() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sessions, setSessions] = useState<ReviewSession[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedSubjects = localStorage.getItem("kr_subjects");
    const storedSessions = localStorage.getItem("kr_sessions");

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

  return {
    subjects,
    sessions,
    saveSubjects,
    saveSessions,
    isLoaded,
  };
}

import { useMemo } from "react";
import { format, startOfWeek, isWithinInterval, parseISO, subWeeks, endOfWeek, eachDayOfInterval } from "date-fns";
import { zhTW } from "date-fns/locale";
import { motion } from "framer-motion";
import { Star, TrendingUp, Calendar, BookOpen } from "lucide-react";
import { Layout } from "@/components/layout";
import { useData, ReviewSession } from "@/hooks/use-data";
import { cn } from "@/lib/utils";

type Difficulty = "easy" | "normal" | "hard";

function computeWeekStats(sessions: ReviewSession[], weekStart: Date, weekEnd: Date) {
  let completedCount = 0;
  let totalUnderstanding = 0;
  let recordCount = 0;
  let hardCount = 0;
  const subjectIds = new Set<string>();
  const byDay: Record<string, number> = {};
  const bySubject: Record<string, { name: string; emoji: string; color: string; count: number; totalUnderstanding: number }> = {};

  sessions.forEach(session => {
    (session.records || []).forEach(record => {
      try {
        const d = parseISO(record.date);
        if (!isWithinInterval(d, { start: weekStart, end: weekEnd })) return;
        completedCount++;
        totalUnderstanding += record.understanding;
        recordCount++;
        subjectIds.add(session.subjectId);
        if (record.difficulty === "hard") hardCount++;
        const dayKey = format(d, "yyyy-MM-dd");
        byDay[dayKey] = (byDay[dayKey] || 0) + 1;
        if (!bySubject[session.subjectId]) {
          const found = { name: "未知", emoji: "📚", color: "bg-gray-100" };
          bySubject[session.subjectId] = { ...found, count: 0, totalUnderstanding: 0 };
        }
        bySubject[session.subjectId].count++;
        bySubject[session.subjectId].totalUnderstanding += record.understanding;
      } catch { /* skip */ }
    });
  });

  return {
    completedCount,
    avgUnderstanding: recordCount > 0 ? totalUnderstanding / recordCount : 0,
    subjectCount: subjectIds.size,
    hardCount,
    recordCount,
    byDay,
    bySubject,
    subjectIds,
  };
}

function StatTile({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div className="bg-white rounded-3xl p-4 text-center shadow-sm border border-border/30 flex flex-col items-center justify-center">
      <p className="text-3xl font-black text-foreground leading-none">{value}</p>
      {sub && <p className="text-muted-foreground text-[10px] mt-1">{sub}</p>}
      <p className="text-xs font-bold text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function DayBar({ day, count, max, label }: { day: string; count: number; max: number; label: string }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  const isToday = day === format(new Date(), "yyyy-MM-dd");
  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <span className="text-[10px] font-bold text-muted-foreground">{count > 0 ? count : ""}</span>
      <div className="w-full bg-muted rounded-full overflow-hidden" style={{ height: 60 }}>
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={cn("w-full rounded-full mt-auto", isToday ? "bg-primary" : "bg-primary/40")}
          style={{ marginTop: `${100 - pct}%` }}
        />
      </div>
      <span className={cn("text-[10px] font-bold", isToday ? "text-primary" : "text-muted-foreground")}>{label}</span>
    </div>
  );
}

function WeekSection({ title, stats, weekDays, sessions, weekStart, weekEnd }: {
  title: string;
  stats: ReturnType<typeof computeWeekStats>;
  weekDays: Date[];
  sessions: ReviewSession[];
  weekStart: Date;
  weekEnd: Date;
}) {
  const maxDay = Math.max(...weekDays.map(d => stats.byDay[format(d, "yyyy-MM-dd")] || 0), 1);
  const message = () => {
    if (stats.completedCount === 0) return "這週還沒有複習紀錄";
    if (stats.avgUnderstanding >= 4.5) return "表現超棒！🎉";
    if (stats.avgUnderstanding >= 3.5) return "學得不錯！👍";
    if (stats.hardCount > stats.completedCount / 2) return "有點挑戰，別灰心！💪";
    return "持續學習就是進步！⭐";
  };

  const subjectEntries = Object.entries(stats.bySubject).map(([id, data]) => {
    const subject = sessions.find(s => s.subjectId === id)?.subjectId;
    return { id, ...data };
  });

  return (
    <div className="mb-8">
      <h2 className="text-base font-bold text-muted-foreground mb-4 flex items-center gap-2">
        <Calendar className="w-4 h-4" />
        {title}
        <span className="text-xs font-medium">
          ({format(weekStart, "M/d")} – {format(weekEnd, "M/d")})
        </span>
      </h2>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatTile value={String(stats.completedCount)} label="完成次數" />
        <StatTile
          value={stats.recordCount > 0 ? stats.avgUnderstanding.toFixed(1) : "—"}
          label="平均理解度"
          sub={stats.recordCount > 0 ? "★".repeat(Math.round(stats.avgUnderstanding)) + "☆".repeat(5 - Math.round(stats.avgUnderstanding)) : undefined}
        />
        <StatTile value={String(stats.subjectCount)} label="涵蓋科目" />
      </div>

      {stats.completedCount > 0 && (
        <div className="bg-card border border-border/30 rounded-3xl p-4 mb-4 shadow-sm">
          <p className="text-xs font-bold text-muted-foreground mb-3">每日複習次數</p>
          <div className="flex gap-2 items-end" style={{ height: 80 }}>
            {weekDays.map(d => {
              const key = format(d, "yyyy-MM-dd");
              const dayLabel = format(d, "E", { locale: zhTW });
              return (
                <DayBar key={key} day={key} count={stats.byDay[key] || 0} max={maxDay} label={dayLabel} />
              );
            })}
          </div>
        </div>
      )}

      {subjectEntries.length > 0 && (
        <div className="bg-card border border-border/30 rounded-3xl p-4 shadow-sm">
          <p className="text-xs font-bold text-muted-foreground mb-3">科目分佈</p>
          <div className="space-y-2">
            {subjectEntries.sort((a, b) => b.count - a.count).map(entry => {
              const subject = sessions.find(s => s.subjectId === entry.id);
              return (
                <div key={entry.id} className="flex items-center gap-3">
                  <div className="text-lg w-7 text-center">{entry.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold truncate">{entry.name}</span>
                      <span className="text-xs font-bold text-muted-foreground ml-2">{entry.count} 次</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(entry.count / stats.completedCount) * 100}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="h-full bg-primary/60 rounded-full"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-center text-sm font-bold text-muted-foreground mt-3">{message()}</p>
    </div>
  );
}

export default function Weekly() {
  const { sessions, subjects } = useData();

  const now = new Date();
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

  const thisWeekDays = eachDayOfInterval({ start: thisWeekStart, end: thisWeekEnd });
  const lastWeekDays = eachDayOfInterval({ start: lastWeekStart, end: lastWeekEnd });

  const enrichedSessions = sessions.map(s => {
    const subject = subjects.find(sub => sub.id === s.subjectId);
    return {
      ...s,
      _subjectName: subject?.name ?? "未知",
      _subjectEmoji: subject?.emoji ?? "📚",
      _subjectColor: subject?.color ?? "bg-gray-100",
    };
  });

  const thisStats = useMemo(() => computeWeekStats(sessions, thisWeekStart, thisWeekEnd), [sessions]);
  const lastStats = useMemo(() => computeWeekStats(sessions, lastWeekStart, lastWeekEnd), [sessions]);

  const enrichBySubject = (stats: ReturnType<typeof computeWeekStats>) => {
    const enriched = { ...stats };
    Object.keys(enriched.bySubject).forEach(id => {
      const subject = subjects.find(s => s.id === id);
      if (subject) {
        enriched.bySubject[id].name = subject.name;
        enriched.bySubject[id].emoji = subject.emoji;
        enriched.bySubject[id].color = subject.color;
      }
    });
    return enriched;
  };

  const enrichedThisStats = enrichBySubject(thisStats);
  const enrichedLastStats = enrichBySubject(lastStats);

  return (
    <Layout>
      <div className="p-6 pb-24">
        <header className="mb-6 pt-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-6 h-6 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">本週複習報告</h1>
          </div>
          <p className="text-muted-foreground font-medium text-sm">掌握你的學習成果</p>
        </header>

        <WeekSection
          title="本週"
          stats={enrichedThisStats}
          weekDays={thisWeekDays}
          sessions={sessions}
          weekStart={thisWeekStart}
          weekEnd={thisWeekEnd}
        />

        {lastStats.completedCount > 0 && (
          <WeekSection
            title="上週"
            stats={enrichedLastStats}
            weekDays={lastWeekDays}
            sessions={sessions}
            weekStart={lastWeekStart}
            weekEnd={lastWeekEnd}
          />
        )}

        {thisStats.completedCount === 0 && lastStats.completedCount === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center text-center py-16"
          >
            <div className="w-28 h-28 bg-accent/30 rounded-[32px] rotate-12 flex items-center justify-center mb-5 shadow-sm">
              <span className="text-4xl -rotate-12">📊</span>
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">還沒有複習紀錄</h2>
            <p className="text-muted-foreground font-medium text-sm">完成第一次複習後，這裡就會出現統計資料！</p>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}

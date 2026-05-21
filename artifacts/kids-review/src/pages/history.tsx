import { useState, useMemo } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Star, CalendarDays, TrendingUp } from "lucide-react";
import { Layout } from "@/components/layout";
import { useData, ReviewRecord } from "@/hooks/use-data";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Difficulty = "easy" | "normal" | "hard";

const DIFFICULTY_MAP: Record<Difficulty, { label: string; color: string }> = {
  easy: { label: "很簡單", color: "text-green-600 bg-green-100" },
  normal: { label: "普通", color: "text-amber-600 bg-amber-100" },
  hard: { label: "很難", color: "text-red-600 bg-red-100" },
};

function StarDisplay({ value, size = "sm" }: { value: number; size?: "sm" | "xs" }) {
  const cls = size === "xs" ? "w-3 h-3" : "w-4 h-4";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          className={cn(cls, n <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20")}
        />
      ))}
    </div>
  );
}

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-bold text-muted-foreground">完成率</span>
        <span className="text-xs font-bold text-foreground">{value}/{total} ({pct}%)</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={cn("h-full rounded-full", pct === 100 ? "bg-green-500" : "bg-primary")}
        />
      </div>
    </div>
  );
}

function RecordRow({ rec, index }: { rec: ReviewRecord; index: number }) {
  const diff = DIFFICULTY_MAP[rec.difficulty as Difficulty] ?? DIFFICULTY_MAP.normal;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="bg-muted/40 rounded-2xl p-3 space-y-1.5"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-foreground">第 {index + 1} 次 · {rec.date}</span>
        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", diff.color)}>{diff.label}</span>
      </div>
      <div className="flex items-center gap-2">
        <StarDisplay value={rec.understanding} size="xs" />
        <span className="text-[10px] text-muted-foreground">{rec.understanding} 分</span>
      </div>
      {rec.notes && (
        <p className="text-xs text-muted-foreground bg-white/60 rounded-xl px-2.5 py-1.5 leading-snug">
          {rec.notes}
        </p>
      )}
    </motion.div>
  );
}

export default function History() {
  const { subjects, sessions, isLoaded } = useData();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const enrichedSessions = useMemo(() => {
    if (!isLoaded) return [];
    return sessions
      .map(session => {
        const subject = subjects.find(s => s.id === session.subjectId);
        const completedCount = session.completedDates.length;
        const totalCount = session.reviewDates.length;
        const records: ReviewRecord[] = session.records || [];
        const avgUnderstanding =
          records.length > 0
            ? records.reduce((sum, r) => sum + r.understanding, 0) / records.length
            : 0;
        const lastCompleted =
          session.completedDates.length > 0
            ? [...session.completedDates].sort().at(-1)
            : null;
        const nextPending = session.reviewDates.find(d => !session.completedDates.includes(d)) ?? null;

        return {
          session,
          subject,
          completedCount,
          totalCount,
          records,
          avgUnderstanding,
          lastCompleted,
          nextPending,
        };
      })
      .sort((a, b) => {
        const aDate = a.lastCompleted ?? a.session.firstDate;
        const bDate = b.lastCompleted ?? b.session.firstDate;
        return bDate.localeCompare(aDate);
      });
  }, [sessions, subjects, isLoaded]);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <Layout>
      <div className="p-6 pb-28">
        <header className="mb-6 pt-4">
          <h1 className="text-3xl font-bold text-foreground">學習歷程總表</h1>
          <p className="text-muted-foreground mt-1 font-medium">查看所有學習的完整紀錄</p>
        </header>

        {!isLoaded ? null : enrichedSessions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center text-center py-16"
          >
            <div className="w-28 h-28 bg-muted rounded-3xl rotate-12 flex items-center justify-center mb-5">
              <TrendingUp className="w-14 h-14 text-muted-foreground/30 -rotate-12" />
            </div>
            <p className="font-bold text-lg text-foreground">還沒有學習紀錄</p>
            <p className="text-muted-foreground text-sm mt-1">先去「新增學習」建立第一筆紀錄吧！</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {enrichedSessions.map(({ session, subject, completedCount, totalCount, records, avgUnderstanding, lastCompleted, nextPending }, index) => {
              const isExpanded = expandedId === session.id;
              const isAllDone = completedCount === totalCount;
              const hasOverdue = session.reviewDates.some(
                d => d < today && !session.completedDates.includes(d)
              );

              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06 }}
                  data-testid={`card-history-${session.id}`}
                >
                  <Card className={cn(
                    "border-2 rounded-3xl shadow-sm overflow-hidden transition-colors",
                    isAllDone ? "border-green-400/40" : hasOverdue ? "border-red-300/50" : "border-border/50"
                  )}>
                    <button
                      className="w-full p-4 text-left active:bg-muted/30 transition-colors"
                      onClick={() => toggleExpand(session.id)}
                      data-testid={`toggle-history-${session.id}`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 shadow-inner", subject?.color || "bg-muted")}>
                          {subject?.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{subject?.name}</span>
                            {isAllDone && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">全部完成</span>
                            )}
                            {hasOverdue && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">有逾期</span>
                            )}
                          </div>
                          <h3 className="font-bold text-foreground text-base leading-tight truncate">{session.scope}</h3>
                        </div>
                        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center transition-colors shrink-0", isExpanded ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>

                      <ProgressBar value={completedCount} total={totalCount} />

                      <div className="grid grid-cols-2 gap-2 mt-3">
                        {avgUnderstanding > 0 && (
                          <div className="flex items-center gap-2 bg-muted/50 rounded-2xl p-2">
                            <StarDisplay value={avgUnderstanding} size="xs" />
                            <span className="text-xs font-bold text-foreground">{avgUnderstanding.toFixed(1)}</span>
                          </div>
                        )}
                        {lastCompleted && (
                          <div className="flex items-center gap-1.5 bg-muted/50 rounded-2xl p-2">
                            <CalendarDays className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="text-[10px] font-bold text-muted-foreground truncate">最近 {lastCompleted}</span>
                          </div>
                        )}
                        {nextPending && (
                          <div className={cn(
                            "col-span-2 flex items-center gap-1.5 rounded-2xl p-2",
                            nextPending < today ? "bg-red-50" : "bg-primary/5"
                          )}>
                            <CalendarDays className={cn("w-3 h-3 shrink-0", nextPending < today ? "text-red-500" : "text-primary")} />
                            <span className={cn("text-[10px] font-bold", nextPending < today ? "text-red-600" : "text-primary")}>
                              {nextPending < today ? "逾期未複習：" : "下次複習："}
                              {nextPending}
                            </span>
                          </div>
                        )}
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 pt-1 space-y-2 border-t border-border/30">
                            <p className="text-xs font-bold text-muted-foreground pt-2 mb-3">歷次複習紀錄</p>
                            {records.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-4">
                                尚無詳細紀錄（完成複習後會記錄在這裡）
                              </p>
                            ) : (
                              records.map((rec, i) => (
                                <RecordRow key={rec.date + i} rec={rec} index={i} />
                              ))
                            )}

                            <div className="mt-3 pt-3 border-t border-border/30">
                              <p className="text-xs font-bold text-muted-foreground mb-2">複習日程</p>
                              <div className="space-y-1">
                                {session.reviewDates.map((d, i) => {
                                  const done = session.completedDates.includes(d);
                                  const overdue = !done && d < today;
                                  return (
                                    <div key={d} className="flex items-center gap-2">
                                      <div className={cn(
                                        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                                        done ? "bg-green-500 text-white" : overdue ? "bg-red-400 text-white" : "bg-muted text-muted-foreground"
                                      )}>
                                        {i + 1}
                                      </div>
                                      <span className={cn(
                                        "text-xs font-medium",
                                        done ? "line-through text-muted-foreground" : overdue ? "text-red-600 font-bold" : "text-foreground"
                                      )}>
                                        {d}
                                      </span>
                                      {done && <span className="text-[10px] text-green-600 font-bold">✓ 完成</span>}
                                      {overdue && <span className="text-[10px] text-red-500 font-bold">逾期</span>}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}

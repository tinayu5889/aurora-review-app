import { useState, useMemo } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, ChevronUp, Star, CalendarDays, TrendingUp,
  Pencil, CheckSquare, Square, Trash2, X,
} from "lucide-react";
import { Layout } from "@/components/layout";
import { useData, ReviewRecord, ReviewSession, LearningType, TIME_SLOT_LABELS } from "@/hooks/use-data";
import { EditSessionSheet } from "@/components/edit-session-sheet";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

type Difficulty = "easy" | "normal" | "hard";

const LEARNING_TYPE_LABELS: Record<LearningType, { emoji: string; label: string }> = {
  video:           { emoji: "🎬", label: "看影片" },
  quiz:            { emoji: "📝", label: "測驗題" },
  reading:         { emoji: "📖", label: "閱讀"   },
  extracurricular: { emoji: "🏃", label: "課外"   },
};

const DIFFICULTY_MAP: Record<Difficulty, { label: string; color: string }> = {
  easy:   { label: "很簡單", color: "text-green-600 bg-green-100" },
  normal: { label: "普通",   color: "text-amber-600 bg-amber-100" },
  hard:   { label: "很難",   color: "text-red-600 bg-red-100"     },
};

function StarDisplay({ value, size = "sm" }: { value: number; size?: "sm" | "xs" }) {
  const cls = size === "xs" ? "w-3 h-3" : "w-4 h-4";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} className={cn(cls, n <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20")} />
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

/* ── Inline review-round dots ── */
function ReviewDots({
  reviewDates,
  completedDates,
  today,
}: {
  reviewDates: string[];
  completedDates: string[];
  today: string;
}) {
  if (reviewDates.length === 0) {
    return (
      <span className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
        單次學習
      </span>
    );
  }
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {reviewDates.map((d, i) => {
        const done    = completedDates.includes(d);
        const overdue = !done && d < today;
        return (
          <div
            key={d}
            title={`第 ${i + 1} 次：${d}${done ? " ✓" : overdue ? " 逾期" : ""}`}
            className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
              done    ? "bg-green-500 text-white"
              : overdue ? "bg-red-400 text-white"
              :           "bg-muted text-muted-foreground"
            )}
          >
            {i + 1}
          </div>
        );
      })}
    </div>
  );
}

export default function History() {
  const { subjects, sessions, saveSessions, isLoaded } = useData();
  const [expandedId, setExpandedId]       = useState<string | null>(null);
  const [editingSession, setEditingSession] = useState<ReviewSession | null>(null);

  /* ── Select mode ── */
  const [selectMode, setSelectMode]   = useState(false);
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [confirmBulk, setConfirmBulk] = useState(false);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const handleBulkDelete = () => {
    saveSessions(sessions.filter(s => !selected.has(s.id)));
    exitSelectMode();
    setConfirmBulk(false);
    setExpandedId(null);
  };

  const handleSave = (updated: ReviewSession) => {
    saveSessions(sessions.map(s => s.id === updated.id ? updated : s));
    setEditingSession(null);
  };

  const handleDelete = (sessionId: string) => {
    saveSessions(sessions.filter(s => s.id !== sessionId));
    setExpandedId(null);
  };

  const enrichedSessions = useMemo(() => {
    if (!isLoaded) return [];
    return sessions
      .map(session => {
        const subject         = subjects.find(s => s.id === session.subjectId);
        const completedCount  = session.completedDates.length;
        const totalCount      = session.reviewDates.length;
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
        return { session, subject, completedCount, totalCount, records, avgUnderstanding, lastCompleted, nextPending };
      })
      .sort((a, b) => {
        const aDate = a.lastCompleted ?? a.session.firstDate;
        const bDate = b.lastCompleted ?? b.session.firstDate;
        return bDate.localeCompare(aDate);
      });
  }, [sessions, subjects, isLoaded]);

  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <Layout>
      <div className="p-6 pb-32">
        {/* Header */}
        <header className="mb-6 pt-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">學習歷程總表</h1>
            <p className="text-muted-foreground mt-1 font-medium">查看所有學習的完整紀錄</p>
          </div>
          {enrichedSessions.length > 0 && (
            selectMode ? (
              <button
                onClick={exitSelectMode}
                className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-muted text-muted-foreground font-bold text-sm"
              >
                <X className="w-4 h-4" /> 取消
              </button>
            ) : (
              <button
                onClick={() => setSelectMode(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-muted text-muted-foreground hover:bg-muted/80 font-bold text-sm transition-colors"
              >
                <CheckSquare className="w-4 h-4" /> 選取
              </button>
            )
          )}
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
          <div className="grid gap-4 md:grid-cols-2">
            {enrichedSessions.map(({ session, subject, completedCount, totalCount, records, avgUnderstanding, lastCompleted, nextPending }, index) => {
              const isExpanded = !selectMode && expandedId === session.id;
              const isSelected = selected.has(session.id);
              const isAllDone  = totalCount > 0 && completedCount === totalCount;
              const hasOverdue = session.reviewDates.some(d => d < today && !session.completedDates.includes(d));

              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <Card className={cn(
                    "border-2 rounded-3xl shadow-sm overflow-hidden transition-all",
                    isSelected  ? "border-primary ring-2 ring-primary/30"
                    : isAllDone ? "border-green-400/40"
                    : hasOverdue ? "border-red-300/50"
                    :              "border-border/50"
                  )}>
                    {/* Header row */}
                    <button
                      className="w-full p-4 text-left active:bg-muted/30 transition-colors"
                      onClick={() => {
                        if (selectMode) { toggleSelect(session.id); return; }
                        setExpandedId(isExpanded ? null : session.id);
                      }}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        {/* Select checkbox */}
                        {selectMode && (
                          <div className={cn(
                            "w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors",
                            isSelected ? "bg-primary border-primary text-white" : "border-muted-foreground/40"
                          )}>
                            {isSelected && <CheckSquare className="w-4 h-4" />}
                            {!isSelected && <Square className="w-4 h-4 text-transparent" />}
                          </div>
                        )}

                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 shadow-inner", subject?.color || "bg-muted")}>
                          {subject?.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{subject?.name}</span>
                            {(() => { const lt = LEARNING_TYPE_LABELS[session.learningType ?? "reading"]; return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">{lt.emoji} {lt.label}</span>; })()}
                            {(session.timeSlot && session.timeSlot !== "none") && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">
                                {TIME_SLOT_LABELS[session.timeSlot].emoji} {TIME_SLOT_LABELS[session.timeSlot].label}
                              </span>
                            )}
                            {isAllDone  && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">全部完成</span>}
                            {hasOverdue && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">有逾期</span>}
                          </div>
                          <h3 className="font-bold text-foreground text-base leading-tight truncate">{session.scope}</h3>
                        </div>
                        {!selectMode && (
                          <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center transition-colors shrink-0", isExpanded ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        )}
                      </div>

                      {/* Inline review rounds — always visible */}
                      <div className="mb-3">
                        <ReviewDots
                          reviewDates={session.reviewDates}
                          completedDates={session.completedDates}
                          today={today}
                        />
                      </div>

                      {totalCount > 0 && <ProgressBar value={completedCount} total={totalCount} />}

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
                              {nextPending < today ? "逾期未複習：" : "下次複習："}{nextPending}
                            </span>
                          </div>
                        )}
                      </div>
                    </button>

                    {/* Expanded: detailed records only */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 pt-1 border-t border-border/30">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full mt-3 mb-4 rounded-2xl font-bold border-2 border-primary/30 text-primary hover:bg-primary/5"
                              onClick={() => setEditingSession(session)}
                            >
                              <Pencil className="w-4 h-4 mr-2" />
                              編輯 / 刪除此計畫
                            </Button>

                            <p className="text-xs font-bold text-muted-foreground mb-3">歷次複習紀錄</p>
                            {records.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-4">
                                尚無詳細紀錄（完成複習後會記錄在這裡）
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {records.map((rec, i) => <RecordRow key={rec.date + i} rec={rec} index={i} />)}
                              </div>
                            )}
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

      {/* Bulk delete bottom bar */}
      <AnimatePresence>
        {selectMode && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 px-6 pb-8 pt-4 bg-background/95 backdrop-blur border-t border-border/40 shadow-lg"
          >
            <div className="flex items-center gap-3 max-w-2xl mx-auto">
              <p className="flex-1 text-sm font-bold text-foreground">
                已選 <span className="text-primary">{selected.size}</span> 筆
              </p>
              <Button
                variant="ghost"
                className="font-bold text-muted-foreground"
                onClick={() => {
                  if (selected.size === enrichedSessions.length) {
                    setSelected(new Set());
                  } else {
                    setSelected(new Set(enrichedSessions.map(e => e.session.id)));
                  }
                }}
              >
                {selected.size === enrichedSessions.length ? "取消全選" : "全選"}
              </Button>
              <Button
                className="bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl px-5"
                disabled={selected.size === 0}
                onClick={() => setConfirmBulk(true)}
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                刪除 {selected.size > 0 ? `(${selected.size})` : ""}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm bulk delete */}
      <AlertDialog open={confirmBulk} onOpenChange={setConfirmBulk}>
        <AlertDialogContent className="rounded-3xl mx-4 border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-center">確定要刪除嗎？</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base leading-relaxed">
              將刪除選取的 <span className="font-bold text-red-600">{selected.size}</span> 筆學習計畫，刪除後無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col mt-2">
            <AlertDialogAction
              className="w-full h-12 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold"
              onClick={handleBulkDelete}
            >
              確定刪除
            </AlertDialogAction>
            <AlertDialogCancel className="w-full h-12 rounded-2xl font-bold border-none bg-muted hover:bg-muted/80 mt-0">
              取消
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditSessionSheet
        session={editingSession}
        subjects={subjects}
        open={!!editingSession}
        onClose={() => setEditingSession(null)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </Layout>
  );
}

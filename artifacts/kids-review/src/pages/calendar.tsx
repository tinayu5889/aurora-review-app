import { useState, useMemo } from "react";
import { format, addDays, startOfMonth } from "date-fns";
import { zhTW } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { BookOpen, CalendarCheck, CheckCircle2, Circle, Target } from "lucide-react";
import { Layout } from "@/components/layout";
import { useData, Goal } from "@/hooks/use-data";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export default function CalendarPage() {
  const { subjects, sessions, excludedPeriods, goals, saveGoals, isLoaded } = useData();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [confirmGoal, setConfirmGoal] = useState<Goal | null>(null);

  /* ── Build lookup sets ── */
  const planDaysSet = useMemo(() => {
    const s = new Set<string>();
    if (!isLoaded) return s;
    sessions.forEach(sess => s.add(sess.firstDate));
    return s;
  }, [sessions, isLoaded]);

  const reviewDaysMap = useMemo(() => {
    const m = new Map<string, { sessionId: string; scope: string; round: number; isCompleted: boolean; subject: ReturnType<typeof subjects.find> }[]>();
    if (!isLoaded) return m;
    sessions.forEach(session => {
      session.reviewDates.forEach((dateStr, idx) => {
        const existing = m.get(dateStr) ?? [];
        m.set(dateStr, [...existing, {
          sessionId: session.id,
          scope: session.scope,
          round: idx + 1,
          isCompleted: session.completedDates.includes(dateStr),
          subject: subjects.find(s => s.id === session.subjectId),
        }]);
      });
    });
    return m;
  }, [sessions, subjects, isLoaded]);

  const excludedDaysSet = useMemo(() => {
    const s = new Set<string>();
    if (!isLoaded) return s;
    excludedPeriods.forEach(p => {
      let d = new Date(p.startDate + "T00:00:00");
      const end = new Date(p.endDate + "T00:00:00");
      while (d <= end) {
        s.add(format(d, "yyyy-MM-dd"));
        d = addDays(d, 1);
      }
    });
    return s;
  }, [excludedPeriods, isLoaded]);

  /* ── Modifiers ── */
  const modifiers = {
    hasPlan:    (date: Date) => planDaysSet.has(format(date, "yyyy-MM-dd")),
    hasReview:  (date: Date) => reviewDaysMap.has(format(date, "yyyy-MM-dd")),
    isExcluded: (date: Date) => excludedDaysSet.has(format(date, "yyyy-MM-dd")),
  };

  /* ── Selected date data ── */
  const selectedDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";

  const planItems = useMemo(() =>
    selectedDateStr ? sessions.filter(s => s.firstDate === selectedDateStr).map(s => ({
      ...s,
      subject: subjects.find(sub => sub.id === s.subjectId),
    })) : [],
    [selectedDateStr, sessions, subjects]
  );

  const reviewItems = useMemo(() =>
    selectedDateStr ? (reviewDaysMap.get(selectedDateStr) ?? []) : [],
    [selectedDateStr, reviewDaysMap]
  );

  const excludedNote = useMemo(() =>
    selectedDateStr
      ? (excludedPeriods.find(p => selectedDateStr >= p.startDate && selectedDateStr <= p.endDate) ?? null)
      : null,
    [selectedDateStr, excludedPeriods]
  );

  /* ── Goals: only show non-completed; click circle → confirm → delete ── */
  const activeGoals = useMemo(() => goals.filter(g => !g.isCompleted), [goals]);

  const handleConfirmComplete = () => {
    if (!confirmGoal) return;
    saveGoals(goals.filter(g => g.id !== confirmGoal.id));
    setConfirmGoal(null);
  };

  if (!isLoaded) return null;

  return (
    <Layout>
      {/* Two-column layout: left = calendar+detail, right = goals panel */}
      <div className="flex h-full">

        {/* ── Left: scrollable calendar + detail ── */}
        <div className="flex-1 min-w-0 overflow-y-auto px-8 py-8">
          <header className="mb-4">
            <h1 className="text-2xl font-bold text-foreground">複習月曆</h1>
            <p className="text-muted-foreground text-sm mt-1">看看未來的計畫安排</p>
          </header>

          {/* Legend */}
          <div className="flex items-center gap-5 mb-5 flex-wrap text-sm font-semibold">
            <span className="flex items-center gap-1.5 text-rose-600">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              今日讀書計畫
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              要記得複習唷
            </span>
            <span className="flex items-center gap-1.5 text-amber-600">
              <span className="text-xs font-black leading-none">✕</span>
              排除日
            </span>
          </div>

          {/* Calendar */}
          <div className="bg-card rounded-3xl p-6 border border-border/50 shadow-sm mb-6">
            <style>{`
              .rdp { --rdp-cell-size: 40px; margin: 0; width: 100%; }
              .rdp-months { display: grid; grid-template-columns: 1fr 1fr; gap: 2.5rem; width: 100%; }
              .rdp-month { width: 100%; }
              .rdp-table { width: 100%; }
              .rdp-caption { margin-bottom: 1rem; }
              .rdp-caption_label { font-size: 1.1rem; font-weight: 800; }
              .rdp-head_cell { font-weight: 700; color: var(--color-muted-foreground); padding-bottom: 0.75rem; text-transform: uppercase; font-size: 0.75rem; }
              .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: hsl(var(--muted)); border-radius: 10px; }
              .rdp-day_selected { background-color: hsl(var(--primary)); color: white; font-weight: bold; border-radius: 10px; }
              .rdp-day_selected:hover { background-color: hsl(var(--primary)); opacity: 0.9; }
              .rdp-day_today:not(.rdp-day_selected) { font-weight: 800; color: hsl(var(--primary)); }
              .rdp-nav_button { border-radius: 10px; }

              /* Plan: red dot */
              .day-has-plan { position: relative; }
              .day-has-plan:not(.day-has-review)::after {
                content: '';
                position: absolute;
                bottom: 2px;
                left: 50%;
                transform: translateX(-50%);
                width: 5px; height: 5px;
                border-radius: 50%;
                background: #ef4444;
                pointer-events: none;
              }
              /* Review: green dot */
              .day-has-review { position: relative; }
              .day-has-review:not(.day-has-plan)::after {
                content: '';
                position: absolute;
                bottom: 2px;
                left: 50%;
                transform: translateX(-50%);
                width: 5px; height: 5px;
                border-radius: 50%;
                background: #22c55e;
                pointer-events: none;
              }
              /* Both: two dots */
              .day-has-plan.day-has-review::after {
                content: '';
                position: absolute;
                bottom: 2px;
                left: calc(50% - 5px);
                width: 5px; height: 5px;
                border-radius: 50%;
                background: #ef4444;
                box-shadow: 8px 0 0 0 #22c55e;
                pointer-events: none;
              }
              /* Excluded: X top-right corner */
              .day-excluded { position: relative; }
              .day-excluded::before {
                content: '✕';
                position: absolute;
                top: 0;
                right: 1px;
                font-size: 7px;
                font-weight: 900;
                color: #d97706;
                line-height: 1.3;
                pointer-events: none;
              }
            `}</style>

            <DayPicker
              mode="single"
              numberOfMonths={2}
              pagedNavigation
              defaultMonth={startOfMonth(new Date())}
              selected={selectedDate}
              onSelect={day => day && setSelectedDate(day)}
              modifiers={modifiers}
              modifiersClassNames={{
                hasPlan: "day-has-plan",
                hasReview: "day-has-review",
                isExcluded: "day-excluded",
              }}
              locale={zhTW}
            />
          </div>

          {/* Detail panel */}
          {selectedDate && (
            <div className="bg-card border border-border/50 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <h2 className="text-lg font-bold text-foreground">
                  {format(selectedDate, "yyyy 年 M 月 d 日（E）", { locale: zhTW })}
                </h2>
                {excludedNote && (
                  <span className="text-xs font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                    ✕ 排除日：{excludedNote.note || "已設定排除"}
                  </span>
                )}
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                {/* Section 1: Study Plan */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="w-4 h-4 text-rose-500" />
                    <h3 className="text-sm font-bold text-rose-600">今日讀書計畫</h3>
                    <span className="ml-auto text-xs text-muted-foreground font-medium">{planItems.length} 個</span>
                  </div>
                  {planItems.length === 0 ? (
                    <div className="text-center py-6 bg-muted/30 rounded-2xl">
                      <p className="text-muted-foreground text-sm">這天沒有新學習計畫</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {planItems.map(item => (
                        <div key={item.id} className="flex items-center gap-3 p-3 bg-rose-50/60 border border-rose-100 rounded-2xl">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0", item.subject?.color ?? "bg-muted")}>
                            {item.subject?.emoji}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-muted-foreground">{item.subject?.name}</p>
                            <p className="text-sm font-bold text-foreground truncate">{item.scope}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section 2: Review Tasks */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CalendarCheck className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-bold text-emerald-600">當日複習任務</h3>
                    <span className="ml-auto text-xs text-muted-foreground font-medium">{reviewItems.length} 個</span>
                  </div>
                  {reviewItems.length === 0 ? (
                    <div className="text-center py-6 bg-muted/30 rounded-2xl">
                      <p className="text-muted-foreground text-sm">這天沒有複習任務</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {reviewItems.map((item, idx) => (
                        <div key={idx} className={cn(
                          "flex items-center gap-3 p-3 border rounded-2xl",
                          item.isCompleted ? "bg-emerald-50/60 border-emerald-100" : "bg-card border-border/50"
                        )}>
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0", item.subject?.color ?? "bg-muted")}>
                            {item.subject?.emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-muted-foreground">{item.subject?.name} · 第 {item.round} 次</p>
                            <p className={cn("text-sm font-bold truncate", item.isCompleted ? "line-through text-muted-foreground" : "text-foreground")}>
                              {item.scope}
                            </p>
                          </div>
                          {item.isCompleted
                            ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                            : <Circle className="w-5 h-5 text-muted-foreground/30 shrink-0" />
                          }
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Goals panel (sticky, full height) ── */}
        <aside className="w-64 shrink-0 border-l border-border/50 bg-card flex flex-col sticky top-0 h-screen overflow-y-auto">
          <div className="px-5 py-5 border-b border-border/40">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary shrink-0" />
              <h2 className="text-sm font-bold text-foreground">學習目標</h2>
            </div>
          </div>

          <div className="flex-1 px-4 py-4 overflow-y-auto">
            {activeGoals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-3">
                  <Target className="w-6 h-6 text-primary/40" />
                </div>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">目前沒有學習目標</p>
              </div>
            ) : (
              <ul className="space-y-1">
                {activeGoals.map(goal => (
                  <li key={goal.id} className="flex items-start gap-3 py-2.5 px-1 group">
                    <button
                      onClick={() => setConfirmGoal(goal)}
                      className="mt-0.5 shrink-0 transition-transform active:scale-90 hover:scale-110"
                      aria-label="標記完成"
                    >
                      <Circle className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
                    </button>
                    <span className="text-sm font-medium text-foreground leading-snug">
                      {goal.content}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {/* Confirm complete → delete dialog */}
      <AlertDialog open={!!confirmGoal} onOpenChange={open => !open && setConfirmGoal(null)}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl w-[88%] sm:max-w-sm mx-auto p-6">
          <AlertDialogHeader>
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
            </div>
            <AlertDialogTitle className="text-lg font-bold text-center leading-snug">
              確定已完成此學習目標？
            </AlertDialogTitle>
            {confirmGoal && (
              <AlertDialogDescription className="text-center mt-2">
                <span className="block bg-muted rounded-2xl px-4 py-3 text-sm text-foreground font-semibold">
                  {confirmGoal.content}
                </span>
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col mt-3">
            <AlertDialogAction
              onClick={handleConfirmComplete}
              className="w-full h-12 rounded-2xl font-bold bg-green-500 hover:bg-green-600 text-white"
            >
              完成
            </AlertDialogAction>
            <AlertDialogCancel className="w-full h-12 rounded-2xl font-bold border-2 mt-0">
              取消
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

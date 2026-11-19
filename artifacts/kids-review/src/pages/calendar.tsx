import { useState, useMemo, useEffect, useRef } from "react";
import { format, addDays, startOfMonth } from "date-fns";
import { zhTW } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { BookOpen, CalendarCheck, CheckCircle2, Circle, Target, Pencil } from "lucide-react";
import { Layout } from "@/components/layout";
import { useData, Goal, ReviewSession, TimeSlot, TIME_SLOT_LABELS, TIME_SLOT_ORDER } from "@/hooks/use-data";
import { EditSessionSheet } from "@/components/edit-session-sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

/* ── Custom DayButton type (avoids fragile DayButtonProps import) ── */
type DayButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  day: { date: Date };
  modifiers: Record<string, boolean>;
};

const TIME_SLOT_SORT_ORDER: TimeSlot[] = TIME_SLOT_ORDER;

export default function CalendarPage() {
  const { subjects, sessions, saveSessions, saveSessionsAndSync, excludedPeriods, goals, saveGoals, isLoaded } = useData();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [confirmGoal, setConfirmGoal] = useState<Goal | null>(null);
  const [editingSession, setEditingSession] = useState<ReviewSession | null>(null);
  const [draggingSessionId, setDraggingSessionId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropTargetSlot, setDropTargetSlot] = useState<TimeSlot | null>(null);
  const activeDragRef = useRef<{ sessionId: string; pointerId: number } | null>(null);
  const saveSessionsRef = useRef(saveSessionsAndSync);
  saveSessionsRef.current = saveSessionsAndSync;

  /* ── Build lookup sets ── */
  const planDaysSet = useMemo(() => {
    const s = new Set<string>();
    if (!isLoaded) return s;
    sessions.forEach(sess => s.add(sess.firstDate));
    return s;
  }, [sessions, isLoaded]);

  const reviewDaysMap = useMemo(() => {
    const m = new Map<string, { sessionId: string; scope: string; round: number; isCompleted: boolean; timeSlot: string; subject: ReturnType<typeof subjects.find> }[]>();
    if (!isLoaded) return m;
    sessions.forEach(session => {
      session.reviewDates.forEach((dateStr, idx) => {
        const existing = m.get(dateStr) ?? [];
        m.set(dateStr, [...existing, {
          sessionId: session.id,
          scope: session.scope,
          round: idx + 1,
          isCompleted: session.completedDates.includes(dateStr),
          timeSlot: session.timeSlot ?? "none",
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

  /* ── Custom DayButton: flex-column layout, markers as real DOM nodes ── */
  const DayButton = useMemo(() => {
    return function CustomDayButton({ day, modifiers, className, style, ...buttonProps }: DayButtonProps) {
      const dateStr = format(day.date, "yyyy-MM-dd");
      const hasPlan    = planDaysSet.has(dateStr);
      const hasReview  = reviewDaysMap.has(dateStr);
      const isExcluded = excludedDaysSet.has(dateStr);

      return (
        <button
          className={className}
          style={{
            ...style,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            padding: "4px 0 3px",
          }}
          {...buttonProps}
        >
          {/* Date number */}
          <span style={{ lineHeight: 1, fontSize: "inherit", fontWeight: "inherit" }}>
            {day.date.getDate()}
          </span>

          {/* Marker row — always reserves 7px so cell height stays constant */}
          <span
            style={{
              height: 7,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              minWidth: 1,
            }}
          >
            {hasPlan && (
              <span
                style={{
                  display: "inline-block",
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "#ef4444",
                  flexShrink: 0,
                }}
              />
            )}
            {hasReview && (
              <span
                style={{
                  display: "inline-block",
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "#22c55e",
                  flexShrink: 0,
                }}
              />
            )}
            {isExcluded && (
              <span
                style={{
                  display: "inline-block",
                  fontSize: 8,
                  fontWeight: 900,
                  color: "#d97706",
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                ✕
              </span>
            )}
          </span>
        </button>
      );
    };
  }, [planDaysSet, reviewDaysMap, excludedDaysSet]);

  /* ── Modifiers (still used by DayPicker for its own logic) ── */
  const modifiers = {
    hasPlan:    (date: Date) => planDaysSet.has(format(date, "yyyy-MM-dd")),
    hasReview:  (date: Date) => reviewDaysMap.has(format(date, "yyyy-MM-dd")),
    isExcluded: (date: Date) => excludedDaysSet.has(format(date, "yyyy-MM-dd")),
  };

  /* ── Selected date data ── */
  const selectedDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";

  const planItems = useMemo(() => {
    if (!selectedDateStr) return [];
    return sessions
      .filter(s => s.firstDate === selectedDateStr)
      .map(s => ({ ...s, subject: subjects.find(sub => sub.id === s.subjectId) }))
      .sort((a, b) =>
        TIME_SLOT_SORT_ORDER.indexOf(a.timeSlot ?? "none") -
          TIME_SLOT_SORT_ORDER.indexOf(b.timeSlot ?? "none") ||
        (a.sortOrder ?? Number.MAX_SAFE_INTEGER) -
          (b.sortOrder ?? Number.MAX_SAFE_INTEGER)
      );
  }, [selectedDateStr, sessions, subjects]);

  const reviewItems = useMemo(() => {
    if (!selectedDateStr) return [];
    return (reviewDaysMap.get(selectedDateStr) ?? [])
      .slice()
      .sort((a, b) =>
        TIME_SLOT_SORT_ORDER.indexOf(a.timeSlot as TimeSlot) -
        TIME_SLOT_SORT_ORDER.indexOf(b.timeSlot as TimeSlot)
      );
  }, [selectedDateStr, reviewDaysMap]);

  useEffect(() => {
    if (!draggingSessionId) return;

    const getDropTargets = (x: number, y: number) => {
      const element = document.elementFromPoint(x, y);
      return {
        card: element?.closest<HTMLElement>("[data-plan-drop-id]") ?? null,
        slot: element?.closest<HTMLElement>("[data-plan-drop-slot]") ?? null,
      };
    };

    const clearDrag = () => {
      activeDragRef.current = null;
      setDraggingSessionId(null);
      setDropTargetId(null);
      setDropTargetSlot(null);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (activeDragRef.current?.pointerId !== event.pointerId) return;
      event.preventDefault();
      const { card, slot } = getDropTargets(event.clientX, event.clientY);
      setDropTargetId(card?.dataset.planDropId ?? null);
      setDropTargetSlot((slot?.dataset.planDropSlot as TimeSlot | undefined) ?? null);
    };

    const handlePointerUp = (event: PointerEvent) => {
      const activeDrag = activeDragRef.current;
      if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;

      const source = planItems.find(item => item.id === activeDrag.sessionId);
      const { card, slot } = getDropTargets(event.clientX, event.clientY);
      const targetId = card?.dataset.planDropId;
      const target = targetId ? planItems.find(item => item.id === targetId) : undefined;
      const targetSlot = slot?.dataset.planDropSlot as TimeSlot | undefined;

      if (source && (target || targetSlot) && targetId !== source.id) {
        const destinationSlot = target?.timeSlot ?? targetSlot ?? "none";
        const destinationIds = planItems
          .filter(item => (item.timeSlot ?? "none") === destinationSlot && item.id !== source.id)
          .map(item => item.id);

        let insertAt = destinationIds.length;
        if (target) {
          const targetIndex = destinationIds.indexOf(target.id);
          if (targetIndex >= 0) {
            const targetRect = card?.getBoundingClientRect();
            const insertAfter = targetRect
              ? event.clientY >= targetRect.top + targetRect.height / 2
              : false;
            insertAt = targetIndex + (insertAfter ? 1 : 0);
          }
        }
        destinationIds.splice(insertAt, 0, source.id);

        const positions = new Map<string, { timeSlot: TimeSlot; sortOrder: number }>();
        for (const timeSlot of TIME_SLOT_SORT_ORDER) {
          const ids = timeSlot === destinationSlot
            ? destinationIds
            : planItems
                .filter(item => (item.timeSlot ?? "none") === timeSlot && item.id !== source.id)
                .map(item => item.id);
          ids.forEach((id, sortOrder) => positions.set(id, { timeSlot, sortOrder }));
        }

        const updatedSessions = sessions.map(session => {
          const position = positions.get(session.id);
          return position
            ? { ...session, timeSlot: position.timeSlot, sortOrder: position.sortOrder }
            : session;
        });
        void saveSessionsRef.current(updatedSessions)
          .then(() => toast({ title: "讀書計畫排序已儲存" }))
          .catch(() => toast({
            title: "雲端同步失敗",
            description: "排序已保存在這台裝置，但其他裝置可能尚未更新。",
            variant: "destructive",
          }));
      }

      clearDrag();
    };

    const handlePointerCancel = (event: PointerEvent) => {
      if (activeDragRef.current?.pointerId === event.pointerId) clearDrag();
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, [draggingSessionId, planItems, sessions, toast]);

  const excludedNote = useMemo(() =>
    selectedDateStr
      ? (excludedPeriods.find(p => selectedDateStr >= p.startDate && selectedDateStr <= p.endDate) ?? null)
      : null,
    [selectedDateStr, excludedPeriods]
  );

  /* ── Goals panel ── */
  const activeGoals = useMemo(() =>
    goals
      .filter(g => !g.isCompleted)
      .sort((a, b) => {
        if (a.targetDate && b.targetDate) return a.targetDate.localeCompare(b.targetDate);
        if (a.targetDate) return -1;
        if (b.targetDate) return 1;
        return 0;
      }),
    [goals]
  );

  const handleConfirmComplete = () => {
    if (!confirmGoal) return;
    saveGoals(goals.filter(g => g.id !== confirmGoal.id));
    setConfirmGoal(null);
  };

  if (!isLoaded) return null;

  return (
    <Layout>
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
              .rdp { --rdp-cell-size: 48px; margin: 0; width: 100%; }
              .rdp-months { display: grid; grid-template-columns: 1fr 1fr; gap: 2.5rem; width: 100%; }
              .rdp-month { width: 100%; }
              .rdp-table { width: 100%; }
              .rdp-caption { margin-bottom: 1rem; }
              .rdp-caption_label { font-size: 1.1rem; font-weight: 800; }
              .rdp-head_cell { font-weight: 700; color: var(--color-muted-foreground); padding-bottom: 0.75rem; text-transform: uppercase; font-size: 0.75rem; }
              .rdp-button:hover:not([disabled]):not(.rdp-selected) { background-color: hsl(var(--muted)); border-radius: 10px; }
              .rdp-day_button:hover:not([disabled]) { background-color: hsl(var(--muted)); border-radius: 10px; }
              .rdp-selected .rdp-day_button,
              .rdp-day_button.rdp-selected { background-color: hsl(var(--primary)); color: white; font-weight: bold; border-radius: 10px; }
              .rdp-today:not(.rdp-selected) .rdp-day_button,
              .rdp-day_button.rdp-today:not(.rdp-selected) { font-weight: 800; color: hsl(var(--primary)); }
              .rdp-nav_button { border-radius: 10px; }
            `}</style>

            <DayPicker
              mode="single"
              numberOfMonths={2}
              pagedNavigation
              defaultMonth={startOfMonth(new Date())}
              selected={selectedDate}
              onSelect={day => day && setSelectedDate(day)}
              modifiers={modifiers}
              locale={zhTW}
              components={{ DayButton } as Record<string, unknown>}
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
                {/* Study Plan */}
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
                      {draggingSessionId && (
                        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-dashed border-rose-200 bg-rose-50/50 px-2 py-2">
                          <span className="mr-1 text-[11px] font-semibold text-muted-foreground">移至時段</span>
                          {TIME_SLOT_SORT_ORDER.map(slot => (
                            <span
                              key={slot}
                              data-plan-drop-slot={slot}
                              className={cn(
                                "rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors",
                                dropTargetSlot === slot
                                  ? "border-rose-400 bg-rose-100 text-rose-700"
                                  : "border-border bg-card text-muted-foreground"
                              )}
                            >
                              {TIME_SLOT_LABELS[slot].label}
                            </span>
                          ))}
                        </div>
                      )}
                      {planItems.map(item => (
                        <div
                          key={item.id}
                          data-plan-drop-id={item.id}
                          className={cn(
                            "flex items-center gap-3 p-3 bg-rose-50/60 border rounded-2xl transition-all",
                            dropTargetId === item.id && draggingSessionId !== item.id
                              ? "border-rose-400 ring-2 ring-rose-200"
                              : "border-rose-100",
                            draggingSessionId === item.id && "opacity-50 scale-[0.99]"
                          )}
                        >
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0", item.subject?.color ?? "bg-muted")}>
                            {item.subject?.emoji}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-muted-foreground">
                              {item.subject?.name}
                              {draggingSessionId && ` · ${TIME_SLOT_LABELS[item.timeSlot ?? "none"].label}`}
                            </p>
                            <p className="text-sm font-bold text-foreground truncate">{item.scope}</p>
                          </div>
                          <button
                            type="button"
                            onPointerDown={event => {
                              event.preventDefault();
                              activeDragRef.current = { sessionId: item.id, pointerId: event.pointerId };
                              setDraggingSessionId(item.id);
                              setDropTargetId(null);
                              setDropTargetSlot(null);
                            }}
                            className="flex h-8 w-8 shrink-0 touch-none select-none items-center justify-center rounded-xl text-lg leading-none text-muted-foreground hover:bg-white/80 hover:text-rose-600 active:cursor-grabbing cursor-grab"
                            aria-label="拖曳調整計畫順序"
                            title="拖曳調整順序"
                          >
                            ⠿
                          </button>
                          <button
                            onClick={() => setEditingSession(sessions.find(s => s.id === item.id) ?? null)}
                            className="w-8 h-8 rounded-xl bg-white/70 border border-rose-200 flex items-center justify-center shrink-0 hover:bg-white transition-colors active:scale-90"
                            aria-label="編輯計畫"
                          >
                            <Pencil className="w-3.5 h-3.5 text-rose-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Review Tasks */}
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

        {/* ── Right: Goals panel ── */}
        <aside className="w-64 shrink-0 border-l border-border/50 bg-card flex flex-col sticky top-0 h-screen overflow-hidden">
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
              <ul className="space-y-0.5">
                {activeGoals.map(goal => (
                  <li key={goal.id} className="flex items-start gap-3 py-2.5 px-1 group">
                    <button
                      onClick={() => setConfirmGoal(goal)}
                      className="mt-0.5 shrink-0 transition-transform active:scale-90 hover:scale-110"
                      aria-label="標記完成"
                    >
                      <Circle className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
                    </button>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground leading-snug">
                        {goal.content}
                      </p>
                      {goal.targetDate && (
                        <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                          截止：{goal.targetDate.replace(/-/g, "/").replace(/^(\d{4})\/(\d{2})\/(\d{2})$/, "$1/$2/$3")}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {/* Edit session sheet */}
      <EditSessionSheet
        session={editingSession}
        subjects={subjects}
        open={!!editingSession}
        onClose={() => setEditingSession(null)}
        onSave={updated => {
          saveSessions(sessions.map(s => s.id === updated.id ? updated : s));
          setEditingSession(null);
        }}
        onDelete={id => {
          saveSessions(sessions.filter(s => s.id !== id));
          setEditingSession(null);
        }}
      />

      {/* Confirm complete → delete */}
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

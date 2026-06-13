import { useState, useMemo } from "react";
import { format, addDays, startOfMonth } from "date-fns";
import { zhTW } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { BookOpen, CalendarCheck, CheckCircle2, Circle } from "lucide-react";
import { Layout } from "@/components/layout";
import { useData } from "@/hooks/use-data";
import { cn } from "@/lib/utils";

export default function CalendarPage() {
  const { subjects, sessions, excludedPeriods, isLoaded } = useData();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

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

  return (
    <Layout>
      <div className="px-8 py-8 max-w-6xl">
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
            /* Both: two dots (red left, green right) */
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
    </Layout>
  );
}

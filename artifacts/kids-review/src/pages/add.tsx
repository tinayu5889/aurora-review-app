import { useState, useMemo } from "react";
import { format, addDays } from "date-fns";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  CheckCircle2, CalendarCheck, BookOpenCheck, CalendarX2,
  Calendar, CalendarRange,
} from "lucide-react";
import { Layout } from "@/components/layout";
import { useData, LearningType, TimeSlot, TIME_SLOT_LABELS, TIME_SLOT_ORDER, ExcludedPeriod, ReviewSession } from "@/hooks/use-data";
import { generateReviewDates } from "@/lib/spaced-repetition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

/* ─── Constants ─── */
const LEARNING_TYPE_OPTIONS: { value: LearningType; emoji: string; label: string }[] = [
  { value: "video",   emoji: "🎬", label: "看影片" },
  { value: "quiz",    emoji: "📝", label: "測驗題" },
  { value: "reading", emoji: "📖", label: "閱讀"   },
];

type DateMode = "single" | "range";
type Frequency = "daily" | "weekdays" | "custom";

const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];
const WEEKDAYS_MON_FRI = [1, 2, 3, 4, 5];

/* ─── Helpers ─── */
function newId() {
  return Math.random().toString(36).substring(2, 9);
}

function isDateExcluded(date: string, periods: ExcludedPeriod[]) {
  return periods.some(p => date >= p.startDate && date <= p.endDate);
}

function getExcludedPeriodsInRange(dates: string[], periods: ExcludedPeriod[]): ExcludedPeriod[] {
  const hit = new Set<string>();
  const result: ExcludedPeriod[] = [];
  dates.forEach(d => {
    const p = periods.find(p => d >= p.startDate && d <= p.endDate);
    if (p && !hit.has(p.id)) {
      hit.add(p.id);
      result.push(p);
    }
  });
  return result;
}

function generateDatesInRange(
  startDate: string,
  endDate: string,
  frequency: Frequency,
  customDays: number[],
): string[] {
  const dates: string[] = [];
  let cur = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  while (cur <= end) {
    const dow = cur.getDay();
    const include =
      frequency === "daily" ? true :
      frequency === "weekdays" ? (dow >= 1 && dow <= 5) :
      customDays.includes(dow);
    if (include) dates.push(format(cur, "yyyy-MM-dd"));
    cur = addDays(cur, 1);
  }
  return dates;
}

function hasDuplicate(sessions: ReviewSession[], subjectId: string, scope: string, date: string) {
  return sessions.some(s => s.subjectId === subjectId && s.scope === scope.trim() && s.firstDate === date);
}

function buildSession(subjectId: string, scope: string, learningType: LearningType, timeSlot: TimeSlot, includeReview: boolean, date: string): ReviewSession {
  return {
    id: newId(),
    subjectId,
    scope: scope.trim(),
    firstDate: date,
    learningType,
    timeSlot,
    reviewDates: includeReview ? generateReviewDates(date) : [],
    completedDates: [],
    records: [],
  };
}

/* ─── Component ─── */
export default function AddLearning() {
  const { subjects, sessions, saveSessions, excludedPeriods, isLoaded } = useData();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  /* Form state */
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [scope, setScope] = useState("");
  const [learningType, setLearningType] = useState<LearningType>("reading");
  const [timeSlot, setTimeSlot] = useState<TimeSlot>("none");
  const [includeReview, setIncludeReview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* Date mode */
  const [dateMode, setDateMode] = useState<DateMode>("single");
  const [singleDate, setSingleDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [rangeStart, setRangeStart] = useState(format(new Date(), "yyyy-MM-dd"));
  const [rangeEnd, setRangeEnd] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("daily");
  const [customDays, setCustomDays] = useState<number[]>([1, 3, 5]); // Mon Wed Fri

  /* Dialog state */
  const [excludedDialog, setExcludedDialog] = useState<{
    hitPeriods: ExcludedPeriod[];
    allDates: string[];
  } | null>(null);

  const [duplicateDialog, setDuplicateDialog] = useState<{
    dupCount: number;
    finalDates: string[];
    skippedExcluded: number;
  } | null>(null);

  /* Single mode inline excluded hint */
  const singleExcluded = useMemo(() =>
    dateMode === "single" ? excludedPeriods.find(p => singleDate >= p.startDate && singleDate <= p.endDate) ?? null : null,
    [dateMode, singleDate, excludedPeriods]
  );

  /* ── Step 1: compute candidate dates and start dialog chain ── */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject || !scope.trim()) return;

    let candidateDates: string[];
    if (dateMode === "single") {
      if (!singleDate) return;
      candidateDates = [singleDate];
    } else {
      if (!rangeStart || !rangeEnd || rangeEnd < rangeStart) return;
      if (frequency === "custom" && customDays.length === 0) return;
      candidateDates = generateDatesInRange(rangeStart, rangeEnd, frequency, customDays);
      if (candidateDates.length === 0) return;
    }

    checkExcluded(candidateDates);
  };

  /* ── Step 2: check excluded days ── */
  const checkExcluded = (dates: string[]) => {
    const hitPeriods = getExcludedPeriodsInRange(dates, excludedPeriods);
    if (hitPeriods.length > 0 && dateMode === "range") {
      setExcludedDialog({ hitPeriods, allDates: dates });
      return;
    }
    // single mode: already showed inline, just proceed
    if (hitPeriods.length > 0 && dateMode === "single") {
      setExcludedDialog({ hitPeriods, allDates: dates });
      return;
    }
    checkDuplicates(dates, 0);
  };

  /* ── Step 3: check duplicates ── */
  const checkDuplicates = (dates: string[], skippedExcluded: number) => {
    const dupCount = dates.filter(d => hasDuplicate(sessions, selectedSubject, scope, d)).length;
    if (dupCount > 0) {
      setDuplicateDialog({ dupCount, finalDates: dates, skippedExcluded });
      return;
    }
    doSubmit(dates, skippedExcluded);
  };

  /* ── Step 4: build and save ── */
  const doSubmit = (dates: string[], skippedExcluded: number) => {
    setIsSubmitting(true);
    const newSessions = dates.map(d => buildSession(selectedSubject, scope, learningType, timeSlot, includeReview, d));
    saveSessions([...sessions, ...newSessions]);

    const count = newSessions.length;
    const skipMsg = skippedExcluded > 0 ? `，略過 ${skippedExcluded} 個排除日` : "";
    toast({
      title: `已建立 ${count} 筆讀書計畫 🎉`,
      description: skippedExcluded > 0 ? `已建立 ${count} 筆讀書計畫${skipMsg}` : (includeReview ? "已經幫你安排好複習計畫囉！" : "已加入讀書計畫！"),
      className: "bg-green-500 text-white border-none rounded-2xl",
    });
    setTimeout(() => setLocation("/"), 800);
  };

  /* ── Validation for submit button ── */
  const isFormValid = useMemo(() => {
    if (!selectedSubject || !scope.trim()) return false;
    if (dateMode === "single") return !!singleDate;
    if (!rangeStart || !rangeEnd || rangeEnd < rangeStart) return false;
    if (frequency === "custom" && customDays.length === 0) return false;
    return true;
  }, [selectedSubject, scope, dateMode, singleDate, rangeStart, rangeEnd, frequency, customDays]);

  /* Preview count for range mode */
  const previewCount = useMemo(() => {
    if (dateMode !== "range" || !rangeStart || !rangeEnd || rangeEnd < rangeStart) return 0;
    if (frequency === "custom" && customDays.length === 0) return 0;
    return generateDatesInRange(rangeStart, rangeEnd, frequency, customDays).length;
  }, [dateMode, rangeStart, rangeEnd, frequency, customDays]);

  if (!isLoaded) return null;

  return (
    <Layout>
      <div className="p-6 pb-24 max-w-2xl">
        <header className="mb-6 pt-4">
          <h1 className="text-3xl font-bold text-foreground">新增讀書計畫</h1>
          <p className="text-muted-foreground mt-1 font-medium">今天學到了什麼新知識呢？</p>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          {/* ── 科目 ── */}
          <div className="space-y-2.5">
            <Label className="text-base font-bold text-foreground ml-1">選擇科目</Label>
            {subjects.length === 0 ? (
              <div className="p-6 bg-muted/50 rounded-3xl text-center border border-border/50">
                <p className="text-muted-foreground mb-4 font-medium">還沒有科目喔，先去建立一個吧！</p>
                <Button type="button" onClick={() => setLocation("/subjects")} className="rounded-xl font-bold">去新增科目</Button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {subjects.map(subject => (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => setSelectedSubject(subject.id)}
                    className={cn(
                      "flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl transition-all border-[3px] active:scale-95",
                      selectedSubject === subject.id
                        ? cn(subject.color, "border-transparent text-white shadow-md scale-105")
                        : "bg-card border-border/50 hover:bg-muted text-foreground"
                    )}
                  >
                    <span className="text-2xl mb-1">{subject.emoji}</span>
                    <span className="text-xs font-bold truncate w-full text-center leading-tight">{subject.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── 學習範圍 ── */}
          <div className="space-y-2.5">
            <Label className="text-base font-bold text-foreground ml-1">學習範圍</Label>
            <Input
              value={scope}
              onChange={e => setScope(e.target.value)}
              placeholder="例如：第一課 乘法、Raz Kids Level C..."
              className="h-14 px-5 text-base font-bold rounded-2xl bg-card border-2 border-border/50 focus-visible:ring-primary shadow-sm"
              required
            />
          </div>

          {/* ── 學習類型 ── */}
          <div className="space-y-2.5">
            <Label className="text-base font-bold text-foreground ml-1">學習類型</Label>
            <div className="grid grid-cols-3 gap-2">
              {LEARNING_TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLearningType(opt.value)}
                  className={cn(
                    "flex flex-col items-center justify-center py-3 rounded-2xl border-[3px] transition-all active:scale-95",
                    learningType === opt.value
                      ? "border-violet-400 bg-violet-50 text-violet-700 shadow-sm scale-105"
                      : "bg-card border-border/50 hover:bg-muted text-foreground"
                  )}
                >
                  <span className="text-2xl mb-1">{opt.emoji}</span>
                  <span className="text-xs font-bold">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── 是否加入複習計畫 ── */}
          <div className="space-y-2.5">
            <Label className="text-base font-bold text-foreground ml-1">是否加入複習計畫</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIncludeReview(true)}
                className={cn(
                  "flex flex-col items-center justify-center py-3.5 px-3 rounded-2xl border-[3px] transition-all active:scale-95 text-center",
                  includeReview
                    ? "border-emerald-400 bg-emerald-50 text-emerald-700 shadow-sm scale-105"
                    : "bg-card border-border/50 hover:bg-muted text-foreground"
                )}
              >
                <CalendarCheck className={cn("w-6 h-6 mb-1", includeReview ? "text-emerald-500" : "text-muted-foreground")} />
                <span className="text-xs font-bold leading-snug">加入複習計畫</span>
                <span className="text-[10px] text-muted-foreground mt-0.5 leading-snug">自動安排 8 次複習</span>
              </button>
              <button
                type="button"
                onClick={() => setIncludeReview(false)}
                className={cn(
                  "flex flex-col items-center justify-center py-3.5 px-3 rounded-2xl border-[3px] transition-all active:scale-95 text-center",
                  !includeReview
                    ? "border-amber-400 bg-amber-50 text-amber-700 shadow-sm scale-105"
                    : "bg-card border-border/50 hover:bg-muted text-foreground"
                )}
              >
                <BookOpenCheck className={cn("w-6 h-6 mb-1", !includeReview ? "text-amber-500" : "text-muted-foreground")} />
                <span className="text-xs font-bold leading-snug">不需加入複習</span>
                <span className="text-[10px] text-muted-foreground mt-0.5 leading-snug">只記錄當天學習</span>
              </button>
            </div>
            <p className={cn(
              "text-xs font-medium ml-1 px-3 py-2 rounded-xl",
              includeReview ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
            )}>
              {includeReview
                ? "從隔天起自動安排複習，所有複習統一改為 📝 測驗題"
                : "適合閱讀小書、影片欣賞等一次性學習，當天完成即結束"}
            </p>
          </div>

          {/* ── 學習日期（模式切換） ── */}
          <div className="space-y-3">
            <Label className="text-base font-bold text-foreground ml-1">學習日期</Label>

            {/* Mode toggle */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDateMode("single")}
                className={cn(
                  "flex items-center justify-center gap-2 py-2.5 rounded-2xl border-[3px] transition-all active:scale-95 text-sm font-bold",
                  dateMode === "single"
                    ? "border-primary bg-primary/10 text-primary scale-105 shadow-sm"
                    : "bg-card border-border/50 hover:bg-muted text-muted-foreground"
                )}
              >
                <Calendar className="w-4 h-4" />
                單日
              </button>
              <button
                type="button"
                onClick={() => setDateMode("range")}
                className={cn(
                  "flex items-center justify-center gap-2 py-2.5 rounded-2xl border-[3px] transition-all active:scale-95 text-sm font-bold",
                  dateMode === "range"
                    ? "border-primary bg-primary/10 text-primary scale-105 shadow-sm"
                    : "bg-card border-border/50 hover:bg-muted text-muted-foreground"
                )}
              >
                <CalendarRange className="w-4 h-4" />
                日期範圍
              </button>
            </div>

            {/* Single mode */}
            {dateMode === "single" && (
              <div className="space-y-2">
                <div className="bg-card border-2 border-border/50 rounded-2xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all">
                  <Input
                    type="date"
                    value={singleDate}
                    onChange={e => setSingleDate(e.target.value)}
                    className="h-11 w-full px-3 text-base font-bold border-none bg-transparent focus-visible:ring-0 shadow-none"
                    required
                  />
                </div>
                {singleExcluded && (
                  <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                    <CalendarX2 className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                    <span>
                      <span className="font-bold">排除日提醒：</span>
                      {singleExcluded.note || "此日期位於排除日區間"}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Range mode */}
            {dateMode === "range" && (
              <div className="space-y-4 bg-card border-2 border-border/50 rounded-2xl p-4 shadow-sm">

                {/* Start / End date */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-muted-foreground ml-1">開始日期</p>
                    <Input
                      type="date"
                      value={rangeStart}
                      onChange={e => {
                        setRangeStart(e.target.value);
                        if (rangeEnd && e.target.value > rangeEnd) setRangeEnd(e.target.value);
                      }}
                      className="h-11 text-sm font-bold rounded-xl border-2 border-border/50 focus-visible:ring-primary"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-muted-foreground ml-1">結束日期</p>
                    <Input
                      type="date"
                      value={rangeEnd}
                      min={rangeStart}
                      onChange={e => setRangeEnd(e.target.value)}
                      className="h-11 text-sm font-bold rounded-xl border-2 border-border/50 focus-visible:ring-primary"
                    />
                  </div>
                </div>

                {/* Frequency */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-muted-foreground ml-1">排程頻率</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(["daily", "weekdays", "custom"] as Frequency[]).map(f => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFrequency(f)}
                        className={cn(
                          "py-2 text-xs font-bold rounded-xl border-2 transition-all",
                          frequency === f
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {f === "daily" ? "每天" : f === "weekdays" ? "週一至週五" : "自訂星期"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom weekday picker */}
                {frequency === "custom" && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-muted-foreground ml-1">選擇星期</p>
                    <div className="flex gap-2 flex-wrap">
                      {[0, 1, 2, 3, 4, 5, 6].map(dow => (
                        <button
                          key={dow}
                          type="button"
                          onClick={() => setCustomDays(prev =>
                            prev.includes(dow) ? prev.filter(d => d !== dow) : [...prev, dow].sort()
                          )}
                          className={cn(
                            "w-10 h-10 rounded-xl text-xs font-bold border-2 transition-all",
                            customDays.includes(dow)
                              ? "border-primary bg-primary text-primary-foreground shadow-sm"
                              : "border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted"
                          )}
                        >
                          週{WEEKDAY_LABELS[dow]}
                        </button>
                      ))}
                    </div>
                    {customDays.length === 0 && (
                      <p className="text-xs text-rose-500 font-medium ml-1">請至少選擇一個星期</p>
                    )}
                  </div>
                )}

                {/* Preview count */}
                {previewCount > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-primary/5 border border-primary/20 rounded-xl">
                    <CalendarRange className="w-4 h-4 text-primary shrink-0" />
                    <p className="text-xs font-bold text-primary">
                      共將建立 <span className="text-base">{previewCount}</span> 筆讀書計畫
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── 時段 ── */}
          <div className="space-y-2.5">
            <Label className="text-base font-bold text-foreground ml-1">時段</Label>
            <div className="grid grid-cols-4 gap-2">
              {TIME_SLOT_ORDER.map(slot => {
                const opt = TIME_SLOT_LABELS[slot];
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setTimeSlot(slot)}
                    className={cn(
                      "flex flex-col items-center justify-center py-3 rounded-2xl border-[3px] transition-all active:scale-95",
                      timeSlot === slot
                        ? "border-sky-400 bg-sky-50 text-sky-700 shadow-sm scale-105"
                        : "bg-card border-border/50 hover:bg-muted text-foreground"
                    )}
                  >
                    <span className="text-xl mb-1">{opt.emoji}</span>
                    <span className="text-[11px] font-bold leading-tight text-center">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Submit ── */}
          <div className="pt-2 pb-6">
            <Button
              type="submit"
              className={cn(
                "w-full h-14 text-lg rounded-full font-bold shadow-xl transition-all",
                isSubmitting ? "bg-green-500 scale-95" : ""
              )}
              disabled={!isFormValid || isSubmitting}
            >
              {isSubmitting ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6" /> 建立計畫成功！
                </motion.div>
              ) : (
                dateMode === "range" && previewCount > 0
                  ? `建立 ${previewCount} 筆讀書計畫！`
                  : "開始計畫！"
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* ── Excluded days warning (range mode: 3 options; single: 2 options) ── */}
      <Dialog open={!!excludedDialog} onOpenChange={open => !open && setExcludedDialog(null)}>
        <DialogContent className="rounded-3xl border-none shadow-2xl w-[92%] sm:max-w-md mx-auto p-6">
          <DialogHeader>
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
                <CalendarX2 className="w-6 h-6 text-amber-500" />
              </div>
            </div>
            <DialogTitle className="text-xl font-bold text-center">排除日提醒</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-center text-muted-foreground mb-4">
            {dateMode === "range"
              ? "此日期範圍包含以下排除日："
              : "此日期位於排除日區間："}
          </div>
          {excludedDialog && (
            <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
              {excludedDialog.hitPeriods.map(p => (
                <div key={p.id} className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5 text-sm">
                  <span className="font-bold text-amber-700">
                    {p.startDate === p.endDate ? p.startDate : `${p.startDate} ～ ${p.endDate}`}
                  </span>
                  {p.note && <span className="text-muted-foreground ml-2">（{p.note}）</span>}
                </div>
              ))}
            </div>
          )}
          {dateMode === "range" && (
            <p className="text-xs text-muted-foreground text-center mb-4">是否仍要新增這些日期的讀書計畫？</p>
          )}
          {dateMode === "single" && (
            <p className="text-xs text-muted-foreground text-center mb-4">是否仍要新增讀書計畫？</p>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            {dateMode === "range" ? (
              <>
                <Button
                  className="w-full h-12 rounded-2xl font-bold"
                  onClick={() => {
                    if (!excludedDialog) return;
                    const skipped = excludedDialog.allDates.filter(d => isDateExcluded(d, excludedPeriods)).length;
                    const filtered = excludedDialog.allDates.filter(d => !isDateExcluded(d, excludedPeriods));
                    setExcludedDialog(null);
                    checkDuplicates(filtered, skipped);
                  }}
                >
                  略過排除日
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-12 rounded-2xl font-bold border-2"
                  onClick={() => {
                    if (!excludedDialog) return;
                    const all = excludedDialog.allDates;
                    setExcludedDialog(null);
                    checkDuplicates(all, 0);
                  }}
                >
                  仍要全部新增
                </Button>
                <Button
                  variant="ghost"
                  className="w-full h-11 rounded-2xl font-bold text-muted-foreground"
                  onClick={() => setExcludedDialog(null)}
                >
                  取消
                </Button>
              </>
            ) : (
              <>
                <Button
                  className="w-full h-12 rounded-2xl font-bold"
                  onClick={() => {
                    if (!excludedDialog) return;
                    const all = excludedDialog.allDates;
                    setExcludedDialog(null);
                    checkDuplicates(all, 0);
                  }}
                >
                  仍要新增
                </Button>
                <Button
                  variant="ghost"
                  className="w-full h-11 rounded-2xl font-bold text-muted-foreground"
                  onClick={() => setExcludedDialog(null)}
                >
                  取消
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Duplicate warning ── */}
      <AlertDialog open={!!duplicateDialog} onOpenChange={open => !open && setDuplicateDialog(null)}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl w-[90%] sm:max-w-md mx-auto p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-center">已有相同讀書計畫</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm mt-2">
              {duplicateDialog && (
                <span className="block bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mt-3 text-foreground font-medium text-sm">
                  這段期間內已有 <span className="font-bold text-amber-700">{duplicateDialog.dupCount}</span> 筆相同讀書計畫，是否仍要新增？
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col mt-3">
            <AlertDialogAction
              onClick={() => {
                if (!duplicateDialog) return;
                const { finalDates, skippedExcluded } = duplicateDialog;
                setDuplicateDialog(null);
                doSubmit(finalDates, skippedExcluded);
              }}
              className="w-full h-12 rounded-2xl font-bold bg-primary hover:bg-primary/90"
            >
              仍要新增
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

import { useState } from "react";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { CheckCircle2, CalendarCheck, BookOpenCheck, CalendarX2 } from "lucide-react";
import { Layout } from "@/components/layout";
import { useData, LearningType, ExcludedPeriod } from "@/hooks/use-data";
import { generateReviewDates } from "@/lib/spaced-repetition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const LEARNING_TYPE_OPTIONS: { value: LearningType; emoji: string; label: string }[] = [
  { value: "video",   emoji: "🎬", label: "看影片" },
  { value: "quiz",    emoji: "📝", label: "測驗題" },
  { value: "reading", emoji: "📖", label: "閱讀"   },
];

function findMatchedExclusion(date: string, excludedPeriods: ExcludedPeriod[]): ExcludedPeriod | null {
  return excludedPeriods.find(p => date >= p.startDate && date <= p.endDate) ?? null;
}

export default function AddLearning() {
  const { subjects, sessions, saveSessions, excludedPeriods, isLoaded } = useData();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [scope, setScope] = useState("");
  const [learningType, setLearningType] = useState<LearningType>("reading");
  const [firstDate, setFirstDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [includeReview, setIncludeReview] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [warningPeriod, setWarningPeriod] = useState<ExcludedPeriod | null>(null);

  const doSubmit = () => {
    setIsSubmitting(true);
    const newSession = {
      id: Math.random().toString(36).substring(7),
      subjectId: selectedSubject,
      scope: scope.trim(),
      firstDate,
      learningType,
      reviewDates: includeReview ? generateReviewDates(firstDate) : [],
      completedDates: [],
      records: [],
    };
    saveSessions([...sessions, newSession]);
    toast({
      title: "太棒了！ 🎉",
      description: includeReview ? "已經幫你安排好複習計畫囉！" : "已加入今日讀書計畫！",
      className: "bg-green-500 text-white border-none rounded-2xl",
    });
    setTimeout(() => setLocation("/"), 800);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject || !scope.trim() || !firstDate) return;

    const matched = findMatchedExclusion(firstDate, excludedPeriods);
    if (matched) {
      setWarningPeriod(matched);
      return;
    }
    doSubmit();
  };

  if (!isLoaded) return null;

  return (
    <Layout>
      <div className="p-6 pb-24 h-full flex flex-col">
        <header className="mb-6 pt-4">
          <h1 className="text-3xl font-bold text-foreground">新增讀書計畫</h1>
          <p className="text-muted-foreground mt-1 font-medium">今天學到了什麼新知識呢？</p>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-6">

          {/* 科目 */}
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

          {/* 學習範圍 */}
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

          {/* 學習類型 */}
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

          {/* 是否加入複習計畫 */}
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

          {/* 日期 */}
          <div className="space-y-2.5">
            <Label className="text-base font-bold text-foreground ml-1">學習日期</Label>
            <div className="bg-card border-2 border-border/50 rounded-2xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all">
              <Input
                type="date"
                value={firstDate}
                onChange={e => setFirstDate(e.target.value)}
                className="h-11 w-full px-3 text-base font-bold border-none bg-transparent focus-visible:ring-0 shadow-none"
                required
              />
            </div>
            {/* Show exclusion hint if date is in excluded period */}
            {firstDate && findMatchedExclusion(firstDate, excludedPeriods) && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                <CalendarX2 className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                <span>
                  <span className="font-bold">排除日提醒：</span>
                  {findMatchedExclusion(firstDate, excludedPeriods)?.note || "此日期位於排除日區間"}
                </span>
              </div>
            )}
          </div>

          <div className="mt-auto pt-2">
            <Button
              type="submit"
              className={cn(
                "w-full h-14 text-lg rounded-full font-bold shadow-xl transition-all",
                isSubmitting ? "bg-green-500 scale-95" : ""
              )}
              disabled={!selectedSubject || !scope.trim() || !firstDate || isSubmitting}
            >
              {isSubmitting ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6" /> 建立計畫成功！
                </motion.div>
              ) : (
                "開始計畫！"
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Exclusion warning dialog */}
      <AlertDialog open={!!warningPeriod} onOpenChange={open => !open && setWarningPeriod(null)}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl w-[90%] sm:max-w-md mx-auto p-6">
          <AlertDialogHeader>
            <div className="flex justify-center mb-2">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
                <CalendarX2 className="w-6 h-6 text-amber-500" />
              </div>
            </div>
            <AlertDialogTitle className="text-xl font-bold text-center">排除日提醒</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm mt-2 space-y-2">
              <span className="block">此日期位於排除日區間：</span>
              {warningPeriod && (
                <span className="block bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm text-foreground font-medium">
                  <span className="block font-bold text-amber-700">
                    {warningPeriod.startDate} ～ {warningPeriod.endDate}
                  </span>
                  {warningPeriod.note && (
                    <span className="block text-muted-foreground mt-1">備註：{warningPeriod.note}</span>
                  )}
                </span>
              )}
              <span className="block text-muted-foreground">是否仍要新增讀書計畫？</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col mt-3">
            <AlertDialogAction
              onClick={() => { setWarningPeriod(null); doSubmit(); }}
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

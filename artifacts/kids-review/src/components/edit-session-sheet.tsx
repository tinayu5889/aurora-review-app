import { useState, useEffect } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Trash2, ChevronDown, ChevronUp, Check } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ReviewSession, Subject, ReviewRecord } from "@/hooks/use-data";
import { generateReviewDates } from "@/lib/spaced-repetition";

type Difficulty = "easy" | "normal" | "hard";

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; emoji: string }[] = [
  { value: "easy", label: "很簡單", emoji: "😄" },
  { value: "normal", label: "普通", emoji: "😊" },
  { value: "hard", label: "很難", emoji: "😤" },
];

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} onClick={() => onChange(n)} className="transition-transform active:scale-90">
          <Star className={cn("w-6 h-6", n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
        </button>
      ))}
    </div>
  );
}

type EditState = {
  subjectId: string;
  scope: string;
  firstDate: string;
  reviewDates: string[];
  completedDates: string[];
  records: ReviewRecord[];
};

function buildEditState(session: ReviewSession): EditState {
  return {
    subjectId: session.subjectId,
    scope: session.scope,
    firstDate: session.firstDate,
    reviewDates: [...session.reviewDates],
    completedDates: [...session.completedDates],
    records: (session.records || []).map(r => ({ ...r })),
  };
}

interface EditSessionSheetProps {
  session: ReviewSession | null;
  subjects: Subject[];
  open: boolean;
  onClose: () => void;
  onSave: (updated: ReviewSession) => void;
  onDelete: (sessionId: string) => void;
}

export function EditSessionSheet({ session, subjects, open, onClose, onSave, onDelete }: EditSessionSheetProps) {
  const [state, setState] = useState<EditState | null>(null);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (session && open) {
      setState(buildEditState(session));
      setExpandedDate(null);
    }
  }, [session, open]);

  if (!state || !session) return null;

  const handleFirstDateChange = (newDate: string) => {
    const newReviewDates = generateReviewDates(newDate);
    // Re-map completedDates: keep completed status by index position
    const prevCompleted = state.reviewDates.map(d => state.completedDates.includes(d));
    const newCompleted = newReviewDates.filter((_, i) => prevCompleted[i] ?? false);
    // Re-map records by index
    const newRecords = state.records.map((rec, i) => ({
      ...rec,
      date: newReviewDates[i] ?? rec.date,
    }));
    setState(s => s ? { ...s, firstDate: newDate, reviewDates: newReviewDates, completedDates: newCompleted, records: newRecords } : s);
  };

  const toggleCompleted = (dateStr: string) => {
    setState(s => {
      if (!s) return s;
      const isCompleted = s.completedDates.includes(dateStr);
      if (isCompleted) {
        return {
          ...s,
          completedDates: s.completedDates.filter(d => d !== dateStr),
        };
      } else {
        return {
          ...s,
          completedDates: [...s.completedDates, dateStr],
        };
      }
    });
  };

  const updateRecord = (dateStr: string, patch: Partial<ReviewRecord>) => {
    setState(s => {
      if (!s) return s;
      const existing = s.records.find(r => r.date === dateStr);
      if (existing) {
        return {
          ...s,
          records: s.records.map(r => r.date === dateStr ? { ...r, ...patch } : r),
        };
      } else {
        const newRecord: ReviewRecord = {
          date: dateStr,
          difficulty: "normal",
          understanding: 3,
          notes: "",
          completedAt: new Date().toISOString(),
          ...patch,
        };
        return { ...s, records: [...s.records, newRecord] };
      }
    });
  };

  const handleSave = () => {
    if (!state.subjectId || !state.scope.trim() || !state.firstDate) return;
    onSave({
      ...session,
      subjectId: state.subjectId,
      scope: state.scope.trim(),
      firstDate: state.firstDate,
      reviewDates: state.reviewDates,
      completedDates: state.completedDates,
      records: state.records,
    });
    onClose();
  };

  const today = format(new Date(), "yyyy-MM-dd");
  const isValid = !!state.subjectId && !!state.scope.trim() && !!state.firstDate;

  return (
    <>
      <Sheet open={open} onOpenChange={v => !v && onClose()}>
        <SheetContent
          side="bottom"
          className="rounded-t-[32px] pb-10 px-0 sm:max-w-md sm:mx-auto border-none shadow-2xl max-h-[92vh] overflow-y-auto"
        >
          <div className="px-6">
            <SheetHeader className="mb-5 mt-2">
              <div className="w-10 h-1.5 bg-muted rounded-full mx-auto mb-4" />
              <SheetTitle className="text-2xl font-bold text-center">編輯學習計畫</SheetTitle>
            </SheetHeader>

            {/* Subject picker */}
            <section className="mb-5">
              <p className="text-sm font-bold text-muted-foreground mb-3">選擇科目</p>
              <div className="grid grid-cols-3 gap-2">
                {subjects.map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setState(s => s ? { ...s, subjectId: sub.id } : s)}
                    className={cn(
                      "flex flex-col items-center justify-center py-3 px-2 rounded-2xl border-[3px] transition-all active:scale-95",
                      state.subjectId === sub.id
                        ? cn(sub.color, "border-transparent text-white shadow-md scale-105")
                        : "bg-card border-border/50 text-foreground"
                    )}
                    data-testid={`edit-subject-${sub.id}`}
                  >
                    <span className="text-2xl mb-1">{sub.emoji}</span>
                    <span className="text-xs font-bold truncate w-full text-center">{sub.name}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Scope */}
            <section className="mb-5">
              <p className="text-sm font-bold text-muted-foreground mb-2">學習範圍</p>
              <Input
                value={state.scope}
                onChange={e => setState(s => s ? { ...s, scope: e.target.value } : s)}
                placeholder="例如：第一課 乘法、自然筆記..."
                className="h-12 rounded-2xl border-2 border-border/50 focus-visible:ring-primary text-base font-medium"
                data-testid="edit-input-scope"
              />
            </section>

            {/* First date */}
            <section className="mb-5">
              <p className="text-sm font-bold text-muted-foreground mb-2">第一次學習日期</p>
              <Input
                type="date"
                value={state.firstDate}
                onChange={e => handleFirstDateChange(e.target.value)}
                className="h-12 rounded-2xl border-2 border-border/50 focus-visible:ring-primary text-base font-medium"
                data-testid="edit-input-first-date"
              />
              <p className="text-xs text-amber-600 font-medium mt-1.5 bg-amber-50 px-3 py-1.5 rounded-xl">
                修改日期後，系統會重新計算所有複習日期
              </p>
            </section>
          </div>

          {/* Review dates list */}
          <div className="px-6 mb-5">
            <p className="text-sm font-bold text-muted-foreground mb-3">複習日程與完成狀態</p>
            <div className="space-y-2">
              {state.reviewDates.map((dateStr, i) => {
                const isDone = state.completedDates.includes(dateStr);
                const record = state.records.find(r => r.date === dateStr);
                const isOverdue = !isDone && dateStr < today;
                const isExpanded = expandedDate === dateStr;

                return (
                  <div
                    key={dateStr}
                    className={cn(
                      "rounded-2xl border-2 overflow-hidden transition-colors",
                      isDone ? "border-green-400/40 bg-green-50/50" : isOverdue ? "border-red-300/50 bg-red-50/30" : "border-border/50 bg-card"
                    )}
                  >
                    <div className="flex items-center gap-3 p-3">
                      <button
                        onClick={() => toggleCompleted(dateStr)}
                        className={cn(
                          "w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all active:scale-90",
                          isDone ? "bg-green-500 border-green-500 text-white" : "border-muted-foreground/30 hover:border-primary"
                        )}
                        data-testid={`toggle-complete-${i}`}
                      >
                        {isDone && <Check className="w-4 h-4" strokeWidth={3} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn("text-xs font-bold", isDone ? "text-green-700" : isOverdue ? "text-red-600" : "text-muted-foreground")}>
                            第 {i + 1} 次
                          </span>
                          <span className={cn("text-sm font-bold", isDone ? "line-through text-muted-foreground" : "text-foreground")}>
                            {dateStr}
                          </span>
                          {isOverdue && <span className="text-[10px] font-bold text-red-500 bg-red-100 px-1.5 py-0.5 rounded-full">逾期</span>}
                        </div>
                        {isDone && record && (
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">{DIFFICULTY_OPTIONS.find(d => d.value === record.difficulty)?.label ?? ""}</span>
                            <div className="flex gap-0.5">
                              {[1,2,3,4,5].map(n => (
                                <Star key={n} className={cn("w-2.5 h-2.5", n <= record.understanding ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20")} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      {isDone && (
                        <button
                          onClick={() => setExpandedDate(isExpanded ? null : dateStr)}
                          className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0"
                          data-testid={`expand-record-${i}`}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </button>
                      )}
                    </div>

                    <AnimatePresence>
                      {isDone && isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 pb-3 pt-1 border-t border-border/30 space-y-3">
                            <div>
                              <p className="text-xs font-bold text-muted-foreground mb-2">學習效果</p>
                              <div className="flex gap-2">
                                {DIFFICULTY_OPTIONS.map(opt => (
                                  <button
                                    key={opt.value}
                                    onClick={() => updateRecord(dateStr, { difficulty: opt.value })}
                                    className={cn(
                                      "flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border-2 text-xs font-bold transition-all active:scale-95",
                                      record?.difficulty === opt.value
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-border/50 text-muted-foreground hover:bg-muted"
                                    )}
                                  >
                                    <span className="text-base">{opt.emoji}</span>
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-muted-foreground mb-2">理解程度</p>
                              <StarPicker
                                value={record?.understanding ?? 3}
                                onChange={v => updateRecord(dateStr, { understanding: v })}
                              />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-muted-foreground mb-2">備註</p>
                              <Textarea
                                value={record?.notes ?? ""}
                                onChange={e => updateRecord(dateStr, { notes: e.target.value })}
                                placeholder="記錄重點、疑問或心得…"
                                className="rounded-xl border-2 border-border/50 focus-visible:ring-primary resize-none text-sm"
                                rows={2}
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="px-6 space-y-3">
            <Button
              onClick={handleSave}
              disabled={!isValid}
              className="w-full h-14 text-lg rounded-full font-bold shadow-lg"
              data-testid="button-save-edit"
            >
              儲存變更
            </Button>
            <Button
              variant="ghost"
              className="w-full h-12 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-full font-bold"
              onClick={() => setShowDeleteConfirm(true)}
              data-testid="button-delete-session"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              刪除這個學習計畫
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="rounded-3xl mx-4 border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-center">確定要刪除嗎？</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base leading-relaxed">
              確定要刪除「{session.scope}」這個學習計畫嗎？刪除後無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col mt-2">
            <AlertDialogAction
              className="w-full h-12 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold"
              onClick={() => { onDelete(session.id); setShowDeleteConfirm(false); onClose(); }}
              data-testid="button-confirm-delete"
            >
              確定刪除
            </AlertDialogAction>
            <AlertDialogCancel className="w-full h-12 rounded-2xl font-bold border-none bg-muted hover:bg-muted/80 mt-0">
              取消
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

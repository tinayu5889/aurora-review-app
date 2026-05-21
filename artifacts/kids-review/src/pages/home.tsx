import { useState, useMemo } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Star, ChevronRight, FileText, Pencil } from "lucide-react";
import { Layout } from "@/components/layout";
import { useData, ReviewRecord, ReviewSession } from "@/hooks/use-data";
import { adjustNextDate } from "@/lib/spaced-repetition";
import { EditSessionSheet } from "@/components/edit-session-sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type DueItem = {
  sessionId: string;
  subject: { id: string; name: string; color: string; emoji: string } | undefined;
  scope: string;
  round: number;
  date: string;
  reviewDateIndex: number;
};

type Difficulty = "easy" | "normal" | "hard";

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; emoji: string; color: string }[] = [
  { value: "easy", label: "很簡單", emoji: "😄", color: "bg-green-100 border-green-400 text-green-700" },
  { value: "normal", label: "普通", emoji: "😊", color: "bg-amber-100 border-amber-400 text-amber-700" },
  { value: "hard", label: "很難", emoji: "😤", color: "bg-red-100 border-red-400 text-red-700" },
];

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-2 justify-center">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} onClick={() => onChange(n)} className="transition-transform active:scale-90" data-testid={`star-${n}`}>
          <Star className={cn("w-10 h-10 transition-colors", n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
        </button>
      ))}
    </div>
  );
}

function RecordSheet({
  item, open, onClose, onSave,
}: {
  item: DueItem | null;
  open: boolean;
  onClose: () => void;
  onSave: (difficulty: Difficulty, understanding: number, notes: string) => void;
}) {
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [understanding, setUnderstanding] = useState(3);
  const [notes, setNotes] = useState("");

  const handleSave = () => {
    onSave(difficulty, understanding, notes);
    setDifficulty("normal");
    setUnderstanding(3);
    setNotes("");
  };

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-[32px] pb-10 px-6 sm:max-w-md sm:mx-auto border-none shadow-2xl max-h-[90vh] overflow-y-auto">
        <SheetHeader className="mb-6 mt-2">
          <div className="w-10 h-1.5 bg-muted rounded-full mx-auto mb-4" />
          <SheetTitle className="text-2xl font-bold text-center">複習完成！記錄一下吧</SheetTitle>
          {item && (
            <p className="text-center text-muted-foreground font-medium text-sm mt-1">
              {item.subject?.emoji} {item.scope} · 第 {item.round} 次
            </p>
          )}
        </SheetHeader>

        <div className="space-y-6">
          <div>
            <p className="text-sm font-bold text-muted-foreground mb-3 text-center">這次的學習效果如何？</p>
            <div className="flex gap-3">
              {DIFFICULTY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setDifficulty(opt.value)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-2 py-4 rounded-3xl border-2 transition-all active:scale-95 font-bold text-sm",
                    difficulty === opt.value ? cn(opt.color, "scale-105 shadow-md") : "border-border/50 bg-card text-muted-foreground hover:bg-muted"
                  )}
                  data-testid={`difficulty-${opt.value}`}
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  {opt.label}
                </button>
              ))}
            </div>
            {difficulty === "hard" && (
              <motion.p
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-red-500 font-bold text-center mt-3 bg-red-50 py-2 px-4 rounded-2xl"
              >
                系統會自動縮短下一次複習間隔，加油！
              </motion.p>
            )}
          </div>

          <div>
            <p className="text-sm font-bold text-muted-foreground mb-3 text-center">理解程度（1～5 分）</p>
            <StarRating value={understanding} onChange={setUnderstanding} />
            <p className="text-center text-xs text-muted-foreground mt-2 font-medium">
              {["", "還要再加油", "有一點懂", "大概了解", "懂得不少", "完全理解！"][understanding]}
            </p>
          </div>

          <div>
            <p className="text-sm font-bold text-muted-foreground mb-2">備註（選填）</p>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="記錄重點、疑問或心得…"
              className="rounded-2xl border-2 border-border/50 focus-visible:ring-primary resize-none text-base"
              rows={3}
              data-testid="input-notes"
            />
          </div>

          <Button onClick={handleSave} className="w-full h-14 text-lg rounded-full font-bold shadow-lg" data-testid="button-save-record">
            <Check className="w-5 h-5 mr-2" strokeWidth={3} />
            完成！
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailSheet({
  item, open, onClose, records, onEditClick,
}: {
  item: DueItem | null;
  open: boolean;
  onClose: () => void;
  records: ReviewRecord[];
  onEditClick: () => void;
}) {
  if (!item) return null;

  const difficultyMap: Record<Difficulty, { label: string; color: string }> = {
    easy: { label: "很簡單", color: "text-green-600 bg-green-100" },
    normal: { label: "普通", color: "text-amber-600 bg-amber-100" },
    hard: { label: "很難", color: "text-red-600 bg-red-100" },
  };

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-[32px] pb-10 px-6 sm:max-w-md sm:mx-auto border-none shadow-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader className="mb-4 mt-2">
          <div className="w-10 h-1.5 bg-muted rounded-full mx-auto mb-4" />
          <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-2", item.subject?.color || "bg-muted")}>
            {item.subject?.emoji}
          </div>
          <SheetTitle className="text-xl font-bold text-center">{item.scope}</SheetTitle>
          <p className="text-center text-muted-foreground font-medium text-sm">{item.subject?.name}</p>
        </SheetHeader>

        <div className="space-y-3">
          {records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground font-medium">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>還沒有複習紀錄</p>
            </div>
          ) : (
            records.map((rec, i) => {
              const diff = difficultyMap[rec.difficulty as Difficulty] ?? difficultyMap.normal;
              return (
                <motion.div
                  key={rec.date + i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card border-2 border-border/50 rounded-3xl p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground">第 {i + 1} 次複習 · {rec.date}</span>
                    <span className={cn("text-xs font-bold px-2 py-1 rounded-full", diff.color)}>{diff.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <Star key={n} className={cn("w-4 h-4", n <= rec.understanding ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20")} />
                    ))}
                    <span className="text-xs text-muted-foreground ml-1">{rec.understanding} 分</span>
                  </div>
                  {rec.notes && (
                    <p className="text-sm text-muted-foreground bg-muted/50 rounded-2xl px-3 py-2">{rec.notes}</p>
                  )}
                </motion.div>
              );
            })
          )}
        </div>

        {/* Edit button */}
        <Button
          variant="outline"
          className="w-full mt-5 h-12 rounded-2xl font-bold border-2 border-primary/30 text-primary hover:bg-primary/5"
          onClick={() => { onClose(); setTimeout(onEditClick, 150); }}
          data-testid="button-open-edit-from-detail"
        >
          <Pencil className="w-4 h-4 mr-2" />
          編輯 / 刪除此計畫
        </Button>
      </SheetContent>
    </Sheet>
  );
}

export default function Home() {
  const { subjects, sessions, saveSessions, isLoaded } = useData();
  const [pendingItem, setPendingItem] = useState<DueItem | null>(null);
  const [detailItem, setDetailItem] = useState<DueItem | null>(null);
  const [editingSession, setEditingSession] = useState<ReviewSession | null>(null);
  const [animatingIds, setAnimatingIds] = useState<string[]>([]);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const dueItems = useMemo<DueItem[]>(() => {
    if (!isLoaded) return [];
    return sessions.flatMap(session => {
      const dueIndex = session.reviewDates.findIndex(date => date === todayStr);
      if (dueIndex !== -1 && !session.completedDates.includes(todayStr)) {
        const subject = subjects.find(s => s.id === session.subjectId);
        return [{
          sessionId: session.id,
          subject,
          scope: session.scope,
          round: dueIndex + 1,
          date: todayStr,
          reviewDateIndex: dueIndex,
        }];
      }
      return [];
    }).filter(item => !animatingIds.includes(`${item.sessionId}-${item.date}`));
  }, [sessions, subjects, todayStr, isLoaded, animatingIds]);

  const handleCompleteClick = (item: DueItem) => setPendingItem(item);

  const handleSaveRecord = (difficulty: Difficulty, understanding: number, notes: string) => {
    if (!pendingItem) return;
    const { sessionId, date, reviewDateIndex } = pendingItem;

    setAnimatingIds(prev => [...prev, `${sessionId}-${date}`]);
    setPendingItem(null);

    setTimeout(() => {
      const newRecord: ReviewRecord = {
        date, difficulty, understanding, notes, completedAt: new Date().toISOString(),
      };
      const updatedSessions = sessions.map(s => {
        if (s.id !== sessionId) return s;
        const newReviewDates = adjustNextDate(s.reviewDates, reviewDateIndex, difficulty);
        return {
          ...s,
          reviewDates: newReviewDates,
          completedDates: [...s.completedDates, date],
          records: [...(s.records || []), newRecord],
        };
      });
      saveSessions(updatedSessions);
      setAnimatingIds(prev => prev.filter(id => id !== `${sessionId}-${date}`));
    }, 400);
  };

  const handleEditSave = (updated: ReviewSession) => {
    saveSessions(sessions.map(s => s.id === updated.id ? updated : s));
    setEditingSession(null);
  };

  const handleDelete = (sessionId: string) => {
    saveSessions(sessions.filter(s => s.id !== sessionId));
    setEditingSession(null);
    setDetailItem(null);
  };

  const getSessionForItem = (item: DueItem | null) =>
    item ? sessions.find(s => s.id === item.sessionId) ?? null : null;

  const getSessionRecords = (sessionId: string) =>
    sessions.find(s => s.id === sessionId)?.records ?? [];

  return (
    <Layout>
      <div className="p-6 pb-24 flex flex-col">
        <header className="mb-6 pt-4">
          <h1 className="text-3xl font-bold text-foreground">今日複習</h1>
          <p className="text-muted-foreground mt-1 font-medium">
            {!isLoaded ? "" : dueItems.length > 0 ? `還有 ${dueItems.length} 個任務等著你！` : "做得好！"}
          </p>
        </header>

        {!isLoaded ? null : dueItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center text-center pb-20"
          >
            <div className="w-40 h-40 bg-accent/30 rounded-[40px] rotate-12 flex items-center justify-center mb-8 shadow-sm">
              <span className="text-6xl -rotate-12 drop-shadow-md">🎉</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">今天全部完成了！</h2>
            <p className="text-muted-foreground font-medium">你太棒了，好好休息吧！</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {dueItems.map((item, index) => (
                <motion.div
                  key={`${item.sessionId}-${item.date}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -120, transition: { duration: 0.35 } }}
                  transition={{ delay: index * 0.08 }}
                >
                  <Card
                    className="p-4 flex items-center gap-4 relative overflow-hidden border-2 border-border/50 hover:border-primary/20 transition-colors shadow-sm rounded-3xl cursor-pointer active:scale-[0.98]"
                    onClick={() => setDetailItem(item)}
                    data-testid={`card-due-${item.sessionId}`}
                  >
                    <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0 shadow-inner", item.subject?.color || "bg-muted")}>
                      {item.subject?.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-muted text-muted-foreground truncate max-w-[80px]">
                          {item.subject?.name}
                        </span>
                        <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">
                          第 {item.round} 次複習
                        </span>
                      </div>
                      <h3 className="text-lg font-bold truncate text-foreground">{item.scope}</h3>
                      <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                        <ChevronRight className="w-3 h-3" />
                        <span className="text-[10px] font-medium">點查看歷史紀錄與編輯</span>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      className="w-14 h-14 rounded-full shrink-0 shadow-md bg-primary hover:bg-primary/90 transition-all duration-300"
                      onClick={e => { e.stopPropagation(); handleCompleteClick(item); }}
                      data-testid={`button-complete-${item.sessionId}`}
                    >
                      <Check className="w-7 h-7 text-white" strokeWidth={4} />
                    </Button>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <RecordSheet
        item={pendingItem}
        open={!!pendingItem}
        onClose={() => setPendingItem(null)}
        onSave={handleSaveRecord}
      />

      <DetailSheet
        item={detailItem}
        open={!!detailItem}
        onClose={() => setDetailItem(null)}
        records={detailItem ? getSessionRecords(detailItem.sessionId) : []}
        onEditClick={() => setEditingSession(getSessionForItem(detailItem))}
      />

      <EditSessionSheet
        session={editingSession}
        subjects={subjects}
        open={!!editingSession}
        onClose={() => setEditingSession(null)}
        onSave={handleEditSave}
        onDelete={handleDelete}
      />
    </Layout>
  );
}

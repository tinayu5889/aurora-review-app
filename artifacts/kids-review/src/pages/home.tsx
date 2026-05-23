import { useState, useMemo } from "react";
import { format, differenceInCalendarDays, startOfWeek, endOfWeek, isWithinInterval, parseISO } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Star, ChevronRight, FileText, Pencil, Clock, ArrowLeft, TrendingUp, CalendarCheck, AlertCircle } from "lucide-react";
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
  isOverdue: boolean;
  overdueDays: number;
};

type Difficulty = "easy" | "normal" | "hard";
type HomeView = "summary" | "today" | "overdue";

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; emoji: string; color: string }[] = [
  { value: "easy", label: "很簡單", emoji: "😄", color: "bg-green-100 border-green-400 text-green-700" },
  { value: "normal", label: "普通", emoji: "😊", color: "bg-amber-100 border-amber-400 text-amber-700" },
  { value: "hard", label: "很難", emoji: "😤", color: "bg-red-100 border-red-400 text-red-700" },
];

/* ── Weekly mini stats ── */
function WeeklyMiniCard({ sessions }: { sessions: ReviewSession[] }) {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const stats = useMemo(() => {
    let count = 0;
    let total = 0;
    const subs = new Set<string>();
    sessions.forEach(s => (s.records || []).forEach(r => {
      try {
        if (isWithinInterval(parseISO(r.date), { start: weekStart, end: weekEnd })) {
          count++; total += r.understanding; subs.add(s.subjectId);
        }
      } catch { /* skip */ }
    }));
    return { count, avg: count > 0 ? total / count : 0, subjects: subs.size };
  }, [sessions]);

  const message = stats.count === 0 ? "本週還沒有複習紀錄" :
    stats.avg >= 4.5 ? "本週表現超棒！🎉" :
    stats.avg >= 3.5 ? "學得不錯！繼續努力 👍" : "持續學習就是進步 ⭐";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
      <div className="rounded-3xl overflow-hidden border border-border/30 shadow-sm"
        style={{ background: "linear-gradient(135deg, hsl(345 80% 68%), hsl(25 90% 68%))" }}>
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-white/90" />
            <span className="text-white font-bold text-sm">本週複習報告</span>
            <span className="text-white/60 text-[11px] ml-auto">
              {format(weekStart, "M/d")} – {format(weekEnd, "M/d")}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { v: String(stats.count), l: "完成次數" },
              { v: stats.count > 0 ? stats.avg.toFixed(1) : "—", l: "理解程度" },
              { v: String(stats.subjects), l: "涵蓋科目" },
            ].map(({ v, l }) => (
              <div key={l} className="bg-white/20 rounded-2xl py-2.5 text-center backdrop-blur-sm">
                <p className="text-white text-xl font-black leading-none">{v}</p>
                <p className="text-white/75 text-[10px] font-bold mt-1">{l}</p>
              </div>
            ))}
          </div>
          <p className="text-white/90 text-xs font-bold text-center">{message}</p>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Summary entry cards ── */
function EntryCard({ icon, title, count, subtitle, color, onClick, delay = 0 }: {
  icon: React.ReactNode; title: string; count: number; subtitle: string;
  color: string; onClick: () => void; delay?: number;
}) {
  const isEmpty = count === 0;
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <button
        onClick={onClick}
        className={cn(
          "w-full text-left rounded-3xl p-5 border-2 shadow-sm transition-all active:scale-[0.98] flex items-center gap-4",
          isEmpty ? "bg-card border-border/40 hover:border-border/70" : cn("border-transparent", color)
        )}
      >
        <div className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0",
          isEmpty ? "bg-muted" : "bg-white/25"
        )}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn("font-bold text-base", isEmpty ? "text-foreground" : "text-white")}>{title}</p>
          <p className={cn("text-sm mt-0.5 font-medium", isEmpty ? "text-muted-foreground" : "text-white/80")}>{subtitle}</p>
        </div>
        {!isEmpty && (
          <div className="bg-white/25 text-white font-black text-lg px-3 py-1 rounded-2xl shrink-0">{count}</div>
        )}
        <ChevronRight className={cn("w-5 h-5 shrink-0", isEmpty ? "text-muted-foreground/40" : "text-white/70")} />
      </button>
    </motion.div>
  );
}

/* ── Record sheet ── */
function RecordSheet({ item, open, onClose, onSave }: {
  item: DueItem | null; open: boolean; onClose: () => void;
  onSave: (d: Difficulty, u: number, n: string) => void;
}) {
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [understanding, setUnderstanding] = useState(3);
  const [notes, setNotes] = useState("");

  const handleSave = () => {
    onSave(difficulty, understanding, notes);
    setDifficulty("normal"); setUnderstanding(3); setNotes("");
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
              {item.isOverdue && <span className="ml-2 text-red-500">（逾期 {item.overdueDays} 天）</span>}
            </p>
          )}
        </SheetHeader>
        <div className="space-y-6">
          <div>
            <p className="text-sm font-bold text-muted-foreground mb-3 text-center">這次的學習效果如何？</p>
            <div className="flex gap-3">
              {DIFFICULTY_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setDifficulty(opt.value)}
                  className={cn("flex-1 flex flex-col items-center gap-2 py-4 rounded-3xl border-2 transition-all active:scale-95 font-bold text-sm",
                    difficulty === opt.value ? cn(opt.color, "scale-105 shadow-md") : "border-border/50 bg-card text-muted-foreground hover:bg-muted")}>
                  <span className="text-2xl">{opt.emoji}</span>{opt.label}
                </button>
              ))}
            </div>
            {difficulty === "hard" && (
              <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                className="text-xs text-red-500 font-bold text-center mt-3 bg-red-50 py-2 px-4 rounded-2xl">
                系統會自動縮短下一次複習間隔，加油！
              </motion.p>
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-muted-foreground mb-3 text-center">理解程度（1～5 分）</p>
            <div className="flex gap-2 justify-center">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setUnderstanding(n)} className="transition-transform active:scale-90">
                  <Star className={cn("w-10 h-10 transition-colors", n <= understanding ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                </button>
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground mt-2 font-medium">
              {["","還要再加油","有一點懂","大概了解","懂得不少","完全理解！"][understanding]}
            </p>
          </div>
          <div>
            <p className="text-sm font-bold text-muted-foreground mb-2">備註（選填）</p>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="記錄重點、疑問或心得…"
              className="rounded-2xl border-2 border-border/50 focus-visible:ring-primary resize-none text-base" rows={3} />
          </div>
          <Button onClick={handleSave} className="w-full h-14 text-lg rounded-full font-bold shadow-lg">
            <Check className="w-5 h-5 mr-2" strokeWidth={3} />完成！
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ── Detail sheet ── */
function DetailSheet({ item, open, onClose, records, onEditClick }: {
  item: DueItem | null; open: boolean; onClose: () => void;
  records: ReviewRecord[]; onEditClick: () => void;
}) {
  if (!item) return null;
  const diffMap: Record<Difficulty, { label: string; color: string }> = {
    easy: { label: "很簡單", color: "text-green-600 bg-green-100" },
    normal: { label: "普通", color: "text-amber-600 bg-amber-100" },
    hard: { label: "很難", color: "text-red-600 bg-red-100" },
  };
  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-[32px] pb-10 px-6 sm:max-w-md sm:mx-auto border-none shadow-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader className="mb-4 mt-2">
          <div className="w-10 h-1.5 bg-muted rounded-full mx-auto mb-4" />
          <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-2", item.subject?.color || "bg-muted")}>{item.subject?.emoji}</div>
          <SheetTitle className="text-xl font-bold text-center">{item.scope}</SheetTitle>
          <p className="text-center text-muted-foreground font-medium text-sm">{item.subject?.name}</p>
          {item.isOverdue && <p className="text-center text-red-500 font-bold text-sm mt-1">已逾期 {item.overdueDays} 天</p>}
        </SheetHeader>
        <div className="space-y-3">
          {records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground font-medium">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>還沒有複習紀錄</p>
            </div>
          ) : records.map((rec, i) => {
            const diff = diffMap[rec.difficulty as Difficulty] ?? diffMap.normal;
            return (
              <motion.div key={rec.date + i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-card border-2 border-border/50 rounded-3xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">第 {i + 1} 次複習 · {rec.date}</span>
                  <span className={cn("text-xs font-bold px-2 py-1 rounded-full", diff.color)}>{diff.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(n => <Star key={n} className={cn("w-4 h-4", n <= rec.understanding ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20")} />)}
                  <span className="text-xs text-muted-foreground ml-1">{rec.understanding} 分</span>
                </div>
                {rec.notes && <p className="text-sm text-muted-foreground bg-muted/50 rounded-2xl px-3 py-2">{rec.notes}</p>}
              </motion.div>
            );
          })}
        </div>
        <Button variant="outline" className="w-full mt-5 h-12 rounded-2xl font-bold border-2 border-primary/30 text-primary hover:bg-primary/5"
          onClick={() => { onClose(); setTimeout(onEditClick, 150); }}>
          <Pencil className="w-4 h-4 mr-2" />編輯 / 刪除此計畫
        </Button>
      </SheetContent>
    </Sheet>
  );
}

/* ── Task card ── */
function TaskCard({ item, onCardClick, onCompleteClick, isAnimating }: {
  item: DueItem; onCardClick: () => void; onCompleteClick: () => void; isAnimating: boolean;
}) {
  return (
    <Card onClick={onCardClick} className={cn(
      "p-4 flex items-center gap-4 relative overflow-hidden border-2 transition-colors shadow-sm rounded-3xl cursor-pointer active:scale-[0.98]",
      item.isOverdue ? "border-red-300/60 bg-red-50/30 hover:border-red-400/40" : "border-border/50 hover:border-primary/20"
    )}>
      <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0 shadow-inner", item.subject?.color || "bg-muted")}>
        {item.subject?.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
          <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-muted text-muted-foreground truncate max-w-[70px]">{item.subject?.name}</span>
          <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">第 {item.round} 次</span>
          {item.isOverdue && <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-1 rounded-full">逾期 {item.overdueDays} 天</span>}
        </div>
        <h3 className="text-base font-bold truncate text-foreground">{item.scope}</h3>
        <div className="flex items-center gap-1 mt-1 text-muted-foreground">
          <ChevronRight className="w-3 h-3" />
          <span className="text-[10px] font-medium">點查看歷史紀錄與編輯</span>
        </div>
      </div>
      <Button size="icon"
        className={cn("w-14 h-14 rounded-full shrink-0 shadow-md transition-all duration-300",
          isAnimating ? "bg-green-500 hover:bg-green-600 scale-110" : item.isOverdue ? "bg-red-400 hover:bg-red-500" : "bg-primary hover:bg-primary/90")}
        onClick={e => { e.stopPropagation(); onCompleteClick(); }}>
        <Check className="w-7 h-7 text-white" strokeWidth={4} />
      </Button>
    </Card>
  );
}

/* ── Task list view ── */
function TaskListView({ items, title, icon, onBack, onCardClick, onCompleteClick, animatingIds }: {
  items: DueItem[]; title: string; icon: React.ReactNode;
  onBack: () => void; onCardClick: (item: DueItem) => void;
  onCompleteClick: (item: DueItem) => void; animatingIds: string[];
}) {
  return (
    <motion.div key="list" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.22 }}>
      <div className="flex items-center gap-3 mb-6 pt-4">
        <button onClick={onBack} className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center transition-colors hover:bg-muted/80 active:scale-95 shrink-0">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          {icon}
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        </div>
        <span className="ml-auto text-sm font-bold text-muted-foreground bg-muted px-3 py-1 rounded-full">{items.length} 個</span>
      </div>

      {items.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center text-center py-16">
          <div className="w-28 h-28 bg-accent/30 rounded-[40px] rotate-12 flex items-center justify-center mb-5 shadow-sm">
            <span className="text-5xl -rotate-12">🎉</span>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">全部完成了！</h2>
          <p className="text-muted-foreground font-medium">你太棒了，繼續保持！</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {items.map((item, index) => (
              <motion.div key={`${item.sessionId}-${item.date}`}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -120, transition: { duration: 0.3 } }}
                transition={{ delay: index * 0.06 }}>
                <TaskCard item={item} onCardClick={() => onCardClick(item)} onCompleteClick={() => onCompleteClick(item)}
                  isAnimating={animatingIds.includes(`${item.sessionId}-${item.date}`)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

/* ── Main page ── */
export default function Home() {
  const { subjects, sessions, saveSessions, isLoaded } = useData();
  const [view, setView] = useState<HomeView>("summary");
  const [pendingItem, setPendingItem] = useState<DueItem | null>(null);
  const [detailItem, setDetailItem] = useState<DueItem | null>(null);
  const [editingSession, setEditingSession] = useState<ReviewSession | null>(null);
  const [animatingIds, setAnimatingIds] = useState<string[]>([]);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayDate = new Date(todayStr + "T00:00:00");

  const { todayItems, overdueItems } = useMemo(() => {
    if (!isLoaded) return { todayItems: [], overdueItems: [] };
    const allPending: DueItem[] = sessions.flatMap(session =>
      session.reviewDates.flatMap((date, index) => {
        if (date > todayStr) return [];
        if (session.completedDates.includes(date)) return [];
        if (animatingIds.includes(`${session.id}-${date}`)) return [];
        const subject = subjects.find(s => s.id === session.subjectId);
        const overdueDays = differenceInCalendarDays(todayDate, new Date(date + "T00:00:00"));
        return [{ sessionId: session.id, subject, scope: session.scope, round: index + 1, date, reviewDateIndex: index, isOverdue: overdueDays > 0, overdueDays }];
      })
    );
    return {
      todayItems: allPending.filter(i => !i.isOverdue),
      overdueItems: allPending.filter(i => i.isOverdue).sort((a, b) => a.date.localeCompare(b.date)),
    };
  }, [sessions, subjects, todayStr, isLoaded, animatingIds]);

  const handleCompleteClick = (item: DueItem) => setPendingItem(item);

  const handleSaveRecord = (difficulty: Difficulty, understanding: number, notes: string) => {
    if (!pendingItem) return;
    const { sessionId, date, reviewDateIndex } = pendingItem;
    const animKey = `${sessionId}-${date}`;
    setAnimatingIds(prev => [...prev, animKey]);
    setPendingItem(null);
    setTimeout(() => {
      const newRecord: ReviewRecord = { date, difficulty, understanding, notes, completedAt: new Date().toISOString() };
      const updated = sessions.map(s => {
        if (s.id !== sessionId) return s;
        return { ...s, reviewDates: adjustNextDate(s.reviewDates, reviewDateIndex, difficulty), completedDates: [...s.completedDates, date], records: [...(s.records || []), newRecord] };
      });
      saveSessions(updated);
      setAnimatingIds(prev => prev.filter(id => id !== animKey));
    }, 400);
  };

  const handleEditSave = (updated: ReviewSession) => { saveSessions(sessions.map(s => s.id === updated.id ? updated : s)); setEditingSession(null); };
  const handleDelete = (sessionId: string) => { saveSessions(sessions.filter(s => s.id !== sessionId)); setEditingSession(null); setDetailItem(null); };
  const getSessionRecords = (id: string) => sessions.find(s => s.id === id)?.records ?? [];
  const getSession = (item: DueItem | null) => item ? sessions.find(s => s.id === item.sessionId) ?? null : null;

  return (
    <Layout>
      <div className="p-6 pb-24 flex flex-col">
        <AnimatePresence mode="wait">

          {/* ── Summary view ── */}
          {view === "summary" && (
            <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              <header className="mb-6 pt-4">
                <h1 className="text-3xl font-bold text-foreground">今日複習</h1>
                <p className="text-muted-foreground mt-1 font-medium">
                  {!isLoaded ? "" : todayItems.length + overdueItems.length > 0
                    ? `共 ${todayItems.length + overdueItems.length} 個任務等著你！`
                    : "今天全部完成，做得好！"}
                </p>
              </header>

              <div className="space-y-3 mb-6">
                {/* 今日複習 */}
                <EntryCard
                  delay={0.04}
                  icon={<CalendarCheck className={cn("w-7 h-7", todayItems.length > 0 ? "text-white" : "text-muted-foreground")} />}
                  title="今日複習"
                  count={todayItems.length}
                  subtitle={todayItems.length > 0 ? `${todayItems.length} 個任務等你完成` : "今天沒有新任務，讚！"}
                  color="bg-primary"
                  onClick={() => setView("today")}
                />

                {/* 逾期待複習 */}
                <EntryCard
                  delay={0.09}
                  icon={<Clock className={cn("w-7 h-7", overdueItems.length > 0 ? "text-white" : "text-muted-foreground")} />}
                  title="逾期待複習"
                  count={overdueItems.length}
                  subtitle={overdueItems.length > 0 ? `${overdueItems.length} 個任務待處理` : "沒有逾期任務，太棒了！"}
                  color="bg-red-400"
                  onClick={() => setView("overdue")}
                />
              </div>

              {/* 本週複習報告 */}
              {isLoaded && <WeeklyMiniCard sessions={sessions} />}
            </motion.div>
          )}

          {/* ── Today list ── */}
          {view === "today" && (
            <TaskListView
              key="today"
              items={todayItems}
              title="今日複習"
              icon={<CalendarCheck className="w-6 h-6 text-primary" />}
              onBack={() => setView("summary")}
              onCardClick={setDetailItem}
              onCompleteClick={handleCompleteClick}
              animatingIds={animatingIds}
            />
          )}

          {/* ── Overdue list ── */}
          {view === "overdue" && (
            <TaskListView
              key="overdue"
              items={overdueItems}
              title="逾期待複習"
              icon={<Clock className="w-6 h-6 text-red-500" />}
              onBack={() => setView("summary")}
              onCardClick={setDetailItem}
              onCompleteClick={handleCompleteClick}
              animatingIds={animatingIds}
            />
          )}

        </AnimatePresence>
      </div>

      <RecordSheet item={pendingItem} open={!!pendingItem} onClose={() => setPendingItem(null)} onSave={handleSaveRecord} />
      <DetailSheet item={detailItem} open={!!detailItem} onClose={() => setDetailItem(null)} records={detailItem ? getSessionRecords(detailItem.sessionId) : []} onEditClick={() => setEditingSession(getSession(detailItem))} />
      <EditSessionSheet session={editingSession} subjects={subjects} open={!!editingSession} onClose={() => setEditingSession(null)} onSave={handleEditSave} onDelete={handleDelete} />
    </Layout>
  );
}

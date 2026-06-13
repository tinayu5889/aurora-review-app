import { useState, useMemo, useEffect } from "react";
import { format, differenceInCalendarDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Star, FileText, Pencil, Clock, CalendarCheck, BookOpen, PlusCircle } from "lucide-react";
import { useSearch, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useData, ReviewRecord, ReviewSession, LearningType } from "@/hooks/use-data";
import { adjustNextDate } from "@/lib/spaced-repetition";
import { EditSessionSheet } from "@/components/edit-session-sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const LEARNING_TYPE_LABELS: Record<LearningType, { emoji: string; label: string }> = {
  video:   { emoji: "🎬", label: "看影片" },
  quiz:    { emoji: "📝", label: "測驗題" },
  reading: { emoji: "📖", label: "閱讀"   },
};

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
type HomeView = "plan" | "today" | "overdue";

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; emoji: string; color: string }[] = [
  { value: "easy",   label: "很簡單", emoji: "😄", color: "bg-green-100 border-green-400 text-green-700" },
  { value: "normal", label: "普通",   emoji: "😊", color: "bg-amber-100 border-amber-400 text-amber-700" },
  { value: "hard",   label: "很難",   emoji: "😤", color: "bg-red-100 border-red-400 text-red-700"   },
];

function getViewFromSearch(search: string): HomeView {
  const s = new URLSearchParams(search).get("s");
  if (s === "today") return "today";
  if (s === "overdue") return "overdue";
  return "plan";
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
      <SheetContent side="right" className="w-[440px] sm:max-w-[440px] pb-10 px-6 border-l shadow-2xl overflow-y-auto">
        <SheetHeader className="mb-6 mt-4">
          <SheetTitle className="text-2xl font-bold">複習完成！記錄一下吧</SheetTitle>
          {item && (
            <p className="text-muted-foreground font-medium text-sm mt-1">
              {item.subject?.emoji} {item.scope} · 第 {item.round} 次
              {item.isOverdue && <span className="ml-2 text-red-500">（逾期 {item.overdueDays} 天）</span>}
            </p>
          )}
        </SheetHeader>
        <div className="space-y-6">
          <div>
            <p className="text-sm font-bold text-muted-foreground mb-3">這次的學習效果如何？</p>
            <div className="flex gap-3">
              {DIFFICULTY_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setDifficulty(opt.value)}
                  className={cn("flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl border-2 transition-all font-bold text-sm",
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
            <p className="text-sm font-bold text-muted-foreground mb-3">理解程度（1～5 分）</p>
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
          <Button onClick={handleSave} className="w-full h-12 text-base rounded-xl font-bold shadow-md">
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
    easy:   { label: "很簡單", color: "text-green-600 bg-green-100" },
    normal: { label: "普通",   color: "text-amber-600 bg-amber-100" },
    hard:   { label: "很難",   color: "text-red-600 bg-red-100" },
  };
  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="right" className="w-[440px] sm:max-w-[440px] pb-10 px-6 border-l shadow-2xl overflow-y-auto">
        <SheetHeader className="mb-4 mt-4">
          <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-2", item.subject?.color || "bg-muted")}>{item.subject?.emoji}</div>
          <SheetTitle className="text-xl font-bold">{item.scope}</SheetTitle>
          <p className="text-muted-foreground font-medium text-sm">{item.subject?.name}</p>
          {item.isOverdue && <p className="text-red-500 font-bold text-sm mt-1">已逾期 {item.overdueDays} 天</p>}
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
                className="bg-card border-2 border-border/50 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">第 {i + 1} 次複習 · {rec.date}</span>
                  <span className={cn("text-xs font-bold px-2 py-1 rounded-full", diff.color)}>{diff.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(n => <Star key={n} className={cn("w-4 h-4", n <= rec.understanding ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20")} />)}
                  <span className="text-xs text-muted-foreground ml-1">{rec.understanding} 分</span>
                </div>
                {rec.notes && <p className="text-sm text-muted-foreground bg-muted/50 rounded-xl px-3 py-2">{rec.notes}</p>}
              </motion.div>
            );
          })}
        </div>
        <Button variant="outline" className="w-full mt-5 h-11 rounded-xl font-bold border-2 border-primary/30 text-primary hover:bg-primary/5"
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
      "p-4 flex items-center gap-4 relative overflow-hidden border-2 transition-colors shadow-sm rounded-2xl cursor-pointer hover:shadow-md",
      item.isOverdue ? "border-red-300/60 bg-red-50/30 hover:border-red-400/40" : "border-border/50 hover:border-primary/30"
    )}>
      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-inner", item.subject?.color || "bg-muted")}>
        {item.subject?.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{item.subject?.name}</span>
          <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">第 {item.round} 次</span>
          <span className="text-[11px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">📝 測驗題</span>
          {item.isOverdue && <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">逾期 {item.overdueDays} 天</span>}
        </div>
        <h3 className="text-base font-bold truncate text-foreground">{item.scope}</h3>
        <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">點擊查看歷史紀錄與編輯</p>
      </div>
      <Button size="icon"
        className={cn("w-12 h-12 rounded-xl shrink-0 shadow-sm transition-all duration-300",
          isAnimating ? "bg-green-500 hover:bg-green-600 scale-110" : item.isOverdue ? "bg-red-400 hover:bg-red-500" : "bg-primary hover:bg-primary/90")}
        onClick={e => { e.stopPropagation(); onCompleteClick(); }}>
        <Check className="w-6 h-6 text-white" strokeWidth={4} />
      </Button>
    </Card>
  );
}

/* ── Task list section ── */
function TaskListSection({ items, title, icon, onCardClick, onCompleteClick, animatingIds }: {
  items: DueItem[]; title: string; icon: React.ReactNode;
  onCardClick: (item: DueItem) => void;
  onCompleteClick: (item: DueItem) => void;
  animatingIds: string[];
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
      <div className="flex items-center gap-3 mb-6">
        {icon}
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <span className="ml-2 text-sm font-bold text-muted-foreground bg-muted px-3 py-1 rounded-full">{items.length} 個</span>
      </div>

      {items.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center text-center py-20">
          <div className="w-24 h-24 bg-accent/30 rounded-3xl rotate-12 flex items-center justify-center mb-5 shadow-sm">
            <span className="text-4xl -rotate-12">🎉</span>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">全部完成了！</h2>
          <p className="text-muted-foreground font-medium">你太棒了，繼續保持！</p>
        </motion.div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
          <AnimatePresence>
            {items.map((item, index) => (
              <motion.div key={`${item.sessionId}-${item.date}`}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -120, transition: { duration: 0.3 } }}
                transition={{ delay: index * 0.04 }}>
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

/* ── Study plan section ── */
function StudyPlanSection({ studyPlanItems, navigate }: {
  studyPlanItems: { session: ReviewSession; subject: { id: string; name: string; color: string; emoji: string } | undefined }[];
  navigate: (to: string) => void;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="w-6 h-6 text-violet-500" />
        <h1 className="text-2xl font-bold text-foreground">今日讀書計畫</h1>
        <span className="ml-auto text-sm text-muted-foreground font-medium">
          {format(new Date(), "yyyy 年 M 月 d 日")}
        </span>
      </div>

      {studyPlanItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20 gap-4">
          <div className="w-24 h-24 rounded-3xl bg-violet-100 flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-violet-400" />
          </div>
          <div>
            <p className="font-bold text-lg text-foreground">今天還沒有讀書計畫</p>
            <p className="text-muted-foreground text-sm mt-1">去新增一個學習內容，系統會自動幫你安排複習！</p>
          </div>
          <Button onClick={() => navigate("/add")} className="rounded-xl font-bold px-6 bg-violet-500 hover:bg-violet-600 h-11">
            <PlusCircle className="w-4 h-4 mr-2" />新增讀書計畫
          </Button>
        </div>
      ) : (
        <div>
          <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2 mb-6">
            {studyPlanItems.map(({ session, subject }, i) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 bg-card border-2 border-violet-100 hover:border-violet-200 rounded-2xl p-4 transition-colors shadow-sm"
              >
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-inner", subject?.color || "bg-muted")}>
                  {subject?.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-muted-foreground mb-0.5">{subject?.name}</p>
                  <p className="text-base font-bold text-foreground truncate">{session.scope}</p>
                  <p className="text-[11px] text-violet-500 font-medium mt-0.5">
                    {LEARNING_TYPE_LABELS[session.learningType ?? "reading"].emoji}{" "}
                    {LEARNING_TYPE_LABELS[session.learningType ?? "reading"].label}
                    {session.reviewDates.length > 0 ? " · 複習排程已自動建立 ✓" : " · 單次學習"}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <Button
            onClick={() => navigate("/add")}
            variant="outline"
            className="h-11 rounded-xl font-bold border-2 border-violet-200 text-violet-600 hover:bg-violet-50"
          >
            <PlusCircle className="w-4 h-4 mr-2" />再新增一個
          </Button>
        </div>
      )}
    </motion.div>
  );
}

/* ── Main page ── */
export default function Home() {
  const { subjects, sessions, saveSessions, isLoaded } = useData();
  const search = useSearch();
  const [, navigate] = useLocation();

  const [view, setView] = useState<HomeView>(() => getViewFromSearch(search));
  const [pendingItem, setPendingItem] = useState<DueItem | null>(null);
  const [detailItem, setDetailItem] = useState<DueItem | null>(null);
  const [editingSession, setEditingSession] = useState<ReviewSession | null>(null);
  const [animatingIds, setAnimatingIds] = useState<string[]>([]);

  useEffect(() => {
    setView(getViewFromSearch(search));
  }, [search]);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayDate = new Date(todayStr + "T00:00:00");

  const { todayItems, overdueItems, studyPlanItems } = useMemo(() => {
    if (!isLoaded) return { todayItems: [], overdueItems: [], studyPlanItems: [] };

    const studyPlanItems = sessions
      .filter(s => s.firstDate === todayStr)
      .map(s => ({ session: s, subject: subjects.find(sub => sub.id === s.subjectId) }));

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
      studyPlanItems,
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
      const session = sessions.find(s => s.id === sessionId);
      const isLastReview =
        session !== undefined &&
        session.reviewDates.length > 0 &&
        reviewDateIndex === session.reviewDates.length - 1;

      if (isLastReview) {
        // 最後一次複習完成 → 永久刪除整筆學習計畫與所有相關資料
        saveSessions(sessions.filter(s => s.id !== sessionId));
      } else {
        const newRecord: ReviewRecord = { date, difficulty, understanding, notes, completedAt: new Date().toISOString() };
        const updated = sessions.map(s => {
          if (s.id !== sessionId) return s;
          return { ...s, reviewDates: adjustNextDate(s.reviewDates, reviewDateIndex, difficulty), completedDates: [...s.completedDates, date], records: [...(s.records || []), newRecord] };
        });
        saveSessions(updated);
      }
      setAnimatingIds(prev => prev.filter(id => id !== animKey));
    }, 400);
  };

  const handleEditSave = (updated: ReviewSession) => { saveSessions(sessions.map(s => s.id === updated.id ? updated : s)); setEditingSession(null); };
  const handleDelete = (sessionId: string) => { saveSessions(sessions.filter(s => s.id !== sessionId)); setEditingSession(null); setDetailItem(null); };
  const getSessionRecords = (id: string) => sessions.find(s => s.id === id)?.records ?? [];
  const getSession = (item: DueItem | null) => item ? sessions.find(s => s.id === item.sessionId) ?? null : null;

  return (
    <Layout>
      <div className="px-8 py-8 max-w-5xl">
        <AnimatePresence mode="wait">

          {view === "plan" && (
            <StudyPlanSection
              key="plan"
              studyPlanItems={studyPlanItems}
              navigate={navigate}
            />
          )}

          {view === "today" && (
            <TaskListSection
              key="today"
              items={todayItems}
              title="要記得複習唷"
              icon={<CalendarCheck className="w-6 h-6 text-primary" />}
              onCardClick={setDetailItem}
              onCompleteClick={handleCompleteClick}
              animatingIds={animatingIds}
            />
          )}

          {view === "overdue" && (
            <TaskListSection
              key="overdue"
              items={overdueItems}
              title="你還記得嗎"
              icon={<Clock className="w-6 h-6 text-red-500" />}
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

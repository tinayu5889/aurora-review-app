import { useState } from "react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Edit, CheckCircle2, Circle, Target, CalendarDays } from "lucide-react";
import { Layout } from "@/components/layout";
import { useData, Goal } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

function newId() {
  return Math.random().toString(36).substring(2, 9);
}

export default function Goals() {
  const { goals, saveGoals, isLoaded } = useData();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Goal | null>(null);

  const [content, setContent] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const resetForm = () => {
    setContent("");
    setTargetDate("");
    setEditingId(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (goal: Goal) => {
    setContent(goal.content);
    setTargetDate(goal.targetDate);
    setEditingId(goal.id);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!content.trim()) return;
    if (editingId) {
      saveGoals(goals.map(g => g.id === editingId ? { ...g, content: content.trim(), targetDate } : g));
    } else {
      const newGoal: Goal = { id: newId(), content: content.trim(), targetDate, isCompleted: false };
      saveGoals([...goals, newGoal]);
    }
    setIsDialogOpen(false);
  };

  const handleToggleComplete = (goal: Goal) => {
    saveGoals(goals.map(g => g.id === goal.id ? { ...g, isCompleted: !g.isCompleted } : g));
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    saveGoals(goals.filter(g => g.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const sorted = [...goals].sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
    if (a.targetDate && b.targetDate) return a.targetDate.localeCompare(b.targetDate);
    if (a.targetDate) return -1;
    if (b.targetDate) return 1;
    return 0;
  });

  if (!isLoaded) return null;

  return (
    <Layout>
      <div className="px-8 py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <header>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Target className="w-6 h-6 text-primary" />
              學習目標
            </h1>
            <p className="text-muted-foreground text-sm mt-1">設定你的學習方向</p>
          </header>
          <Button onClick={handleOpenAdd} className="rounded-xl font-bold h-10">
            <Plus className="w-4 h-4 mr-2" />新增目標
          </Button>
        </div>

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center mb-4">
              <Target className="w-12 h-12 text-primary/50" />
            </div>
            <p className="font-bold text-lg text-foreground mb-1">還沒有學習目標</p>
            <p className="text-muted-foreground text-sm">新增一個目標，讓學習更有方向！</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {sorted.map((goal, i) => (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -60 }}
                  transition={{ delay: i * 0.03 }}
                  className={cn(
                    "flex items-start gap-4 p-4 bg-card border-2 rounded-2xl shadow-sm transition-colors",
                    goal.isCompleted ? "border-green-200 bg-green-50/30" : "border-border/50"
                  )}
                >
                  <button
                    onClick={() => handleToggleComplete(goal)}
                    className="mt-0.5 shrink-0 transition-transform active:scale-90"
                  >
                    {goal.isCompleted
                      ? <CheckCircle2 className="w-6 h-6 text-green-500" />
                      : <Circle className="w-6 h-6 text-muted-foreground/40 hover:text-primary/60 transition-colors" />
                    }
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-semibold text-base leading-snug",
                      goal.isCompleted ? "line-through text-muted-foreground" : "text-foreground"
                    )}>
                      {goal.content}
                    </p>
                    {goal.targetDate && (
                      <p className={cn(
                        "flex items-center gap-1 text-xs font-medium mt-1.5",
                        goal.isCompleted ? "text-muted-foreground/50" : "text-primary/80"
                      )}>
                        <CalendarDays className="w-3.5 h-3.5" />
                        目標：{format(new Date(goal.targetDate + "T00:00:00"), "yyyy 年 M 月 d 日（E）", { locale: zhTW })}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(goal)}
                      className="w-8 h-8 rounded-xl bg-muted hover:bg-primary/10 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(goal)}
                      className="w-8 h-8 rounded-xl bg-muted hover:bg-red-100 flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <p className="text-xs text-muted-foreground text-center pt-2">
              {goals.filter(g => g.isCompleted).length} / {goals.length} 個目標已完成
            </p>
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={open => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingId ? "編輯學習目標" : "新增學習目標"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-3">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-muted-foreground">目標內容</Label>
              <Input
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="例如：暑假完成 Raz Kids Level C"
                className="h-12 rounded-2xl border-2 border-border/50 focus-visible:ring-primary text-base font-medium"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold text-muted-foreground">預計完成日期（選填）</Label>
              <Input
                type="date"
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
                className="h-12 rounded-2xl border-2 border-border/50 focus-visible:ring-primary text-base font-medium"
              />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col mt-2">
            <Button onClick={handleSave} className="w-full h-12 rounded-2xl font-bold" disabled={!content.trim()}>
              {editingId ? "儲存變更" : "新增目標"}
            </Button>
            <DialogClose asChild>
              <Button variant="ghost" className="w-full h-11 rounded-2xl font-bold text-muted-foreground">取消</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl w-[88%] sm:max-w-md mx-auto p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-center">確定要刪除此學習目標嗎？</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm mt-2">
              刪除後無法復原。
              {deleteTarget && (
                <span className="block mt-3 bg-muted rounded-2xl px-3 py-2 text-foreground font-medium text-sm">
                  {deleteTarget.content}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col mt-3">
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="w-full h-12 rounded-2xl font-bold bg-red-500 hover:bg-red-600 text-white"
            >
              確認刪除
            </AlertDialogAction>
            <AlertDialogCancel className="w-full h-12 rounded-2xl font-bold border-2 mt-0">取消</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

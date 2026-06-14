import { useState, useEffect } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Edit, CalendarX2, ArrowRight } from "lucide-react";
import { Layout } from "@/components/layout";
import { useData, ExcludedPeriod } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

function newId() {
  return Math.random().toString(36).substring(2, 9);
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  return format(new Date(dateStr + "T00:00:00"), "yyyy/MM/dd");
}

export default function ExcludedDays() {
  const { excludedPeriods, saveExcludedPeriods, isLoaded } = useData();

  useEffect(() => {
    if (!isLoaded) return;
    const today = new Date().toISOString().slice(0, 10);
    const active = excludedPeriods.filter(p => p.endDate >= today);
    if (active.length !== excludedPeriods.length) {
      saveExcludedPeriods(active);
    }
  }, [isLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExcludedPeriod | null>(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [note, setNote] = useState("");

  const resetForm = () => {
    setStartDate("");
    setEndDate("");
    setNote("");
    setEditingId(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (period: ExcludedPeriod) => {
    setStartDate(period.startDate);
    setEndDate(period.endDate);
    setNote(period.note);
    setEditingId(period.id);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!startDate || !endDate) return;
    const actualEnd = endDate < startDate ? startDate : endDate;

    if (editingId) {
      saveExcludedPeriods(excludedPeriods.map(p =>
        p.id === editingId ? { ...p, startDate, endDate: actualEnd, note } : p
      ));
    } else {
      const newPeriod: ExcludedPeriod = { id: newId(), startDate, endDate: actualEnd, note };
      saveExcludedPeriods([...excludedPeriods, newPeriod].sort((a, b) => a.startDate.localeCompare(b.startDate)));
    }
    setIsDialogOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    saveExcludedPeriods(excludedPeriods.filter(p => p.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const sorted = [...excludedPeriods].sort((a, b) => a.startDate.localeCompare(b.startDate));

  if (!isLoaded) return null;

  return (
    <Layout>
      <div className="px-8 py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <header>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CalendarX2 className="w-6 h-6 text-amber-500" />
              排除日
            </h1>
            <p className="text-muted-foreground text-sm mt-1">標記不適合新增讀書進度的日期</p>
          </header>
          <Button onClick={handleOpenAdd} className="rounded-xl font-bold h-10">
            <Plus className="w-4 h-4 mr-2" />新增排除日
          </Button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-6 text-sm text-amber-800">
          <p className="font-bold mb-0.5">💡 排除日的用途</p>
          <p className="text-amber-700 text-xs leading-relaxed">
            例如期中考週、旅行、校外教學等。月曆上會顯示 <span className="font-black">✕</span> 提醒你，新增讀書計畫時也會跳出提醒。排除日不代表禁止學習，只是提醒不建議新增進度。
          </p>
        </div>

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-24 h-24 bg-amber-100 rounded-3xl flex items-center justify-center mb-4">
              <CalendarX2 className="w-12 h-12 text-amber-400" />
            </div>
            <p className="font-bold text-lg text-foreground mb-1">還沒有排除日</p>
            <p className="text-muted-foreground text-sm">新增一個排除日，讓計畫更合理！</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {sorted.map((period, i) => {
                const isSingleDay = period.startDate === period.endDate;
                return (
                  <motion.div
                    key={period.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -60 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-start gap-4 p-4 bg-card border-2 border-amber-100 rounded-2xl shadow-sm"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-lg font-black text-amber-600">✕</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-foreground">{formatDate(period.startDate)}</span>
                        {!isSingleDay && (
                          <>
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-sm font-bold text-foreground">{formatDate(period.endDate)}</span>
                          </>
                        )}
                      </div>
                      {period.note && (
                        <p className="text-xs text-muted-foreground mt-1 font-medium">{period.note}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleOpenEdit(period)}
                        className="w-8 h-8 rounded-xl bg-muted hover:bg-primary/10 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(period)}
                        className="w-8 h-8 rounded-xl bg-muted hover:bg-red-100 flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={open => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingId ? "編輯排除日" : "新增排除日"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-muted-foreground">開始日期</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={e => {
                    setStartDate(e.target.value);
                    if (endDate && e.target.value > endDate) setEndDate(e.target.value);
                  }}
                  className="h-12 rounded-2xl border-2 border-border/50 focus-visible:ring-primary text-base font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-muted-foreground">結束日期</Label>
                <Input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="h-12 rounded-2xl border-2 border-border/50 focus-visible:ring-primary text-base font-medium"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold text-muted-foreground">備註（選填）</Label>
              <Input
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="例如：期中考週、旅行、夏令營…"
                className="h-12 rounded-2xl border-2 border-border/50 focus-visible:ring-primary text-base font-medium"
              />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col mt-2">
            <Button onClick={handleSave} className="w-full h-12 rounded-2xl font-bold" disabled={!startDate || !endDate}>
              {editingId ? "儲存變更" : "新增排除日"}
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
            <AlertDialogTitle className="text-xl font-bold text-center">確定要刪除此排除日嗎？</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm mt-2">
              刪除後無法復原。
              {deleteTarget && (
                <span className="block mt-3 bg-muted rounded-2xl px-3 py-2 text-foreground font-medium text-sm">
                  {formatDate(deleteTarget.startDate)}
                  {deleteTarget.startDate !== deleteTarget.endDate && ` ～ ${formatDate(deleteTarget.endDate)}`}
                  {deleteTarget.note && `（${deleteTarget.note}）`}
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

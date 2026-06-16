import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Edit, Book, Download, Upload, CheckCircle, AlertTriangle } from "lucide-react";
import { Layout } from "@/components/layout";
import { useData, Subject, ReviewSession, Goal, ExcludedPeriod } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const COLORS = [
  "bg-red-400", "bg-orange-400", "bg-amber-400", "bg-yellow-400",
  "bg-lime-400", "bg-green-400", "bg-emerald-400", "bg-teal-400",
  "bg-cyan-400", "bg-sky-400", "bg-blue-400", "bg-indigo-400",
  "bg-violet-400", "bg-purple-400", "bg-fuchsia-400", "bg-pink-400", "bg-rose-400"
];

const EMOJIS = [
  // 語言
  "中", "あ", "🔤", "🎤",
  // 數學
  "➕", "➖", "✖️", "➗",
  // 自然
  "🔬", "🧪", "🔭",
  // 通用書寫
  "📖", "✍️", "📝", "📚",
  // 藝術音樂
  "🎨", "🎵", "🪈",
  // 運動
  "🏊", "🚴", "🏃",
  // 科技人文
  "💻", "🧠", "🌍", "🗺️",
  // 其他
  "💡", "🌟", "🏆", "⭐️", "🎯",
];

type BackupData = {
  version: string;
  appName: string;
  exportedAt: string;
  subjects: Subject[];
  sessions: ReviewSession[];
  goals?: Goal[];
  excludedPeriods?: ExcludedPeriod[];
};

type ImportStatus = "idle" | "success" | "error";

function BackupCard({
  subjects,
  sessions,
  goals,
  excludedPeriods,
  onImport,
}: {
  subjects: Subject[];
  sessions: ReviewSession[];
  goals: Goal[];
  excludedPeriods: ExcludedPeriod[];
  onImport: (data: BackupData) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<ImportStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [pendingData, setPendingData] = useState<BackupData | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const lastBackup = localStorage.getItem("kr_last_backup");

  const handleExport = () => {
    const today = new Date().toISOString().slice(0, 10);
    const activeExcludedPeriods = excludedPeriods.filter(p => p.endDate >= today);
    const data: BackupData = {
      version: "1.0",
      appName: "aurora-review-app",
      exportedAt: new Date().toISOString(),
      subjects,
      sessions,
      goals,
      excludedPeriods: activeExcludedPeriods,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `aurora-review-backup-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    localStorage.setItem("kr_last_backup", new Date().toLocaleString("zh-TW"));
    setImportStatus("idle");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as BackupData;

        if (
          !parsed.appName ||
          !Array.isArray(parsed.subjects) ||
          !Array.isArray(parsed.sessions)
        ) {
          throw new Error("檔案格式不正確，請確認是否為本 App 匯出的備份");
        }

        setPendingData(parsed);
        setConfirmOpen(true);
        setImportStatus("idle");
        setErrorMsg("");
      } catch (err) {
        setImportStatus("error");
        setErrorMsg(err instanceof Error ? err.message : "無法讀取檔案，請確認格式正確");
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (!pendingData) return;
    onImport(pendingData);
    setImportStatus("success");
    setConfirmOpen(false);
    setPendingData(null);
    setTimeout(() => setImportStatus("idle"), 3000);
  };

  return (
    <>
      <div className="mb-6 bg-card border-2 border-border/40 rounded-3xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">💾</span>
          <h2 className="text-sm font-bold text-foreground">資料備份與還原</h2>
        </div>

        <div className="flex gap-2 mb-3">
          <Button
            onClick={handleExport}
            variant="outline"
            className="flex-1 h-12 rounded-2xl font-bold border-2 border-primary/30 text-primary hover:bg-primary/5 text-sm"
          >
            <Download className="w-4 h-4 mr-1.5" />
            匯出備份
          </Button>

          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="flex-1 h-12 rounded-2xl font-bold border-2 border-amber-400/40 text-amber-600 hover:bg-amber-50 text-sm"
          >
            <Upload className="w-4 h-4 mr-1.5" />
            匯入還原
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleFileChange}
        />

        {importStatus === "success" && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-green-700 bg-green-50 rounded-2xl px-3 py-2 text-xs font-bold"
          >
            <CheckCircle className="w-4 h-4 shrink-0" />
            資料還原成功！所有學習紀錄已載入。
          </motion.div>
        )}

        {importStatus === "error" && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-red-700 bg-red-50 rounded-2xl px-3 py-2 text-xs font-bold"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {errorMsg}
          </motion.div>
        )}

        {importStatus === "idle" && (
          <div className="text-[11px] text-muted-foreground/70 space-y-0.5">
            <p>📦 包含：科目、學習計畫、複習紀錄、理解程度、完成狀態</p>
            {lastBackup && <p className="text-green-600 font-medium">✅ 上次匯出：{lastBackup}</p>}
          </div>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-[28px] border-none shadow-2xl w-[88%] sm:max-w-md mx-auto p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-center">確定要還原資料嗎？</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm mt-2 space-y-1">
              <span className="block">
                這個動作會
                <span className="text-red-500 font-bold">覆蓋目前所有資料</span>，
                包含科目與學習紀錄。
              </span>
              {pendingData && (
                <span className="block mt-2 bg-muted rounded-2xl px-3 py-2 text-xs text-foreground font-medium">
                  備份日期：{new Date(pendingData.exportedAt).toLocaleString("zh-TW")}
                  <br />
                  科目數：{pendingData.subjects.length}　學習計畫：{pendingData.sessions.length}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col mt-2">
            <AlertDialogAction
              onClick={handleConfirmImport}
              className="w-full h-12 rounded-2xl font-bold bg-amber-500 hover:bg-amber-600 text-white"
            >
              確定還原
            </AlertDialogAction>
            <AlertDialogCancel className="w-full h-12 rounded-2xl font-bold border-2 mt-0">
              取消
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function Subjects() {
  const { subjects, sessions, saveSubjects, saveSessions, goals, saveGoals, excludedPeriods, saveExcludedPeriods, isLoaded } = useData();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [emoji, setEmoji] = useState(EMOJIS[0]);

  const resetForm = () => {
    setName("");
    setColor(COLORS[0]);
    setEmoji(EMOJIS[0]);
    setEditingId(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const handleOpenEdit = (subject: Subject) => {
    setName(subject.name);
    setColor(subject.color);
    setEmoji(subject.emoji);
    setEditingId(subject.id);
    setIsAddOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) return;

    if (editingId) {
      saveSubjects(subjects.map(s =>
        s.id === editingId ? { ...s, name, color, emoji } : s
      ));
    } else {
      saveSubjects([
        ...subjects,
        { id: Math.random().toString(36).substring(7), name, color, emoji }
      ]);
    }
    setIsAddOpen(false);
  };

  const handleDelete = (id: string) => {
    saveSubjects(subjects.filter(s => s.id !== id));
  };

  const handleImport = (data: BackupData) => {
    saveSubjects(data.subjects);
    saveSessions(data.sessions);
    if (data.goals) saveGoals(data.goals);
    if (data.excludedPeriods) saveExcludedPeriods(data.excludedPeriods);
    localStorage.setItem("kr_last_backup", `還原於 ${new Date().toLocaleString("zh-TW")}`);
  };

  if (!isLoaded) return null;

  return (
    <Layout>
      <div className="p-6 pb-24">
        <div className="flex items-center justify-between mb-5 pt-4">
          <header>
            <h1 className="text-3xl font-bold text-foreground">科目管理</h1>
            <p className="text-muted-foreground mt-1 font-medium">設定你的學習夥伴</p>
          </header>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenAdd} size="icon" className="w-14 h-14 rounded-full shadow-lg hover:scale-105 transition-transform">
                <Plus className="w-7 h-7" strokeWidth={3} />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md w-[90%] rounded-[32px] p-6 border-none shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-center text-foreground">
                  {editingId ? "編輯科目" : "新增科目"}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <div className="space-y-3">
                  <label className="text-sm font-bold text-muted-foreground ml-2">科目名稱</label>
                  <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="例如：數學、英文..."
                    className="h-14 px-5 text-lg font-bold rounded-2xl bg-muted/50 border-transparent focus-visible:ring-primary shadow-inner"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-muted-foreground ml-2">選擇圖案</label>
                  <div className="grid grid-cols-7 gap-2 bg-muted/30 p-3 rounded-3xl">
                    {EMOJIS.map(e => (
                      <button
                        key={e}
                        onClick={() => setEmoji(e)}
                        className={cn(
                          "w-full aspect-square rounded-2xl flex items-center justify-center text-2xl transition-all",
                          emoji === e ? "bg-white scale-110 shadow-sm ring-2 ring-primary/20" : "hover:bg-black/5 active:scale-95"
                        )}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-muted-foreground ml-2">選擇顏色</label>
                  <div className="grid grid-cols-8 gap-3 bg-muted/30 p-4 rounded-3xl">
                    {COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        className={cn(
                          "w-full aspect-square rounded-full transition-all shadow-sm",
                          c,
                          color === c ? "ring-4 ring-primary ring-offset-2 ring-offset-background scale-110" : "hover:scale-110 active:scale-95"
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter className="flex-col gap-3 sm:flex-col mt-4">
                <Button onClick={handleSave} className="w-full h-14 text-lg rounded-2xl font-bold shadow-md" disabled={!name.trim()}>
                  {editingId ? "儲存變更" : "建立科目"}
                </Button>
                <DialogClose asChild>
                  <Button variant="ghost" className="w-full h-12 text-muted-foreground hover:bg-muted rounded-2xl font-bold">
                    取消
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <BackupCard subjects={subjects} sessions={sessions} goals={goals} excludedPeriods={excludedPeriods} onImport={handleImport} />

        <div className="grid grid-cols-2 gap-2">
          <AnimatePresence>
            {subjects.map((subject, index) => (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.03 }}
                className="bg-card border border-border/50 rounded-2xl p-3 flex items-center gap-2.5 shadow-sm hover:shadow-md transition-all active:scale-[0.97]"
              >
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-inner", subject.color)}>
                  {subject.emoji}
                </div>

                <span className="font-bold text-foreground text-sm flex-1 truncate leading-tight">
                  {subject.name}
                </span>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleOpenEdit(subject)}
                    className="w-7 h-7 rounded-xl bg-muted hover:bg-primary/10 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(subject.id)}
                    className="w-7 h-7 rounded-xl bg-muted hover:bg-red-100 flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {subjects.length === 0 && (
            <div className="col-span-2 text-center py-12">
              <div className="w-20 h-20 bg-muted rounded-[28px] rotate-12 flex items-center justify-center mx-auto mb-5 shadow-sm">
                <Book className="w-10 h-10 text-muted-foreground -rotate-12" />
              </div>
              <p className="text-muted-foreground font-medium">還沒有科目喔，快來新增一個吧！</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

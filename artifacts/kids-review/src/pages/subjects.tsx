import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Edit, Book } from "lucide-react";
import { Layout } from "@/components/layout";
import { useData, Subject } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const COLORS = [
  "bg-red-400", "bg-orange-400", "bg-amber-400", "bg-yellow-400",
  "bg-lime-400", "bg-green-400", "bg-emerald-400", "bg-teal-400",
  "bg-cyan-400", "bg-sky-400", "bg-blue-400", "bg-indigo-400",
  "bg-violet-400", "bg-purple-400", "bg-fuchsia-400", "bg-pink-400", "bg-rose-400"
];

const EMOJIS = ["📚", "📐", "🔬", "🎨", "🎵", "⚽️", "💻", "🌍", "📝", "✍️", "🧠", "💡", "🌟", "🚀"];

export default function Subjects() {
  const { subjects, saveSubjects, isLoaded } = useData();
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

  if (!isLoaded) return null;

  return (
    <Layout>
      <div className="p-6 pb-24">
        <div className="flex items-center justify-between mb-8 pt-4">
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

        <div className="grid grid-cols-2 gap-4">
          <AnimatePresence>
            {subjects.map((subject, index) => (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "relative p-5 rounded-[32px] aspect-square flex flex-col items-center justify-center text-center group transition-transform active:scale-95 shadow-sm border-4 border-transparent hover:border-white/20",
                  subject.color
                )}
              >
                <div className="absolute top-3 right-3 flex opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleOpenEdit(subject)}
                    className="w-9 h-9 rounded-full bg-white/30 hover:bg-white/50 flex items-center justify-center text-white backdrop-blur-sm mr-1 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(subject.id)}
                    className="w-9 h-9 rounded-full bg-white/30 hover:bg-red-500/80 flex items-center justify-center text-white backdrop-blur-sm transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <span className="text-6xl mb-4 drop-shadow-md">{subject.emoji}</span>
                <span className="font-bold text-white text-xl px-2 drop-shadow-sm line-clamp-2 leading-tight">
                  {subject.name}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>

          {subjects.length === 0 && (
             <div className="col-span-2 text-center py-12">
               <div className="w-24 h-24 bg-muted rounded-[32px] rotate-12 flex items-center justify-center mx-auto mb-6 shadow-sm">
                 <Book className="w-12 h-12 text-muted-foreground -rotate-12" />
               </div>
               <p className="text-muted-foreground font-medium text-lg">還沒有科目喔，快來新增一個吧！</p>
             </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

import { useState } from "react";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { Layout } from "@/components/layout";
import { useData } from "@/hooks/use-data";
import { generateReviewDates } from "@/lib/spaced-repetition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function AddLearning() {
  const { subjects, sessions, saveSessions, isLoaded } = useData();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [scope, setScope] = useState("");
  const [firstDate, setFirstDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject || !scope.trim() || !firstDate) return;

    setIsSubmitting(true);

    const reviewDates = generateReviewDates(firstDate);
    
    const newSession = {
      id: Math.random().toString(36).substring(7),
      subjectId: selectedSubject,
      scope: scope.trim(),
      firstDate,
      reviewDates,
      completedDates: [],
    };

    saveSessions([...sessions, newSession]);
    
    toast({
      title: "太棒了！ 🎉",
      description: "已經幫你安排好複習計畫囉！",
      className: "bg-green-500 text-white border-none rounded-2xl",
    });

    setTimeout(() => {
      setLocation("/");
    }, 800);
  };

  if (!isLoaded) return null;

  return (
    <Layout>
      <div className="p-6 pb-24 h-full flex flex-col">
        <header className="mb-8 pt-4">
          <h1 className="text-3xl font-bold text-foreground">新增學習</h1>
          <p className="text-muted-foreground mt-1 font-medium">今天學到了什麼新知識呢？</p>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-8">
          <div className="space-y-4">
            <Label className="text-lg font-bold text-foreground ml-2">選擇科目</Label>
            
            {subjects.length === 0 ? (
               <div className="p-6 bg-muted/50 rounded-3xl text-center border border-border/50">
                 <p className="text-muted-foreground mb-4 font-medium">還沒有科目喔，先去建立一個吧！</p>
                 <Button type="button" onClick={() => setLocation("/subjects")} className="rounded-xl font-bold">去新增科目</Button>
               </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {subjects.map(subject => (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => setSelectedSubject(subject.id)}
                    className={cn(
                      "flex flex-col items-center justify-center p-4 rounded-3xl transition-all border-[3px] active:scale-95",
                      selectedSubject === subject.id 
                        ? cn(subject.color, "border-transparent text-white shadow-lg scale-105") 
                        : "bg-card border-border/50 hover:bg-muted text-foreground"
                    )}
                  >
                    <span className="text-4xl mb-2 drop-shadow-sm">{subject.emoji}</span>
                    <span className="text-sm font-bold truncate w-full text-center">{subject.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <Label className="text-lg font-bold text-foreground ml-2">學習範圍</Label>
            <Input 
              value={scope}
              onChange={e => setScope(e.target.value)}
              placeholder="例如：第一課 乘法、自然筆記..."
              className="h-16 px-5 text-lg font-bold rounded-3xl bg-card border-2 border-border/50 focus-visible:ring-primary shadow-sm"
              required
            />
          </div>

          <div className="space-y-4">
            <Label className="text-lg font-bold text-foreground ml-2">第一次學習日期</Label>
            <div className="bg-card border-2 border-border/50 rounded-3xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all">
              <Input 
                type="date"
                value={firstDate}
                onChange={e => setFirstDate(e.target.value)}
                className="h-12 w-full px-3 text-lg font-bold border-none bg-transparent focus-visible:ring-0 shadow-none"
                required
              />
            </div>
            <p className="text-sm text-muted-foreground ml-2 font-medium">我們會自動幫你安排之後的複習時間喔！</p>
          </div>

          <div className="mt-auto pt-6">
            <Button 
              type="submit" 
              className={cn(
                "w-full h-16 text-xl rounded-full font-bold shadow-xl transition-all",
                isSubmitting ? "bg-green-500 scale-95" : ""
              )}
              disabled={!selectedSubject || !scope.trim() || !firstDate || isSubmitting}
            >
              {isSubmitting ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">
                  <CheckCircle2 className="w-7 h-7" /> 建立計畫成功！
                </motion.div>
              ) : (
                "開始計畫！"
              )}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

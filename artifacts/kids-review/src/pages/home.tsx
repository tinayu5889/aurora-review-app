import { useState, useMemo } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { Layout } from "@/components/layout";
import { useData } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function Home() {
  const { subjects, sessions, saveSessions, isLoaded } = useData();
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const dueItems = useMemo(() => {
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
          date: todayStr
        }];
      }
      return [];
    }).filter(item => !completedIds.includes(`${item.sessionId}-${item.date}`));
  }, [sessions, subjects, todayStr, isLoaded, completedIds]);

  const handleComplete = (sessionId: string, date: string) => {
    setCompletedIds(prev => [...prev, `${sessionId}-${date}`]);
    setTimeout(() => {
      const updatedSessions = sessions.map(s => {
        if (s.id === sessionId) {
          return {
            ...s,
            completedDates: [...s.completedDates, date]
          };
        }
        return s;
      });
      saveSessions(updatedSessions);
      setCompletedIds(prev => prev.filter(id => id !== `${sessionId}-${date}`));
    }, 500); // Wait for animation
  };

  return (
    <Layout>
      <div className="p-6 pb-24 h-full flex flex-col">
        <header className="mb-6 pt-4">
          <h1 className="text-3xl font-bold text-foreground">今日複習</h1>
          <p className="text-muted-foreground mt-1 font-medium">
            {dueItems.length > 0 ? `還有 ${dueItems.length} 個任務等著你！` : "做得好！"}
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
                  exit={{ opacity: 0, x: -100, transition: { duration: 0.3 } }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="p-4 flex items-center gap-4 relative overflow-hidden border-2 border-border/50 hover:border-primary/20 transition-colors shadow-sm rounded-3xl">
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
                    </div>

                    <Button 
                      size="icon"
                      className={cn(
                        "w-14 h-14 rounded-full shrink-0 transition-all duration-300 shadow-md",
                        completedIds.includes(`${item.sessionId}-${item.date}`) 
                          ? "bg-green-500 hover:bg-green-600 scale-110" 
                          : "bg-primary hover:bg-primary/90"
                      )}
                      onClick={() => handleComplete(item.sessionId, item.date)}
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
    </Layout>
  );
}

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { Calendar, CheckCircle2, Circle } from "lucide-react";
import { Layout } from "@/components/layout";
import { useData } from "@/hooks/use-data";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export default function CalendarPage() {
  const { subjects, sessions, isLoaded } = useData();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const dueMap = useMemo(() => {
    const map = new Map<string, any[]>();
    if (!isLoaded) return map;

    sessions.forEach(session => {
      session.reviewDates.forEach((dateStr, index) => {
        const item = {
          sessionId: session.id,
          subject: subjects.find(s => s.id === session.subjectId),
          scope: session.scope,
          round: index + 1,
          isCompleted: session.completedDates.includes(dateStr)
        };
        const existing = map.get(dateStr) || [];
        map.set(dateStr, [...existing, item]);
      });
    });
    return map;
  }, [sessions, subjects, isLoaded]);

  const modifiers = {
    hasDue: (date: Date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      return (dueMap.get(dateStr) || []).length > 0;
    },
    allCompleted: (date: Date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const items = dueMap.get(dateStr) || [];
      return items.length > 0 && items.every(item => item.isCompleted);
    }
  };

  const modifiersStyles = {
    hasDue: { fontWeight: "bold" },
  };

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setIsSheetOpen(true);
  };

  const selectedDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const selectedItems = dueMap.get(selectedDateStr) || [];

  return (
    <Layout>
      <div className="p-6 pb-24 h-full flex flex-col">
        <header className="mb-6 pt-4">
          <h1 className="text-3xl font-bold text-foreground">複習月曆</h1>
          <p className="text-muted-foreground mt-1 font-medium">看看未來的計畫吧！</p>
        </header>

        <div className="bg-card rounded-[32px] p-6 shadow-sm border border-border/50 flex-1">
          <style>{`
            .rdp { --rdp-cell-size: 42px; margin: 0; width: 100%; display: flex; justify-content: center; }
            .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: var(--color-muted); border-radius: 12px; }
            .rdp-day_selected { background-color: var(--color-primary); color: white; font-weight: bold; border-radius: 12px; }
            .rdp-day_selected:hover { background-color: var(--color-primary); opacity: 0.9; }
            .rdp-head_cell { font-weight: 700; color: var(--color-muted-foreground); padding-bottom: 1rem; text-transform: uppercase; font-size: 0.8rem; }
            .rdp-nav_button { border-radius: 12px; }
            .rdp-month { width: 100%; }
            .rdp-table { width: 100%; max-width: 320px; margin: 0 auto; }
            .rdp-caption { margin-bottom: 1rem; }
            .rdp-caption_label { font-size: 1.25rem; font-weight: 800; }
            .day-has-due { position: relative; }
            .day-has-due::after { content: ''; position: absolute; bottom: 2px; left: 50%; transform: translateX(-50%); width: 5px; height: 5px; border-radius: 50%; background: hsl(var(--primary)); pointer-events: none; }
            .day-all-completed::after { background: #22c55e; }
          `}</style>

          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={(day) => day && handleDayClick(day)}
            modifiers={modifiers}
            modifiersClassNames={{
              hasDue: "day-has-due",
              allCompleted: "day-all-completed",
            }}
          />
        </div>

        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent side="bottom" className="rounded-t-[32px] min-h-[50vh] max-h-[85vh] pb-8 px-6 sm:max-w-md sm:mx-auto border-none shadow-2xl">
            <SheetHeader className="mb-6 mt-2">
              <SheetTitle className="text-2xl font-bold flex items-center justify-center gap-3">
                <Calendar className="w-7 h-7 text-primary" strokeWidth={3} />
                {selectedDate ? format(selectedDate, "yyyy年MM月dd日") : ""}
              </SheetTitle>
            </SheetHeader>
            
            <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-2 -mr-2 pb-10">
              {selectedItems.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-muted/50 rounded-3xl rotate-12 flex items-center justify-center mx-auto mb-6">
                    <span className="text-4xl -rotate-12">☕️</span>
                  </div>
                  <p className="text-muted-foreground font-medium text-lg">這天沒有安排複習喔！</p>
                </div>
              ) : (
                selectedItems.map((item, idx) => (
                  <div key={idx} className={cn(
                    "flex items-center gap-4 p-4 rounded-3xl border-2 transition-colors",
                    item.isCompleted ? "border-green-500/30 bg-green-500/5" : "border-border/50 bg-card shadow-sm"
                  )}>
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 shadow-inner", item.subject?.color || "bg-muted")}>
                      {item.subject?.emoji}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">
                          第 {item.round} 次
                        </span>
                        <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-muted text-muted-foreground truncate">
                          {item.subject?.name}
                        </span>
                      </div>
                      <h4 className={cn("font-bold text-lg truncate", item.isCompleted ? "text-muted-foreground line-through" : "text-foreground")}>
                        {item.scope}
                      </h4>
                    </div>

                    {item.isCompleted ? (
                      <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" strokeWidth={3} />
                    ) : (
                      <Circle className="w-8 h-8 text-muted-foreground/30 shrink-0" strokeWidth={3} />
                    )}
                  </div>
                ))
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </Layout>
  );
}

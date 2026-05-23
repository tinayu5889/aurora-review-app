import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Calendar, Home, PlusCircle, Book, ClipboardList, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const NAV_ITEMS = [
  { href: "/", label: "今日複習", icon: Home, small: false, showBadge: true },
  { href: "/add", label: "新增學習", icon: PlusCircle, small: false, showBadge: false },
  { href: "/calendar", label: "月曆", icon: Calendar, small: false, showBadge: false },
  { href: "/history", label: "歷程", icon: ClipboardList, small: false, showBadge: false },
  { href: "/subjects", label: "科目", icon: Book, small: false, showBadge: false },
  { href: "/weekly", label: "本週報告", icon: TrendingUp, small: true, showBadge: false },
];

function computePending(): number {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  try {
    const sessions = JSON.parse(localStorage.getItem("kr_sessions") || "[]");
    let total = 0;
    sessions.forEach((s: { reviewDates?: string[]; completedDates?: string[] }) => {
      (s.reviewDates || []).forEach(date => {
        if (date <= todayStr && !(s.completedDates || []).includes(date)) total++;
      });
    });
    return total;
  } catch {
    return 0;
  }
}

function usePendingCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(computePending());
    const update = () => setCount(computePending());
    window.addEventListener("kr-sessions-updated", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("kr-sessions-updated", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return count;
}

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const pendingCount = usePendingCount();

  return (
    <div className="min-h-[100dvh] w-full max-w-md mx-auto bg-background pb-20 relative flex flex-col shadow-xl sm:rounded-3xl sm:my-8 sm:min-h-[calc(100vh-4rem)] overflow-hidden border border-border/50">
      <main className="flex-1 overflow-y-auto w-full h-full relative">
        {children}
      </main>

      <nav className="fixed bottom-0 sm:absolute w-full max-w-md bg-white border-t border-border/50 p-1.5 pb-safe z-50 rounded-t-3xl sm:rounded-b-3xl sm:rounded-t-none shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
        <ul className="flex items-center justify-around">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            const badge = item.showBadge ? pendingCount : 0;

            return (
              <li key={item.href} className="flex-1">
                <Link href={item.href} className="block w-full">
                  <div className="flex flex-col items-center justify-center py-2 gap-0.5 relative w-full h-full">
                    {isActive && (
                      <div className="absolute inset-0 bg-primary/10 rounded-2xl -z-10 animate-in fade-in zoom-in duration-300" />
                    )}

                    <div className="relative">
                      <Icon
                        className={cn(
                          "transition-all duration-300",
                          item.small ? "w-4 h-4" : "w-5 h-5",
                          isActive
                            ? "text-primary scale-110"
                            : item.small
                            ? "text-muted-foreground/50"
                            : "text-muted-foreground"
                        )}
                      />
                      {badge > 0 && (
                        <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-rose-400 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 leading-none shadow-sm">
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </div>

                    <span
                      className={cn(
                        "font-bold transition-all duration-300",
                        item.small ? "text-[8px]" : "text-[9px]",
                        isActive
                          ? "text-primary"
                          : item.small
                          ? "text-muted-foreground/50"
                          : "text-muted-foreground"
                      )}
                    >
                      {item.label}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

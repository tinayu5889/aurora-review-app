import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Calendar, BookOpen, CalendarCheck, Clock, ClipboardList, Book, PlusCircle, Target, CalendarX2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

function computeBadges(): { today: number; overdue: number } {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  try {
    const sessions = JSON.parse(localStorage.getItem("kr_sessions") || "[]");
    let today = 0, overdue = 0;
    sessions.forEach((s: { reviewDates?: string[]; completedDates?: string[] }) => {
      (s.reviewDates || []).forEach(date => {
        if ((s.completedDates || []).includes(date)) return;
        if (date === todayStr) today++;
        else if (date < todayStr) overdue++;
      });
    });
    return { today, overdue };
  } catch {
    return { today: 0, overdue: 0 };
  }
}

function useBadges() {
  const [badges, setBadges] = useState({ today: 0, overdue: 0 });
  useEffect(() => {
    setBadges(computeBadges());
    const update = () => setBadges(computeBadges());
    window.addEventListener("kr-sessions-updated", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("kr-sessions-updated", update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return badges;
}

function NavItem({
  href, label, icon: Icon, badge, active,
}: {
  href: string; label: string; icon: React.ElementType;
  badge?: number; active: boolean;
}) {
  return (
    <Link href={href}>
      <div className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer group select-none",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "hover:bg-muted text-muted-foreground hover:text-foreground"
      )}>
        <Icon className={cn("w-4 h-4 shrink-0 transition-colors",
          active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
        )} />
        <span className={cn("text-sm font-semibold flex-1 leading-tight",
          active ? "text-primary-foreground" : "group-hover:text-foreground"
        )}>
          {label}
        </span>
        {badge !== undefined && badge > 0 && (
          <span className={cn(
            "text-[10px] font-black min-w-[20px] h-5 rounded-full flex items-center justify-center px-1.5 leading-none",
            active ? "bg-white/30 text-white" : "bg-rose-400 text-white"
          )}>
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </div>
    </Link>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const search = useSearch();
  const badges = useBadges();

  const section = new URLSearchParams(search).get("s") ?? "plan";
  const isHome = location === "/";

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* ── Left Sidebar ── */}
      <aside className="w-56 shrink-0 flex flex-col border-r border-border/50 bg-card h-full">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-sm">
              <BookOpen className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground leading-tight">Kiddo Study</p>
              <p className="text-[10px] text-muted-foreground font-medium">學習計畫管理</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">

          <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider px-3 pb-1.5 pt-0.5">今日任務</p>

          <NavItem href="/?s=plan"    label="今日讀書計畫" icon={BookOpen}      active={isHome && section === "plan"} />
          <NavItem href="/?s=today"   label="要記得複習唷" icon={CalendarCheck} badge={badges.today}   active={isHome && section === "today"} />
          <NavItem href="/?s=overdue" label="你還記得嗎"   icon={Clock}         badge={badges.overdue} active={isHome && section === "overdue"} />

          <div className="h-px bg-border/40 my-3 mx-1" />

          <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider px-3 pb-1.5 pt-0.5">管理</p>

          <NavItem href="/calendar"      label="月曆"   icon={Calendar}   active={location === "/calendar"} />
          <NavItem href="/history"       label="歷程"   icon={ClipboardList} active={location === "/history"} />
          <NavItem href="/subjects"      label="科目"   icon={Book}       active={location === "/subjects"} />
          <NavItem href="/goals"         label="學習目標" icon={Target}     active={location === "/goals"} />
          <NavItem href="/excluded-days" label="排除日"  icon={CalendarX2} active={location === "/excluded-days"} />
        </nav>

        {/* Add button */}
        <div className="px-3 py-4 border-t border-border/40">
          <Link href="/add">
            <Button
              className={cn(
                "w-full font-bold text-sm rounded-xl h-10",
                location === "/add" ? "bg-primary/80" : ""
              )}
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              新增讀書計畫
            </Button>
          </Link>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto min-w-0 bg-background">
        {children}
      </main>

    </div>
  );
}

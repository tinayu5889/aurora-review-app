import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Calendar, Home, PlusCircle, Book } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "今日複習", icon: Home },
  { href: "/add", label: "新增學習", icon: PlusCircle },
  { href: "/calendar", label: "月曆", icon: Calendar },
  { href: "/subjects", label: "科目管理", icon: Book },
];

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-[100dvh] w-full max-w-md mx-auto bg-background pb-20 relative flex flex-col shadow-xl sm:rounded-3xl sm:my-8 sm:min-h-[calc(100vh-4rem)] overflow-hidden border border-border/50">
      <main className="flex-1 overflow-y-auto w-full h-full relative">
        {children}
      </main>

      <nav className="fixed bottom-0 sm:absolute w-full max-w-md bg-white border-t border-border/50 p-2 pb-safe z-50 rounded-t-3xl sm:rounded-b-3xl sm:rounded-t-none shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
        <ul className="flex items-center justify-around">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <li key={item.href} className="flex-1">
                <Link href={item.href} className="block w-full">
                  <div className="flex flex-col items-center justify-center py-2 gap-1 relative w-full h-full">
                    {isActive && (
                      <div className="absolute inset-0 bg-primary/10 rounded-2xl -z-10 animate-in fade-in zoom-in duration-300" />
                    )}
                    <Icon
                      className={cn(
                        "w-6 h-6 transition-all duration-300",
                        isActive ? "text-primary scale-110" : "text-muted-foreground"
                      )}
                    />
                    <span
                      className={cn(
                        "text-[10px] font-bold transition-all duration-300",
                        isActive ? "text-primary" : "text-muted-foreground"
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

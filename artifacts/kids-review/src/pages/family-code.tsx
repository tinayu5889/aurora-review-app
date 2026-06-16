import { useState } from "react";
import { motion } from "framer-motion";
import { BookHeart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FAMILY_ID_KEY } from "@/lib/supabase";

interface FamilyCodePageProps {
  onEnter: (code: string) => void;
}

export default function FamilyCodePage({ onEnter }: FamilyCodePageProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setError(true);
      return;
    }
    localStorage.setItem(FAMILY_ID_KEY, trimmed);
    onEnter(trimmed);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        {/* Logo area */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center shadow-xl mb-4">
            <BookHeart className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Kiddo Study Planner</h1>
          <p className="text-muted-foreground text-sm mt-1 font-medium">學習計畫管理</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border/50 rounded-3xl p-7 shadow-sm">
          <h2 className="text-lg font-bold text-foreground mb-1">輸入家庭代碼</h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            請輸入你的家庭代碼，兩台裝置使用相同代碼即可同步讀書計畫。
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                value={code}
                onChange={e => { setCode(e.target.value); setError(false); }}
                placeholder="例如：Aurora"
                autoFocus
                autoCapitalize="none"
                autoComplete="off"
                className={`h-14 px-5 text-base font-bold rounded-2xl bg-background border-2 focus-visible:ring-primary shadow-sm transition-colors ${
                  error ? "border-red-400 focus-visible:ring-red-400" : "border-border/50"
                }`}
              />
              {error && (
                <p className="text-xs text-red-500 font-medium mt-1.5 ml-1">請輸入家庭代碼</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-13 text-base rounded-2xl font-bold shadow-md"
              style={{ height: "52px" }}
            >
              進入
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-5 font-medium">
          代碼區分大小寫，請確認兩台裝置輸入相同代碼
        </p>
      </motion.div>
    </div>
  );
}

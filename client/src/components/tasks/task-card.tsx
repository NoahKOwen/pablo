import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

export interface TaskCardProps {
  title: string;
  description: string;
  xpReward: number;
  xnrtReward: number;
  tag?: string;
  completed?: boolean;
  onClick?: () => void;
}

export function TaskCard({
  title,
  description,
  xpReward,
  xnrtReward,
  tag = "Special",
  completed,
  onClick,
}: TaskCardProps) {
  return (
    <div className="w-full rounded-2xl border border-white/5 bg-slate-900/60 px-4 py-4 md:px-6 md:py-5 shadow-lg shadow-black/30 backdrop-blur flex flex-col gap-3 md:flex-row md:items-center">
      <div className="flex items-start gap-3 flex-1">
        <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800">
          <Sparkles className="h-5 w-5 text-amber-400" />
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-base md:text-lg text-slate-100">
              {title}
            </h3>
            <Badge className="bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[11px] uppercase tracking-wide">
              {tag}
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-slate-400 leading-snug">
            {description}
          </p>
        </div>
      </div>

      <div className="flex flex-col md:items-end gap-2 md:gap-3">
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-300">
            +{xpReward} XP
          </span>
          <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
            +{xnrtReward} XNRT
          </span>
        </div>

        <Button
          size="sm"
          className="w-full md:w-auto rounded-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
          variant={completed ? "outline" : "default"}
          disabled={completed}
          onClick={onClick}
        >
          {completed ? "Completed" : "Complete"}
        </Button>
      </div>
    </div>
  );
}

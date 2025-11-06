import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Pickaxe, Zap, Clock } from "lucide-react";
import type { MiningSession } from "@shared/schema";
import { isUnauthorizedError, handleUnauthorized } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { nf } from "@/lib/number";

const XP_TO_XNRT_RATE = 0.5;

export default function Mining() {
  const { toast } = useToast();
  const { user } = useAuth(); // (still available if you ever want per-user tweaks)

  const { data: currentSession } = useQuery<MiningSession>({
    queryKey: ["/api/mining/current"],
    refetchInterval: 5000,
    staleTime: 3000,
  });

  const { data: sessions, isLoading: sessionsLoading } = useQuery<
    MiningSession[]
  >({
    queryKey: ["/api/mining/history"],
    staleTime: 15000,
    refetchOnWindowFocus: false,
  });

  // Process mining rewards automatically on interval
  const processRewardsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/mining/process-rewards", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mining/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mining/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
    },
  });

  // Auto-process rewards every 30 seconds to check for completed sessions
  useEffect(() => {
    const interval = setInterval(() => {
      processRewardsMutation.mutate();
    }, 30000);

    // Also process on mount
    processRewardsMutation.mutate();

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startMiningMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/mining/start", {});
    },
    onSuccess: () => {
      toast({
        title: "Mining Started!",
        description:
          "Your 24-hour mining session has begun. Rewards will be automatically deposited when complete!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/mining/current"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        handleUnauthorized(toast);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to start mining",
        variant: "destructive",
      });
    },
  });

  const [timeLeft, setTimeLeft] = useState("");
  const [progress, setProgress] = useState(0); // 0–100 for progress bar
  const hasInvalidatedRef = useRef(false);
  const lastSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentSession || currentSession.status !== "active") {
      hasInvalidatedRef.current = false;
      lastSessionIdRef.current = null;
      setTimeLeft("");
      setProgress(0);
      return;
    }

    // Reset flag when session ID changes (new session started)
    if (currentSession.id !== lastSessionIdRef.current) {
      hasInvalidatedRef.current = false;
      lastSessionIdRef.current = currentSession.id;
    }

    const startMs = new Date(currentSession.startTime).getTime();
    const endMs = currentSession.endTime
      ? new Date(currentSession.endTime).getTime()
      : startMs + 24 * 60 * 60 * 1000; // fallback: 24h window
    const totalMs = Math.max(endMs - startMs, 1);

    const tick = () => {
      const now = Date.now();
      const remaining = Math.max(0, endMs - now);

      if (remaining <= 0) {
        setTimeLeft("Auto-completing...");
        setProgress(100);

        if (!hasInvalidatedRef.current) {
          queryClient.invalidateQueries({ queryKey: ["/api/mining/current"] });
          queryClient.invalidateQueries({ queryKey: ["/api/mining/history"] });
          queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
          hasInvalidatedRef.current = true;
        }
      } else {
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor(
          (remaining % (1000 * 60 * 60)) / (1000 * 60),
        );
        setTimeLeft(`${hours}h ${minutes}m remaining`);

        const done = totalMs - remaining;
        const pct = Math.max(0, Math.min(100, (done / totalMs) * 100));
        setProgress(pct);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [currentSession]);

  const isSessionActive = currentSession?.status === "active";
  const isReady = !isSessionActive;
  const baseReward = currentSession?.baseReward || 10;
  const startDisabled = startMiningMutation.isPending;

  const status = isSessionActive
    ? {
        label: "Mining in Progress",
        icon: Pickaxe,
        bgClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/40",
      }
    : {
        label: "Ready to Start!",
        icon: Zap,
        bgClass: "bg-emerald-500 text-emerald-950 border-emerald-400",
      };

  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-serif">Mining</h1>
        <p className="text-muted-foreground">
          Fully automated 24-hour mining sessions with auto-deposit rewards
        </p>
      </div>

      {/* MAIN SESSION CARD */}
      <div className="grid gap-6 md:grid-cols-1">
        <Card className="border-primary/20 bg-gradient-to-b from-card/80 via-card/60 to-primary/5">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Mining Session</CardTitle>

              <Badge
                variant="outline"
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${status.bgClass}`}
                data-testid="badge-status"
              >
                <StatusIcon className="h-3.5 w-3.5" />
                {status.label}
              </Badge>
            </div>

            <CardDescription>
              {isSessionActive &&
                "Your mining session will auto-complete in 24 hours and rewards will be deposited automatically."}
              {isReady &&
                "Click START to begin a 24-hour automated mining session."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Circular mining control */}
            <div className="flex items-center justify-center">
              <div className="relative flex h-64 w-64 items-center justify-center md:h-72 md:w-72">
                {/* outer rotating ring */}
                <div
                  className={`absolute inset-0 rounded-full border-4 border-emerald-400/25 ${
                    isSessionActive
                      ? "border-transparent border-t-4 border-r-4 border-t-emerald-400 border-r-lime-300 animate-spin"
                      : ""
                  }`}
                />

                {/* rotating network nodes */}
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 animate-[spin_20s_linear_infinite]">
                  {/* 5 outer nodes */}
                  <span className="absolute left-1/2 top-0 h-4 w-4 -translate-x-1/2 rounded-full bg-gradient-to-br from-cyan-400 to-sky-500 shadow-[0_0_20px_rgba(34,211,238,0.7)]" />
                  <span className="absolute right-0 top-1/3 h-4 w-4 rounded-full bg-gradient-to-br from-cyan-400 to-sky-500 shadow-[0_0_20px_rgba(34,211,238,0.7)]" />
                  <span className="absolute bottom-0 right-1/4 h-4 w-4 rounded-full bg-gradient-to-br from-cyan-400 to-sky-500 shadow-[0_0_20px_rgba(34,211,238,0.7)]" />
                  <span className="absolute bottom-0 left-1/4 h-4 w-4 rounded-full bg-gradient-to-br from-cyan-400 to-sky-500 shadow-[0_0_20px_rgba(34,211,238,0.7)]" />
                  <span className="absolute left-0 top-1/3 h-4 w-4 rounded-full bg-gradient-to-br from-cyan-400 to-sky-500 shadow-[0_0_20px_rgba(34,211,238,0.7)]" />

                  {/* center node */}
                  <span className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-emerald-400 via-lime-300 to-yellow-300 shadow-[0_0_30px_rgba(52,211,153,0.8)]" />
                </div>

                {/* inner clickable disk */}
                <button
                  type="button"
                  className={`relative z-10 flex h-52 w-52 flex-col items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 via-lime-300 to-amber-300 text-emerald-950 shadow-[0_20px_40px_rgba(34,197,94,0.35)] transition-transform ${
                    isReady && !startDisabled
                      ? "hover:translate-y-[-3px] active:translate-y-[1px]"
                      : ""
                  } ${
                    !isReady || startDisabled
                      ? "cursor-not-allowed opacity-70"
                      : "cursor-pointer"
                  }`}
                  disabled={!isReady || startDisabled}
                  onClick={() => {
                    if (isReady && !startDisabled) {
                      startMiningMutation.mutate();
                    }
                  }}
                  aria-label="Start mining"
                  data-testid="button-mining-start"
                >
                  <Pickaxe className="mb-2 h-14 w-14 text-white drop-shadow-[0_0_18px_rgba(15,23,42,0.5)]" />
                  <p className="text-lg font-extrabold tracking-wide text-white">
                    {isSessionActive ? "MINING" : "START"}
                  </p>
                </button>
              </div>
            </div>

            {/* timer + progress */}
            {isSessionActive && (
              <div className="space-y-3">
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-1.5 text-sm font-mono font-semibold text-emerald-300">
                    <Clock className="h-4 w-4" />
                    <span data-testid="text-active-countdown">{timeLeft}</span>
                  </div>
                </div>

                <div className="mx-auto h-2 w-full max-w-md overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-lime-300 to-amber-300 shadow-[0_0_20px_rgba(52,211,153,0.7)] transition-[width] duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {isReady && (
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold text-emerald-400">
                  Ready to Mine!
                </p>
                <p className="text-sm text-muted-foreground">
                  Earn {nf(baseReward)} XP and{" "}
                  {(baseReward * XP_TO_XNRT_RATE).toFixed(1)} XNRT automatically
                  after 24 hours.
                </p>
              </div>
            )}

            {/* reward summary */}
            {isSessionActive && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Base Reward
                  </span>
                  <span className="text-xl font-bold text-emerald-300">
                    {nf(currentSession.baseReward)} XP
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    XNRT Conversion
                  </span>
                  <span className="text-xl font-bold text-emerald-300">
                    {(currentSession.baseReward * XP_TO_XNRT_RATE).toFixed(1)}{" "}
                    XNRT
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* HISTORY CARD */}
      <Card>
        <CardHeader>
          <CardTitle>Mining History</CardTitle>
          <CardDescription>Your recent mining sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <div className="space-y-2.5 sm:space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 rounded-xl border-white/10 bg-white/5 animate-pulse"
                  role="status"
                  aria-label="Loading sessions"
                />
              ))}
            </div>
          ) : !sessions || sessions.length === 0 ? (
            <div className="py-12 text-center">
              <Pickaxe className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
              <p className="text-muted-foreground">No mining sessions yet</p>
            </div>
          ) : (
            <div className="space-y-2.5 sm:space-y-3">
              {sessions.slice(0, 10).map((session) => {
                const started = new Date(session.startTime);
                const ended = session.endTime ? new Date(session.endTime) : null;
                const durationHrs = ended
                  ? Math.max(1, Math.round((+ended - +started) / 3_600_000))
                  : 24;

                const isCompleted = session.status === "completed";

                return (
                  <div
                    key={session.id}
                    className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:p-4 transition-colors hover:bg-white/[0.05]"
                    data-testid={`session-${session.id}`}
                  >
                    <div
                      className="pointer-events-none absolute inset-0 opacity-[0.04] sm:opacity-[0.06]"
                      aria-hidden="true"
                      style={{
                        backgroundImage:
                          "linear-gradient(to right, rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.3) 1px, transparent 1px)",
                        backgroundSize: "20px 20px",
                      }}
                    />
                    <div className="relative z-10 flex items-center gap-3 sm:gap-4">
                      <div
                        className={`grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-lg ${
                          isCompleted ? "bg-emerald-500/20" : "bg-muted"
                        }`}
                      >
                        <Pickaxe
                          className={
                            isCompleted
                              ? "text-emerald-400"
                              : "text-muted-foreground"
                          }
                          aria-hidden="true"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold leading-none sm:text-base">
                            Mining Session
                          </p>
                          <Badge
                            variant="outline"
                            className={`h-5 rounded-full px-2 text-[10px] capitalize sm:h-6 sm:text-[11px] ${
                              isCompleted
                                ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
                                : "border-muted bg-muted/40 text-muted-foreground"
                            }`}
                          >
                            {session.status}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground sm:mt-1 sm:text-xs">
                          {new Intl.DateTimeFormat(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(started)}
                          {ended && (
                            <span className="hidden sm:inline">
                              {" "}
                              · {durationHrs}h
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-bold text-emerald-300 sm:text-base">
                          +{nf(session.finalReward)} XP
                        </div>
                        <div className="text-[11px] text-muted-foreground sm:text-sm">
                          +
                          {(
                            session.finalReward * XP_TO_XNRT_RATE
                          ).toFixed(1)}{" "}
                          XNRT
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

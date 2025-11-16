// client/src/pages/tasks.tsx
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ListChecks,
  CheckCircle2,
  Sparkles,
  Calendar,
  Star,
} from "lucide-react";
import type { Task, UserTask } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { useConfetti } from "@/hooks/use-confetti";

type UserTaskWithTask = UserTask & {
  task: Task;
};

export default function Tasks() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { celebrate } = useConfetti();

  const {
    data: userTasks,
    isLoading,
  } = useQuery<UserTaskWithTask[]>({
    queryKey: ["/api/tasks/user"],
  });

  const completeTaskMutation = useMutation<
    { xpReward: number; xnrtReward: number },
    Error,
    string
  >({
    mutationFn: async (taskId: string) => {
      const res = await apiRequest("POST", `/api/tasks/${taskId}/complete`, {});
      const data = (await res.json()) as {
        xpReward: number;
        xnrtReward: number;
      };
      return data;
    },
    onSuccess: (data) => {
      const previousXP = user?.xp ?? 0;
      const newXP = previousXP + (data.xpReward || 0);
      const previousLevel = Math.floor(previousXP / 1000) + 1;
      const newLevel = Math.floor(newXP / 1000) + 1;
      const leveledUp = newLevel > previousLevel;

      toast({
        title: "Task Completed!",
        description: `You earned ${data.xpReward} XP and ${data.xnrtReward} XNRT!`,
      });

      if (leveledUp) {
        celebrate("levelup");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/tasks/user"] });
      queryClient.invalidateQueries({ queryKey: ["/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to complete task",
        variant: "destructive",
      });
    },
  });

  const allTasks = userTasks ?? [];

  const dailyTasks = allTasks.filter((t) => t.task.category === "daily");
  const weeklyTasks = allTasks.filter((t) => t.task.category === "weekly");
  const specialTasks = allTasks.filter((t) => t.task.category === "special");

  const completedCount = (tasks: UserTaskWithTask[]) =>
    tasks.filter((t) => t.completed).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-serif">Tasks</h1>
        <p className="text-muted-foreground">
          Complete tasks to earn XP and XNRT rewards
        </p>
      </div>

      {/* Top summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-primary/10 bg-gradient-to-br from-card to-primary/5">
          <CardContent className="p-6">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Daily Tasks</p>
              <Calendar className="h-5 w-5 text-chart-1" />
            </div>
            <p className="font-mono text-3xl font-bold">
              {completedCount(dailyTasks)}/{dailyTasks.length}
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 bg-gradient-to-br from-card to-chart-2/10">
          <CardContent className="p-6">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Weekly Tasks</p>
              <Star className="h-5 w-5 text-chart-2" />
            </div>
            <p className="font-mono text-3xl font-bold">
              {completedCount(weeklyTasks)}/{weeklyTasks.length}
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 bg-gradient-to-br from-card to-chart-5/10">
          <CardContent className="p-6">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Special Tasks</p>
              <Sparkles className="h-5 w-5 text-chart-5" />
            </div>
            <p className="font-mono text-3xl font-bold">
              {completedCount(specialTasks)}/{specialTasks.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Loading state */}
      {isLoading && (
        <Card>
          <CardContent className="space-y-3 p-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-md bg-muted/60"
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Daily tasks */}
      {!isLoading && dailyTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-chart-1" />
              Daily Tasks
            </CardTitle>
            <CardDescription>
              Complete daily to maintain your streak
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dailyTasks.map((userTask) => (
              <TaskItem
                key={userTask.id}
                userTask={userTask}
                onComplete={() =>
                  completeTaskMutation.mutate(userTask.taskId as string)
                }
                isPending={completeTaskMutation.isPending}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Weekly tasks */}
      {!isLoading && weeklyTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-chart-2" />
              Weekly Tasks
            </CardTitle>
            <CardDescription>
              Higher rewards for weekly completion
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {weeklyTasks.map((userTask) => (
              <TaskItem
                key={userTask.id}
                userTask={userTask}
                onComplete={() =>
                  completeTaskMutation.mutate(userTask.taskId as string)
                }
                isPending={completeTaskMutation.isPending}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Special tasks */}
      {!isLoading && specialTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-chart-5" />
              Special Tasks
            </CardTitle>
            <CardDescription>
              Limited time tasks with bonus rewards
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {specialTasks.map((userTask) => (
              <TaskItem
                key={userTask.id}
                userTask={userTask}
                onComplete={() =>
                  completeTaskMutation.mutate(userTask.taskId as string)
                }
                isPending={completeTaskMutation.isPending}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && (!userTasks || userTasks.length === 0) && (
        <Card>
          <CardContent className="p-12 text-center">
            <ListChecks className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">No tasks available</p>
            <p className="text-sm text-muted-foreground">
              Check back later for new tasks
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TaskItem({
  userTask,
  onComplete,
  isPending,
}: {
  userTask: UserTaskWithTask;
  onComplete: () => void;
  isPending: boolean;
}) {
  const { task } = userTask;
  const [linkOpened, setLinkOpened] = useState(false);

  const progress =
    userTask.maxProgress > 0
      ? (userTask.progress / userTask.maxProgress) * 100
      : 0;

  const CategoryIcon =
    task.category === "daily"
      ? Calendar
      : task.category === "weekly"
      ? Star
      : Sparkles;

  const xnrtRewardNumber =
    typeof task.xnrtReward === "number"
      ? task.xnrtReward
      : parseFloat(task.xnrtReward || "0");

  // Extract URL from description (for special tasks)
  const urlRegex = /(https?:\/\/\S+)/;
  const urlMatch = task.description?.match(urlRegex);
  let taskUrl = urlMatch?.[0] ?? null;

  // Hard override for WhatsApp Community task
  if (task.title === "Join WhatsApp Community") {
    taskUrl = "https://chat.whatsapp.com/KjAjDTb1LX4I6cyXMctV1s";
  }

  const descriptionWithoutUrl = task.description
    ? task.description.replace(urlRegex, "").replace(/[:\-–]+\s*$/, "").trim()
    : "";

  // Special tasks → app icon
  const titleLower = task.title.toLowerCase();
  let appIconSrc: string | null = null;

  if (titleLower.includes("whatsapp")) {
    appIconSrc = "/icons/whatsapp.png";
  } else if (titleLower.includes("telegram")) {
    appIconSrc = "/icons/telegram.png";
  } else if (
    titleLower.includes("twitter") ||
    titleLower.includes("x (twitter)") ||
    titleLower.includes(" x ")
  ) {
    appIconSrc = "/icons/X.png";
  } else if (titleLower.includes("facebook")) {
    appIconSrc = "/icons/facebook.png";
  } else if (titleLower.includes("instagram")) {
    appIconSrc = "/icons/instagram.png";
  }

  const showAppIcon = task.category === "special" && appIconSrc;

  // Disable Complete if:
  // - mutation is pending OR
  // - multi-step task and progress not full OR
  // - special task with link that has not been opened yet
  const requiresProgress = userTask.maxProgress > 1;
  const requiresLinkOpen = task.category === "special" && !!taskUrl;
  const isLockedByProgress =
    requiresProgress && userTask.progress < userTask.maxProgress;
  const isLockedByLink = requiresLinkOpen && !linkOpened;
  const completeDisabled = isPending || isLockedByProgress || isLockedByLink;

  // SPECIAL TASKS
  if (task.category === "special") {
    return (
      <div
        className="rounded-2xl border border-primary/10 bg-gradient-to-br from-slate-900 to-slate-950 px-4 py-4 md:px-6 md:py-5 shadow-xl shadow-black/40"
        data-testid={`task-${userTask.id}`}
      >
        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-800">
            {showAppIcon ? (
              <img
                src={appIconSrc!}
                alt={task.title}
                className="h-7 w-7 rounded-xl object-contain"
              />
            ) : userTask.completed ? (
              <CheckCircle2 className="h-6 w-6 text-chart-2" />
            ) : (
              <CategoryIcon className="h-6 w-6 text-muted-foreground" />
            )}
          </div>

          <div className="flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-sm md:text-base">
                {task.title}
              </p>
              <Badge className="bg-amber-500/20 text-amber-200 border border-amber-400/40 text-[11px] uppercase">
                Special
              </Badge>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">
              {descriptionWithoutUrl}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border border-chart-1/40 bg-chart-1/10 px-3 py-1 text-[11px] font-medium text-chart-1">
              +{task.xpReward} XP
            </span>
            {xnrtRewardNumber > 0 && (
              <span className="inline-flex items-center rounded-full border border-chart-2/40 bg-chart-2/10 px-3 py-1 text-[11px] font-medium text-chart-2">
                +{xnrtRewardNumber.toLocaleString()} XNRT
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 self-start md:self-auto">
            {taskUrl && (
              <Button
                size="sm"
                variant="outline"
                className="rounded-full px-4 border-amber-400/60 bg-transparent text-amber-200 hover:bg-amber-500/10"
                onClick={(e) => {
                  e.stopPropagation();
                  setLinkOpened(true); // mark that user opened the link
                  window.open(taskUrl, "_blank");
                }}
              >
                Open link
              </Button>
            )}

            {userTask.completed ? (
              <Badge
                variant="default"
                className="bg-chart-2 text-xs px-4 py-1 rounded-full"
              >
                Completed
              </Badge>
            ) : (
              <Button
                size="sm"
                className="rounded-full px-6"
                disabled={completeDisabled}
                onClick={(e) => {
                  e.stopPropagation();
                  onComplete();
                }}
                data-testid={`button-complete-${userTask.id}`}
              >
                Complete
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // DAILY / WEEKLY – standard row
  return (
    <div
      className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between rounded-md border border-border p-4 hover-elevate"
      data-testid={`task-${userTask.id}`}
    >
      <div className="flex flex-1 items-start gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-md ${
            userTask.completed ? "bg-chart-2/20" : "bg-muted"
          }`}
        >
          {userTask.completed ? (
            <CheckCircle2 className="h-6 w-6 text-chart-2" />
          ) : (
            <CategoryIcon className="h-6 w-6 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <p className="font-semibold">{task.title}</p>
            <Badge variant="secondary" className="capitalize">
              {task.category}
            </Badge>
          </div>
          <p className="mb-2 text-sm text-muted-foreground">
            {task.description}
          </p>

          {!userTask.completed && userTask.maxProgress > 1 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold">
                  {userTask.progress}/{userTask.maxProgress}
                </span>
              </div>
              <Progress value={progress} />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col items-start gap-2 md:items-end">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="bg-chart-1/10">
            +{task.xpReward} XP
          </Badge>
          {xnrtRewardNumber > 0 && (
            <Badge variant="outline" className="bg-chart-2/10">
              +{xnrtRewardNumber.toLocaleString()} XNRT
            </Badge>
          )}
        </div>

        {userTask.completed ? (
          <Badge variant="default" className="bg-chart-2">
            Completed
          </Badge>
        ) : (
          <Button
            size="sm"
            disabled={completeDisabled}
            onClick={onComplete}
            data-testid={`button-complete-${userTask.id}`}
            aria-label={`Complete task ${task.title}`}
          >
            Complete
          </Button>
        )}
      </div>
    </div>
  );
}

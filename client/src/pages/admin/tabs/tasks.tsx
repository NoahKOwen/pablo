// client/src/pages/tasks.tsx
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

  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await apiRequest(
        "POST",
        `/api/tasks/${taskId}/complete`,
        {}
      );
      // response JSON -> { xpReward, xnrtReward }
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

function renderDescriptionWithLink(description: string) {
  if (!description) return null;

  const match = description.match(/https?:\/\/\S+/);
  if (!match) return <span>{description}</span>;

  const url = match[0];
  const [before, after] = description.split(url);
  const display =
    url.length > 45 ? `${url.slice(0, 42)}…` : url;

  return (
    <>
      {before}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline-offset-2 hover:underline"
      >
        {display}
      </a>
      {after}
    </>
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

  return (
    <div
      className="flex flex-col gap-4 rounded-xl border border-border bg-card/40 p-4 hover-elevate md:flex-row md:items-center md:justify-between"
      data-testid={`task-${userTask.id}`}
    >
      {/* Left: icon + text */}
      <div className="flex flex-1 items-start gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-full ${
            userTask.completed ? "bg-chart-2/20" : "bg-muted"
          }`}
        >
          {userTask.completed ? (
            <CheckCircle2 className="h-6 w-6 text-chart-2" />
          ) : (
            <CategoryIcon className="h-6 w-6 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold leading-tight">{task.title}</p>
            <Badge variant="secondary" className="capitalize">
              {task.category}
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            {renderDescriptionWithLink(task.description)}
          </p>

          {!userTask.completed && userTask.maxProgress > 1 && (
            <div className="space-y-1 pt-1">
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

      {/* Right: rewards + button */}
      <div className="flex flex-col items-end gap-2 md:items-end">
        <div className="flex flex-wrap items-center justify-end gap-2">
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
            disabled={userTask.progress < userTask.maxProgress || isPending}
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

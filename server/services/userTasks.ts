// server/services/userTasks.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Make sure a user has UserTask rows for all active tasks.
 */
export async function ensureUserTasksForUser(userId: string) {
  // saare active tasks lao
  const tasks = await prisma.task.findMany({
    where: { isActive: true },
  });

  if (!tasks.length) return;

  // user ke existing userTask rows
  const existing = await prisma.userTask.findMany({
    where: { userId },
    select: { taskId: true },
  });

  const existingIds = new Set(existing.map((e) => e.taskId));
  const missing = tasks.filter((t) => !existingIds.has(t.id));

  if (!missing.length) return;

  await prisma.userTask.createMany({
    data: missing.map((task) => ({
      userId,
      taskId: task.id,
      progress: 0,
      maxProgress: 1,
      completed: false,
    })),
    skipDuplicates: true,
  });
}

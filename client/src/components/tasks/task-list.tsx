// client/src/components/tasks/task-list.tsx
import { TaskCard, TaskCardProps } from "./task-card";

interface TaskListProps {
  tasks: (TaskCardProps & { id: string })[];
  onComplete: (id: string) => void;
}

export function TaskList({ tasks, onComplete }: TaskListProps) {
  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          {...task}
          onClick={() => onComplete(task.id)}
        />
      ))}
    </div>
  );
}

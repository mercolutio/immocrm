import type { Task, TaskPriority } from "@/lib/types";

export interface TaskItem {
  kind: "task";
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  priority: TaskPriority;
  raw: Task;
}

export interface AppointmentItem {
  kind: "appointment";
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  durationMin: number;
  location: string | null;
}

export type TodayFeedItem = TaskItem | AppointmentItem;

export type TodayFeedGroup = {
  key: "overdue" | "today";
  label: string;
  urgent: boolean;
  items: TodayFeedItem[];
};

export function taskToItem(task: Task): TaskItem {
  return {
    kind: "task",
    id: task.id,
    title: task.title,
    description: task.description,
    dueAt: task.due_date,
    priority: task.priority,
    raw: task,
  };
}

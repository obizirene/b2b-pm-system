/**
 * Task entity definitions & Task Dependency structures
 */

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskType = 'feature' | 'optimization' | 'bug' | 'cr';

export interface Task {
  id: string;
  masterProjectId: string; // Denormalized for rapid query
  subProjectId: string; // Belongs to SubProject / Phase
  type?: TaskType; // 'feature' | 'optimization' | 'bug' | 'cr'
  title: string;
  description: string;
  assigneeId: string; // Assigned User ID
  assigneeName?: string;
  status: TaskStatus;
  priority: TaskPriority;
  estimatedHours: number;
  actualHours: number;
  startDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD (target end date)
  completedDate?: string; // YYYY-MM-DD (actual completed date)
  dependencies: string[]; // Prerequisite task IDs (string[])
  createdAt: string;
  updatedAt: string;
}

export type CreateTaskInput = Omit<Task, 'id' | 'actualHours' | 'completedDate' | 'createdAt' | 'updatedAt'> & {
  estimatedHours?: number;
  dependencies?: string[];
};

export type UpdateTaskInput = Partial<Omit<Task, 'id' | 'masterProjectId' | 'subProjectId' | 'createdAt' | 'updatedAt'>>;

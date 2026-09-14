/**
 * Work Log / Timesheet entry definition
 */

export interface WorkLog {
  id: string;
  taskId: string;
  taskTitle?: string;
  masterProjectId?: string;
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD
  hours: number; // Hours logged (e.g. 4.5)
  notes: string; // Description of work completed
  createdAt: string;
  updatedAt: string;
}

export type CreateWorkLogInput = Omit<WorkLog, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateWorkLogInput = Partial<CreateWorkLogInput>;

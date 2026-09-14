/**
 * Gantt Chart data view types
 */

export interface GanttItem {
  id: string;
  name: string;
  type: 'phase' | 'task';
  subProjectId: string;
  startDate: string; // YYYY-MM-DD
  targetEndDate: string; // YYYY-MM-DD
  actualEndDate?: string; // YYYY-MM-DD
  progressPercent: number; // 0 to 100
  assigneeName?: string;
  status: string;
  dependencies: string[]; // Prerequisite item IDs
  varianceDays: number; // Target vs Actual end date diff (or delay relative to today)
}

export interface GanttGroup {
  subProjectId: string;
  subProjectName: string;
  startDate: string;
  targetEndDate: string;
  actualEndDate?: string;
  progressPercent: number;
  tasks: GanttItem[];
}

/**
 * Dashboard & Project Metrics statistics types
 */

export interface ProjectSummary {
  masterProjectId: string;
  masterProjectName: string;
  masterProjectCode: string;
  clientName: string;
  status: string;
  totalEstimatedHours: number;
  totalActualHours: number;
  overallProgressPercent: number;
  unresolvedBugsCount: number; // Open & In_Progress Bugs
  activeCRsCount: number; // Submitted / In_Progress CRs
  isDelayed: boolean; // Flag if today > targetEndDate & status !== completed
  delayDays: number; // Positive number of days delayed
  targetEndDate: string;
  actualEndDate?: string;
}

export interface DashboardMetrics {
  totalClients: number;
  activeProjects: number;
  delayedProjectsCount: number;
  totalCriticalBugs: number;
  pendingCRsCount: number;
  projectSummaries: ProjectSummary[];
}

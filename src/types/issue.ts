/**
 * Issue / Bug entity definitions
 */

export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface Issue {
  id: string;
  masterProjectId: string; // Associated Master Project
  subProjectId?: string; // Associated Sub-Project / Phase (Optional)
  reporterId: string; // Reporter User ID
  reporterName?: string;
  assigneeId: string; // Assignee User ID
  assigneeName?: string;
  title: string;
  description: string;
  severity: IssueSeverity;
  status: IssueStatus;
  stepsToReproduce: string;
  createdAt: string;
  resolvedAt?: string;
  updatedAt: string;
}

export type CreateIssueInput = Omit<Issue, 'id' | 'createdAt' | 'resolvedAt' | 'updatedAt'>;
export type UpdateIssueInput = Partial<Omit<Issue, 'id' | 'masterProjectId' | 'createdAt' | 'updatedAt'>>;

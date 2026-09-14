/**
 * Change Request (CR) entity definitions
 */

export type CRApprovalStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export type CRImplementStatus = 'pending' | 'in_progress' | 'completed';

export interface ChangeRequest {
  id: string;
  masterProjectId: string; // Associated Master Project
  subProjectId?: string; // Associated Sub-Project / Phase (Optional)
  applicantId: string; // Client / Reporter User ID
  applicantName?: string;
  title: string;
  backgroundReason: string; // Background / Reason for change
  proposedChanges: string; // Detailed proposed changes
  impactScope: string; // Impact on schedule, cost, scope
  estimatedAdditionalHours: number; // Additional estimated hours
  approvalStatus: CRApprovalStatus;
  implementStatus: CRImplementStatus;
  createdAt: string;
  approvedAt?: string;
  updatedAt: string;
}

export type CreateChangeRequestInput = Omit<ChangeRequest, 'id' | 'createdAt' | 'approvedAt' | 'updatedAt'>;
export type UpdateChangeRequestInput = Partial<Omit<ChangeRequest, 'id' | 'masterProjectId' | 'createdAt' | 'updatedAt'>>;

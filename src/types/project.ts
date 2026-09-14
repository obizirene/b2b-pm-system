/**
 * Master Project & Sub-Project (Phase) entity definitions
 */

export type MasterProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed';

export interface MasterProject {
  id: string;
  clientId: string; // Belongs to Client
  name: string;
  code: string; // e.g. "PRJ-2026-001"
  description: string;
  status: MasterProjectStatus;
  ownerId: string; // Project Manager / Owner User ID
  startDate: string; // YYYY-MM-DD
  targetEndDate: string; // YYYY-MM-DD
  actualEndDate?: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

export type CreateMasterProjectInput = Omit<MasterProject, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateMasterProjectInput = Partial<CreateMasterProjectInput>;

export type SubProjectStatus = 'planning' | 'in_progress' | 'review' | 'completed' | 'on_hold';
export type SubProjectPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface SubProject {
  id: string;
  masterProjectId: string; // Belongs to MasterProject
  name: string;
  description: string;
  status: SubProjectStatus;
  priority: SubProjectPriority;
  estimatedHours: number;
  actualHours: number;
  startDate: string; // YYYY-MM-DD
  targetEndDate: string; // YYYY-MM-DD
  actualEndDate?: string; // YYYY-MM-DD
  progressPercent: number; // 0 to 100
  createdAt: string;
  updatedAt: string;
}

export type CreateSubProjectInput = Omit<SubProject, 'id' | 'actualHours' | 'progressPercent' | 'createdAt' | 'updatedAt'> & {
  estimatedHours?: number;
};
export type UpdateSubProjectInput = Partial<Omit<SubProject, 'id' | 'masterProjectId' | 'createdAt' | 'updatedAt'>>;

import { MasterProject, SubProject, CreateMasterProjectInput, UpdateMasterProjectInput, CreateSubProjectInput, UpdateSubProjectInput } from '@/types';
import { mockMasterProjects, mockSubProjects } from './mockData';

let masterProjectStore: MasterProject[] = [...mockMasterProjects];
let subProjectStore: SubProject[] = [...mockSubProjects];

export const projectService = {
  // Master Projects CRUD
  async getMasterProjects(): Promise<MasterProject[]> {
    return [...masterProjectStore];
  },

  async getMasterProjectById(id: string): Promise<MasterProject | null> {
    const project = masterProjectStore.find((p) => p.id === id);
    return project ? { ...project } : null;
  },

  async getMasterProjectsByClient(clientId: string): Promise<MasterProject[]> {
    return masterProjectStore.filter((p) => p.clientId === clientId);
  },

  async createMasterProject(input: CreateMasterProjectInput): Promise<MasterProject> {
    const newProject: MasterProject = {
      ...input,
      id: `prj-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    masterProjectStore.push(newProject);
    return newProject;
  },

  async updateMasterProject(id: string, input: UpdateMasterProjectInput): Promise<MasterProject> {
    const index = masterProjectStore.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Master project not found');
    masterProjectStore[index] = {
      ...masterProjectStore[index],
      ...input,
      updatedAt: new Date().toISOString(),
    };
    return { ...masterProjectStore[index] };
  },

  // Sub-Projects (Phases) CRUD
  async getSubProjects(masterProjectId?: string): Promise<SubProject[]> {
    if (masterProjectId) {
      return subProjectStore.filter((s) => s.masterProjectId === masterProjectId);
    }
    return [...subProjectStore];
  },

  async createSubProject(input: CreateSubProjectInput): Promise<SubProject> {
    const newSub: SubProject = {
      ...input,
      estimatedHours: input.estimatedHours ?? 0,
      actualHours: 0,
      progressPercent: 0,
      id: `sub-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    subProjectStore.push(newSub);
    return newSub;
  },

  async updateSubProject(id: string, input: UpdateSubProjectInput): Promise<SubProject> {
    const index = subProjectStore.findIndex((s) => s.id === id);
    if (index === -1) throw new Error('SubProject not found');
    subProjectStore[index] = {
      ...subProjectStore[index],
      ...input,
      updatedAt: new Date().toISOString(),
    };
    return { ...subProjectStore[index] };
  },
};

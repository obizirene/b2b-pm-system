import { ChangeRequest, CreateChangeRequestInput, UpdateChangeRequestInput } from '@/types';
import { mockChangeRequests } from './mockData';

let crStore: ChangeRequest[] = [...mockChangeRequests];

export const changeRequestService = {
  async getChangeRequests(masterProjectId?: string): Promise<ChangeRequest[]> {
    if (masterProjectId) {
      return crStore.filter((cr) => cr.masterProjectId === masterProjectId);
    }
    return [...crStore];
  },

  async createChangeRequest(input: CreateChangeRequestInput): Promise<ChangeRequest> {
    const newCR: ChangeRequest = {
      ...input,
      id: `cr-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    crStore.push(newCR);
    return newCR;
  },

  async updateChangeRequest(id: string, input: UpdateChangeRequestInput): Promise<ChangeRequest> {
    const index = crStore.findIndex((cr) => cr.id === id);
    if (index === -1) throw new Error('Change request not found');
    const updated = {
      ...crStore[index],
      ...input,
      updatedAt: new Date().toISOString(),
    };
    if (input.approvalStatus === 'approved' && !updated.approvedAt) {
      updated.approvedAt = new Date().toISOString();
    }
    crStore[index] = updated;
    return { ...updated };
  },
};

import { Issue, CreateIssueInput, UpdateIssueInput } from '@/types';
import { mockIssues } from './mockData';

let issueStore: Issue[] = [...mockIssues];

export const issueService = {
  async getIssues(masterProjectId?: string): Promise<Issue[]> {
    if (masterProjectId) {
      return issueStore.filter((i) => i.masterProjectId === masterProjectId);
    }
    return [...issueStore];
  },

  async createIssue(input: CreateIssueInput): Promise<Issue> {
    const newIssue: Issue = {
      ...input,
      id: `issue-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    issueStore.push(newIssue);
    return newIssue;
  },

  async updateIssue(id: string, input: UpdateIssueInput): Promise<Issue> {
    const index = issueStore.findIndex((i) => i.id === id);
    if (index === -1) throw new Error('Issue not found');
    const updated = {
      ...issueStore[index],
      ...input,
      updatedAt: new Date().toISOString(),
    };
    if (input.status === 'resolved' || input.status === 'closed') {
      if (!updated.resolvedAt) updated.resolvedAt = new Date().toISOString();
    }
    issueStore[index] = updated;
    return { ...updated };
  },

  async deleteIssue(id: string): Promise<boolean> {
    issueStore = issueStore.filter((i) => i.id !== id);
    return true;
  },
};

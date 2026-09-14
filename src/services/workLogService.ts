import { WorkLog, CreateWorkLogInput, UpdateWorkLogInput } from '../types/workLog';
import { initialWorkLogs } from './mockData';

let workLogsStore: WorkLog[] = [...initialWorkLogs];

export const getWorkLogs = async (taskId?: string, userId?: string): Promise<WorkLog[]> => {
  let list = [...workLogsStore];
  if (taskId) {
    list = list.filter(w => w.taskId === taskId);
  }
  if (userId) {
    list = list.filter(w => w.userId === userId);
  }
  return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const createWorkLog = async (input: CreateWorkLogInput): Promise<WorkLog> => {
  const newLog: WorkLog = {
    ...input,
    id: `wl-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  workLogsStore.unshift(newLog);
  return newLog;
};

export const updateWorkLog = async (id: string, input: UpdateWorkLogInput): Promise<WorkLog> => {
  const idx = workLogsStore.findIndex(w => w.id === id);
  if (idx === -1) throw new Error('WorkLog not found');

  const updated: WorkLog = {
    ...workLogsStore[idx],
    ...input,
    updatedAt: new Date().toISOString(),
  };
  workLogsStore[idx] = updated;
  return updated;
};

export const deleteWorkLog = async (id: string): Promise<boolean> => {
  const idx = workLogsStore.findIndex(w => w.id === id);
  if (idx === -1) return false;
  workLogsStore.splice(idx, 1);
  return true;
};

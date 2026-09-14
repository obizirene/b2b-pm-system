import { Task, CreateTaskInput, UpdateTaskInput } from '@/types';
import { mockTasks } from './mockData';

let taskStore: Task[] = [...mockTasks];

export const taskService = {
  async getTasks(masterProjectId?: string, subProjectId?: string): Promise<Task[]> {
    let result = [...taskStore];
    if (masterProjectId) {
      result = result.filter((t) => t.masterProjectId === masterProjectId);
    }
    if (subProjectId) {
      result = result.filter((t) => t.subProjectId === subProjectId);
    }
    return result;
  },

  async createTask(input: CreateTaskInput): Promise<Task> {
    const newTask: Task = {
      ...input,
      id: `task-${Date.now()}`,
      estimatedHours: input.estimatedHours || 0,
      actualHours: 0,
      dependencies: input.dependencies || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    taskStore.push(newTask);
    return newTask;
  },

  async updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
    const index = taskStore.findIndex((t) => t.id === id);
    if (index === -1) throw new Error('Task not found');
    const updated = {
      ...taskStore[index],
      ...input,
      updatedAt: new Date().toISOString(),
    };
    if (input.status === 'done' && !updated.completedDate) {
      updated.completedDate = new Date().toISOString().split('T')[0];
    }
    taskStore[index] = updated;
    return { ...updated };
  },

  async deleteTask(id: string): Promise<boolean> {
    taskStore = taskStore.filter((t) => t.id !== id);
    // Remove from dependencies of other tasks
    taskStore = taskStore.map((t) => ({
      ...t,
      dependencies: t.dependencies.filter((depId) => depId !== id),
    }));
    return true;
  },
};

import { Client, CreateClientInput, UpdateClientInput } from '@/types';
import { mockClients } from './mockData';

let clientStore: Client[] = [...mockClients];

export const clientService = {
  async getClients(): Promise<Client[]> {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...clientStore]), 100);
    });
  },

  async getClientById(id: string): Promise<Client | null> {
    const client = clientStore.find((c) => c.id === id);
    return client ? { ...client } : null;
  },

  async createClient(input: CreateClientInput): Promise<Client> {
    const newClient: Client = {
      ...input,
      id: `cli-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    clientStore.push(newClient);
    return newClient;
  },

  async updateClient(id: string, input: UpdateClientInput): Promise<Client> {
    const index = clientStore.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Client not found');
    clientStore[index] = {
      ...clientStore[index],
      ...input,
      updatedAt: new Date().toISOString(),
    };
    return { ...clientStore[index] };
  },

  async deleteClient(id: string): Promise<boolean> {
    clientStore = clientStore.filter((c) => c.id !== id);
    return true;
  },
};

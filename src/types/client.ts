/**
 * Client entity definition
 */

export type ClientStatus = 'active' | 'archived';

export interface Client {
  id: string;
  name: string;
  code: string; // e.g. "CLI-ACME"
  contactPerson: string;
  email: string;
  phone: string;
  status: ClientStatus;
  notes?: string;
  createdAt: string; // ISO 8601 string or Timestamp string
  updatedAt: string;
}

export type CreateClientInput = Omit<Client, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateClientInput = Partial<CreateClientInput>;

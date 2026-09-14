/**
 * User & Role definitions
 */

export type UserRole = 'admin' | 'project_manager' | 'member' | 'client_user';

export interface User {
  id: string; // Firebase Auth UID
  email: string;
  displayName: string;
  role: UserRole;
  clientId?: string; // If role === 'client_user', linked client entity ID
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateUserInput = Omit<User, 'createdAt' | 'updatedAt'>;
export type UpdateUserInput = Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>;

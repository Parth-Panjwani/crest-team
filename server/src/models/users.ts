import { ObjectId } from 'mongodb';

export type Role = 'admin' | 'employee';

export interface UserDocument {
  _id?: ObjectId;
  id: string;
  name: string;
  role: Role;
  pin: string;
  baseSalary?: number | null;
}

export interface UserResponse {
  id: string;
  name: string;
  role: Role;
  pin: string;
  baseSalary?: number | null;
}

export function formatUser(doc: UserDocument): UserResponse {
  return {
    id: doc.id,
    name: doc.name,
    role: doc.role,
    pin: doc.pin,
    baseSalary: doc.baseSalary ?? null,
  };
}


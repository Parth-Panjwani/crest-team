import { getDB } from '../config/database.js';
import { Collection, Document } from 'mongodb';

export async function getCollection<T extends Document = Document>(name: string): Promise<Collection<T>> {
  const db = getDB();
  return db.collection<T>(name);
}


import { ObjectId, Binary } from 'mongodb';
import { deflateSync, inflateSync } from 'zlib';
import { createHash } from 'crypto';

export interface NoteDocument {
  _id?: ObjectId;
  id: string;
  text?: string;
  textCompressed?: Binary | Buffer;
  textLength?: number;
  textHash?: string;
  createdBy: string;
  createdAt: string;
  status: string;
  category?: string;
  subCategory?: 'refill-stock' | 'remove-from-stock' | 'out-of-stock';
  adminOnly?: boolean;
  completedBy?: string;
  completedAt?: string;
  updatedAt?: string;
  deleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
  imageUrl?: string;
}

export interface NoteResponse {
  id: string;
  text: string;
  createdBy: string;
  createdAt: string;
  status: string;
  category: string;
  subCategory?: 'refill-stock' | 'remove-from-stock' | 'out-of-stock';
  adminOnly: boolean;
  completedBy?: string;
  completedAt?: string;
  deleted: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
  imageUrl?: string;
}

function isBinary(value: unknown): value is Binary | Buffer {
  if (Buffer.isBuffer(value)) return true;
  if (typeof value === 'object' && value !== null && 'buffer' in value) {
    return Buffer.isBuffer((value as { buffer: unknown }).buffer);
  }
  return false;
}

function normalizeBinary(value: Binary | Buffer): Buffer {
  if (Buffer.isBuffer(value)) return value;
  return Buffer.from((value as Binary).buffer);
}

function decompressNoteText(doc: NoteDocument): string {
  if (doc.textCompressed && isBinary(doc.textCompressed)) {
    const payload = normalizeBinary(doc.textCompressed);
    try {
      return inflateSync(payload).toString('utf8');
    } catch {
      return payload.toString('utf8');
    }
  }
  if (typeof doc.text === 'string') {
    return doc.text;
  }
  return '';
}

export function formatNote(doc: NoteDocument): NoteResponse {
  return {
    id: doc.id,
    text: decompressNoteText(doc),
    createdBy: doc.createdBy,
    createdAt: doc.createdAt,
    status: doc.status,
    category: doc.category || 'general',
    subCategory: doc.subCategory,
    adminOnly: doc.adminOnly || false,
    completedBy: doc.completedBy,
    completedAt: doc.completedAt,
    deleted: doc.deleted || false,
    deletedAt: doc.deletedAt,
    deletedBy: doc.deletedBy,
    imageUrl: doc.imageUrl,
  };
}

const NOTE_COMPRESSION_MIN_LENGTH = 16;

export function compressNoteText(text: string): { textCompressed: Binary; textLength: number; textHash: string } {
  const trimmed = text.trim();
  const buffer = Buffer.from(trimmed, 'utf8');
  const compressedBuffer = buffer.length > NOTE_COMPRESSION_MIN_LENGTH ? deflateSync(buffer) : buffer;
  return {
    textCompressed: new Binary(compressedBuffer),
    textLength: buffer.length,
    textHash: createHash('sha256').update(buffer).digest('base64url'),
  };
}


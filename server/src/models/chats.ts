import { ObjectId } from 'mongodb';

export interface FileAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

export interface ChatMessageDocument {
  _id?: ObjectId;
  id: string;
  chatId: string;
  senderId: string;
  message: string;
  attachments?: FileAttachment[];
  mentions?: string[]; // Array of user IDs mentioned in the message
  readBy?: string[]; // Array of user IDs who have read this message
  replyTo?: {
    messageId: string;
    senderId: string;
    senderName: string;
    message: string;
  };
  createdAt: string;
}

export interface ChatDocument {
  _id?: ObjectId;
  id: string;
  type: 'group'; // Only group chat now
  name?: string; // Group name (editable)
  participantIds: string[]; // All user IDs in the group
  lastMessageAt?: string;
  createdAt: string;
}

export interface ChatMessageResponse {
  id: string;
  chatId: string;
  senderId: string;
  message: string;
  attachments?: FileAttachment[];
  mentions?: string[];
  readBy?: string[];
  replyTo?: {
    messageId: string;
    senderId: string;
    senderName: string;
    message: string;
  };
  createdAt: string;
  sender?: {
    id: string;
    name: string;
    role: string;
  };
}

export interface ChatResponse {
  id: string;
  name?: string;
  participantIds: string[];
  lastMessageAt?: string | null;
  createdAt: string;
  otherParticipant?: {
    id: string;
    name: string;
    role: string;
  };
  lastMessage?: ChatMessageResponse;
  unreadCount?: number;
}

export function formatChatMessage(doc: ChatMessageDocument | ChatMessageDocument & { _id: ObjectId }): ChatMessageResponse {
  return {
    id: doc.id,
    chatId: doc.chatId,
    senderId: doc.senderId,
    message: doc.message,
    attachments: doc.attachments || [],
    mentions: doc.mentions || [],
    readBy: doc.readBy || [],
    replyTo: doc.replyTo,
    createdAt: doc.createdAt,
  };
}

export function formatChat(doc: ChatDocument | ChatDocument & { _id: ObjectId }): ChatResponse {
  return {
    id: doc.id,
    name: doc.name,
    participantIds: doc.participantIds,
    lastMessageAt: doc.lastMessageAt || null,
    createdAt: doc.createdAt,
  };
}


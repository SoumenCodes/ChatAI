export interface Project {
  id: string;
  name: string;
  systemPrompt: string;
  similarityThreshold: number;
  maxSources: number;
  fallbackMessage: string;
  customApiKey?: string | null;
  customModel?: string | null;
  createdAt: Date;
}

export interface Document {
  id: string;
  projectId: string;
  fileName: string;
  filePath: string;
  status: 'processing' | 'processed' | 'failed';
  chunksCount?: number;
  createdAt: Date;
}

export interface Chunk {
  id: string;
  documentId: string;
  chunkText: string;
  embedding?: number[]; // Representing the vector (dim: 768)
  createdAt: Date;
}

export interface Conversation {
  id: string;
  projectId: string;
  createdAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: MessageSource[]; // List of source citations
  createdAt: Date;
}

export interface MessageSource {
  documentId: string;
  fileName: string;
  textSnippet: string;
}

// API DTOs (Data Transfer Objects)
export interface CreateProjectDTO {
  name: string;
  systemPrompt?: string;
  similarityThreshold?: number;
  maxSources?: number;
  fallbackMessage?: string;
}

export interface UpdateProjectDTO {
  name?: string;
  systemPrompt?: string;
  similarityThreshold?: number;
  maxSources?: number;
  fallbackMessage?: string;
}

export interface ChatRequestDTO {
  projectId: string;
  conversationId?: string; // Optional if starting a new conversation
  message: string;
}

export interface ChatResponseChunkDTO {
  text: string;
  sources?: MessageSource[];
  conversationId: string;
}

export interface WidgetSettingsDTO {
  projectId: string;
  name: string;
  systemPrompt: string;
  similarityThreshold: number;
  maxSources: number;
  fallbackMessage: string;
}

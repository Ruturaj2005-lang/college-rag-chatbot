export type UserRole = 'student' | 'admin';

export interface User {
  user_id: string;
  email: string;
  role: UserRole;
  full_name?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Source {
  document_id: string;
  document_name: string;
  page_number?: number;
  relevance_score: number;
  excerpt?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  confidence?: number;
  grounded?: boolean;
  created_at: string;
  feedback?: 'positive' | 'negative' | null;
  suggested_followups?: string[];
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

export interface ConversationDetail extends Conversation {
  messages: Message[];
}

export type DocumentStatus = 'UPLOADED' | 'PROCESSING' | 'READY' | 'FAILED' | 'DELETED';

export interface Document {
  id: string;
  title: string;
  file_name: string;
  file_type: string;
  file_size?: number;
  storage_path?: string;
  status: DocumentStatus;
  error_message?: string | null;
  chunk_count: number;
  uploaded_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  page_number?: number;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface DocumentDetail {
  document: Document;
  chunks: DocumentChunk[];
}

export interface AnalyticsData {
  total_documents: number;
  ready_documents: number;
  processing_documents: number;
  failed_documents: number;
  total_questions: number;
  average_confidence: number;
  positive_feedback: number;
  negative_feedback: number;
}

export interface ChatResponse {
  conversation_id: string;
  message_id: string;
  answer: string;
  sources: Source[];
  confidence: number;
  grounded: boolean;
  suggested_followups?: string[];
}

export interface SearchResult {
  chunk_id: string;
  document_id: string;
  document_name: string;
  file_name: string;
  page_number: number;
  matched_excerpt: string;
  raw_excerpt: string;
  full_content: string;
  relevance_score: number;
  relevance_percent: number;
  matched_terms: string[];
}

export interface SearchResponse {
  query: string;
  total_matches: number;
  results: SearchResult[];
}

export interface Notice {
  id: string;
  title: string;
  category: 'ACADEMIC' | 'ADMISSION' | 'EXAM' | 'HOSTEL' | 'PLACEMENT' | 'GENERAL';
  content: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
  published_date: string;
  author?: string;
  pinned?: boolean;
}

export type SupportedLanguage = 'en' | 'hi' | 'or' | 'es' | 'fr';

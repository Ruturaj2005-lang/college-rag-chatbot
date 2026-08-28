import {
  AuthResponse,
  User,
  Conversation,
  ConversationDetail,
  Document,
  DocumentDetail,
  AnalyticsData,
  ChatResponse,
  Notice
} from '../types';

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('college_rag_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorDetail = 'An unexpected error occurred';
    try {
      const data = await response.json();
      errorDetail = data.detail || data.message || errorDetail;
    } catch {
      errorDetail = response.statusText || errorDetail;
    }
    if (response.status === 401) {
      // Clear token on 401
      localStorage.removeItem('college_rag_token');
      localStorage.removeItem('college_rag_user');
    }
    throw new Error(errorDetail);
  }
  return response.json();
}

export const api = {
  auth: {
    login: async (email: string, password: string): Promise<AuthResponse> => {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      return handleResponse<AuthResponse>(res);
    },
    register: async (
      email: string,
      password: string,
      full_name: string = '',
      role: 'student' | 'admin' = 'student'
    ): Promise<AuthResponse> => {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name, role }),
      });
      return handleResponse<AuthResponse>(res);
    },
    getMe: async (): Promise<User> => {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<User>(res);
    },
    forgotPassword: async (email: string): Promise<{ status: string; message: string; reset_code?: string }> => {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      return handleResponse<{ status: string; message: string; reset_code?: string }>(res);
    },
    resetPassword: async (email: string, reset_code: string, new_password: string): Promise<{ status: string; message: string }> => {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, reset_code, new_password }),
      });
      return handleResponse<{ status: string; message: string }>(res);
    },
  },

  chat: {
    send: async (message: string, conversation_id?: string, language: string = 'en'): Promise<ChatResponse> => {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ message, conversation_id, language }),
      });
      return handleResponse<ChatResponse>(res);
    },
  },

  conversations: {
    list: async (): Promise<Conversation[]> => {
      const res = await fetch(`${API_BASE}/conversations`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<Conversation[]>(res);
    },
    create: async (title?: string): Promise<Conversation> => {
      const res = await fetch(`${API_BASE}/conversations`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ title: title || 'New Conversation' }),
      });
      return handleResponse<Conversation>(res);
    },
    get: async (conversationId: string): Promise<ConversationDetail> => {
      const res = await fetch(`${API_BASE}/conversations/${conversationId}`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<ConversationDetail>(res);
    },
    delete: async (conversationId: string): Promise<{ status: string }> => {
      const res = await fetch(`${API_BASE}/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return handleResponse<{ status: string }>(res);
    },
  },

  admin: {
    listDocuments: async (): Promise<Document[]> => {
      const res = await fetch(`${API_BASE}/admin/documents`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<Document[]>(res);
    },
    getDocument: async (documentId: string): Promise<DocumentDetail> => {
      const res = await fetch(`${API_BASE}/admin/documents/${documentId}`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<DocumentDetail>(res);
    },
    uploadDocument: async (file: File): Promise<Document> => {
      const token = localStorage.getItem('college_rag_token');
      const formData = new FormData();
      formData.append('file', file);

      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE}/admin/documents`, {
        method: 'POST',
        headers,
        body: formData,
      });
      return handleResponse<Document>(res);
    },
    reprocessDocument: async (documentId: string): Promise<{ status: string }> => {
      const res = await fetch(`${API_BASE}/admin/documents/${documentId}/reprocess`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      return handleResponse<{ status: string }>(res);
    },
    deleteDocument: async (documentId: string): Promise<{ status: string }> => {
      const res = await fetch(`${API_BASE}/admin/documents/${documentId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return handleResponse<{ status: string }>(res);
    },
    getAnalytics: async (): Promise<AnalyticsData> => {
      const res = await fetch(`${API_BASE}/admin/analytics`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<AnalyticsData>(res);
    },
    exportAnalyticsCsv: async (): Promise<Blob> => {
      const token = localStorage.getItem('college_rag_token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`${API_BASE}/admin/analytics/export`, {
        headers,
      });
      if (!res.ok) {
        let errMessage = 'Failed to export CSV analytics report';
        try {
          const errData = await res.json();
          errMessage = errData.detail || errMessage;
        } catch {
          // ignore
        }
        throw new Error(errMessage);
      }
      return res.blob();
    },
  },

  feedback: {
    submit: async (messageId: string, feedback: 'positive' | 'negative'): Promise<{ status: string }> => {
      const res = await fetch(`${API_BASE}/messages/${messageId}/feedback`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ feedback }),
      });
      return handleResponse<{ status: string }>(res);
    },
  },

  documents: {
    list: async (): Promise<Document[]> => {
      const res = await fetch(`${API_BASE}/documents`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<Document[]>(res);
    },
    upload: async (file: File): Promise<Document> => {
      const token = localStorage.getItem('college_rag_token');
      const formData = new FormData();
      formData.append('file', file);

      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE}/documents/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });
      return handleResponse<Document>(res);
    },
    download: async (documentId: string, fileName?: string): Promise<void> => {
      const token = localStorage.getItem('college_rag_token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`${API_BASE}/documents/download/${documentId}`, {
        headers,
      });
      if (!res.ok) {
        let errMessage = 'Failed to download document file';
        try {
          const errData = await res.json();
          errMessage = errData.detail || errMessage;
        } catch {
          // ignore
        }
        throw new Error(errMessage);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'document';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
    downloadUrl: (documentId: string): string => {
      const token = localStorage.getItem('college_rag_token');
      return `${API_BASE}/documents/download/${documentId}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    },
  },

  search: {
    query: async (q: string, limit: number = 10): Promise<{ query: string; total_matches: number; results: any[] }> => {
      const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}&limit=${limit}`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<{ query: string; total_matches: number; results: any[] }>(res);
    },
  },

  notices: {
    list: async (): Promise<Notice[]> => {
      const res = await fetch(`${API_BASE}/notices`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<Notice[]>(res);
    },
    create: async (notice: { title: string; category: string; content: string; urgency: string; pinned?: boolean }): Promise<Notice> => {
      const res = await fetch(`${API_BASE}/notices`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(notice),
      });
      return handleResponse<Notice>(res);
    },
    delete: async (noticeId: string): Promise<{ status: string }> => {
      const res = await fetch(`${API_BASE}/notices/${noticeId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return handleResponse<{ status: string }>(res);
    },
  },
};

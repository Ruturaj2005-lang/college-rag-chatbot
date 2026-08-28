from datetime import datetime
from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, EmailStr, Field


# ==================== Auth Schemas ====================

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = ""
    role: Literal["student", "admin"] = "student"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    user_id: str
    email: str
    role: str
    full_name: Optional[str] = ""


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    reset_code: str = Field(..., min_length=4, max_length=10)
    new_password: str = Field(..., min_length=6)


class AuthMessageResponse(BaseModel):
    status: str
    message: str
    reset_code: Optional[str] = None


# ==================== Source & Chat Schemas ====================

class SourceItem(BaseModel):
    document_id: str
    document_name: str
    page_number: Optional[int] = None
    relevance_score: float
    excerpt: Optional[str] = None


class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    message: str = Field(..., min_length=1, description="Student's query to the chatbot")
    language: Optional[str] = "en"


class ChatResponse(BaseModel):
    conversation_id: str
    message_id: str
    answer: str
    sources: List[SourceItem] = []
    confidence: float
    grounded: bool
    suggested_followups: List[str] = []


# ==================== Conversation Schemas ====================

class MessageItem(BaseModel):
    id: str
    conversation_id: str
    role: Literal["user", "assistant"]
    content: str
    sources: Optional[List[SourceItem]] = []
    confidence: Optional[float] = 0.0
    grounded: Optional[bool] = False
    created_at: datetime
    feedback: Optional[Literal["positive", "negative"]] = None
    suggested_followups: Optional[List[str]] = []


class ConversationCreate(BaseModel):
    title: Optional[str] = "New Conversation"


class ConversationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: Optional[int] = 0


class ConversationDetailResponse(BaseModel):
    id: str
    user_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List[MessageItem] = []


# ==================== Document Management Schemas ====================

class DocumentChunkItem(BaseModel):
    id: str
    document_id: str
    chunk_index: int
    content: str
    page_number: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None


class DocumentResponse(BaseModel):
    id: str
    title: str
    file_name: str
    file_type: str
    file_size: Optional[int] = 0
    storage_path: Optional[str] = ""
    status: Literal["UPLOADED", "PROCESSING", "READY", "FAILED", "DELETED"]
    error_message: Optional[str] = None
    chunk_count: int = 0
    uploaded_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class DocumentDetailResponse(BaseModel):
    document: DocumentResponse
    chunks: List[DocumentChunkItem] = []


# ==================== Campus Notices Schemas ====================

class NoticeItem(BaseModel):
    id: str
    title: str
    category: Literal["ACADEMIC", "ADMISSION", "EXAM", "HOSTEL", "PLACEMENT", "GENERAL"] = "GENERAL"
    content: str
    urgency: Literal["LOW", "MEDIUM", "HIGH"] = "MEDIUM"
    published_date: datetime
    author: Optional[str] = "Office of Academic Affairs"
    pinned: Optional[bool] = False


class NoticeCreate(BaseModel):
    title: str = Field(..., min_length=3)
    category: Literal["ACADEMIC", "ADMISSION", "EXAM", "HOSTEL", "PLACEMENT", "GENERAL"] = "GENERAL"
    content: str = Field(..., min_length=5)
    urgency: Literal["LOW", "MEDIUM", "HIGH"] = "MEDIUM"
    pinned: Optional[bool] = False


# ==================== Feedback & Analytics Schemas ====================

class FeedbackRequest(BaseModel):
    feedback: Literal["positive", "negative"]


class FeedbackResponse(BaseModel):
    status: str = "success"
    message: str = "Feedback recorded successfully"


class AnalyticsResponse(BaseModel):
    total_documents: int
    ready_documents: int
    processing_documents: int
    failed_documents: int
    total_questions: int
    average_confidence: float
    positive_feedback: int
    negative_feedback: int

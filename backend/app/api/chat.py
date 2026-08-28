import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Request, HTTPException, status
from app.core.database import get_db, is_mongo_active, memory_db
from app.core.security import get_current_user
from app.models.schemas import ChatRequest, ChatResponse
from app.services.rag_service import process_rag_query

router = APIRouter(tags=["Chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    payload: ChatRequest,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Core RAG Chat endpoint complying with Section 22.
    """
    user_id = current_user["user_id"]
    db = get_db()
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))

    # Ensure or create conversation
    conv_id = payload.conversation_id
    conversation = None
    if conv_id:
        if is_mongo_active() and db is not None:
            conversation = await db.conversations.find_one({"_id": conv_id, "user_id": user_id})
        else:
            for c in memory_db["conversations"]:
                if c.get("id") == conv_id and c.get("user_id") == user_id:
                    conversation = c
                    break

    if not conversation:
        # Create a new conversation with title derived from user question
        conv_id = str(uuid.uuid4())
        title = payload.message.strip()[:40] + ("..." if len(payload.message.strip()) > 40 else "")
        conv_doc = {
            "_id": conv_id,
            "id": conv_id,
            "user_id": user_id,
            "title": title or "New Conversation",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        if is_mongo_active() and db is not None:
            await db.conversations.insert_one(conv_doc)
        else:
            memory_db["conversations"].append(conv_doc)
    else:
        # Update timestamp
        if is_mongo_active() and db is not None:
            await db.conversations.update_one(
                {"_id": conv_id},
                {"$set": {"updated_at": datetime.now(timezone.utc)}}
            )
        else:
            conversation["updated_at"] = datetime.now(timezone.utc)

    # Save User message
    user_msg_id = str(uuid.uuid4())
    user_msg_doc = {
        "_id": user_msg_id,
        "id": user_msg_id,
        "conversation_id": conv_id,
        "role": "user",
        "content": payload.message,
        "sources": [],
        "confidence": 0.0,
        "grounded": False,
        "created_at": datetime.now(timezone.utc)
    }
    if is_mongo_active() and db is not None:
        await db.messages.insert_one(user_msg_doc)
    else:
        memory_db["messages"].append(user_msg_doc)

    # Execute full RAG Pipeline
    rag_result = await process_rag_query(
        question=payload.message,
        conversation_id=conv_id,
        user_id=user_id,
        request_id=request_id,
        language=payload.language or "en"
    )

    # Save Assistant message
    asst_msg_doc = {
        "_id": rag_result.message_id,
        "id": rag_result.message_id,
        "conversation_id": conv_id,
        "role": "assistant",
        "content": rag_result.answer,
        "sources": [s.model_dump() for s in rag_result.sources],
        "confidence": rag_result.confidence,
        "grounded": rag_result.grounded,
        "created_at": datetime.now(timezone.utc)
    }
    if is_mongo_active() and db is not None:
        await db.messages.insert_one(asst_msg_doc)
    else:
        memory_db["messages"].append(asst_msg_doc)

    return rag_result

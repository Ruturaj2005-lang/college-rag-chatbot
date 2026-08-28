import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.database import get_db, is_mongo_active, memory_db
from app.core.security import get_current_user
from app.models.schemas import (
    ConversationCreate,
    ConversationResponse,
    ConversationDetailResponse,
    MessageItem,
    SourceItem
)

router = APIRouter(prefix="/conversations", tags=["Conversations"])


@router.get("", response_model=List[ConversationResponse])
async def list_conversations(current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    db = get_db()
    results = []

    if is_mongo_active() and db is not None:
        cursor = db.conversations.find({"user_id": user_id}).sort("updated_at", -1)
        convs = await cursor.to_list(length=100)
        for c in convs:
            msg_count = await db.messages.count_documents({"conversation_id": str(c["_id"])})
            results.append(
                ConversationResponse(
                    id=str(c["_id"]),
                    user_id=c["user_id"],
                    title=c.get("title", "New Conversation"),
                    created_at=c.get("created_at", datetime.now(timezone.utc)),
                    updated_at=c.get("updated_at", datetime.now(timezone.utc)),
                    message_count=msg_count
                )
            )
    else:
        user_convs = [c for c in memory_db["conversations"] if c.get("user_id") == user_id]
        user_convs.sort(key=lambda x: x.get("updated_at", datetime.min), reverse=True)
        for c in user_convs:
            cid = c.get("id") or str(c.get("_id"))
            msg_count = sum(1 for m in memory_db["messages"] if m.get("conversation_id") == cid)
            results.append(
                ConversationResponse(
                    id=cid,
                    user_id=c["user_id"],
                    title=c.get("title", "New Conversation"),
                    created_at=c.get("created_at", datetime.now(timezone.utc)),
                    updated_at=c.get("updated_at", datetime.now(timezone.utc)),
                    message_count=msg_count
                )
            )

    return results


@router.post("", response_model=ConversationResponse)
async def create_conversation(
    payload: ConversationCreate,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["user_id"]
    db = get_db()
    conv_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    conv_doc = {
        "_id": conv_id,
        "id": conv_id,
        "user_id": user_id,
        "title": payload.title or "New Conversation",
        "created_at": now,
        "updated_at": now
    }

    if is_mongo_active() and db is not None:
        await db.conversations.insert_one(conv_doc)
    else:
        memory_db["conversations"].append(conv_doc)

    return ConversationResponse(
        id=conv_id,
        user_id=user_id,
        title=conv_doc["title"],
        created_at=now,
        updated_at=now,
        message_count=0
    )


@router.get("/{conversation_id}", response_model=ConversationDetailResponse)
async def get_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["user_id"]
    db = get_db()
    conv = None
    messages_list = []

    if is_mongo_active() and db is not None:
        conv = await db.conversations.find_one({"_id": conversation_id, "user_id": user_id})
        if not conv:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
        
        cursor = db.messages.find({"conversation_id": conversation_id}).sort("created_at", 1)
        raw_msgs = await cursor.to_list(length=500)
        
        # Also fetch feedbacks for messages
        for m in raw_msgs:
            m_id = str(m["_id"])
            fb_doc = await db.feedback.find_one({"message_id": m_id, "user_id": user_id})
            
            raw_sources = m.get("sources") or []
            parsed_sources = []
            for s in raw_sources:
                if isinstance(s, dict):
                    parsed_sources.append(SourceItem(**s))

            messages_list.append(
                MessageItem(
                    id=m_id,
                    conversation_id=conversation_id,
                    role=m.get("role", "user"),
                    content=m.get("content", ""),
                    sources=parsed_sources,
                    confidence=m.get("confidence", 0.0),
                    grounded=m.get("grounded", False),
                    created_at=m.get("created_at", datetime.now(timezone.utc)),
                    feedback=fb_doc.get("feedback") if fb_doc else None
                )
            )
    else:
        for c in memory_db["conversations"]:
            cid = c.get("id") or str(c.get("_id"))
            if cid == conversation_id and c.get("user_id") == user_id:
                conv = c
                break
        if not conv:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

        conv_msgs = [m for m in memory_db["messages"] if m.get("conversation_id") == conversation_id]
        conv_msgs.sort(key=lambda x: x.get("created_at", datetime.min))
        for m in conv_msgs:
            m_id = m.get("id") or str(m.get("_id"))
            fb_val = next(
                (f.get("feedback") for f in memory_db["feedback"] if f.get("message_id") == m_id and f.get("user_id") == user_id),
                None
            )
            raw_sources = m.get("sources") or []
            parsed_sources = [SourceItem(**s) if isinstance(s, dict) else s for s in raw_sources]
            
            messages_list.append(
                MessageItem(
                    id=m_id,
                    conversation_id=conversation_id,
                    role=m.get("role", "user"),
                    content=m.get("content", ""),
                    sources=parsed_sources,
                    confidence=m.get("confidence", 0.0),
                    grounded=m.get("grounded", False),
                    created_at=m.get("created_at", datetime.now(timezone.utc)),
                    feedback=fb_val
                )
            )

    return ConversationDetailResponse(
        id=conversation_id,
        user_id=user_id,
        title=conv.get("title", "Conversation"),
        created_at=conv.get("created_at", datetime.now(timezone.utc)),
        updated_at=conv.get("updated_at", datetime.now(timezone.utc)),
        messages=messages_list
    )


@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["user_id"]
    db = get_db()

    if is_mongo_active() and db is not None:
        res = await db.conversations.delete_one({"_id": conversation_id, "user_id": user_id})
        if res.deleted_count == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
        await db.messages.delete_many({"conversation_id": conversation_id})
    else:
        initial_len = len(memory_db["conversations"])
        memory_db["conversations"] = [
            c for c in memory_db["conversations"]
            if not ((c.get("id") == conversation_id or str(c.get("_id")) == conversation_id) and c.get("user_id") == user_id)
        ]
        if len(memory_db["conversations"]) == initial_len:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
        memory_db["messages"] = [
            m for m in memory_db["messages"] if m.get("conversation_id") != conversation_id
        ]

    return {"status": "success", "message": "Conversation deleted"}

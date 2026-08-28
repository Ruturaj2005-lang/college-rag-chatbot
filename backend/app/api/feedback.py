import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.database import get_db, is_mongo_active, memory_db
from app.core.security import get_current_user
from app.models.schemas import FeedbackRequest, FeedbackResponse

router = APIRouter(prefix="/messages", tags=["Feedback"])


@router.post("/{message_id}/feedback", response_model=FeedbackResponse)
async def submit_feedback(
    message_id: str,
    payload: FeedbackRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Submits student feedback (positive or negative) on an assistant message.
    Fulfills Section 25.
    """
    user_id = current_user["user_id"]
    db = get_db()
    now = datetime.now(timezone.utc)
    fb_id = str(uuid.uuid4())

    if is_mongo_active() and db is not None:
        # Upsert feedback for this user & message
        await db.feedback.update_one(
            {"message_id": message_id, "user_id": user_id},
            {
                "$set": {
                    "feedback": payload.feedback,
                    "updated_at": now
                },
                "$setOnInsert": {
                    "_id": fb_id,
                    "created_at": now
                }
            },
            upsert=True
        )
    else:
        # Check if feedback exists
        found = False
        for f in memory_db["feedback"]:
            if f.get("message_id") == message_id and f.get("user_id") == user_id:
                f["feedback"] = payload.feedback
                f["updated_at"] = now
                found = True
                break
        if not found:
            memory_db["feedback"].append({
                "_id": fb_id,
                "id": fb_id,
                "message_id": message_id,
                "user_id": user_id,
                "feedback": payload.feedback,
                "created_at": now
            })

    return FeedbackResponse(
        status="success",
        message=f"Recorded {payload.feedback} feedback for message {message_id}"
    )


class DirectFeedbackPayload(FeedbackRequest):
    message_id: str


feedback_direct_router = APIRouter(tags=["Feedback"])


@feedback_direct_router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback_direct(
    payload: DirectFeedbackPayload,
    current_user: dict = Depends(get_current_user)
):
    return await submit_feedback(
        message_id=payload.message_id,
        payload=FeedbackRequest(feedback=payload.feedback),
        current_user=current_user
    )

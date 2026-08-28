import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.database import get_db, is_mongo_active, memory_db
from app.core.security import get_current_user, require_admin
from app.models.schemas import NoticeItem, NoticeCreate

router = APIRouter(prefix="/notices", tags=["Campus Notices"])

# Seed mock notices if not yet created
DEFAULT_NOTICES = [
    {
        "_id": "notice-001",
        "id": "notice-001",
        "title": "Autumn Semester 2026 Examination Schedule Released",
        "category": "EXAM",
        "content": "The official Autumn Semester 2026 examination timetable has been published. Exams commence November 23, 2026. Hall tickets available on portal from Nov 10.",
        "urgency": "HIGH",
        "published_date": datetime(2026, 8, 20, 10, 0, tzinfo=timezone.utc),
        "author": "Controller of Examinations",
        "pinned": True
    },
    {
        "_id": "notice-002",
        "id": "notice-002",
        "title": "Dean's Merit Scholarship Application Portal Open",
        "category": "ACADEMIC",
        "content": "Applications for the Dean's Merit Scholarship (100% Tuition Fee Waiver for SGPA >= 9.5) are open until September 15, 2026.",
        "urgency": "MEDIUM",
        "published_date": datetime(2026, 8, 18, 14, 30, tzinfo=timezone.utc),
        "author": "Dean Academic Affairs",
        "pinned": True
    },
    {
        "_id": "notice-003",
        "id": "notice-003",
        "title": "Campus Placement Drive 2026-2027 Commences",
        "category": "PLACEMENT",
        "content": "Phase-1 Campus Placement Drives for final year B.Tech, M.Tech, MCA & M.Sc students begins September 01, 2026. Verify resume on CDC portal.",
        "urgency": "HIGH",
        "published_date": datetime(2026, 8, 15, 9, 0, tzinfo=timezone.utc),
        "author": "Career Development Cell",
        "pinned": False
    },
    {
        "_id": "notice-004",
        "id": "notice-004",
        "title": "Hostel Room Allotment & Mess Renovation Advisory",
        "category": "HOSTEL",
        "content": "Hostel block B & D mess operations will undergo maintenance this weekend. Special dining hall arrangements in Block A.",
        "urgency": "LOW",
        "published_date": datetime(2026, 8, 12, 11, 0, tzinfo=timezone.utc),
        "author": "Chief Warden Office",
        "pinned": False
    }
]


@router.get("", response_model=List[NoticeItem])
async def list_campus_notices(current_user: dict = Depends(get_current_user)):
    """
    List active campus notices and circulars for students and admins.
    """
    db = get_db()
    if is_mongo_active() and db is not None:
        count = await db.notices.count_documents({})
        if count == 0:
            await db.notices.insert_many(DEFAULT_NOTICES)
        cursor = db.notices.find({}).sort([("pinned", -1), ("published_date", -1)])
        notices = await cursor.to_list(length=50)
        return [
            NoticeItem(
                id=str(n.get("_id") or n.get("id")),
                title=n.get("title", ""),
                category=n.get("category", "GENERAL"),
                content=n.get("content", ""),
                urgency=n.get("urgency", "MEDIUM"),
                published_date=n.get("published_date") or datetime.now(timezone.utc),
                author=n.get("author", "Academic Office"),
                pinned=n.get("pinned", False)
            )
            for n in notices
        ]
    else:
        if "notices" not in memory_db or not memory_db["notices"]:
            memory_db["notices"] = list(DEFAULT_NOTICES)
        sorted_notices = sorted(memory_db["notices"], key=lambda x: (not x.get("pinned", False), x.get("published_date")), reverse=False)
        return [
            NoticeItem(
                id=str(n.get("_id") or n.get("id")),
                title=n.get("title", ""),
                category=n.get("category", "GENERAL"),
                content=n.get("content", ""),
                urgency=n.get("urgency", "MEDIUM"),
                published_date=n.get("published_date") or datetime.now(timezone.utc),
                author=n.get("author", "Academic Office"),
                pinned=n.get("pinned", False)
            )
            for n in sorted_notices
        ]


@router.post("", response_model=NoticeItem)
async def create_campus_notice(
    notice_in: NoticeCreate,
    current_user: dict = Depends(require_admin)
):
    """
    Admin-only: Publish a new campus notice or circular.
    """
    notice_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    record = {
        "_id": notice_id,
        "id": notice_id,
        "title": notice_in.title,
        "category": notice_in.category,
        "content": notice_in.content,
        "urgency": notice_in.urgency,
        "published_date": now,
        "author": current_user.get("full_name") or "Administrator",
        "pinned": notice_in.pinned
    }

    db = get_db()
    if is_mongo_active() and db is not None:
        await db.notices.insert_one(record)
    else:
        if "notices" not in memory_db:
            memory_db["notices"] = list(DEFAULT_NOTICES)
        memory_db["notices"].insert(0, record)

    return NoticeItem(
        id=notice_id,
        title=record["title"],
        category=record["category"],
        content=record["content"],
        urgency=record["urgency"],
        published_date=record["published_date"],
        author=record["author"],
        pinned=record["pinned"]
    )


@router.delete("/{notice_id}")
async def delete_campus_notice(
    notice_id: str,
    current_user: dict = Depends(require_admin)
):
    """
    Admin-only: Delete an obsolete campus notice.
    """
    db = get_db()
    if is_mongo_active() and db is not None:
        res = await db.notices.delete_one({"$or": [{"_id": notice_id}, {"id": notice_id}]})
        if res.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Notice not found")
    else:
        if "notices" in memory_db:
            memory_db["notices"] = [n for n in memory_db["notices"] if not (n.get("id") == notice_id or str(n.get("_id")) == notice_id)]

    return {"status": "success", "message": "Notice deleted"}

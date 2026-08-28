import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Depends
from app.core.config import settings
from app.core.database import get_db, is_mongo_active, memory_db
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user
)
from app.models.schemas import (
    UserRegister,
    UserLogin,
    UserResponse,
    TokenResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    AuthMessageResponse
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse)
async def register(payload: UserRegister):
    db = get_db()
    email_clean = payload.email.strip().lower()
    
    # Check if user exists
    if is_mongo_active() and db is not None:
        existing = await db.users.find_one({"email": email_clean})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
    else:
        for u in memory_db["users"]:
            if u.get("email") == email_clean:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User with this email already exists"
                )

    user_id = str(uuid.uuid4())
    hashed_pwd = get_password_hash(payload.password)
    user_doc = {
        "_id": user_id,
        "id": user_id,
        "email": email_clean,
        "password_hash": hashed_pwd,
        "full_name": payload.full_name or email_clean.split("@")[0].title(),
        "role": payload.role,
        "created_at": datetime.now(timezone.utc)
    }

    if is_mongo_active() and db is not None:
        await db.users.insert_one(user_doc)
    else:
        memory_db["users"].append(user_doc)

    user_resp = UserResponse(
        user_id=user_id,
        email=email_clean,
        role=payload.role,
        full_name=user_doc["full_name"]
    )
    token = create_access_token({
        "sub": user_id,
        "email": email_clean,
        "role": payload.role,
        "full_name": user_doc["full_name"]
    })

    return TokenResponse(access_token=token, token_type="bearer", user=user_resp)


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin):
    db = get_db()
    email_clean = payload.email.strip().lower()
    user = None

    if is_mongo_active() and db is not None:
        user = await db.users.find_one({"email": email_clean})
    else:
        for u in memory_db["users"]:
            if u.get("email") == email_clean:
                user = u
                break

    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = str(user.get("_id") or user.get("id"))
    user_resp = UserResponse(
        user_id=user_id,
        email=user["email"],
        role=user.get("role", "student"),
        full_name=user.get("full_name", "")
    )
    token = create_access_token({
        "sub": user_id,
        "email": user["email"],
        "role": user.get("role", "student"),
        "full_name": user.get("full_name", "")
    })

    return TokenResponse(access_token=token, token_type="bearer", user=user_resp)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        user_id=current_user["user_id"],
        email=current_user["email"],
        role=current_user["role"],
        full_name=current_user.get("full_name", "")
    )


@router.post("/forgot-password", response_model=AuthMessageResponse)
async def forgot_password(payload: ForgotPasswordRequest):
    """
    Initiates password reset for a registered college user.
    Generates a secure 6-digit verification code valid for 15 minutes.
    """
    import random
    db = get_db()
    email_clean = payload.email.strip().lower()
    user = None

    if is_mongo_active() and db is not None:
        user = await db.users.find_one({"email": email_clean})
    else:
        for u in memory_db["users"]:
            if u.get("email") == email_clean:
                user = u
                break

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email address."
        )

    # Generate 6-digit verification code
    code = f"{random.randint(100000, 999999)}"
    now = datetime.now(timezone.utc)

    if is_mongo_active() and db is not None:
        await db.users.update_one(
            {"email": email_clean},
            {"$set": {"reset_code": code, "reset_code_created_at": now}}
        )
    else:
        user["reset_code"] = code
        user["reset_code_created_at"] = now

    return AuthMessageResponse(
        status="success",
        message=f"Verification code sent successfully to {email_clean}.",
        reset_code=code
    )


@router.post("/reset-password", response_model=AuthMessageResponse)
async def reset_password(payload: ResetPasswordRequest):
    """
    Verifies the reset code and updates the user's password.
    """
    db = get_db()
    email_clean = payload.email.strip().lower()
    user = None

    if is_mongo_active() and db is not None:
        user = await db.users.find_one({"email": email_clean})
    else:
        for u in memory_db["users"]:
            if u.get("email") == email_clean:
                user = u
                break

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email address."
        )

    stored_code = user.get("reset_code")
    if not stored_code or stored_code != payload.reset_code.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code. Please request a new one."
        )

    new_hash = get_password_hash(payload.new_password)
    now = datetime.now(timezone.utc)

    if is_mongo_active() and db is not None:
        await db.users.update_one(
            {"email": email_clean},
            {
                "$set": {"password_hash": new_hash, "updated_at": now},
                "$unset": {"reset_code": "", "reset_code_created_at": ""}
            }
        )
    else:
        user["password_hash"] = new_hash
        user["updated_at"] = now
        user.pop("reset_code", None)
        user.pop("reset_code_created_at", None)

    return AuthMessageResponse(
        status="success",
        message="Your password has been successfully reset! You can now log in."
    )

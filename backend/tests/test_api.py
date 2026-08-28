import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert "ai_provider" in data


@pytest.mark.asyncio
async def test_auth_and_chat_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Register student
        reg_resp = await client.post(
            "/api/auth/register",
            json={
                "email": "teststudent@college.edu",
                "password": "Password123",
                "full_name": "Test Student",
                "role": "student"
            }
        )
        assert reg_resp.status_code == 200
        reg_data = reg_resp.json()
        token = reg_data["access_token"]
        assert token is not None

        # 2. Get Me
        headers = {"Authorization": f"Bearer {token}"}
        me_resp = await client.get("/api/auth/me", headers=headers)
        assert me_resp.status_code == 200
        assert me_resp.json()["email"] == "teststudent@college.edu"

        # 3. Chat Endpoint
        chat_resp = await client.post(
            "/api/chat",
            json={"message": "What is the hostel fee?"},
            headers=headers
        )
        assert chat_resp.status_code == 200
        chat_data = chat_resp.json()
        assert "conversation_id" in chat_data
        assert "answer" in chat_data
        assert "confidence" in chat_data
        conv_id = chat_data["conversation_id"]

        # 4. Get Conversation
        conv_resp = await client.get(f"/api/conversations/{conv_id}", headers=headers)
        assert conv_resp.status_code == 200
        assert len(conv_resp.json()["messages"]) >= 2

        # 5. Feedback
        msg_id = chat_data["message_id"]
        fb_resp = await client.post(
            f"/api/messages/{msg_id}/feedback",
            json={"feedback": "positive"},
            headers=headers
        )
        assert fb_resp.status_code == 200

        # 6. Verify student cannot access Admin APIs (403 Forbidden)
        admin_resp = await client.get("/api/admin/documents", headers=headers)
        assert admin_resp.status_code == 403

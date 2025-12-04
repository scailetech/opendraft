#!/usr/bin/env python3
"""Create a test user for thesis generation demo."""
import modal
import os
from datetime import datetime
import uuid

app = modal.App("test-user-creator")
image = modal.Image.debian_slim().pip_install("supabase>=2.24.0")

@app.function(
    image=image,
    secrets=[modal.Secret.from_name("supabase-credentials")],
)
def create_test_user():
    """Create a test user in Supabase for thesis generation."""
    from supabase import create_client
    
    supabase = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"]
    )
    
    # Create test user with FULL academic metadata
    test_user = {
        "id": str(uuid.uuid4()),
        "email": "test-academic2@opendraft.dev",
        "full_name": "Sarah M. Johnson",  # <-- Will appear on cover page!
        "thesis_topic": "Deep Learning for Medical Image Analysis",
        "academic_level": "master",
        "language": "en",
        "position": 1,
        "original_position": 1,
        "referral_code": f"TEST-{uuid.uuid4().hex[:6].upper()}",
        "status": "waiting",  # Valid status value
        "email_verified": True,  # Required for processing!
        "created_at": datetime.now().isoformat(),
    }
    
    # Check if user already exists
    existing = supabase.table("waitlist").select("id").eq("email", test_user["email"]).execute()
    if existing.data:
        print(f"⚠️ User {test_user['email']} already exists")
        # Reset their status to waiting and ensure email_verified is True
        supabase.table("waitlist").update({
            "status": "waiting",
            "email_verified": True
        }).eq("email", test_user["email"]).execute()
        print("✅ Reset status to waiting (email_verified=True)")
        return existing.data[0]["id"]
    
    result = supabase.table("waitlist").insert(test_user).execute()
    print(f"✅ Created test user: {test_user['full_name']}")
    print(f"   Email: {test_user['email']}")
    print(f"   Topic: {test_user['thesis_topic']}")
    print(f"   ID: {test_user['id']}")
    return test_user["id"]


if __name__ == "__main__":
    with modal.enable_output():
        with app.run():
            user_id = create_test_user.remote()
            print(f"\n🎯 Test user ID: {user_id}")
            print("Now run: modal run backend/modal_worker.py")


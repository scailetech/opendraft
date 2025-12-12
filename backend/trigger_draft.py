#!/usr/bin/env python3
"""
Trigger draft generation for a specific draft ID via Modal
Called by Next.js API route after draft record is created
"""
import sys
import os
from pathlib import Path

# Add opendraft to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import modal
from supabase import create_client


def main(draft_id: str):
    """Trigger Modal worker for specific draft ID"""

    # Connect to Supabase to fetch draft data
    supabase = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"]
    )

    # Fetch draft record
    result = supabase.table("theses").select("*").eq("id", draft_id).single().execute()
    draft = result.data

    if not draft:
        print(f"❌ Draft {draft_id} not found")
        sys.exit(1)

    print(f"📝 Found draft: {draft['topic']}")
    print(f"📧 User ID: {draft['user_id']}")

    # Fetch user email (needed for notifications)
    user_result = supabase.auth.admin.get_user_by_id(draft['user_id'])
    user_email = user_result.user.email if user_result.user else "user@opendraft.xyz"

    # Format as user dict for Modal worker
    user_dict = {
        "user_id": draft["user_id"],
        "id": draft["user_id"],
        "email": user_email,
        "draft_topic": draft["topic"],
        "topic": draft["topic"],
        "language": draft.get("language", "en"),
        "academic_level": draft.get("academic_level", "master"),
        "full_name": draft.get("author_name", "User"),
        "author_name": draft.get("author_name"),
        "institution": draft.get("institution"),
        "department": draft.get("department"),
        "faculty": draft.get("faculty"),
        "advisor": draft.get("advisor"),
        "second_examiner": draft.get("second_examiner"),
        "location": draft.get("location"),
        "student_id": draft.get("student_id"),
        "waitlist_id": draft.get("waitlist_id"),
    }

    print(f"🚀 Triggering Modal worker for draft {draft_id}")

    # Get Modal function using lookup (newer Modal API)
    process_fn = modal.lookup("draft-generator", "process_single_user")

    # Call Modal function with draft_id parameter (runs in background)
    # Use spawn() to run asynchronously without waiting for completion
    call = process_fn.spawn(user_dict, draft_id)

    print(f"✅ Modal worker triggered: {call.object_id}")
    print(f"📊 Draft will be processed in Modal container")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python trigger_draft.py <draft_id>")
        sys.exit(1)

    draft_id = sys.argv[1]
    main(draft_id)

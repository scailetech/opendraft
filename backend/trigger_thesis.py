#!/usr/bin/env python3
"""
Trigger thesis generation for a specific thesis ID via Modal
Called by Next.js API route after thesis record is created
"""
import sys
import os
from pathlib import Path

# Add opendraft to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import modal
from supabase import create_client


def main(thesis_id: str):
    """Trigger Modal worker for specific thesis ID"""

    # Connect to Supabase to fetch thesis data
    supabase = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"]
    )

    # Fetch thesis record
    result = supabase.table("theses").select("*").eq("id", thesis_id).single().execute()
    thesis = result.data

    if not thesis:
        print(f"❌ Thesis {thesis_id} not found")
        sys.exit(1)

    print(f"📝 Found thesis: {thesis['topic']}")
    print(f"📧 User ID: {thesis['user_id']}")

    # Fetch user email (needed for notifications)
    user_result = supabase.auth.admin.get_user_by_id(thesis['user_id'])
    user_email = user_result.user.email if user_result.user else "user@opendraft.xyz"

    # Format as user dict for Modal worker
    user_dict = {
        "user_id": thesis["user_id"],
        "id": thesis["user_id"],
        "email": user_email,
        "thesis_topic": thesis["topic"],
        "topic": thesis["topic"],
        "language": thesis.get("language", "en"),
        "academic_level": thesis.get("academic_level", "master"),
        "full_name": thesis.get("author_name", "User"),
        "author_name": thesis.get("author_name"),
        "institution": thesis.get("institution"),
        "department": thesis.get("department"),
        "faculty": thesis.get("faculty"),
        "advisor": thesis.get("advisor"),
        "second_examiner": thesis.get("second_examiner"),
        "location": thesis.get("location"),
        "student_id": thesis.get("student_id"),
        "waitlist_id": thesis.get("waitlist_id"),
    }

    print(f"🚀 Triggering Modal worker for thesis {thesis_id}")

    # Get Modal function using lookup (newer Modal API)
    process_fn = modal.lookup("thesis-generator", "process_single_user")

    # Call Modal function with thesis_id parameter (runs in background)
    # Use spawn() to run asynchronously without waiting for completion
    call = process_fn.spawn(user_dict, thesis_id)

    print(f"✅ Modal worker triggered: {call.object_id}")
    print(f"📊 Thesis will be processed in Modal container")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python trigger_thesis.py <thesis_id>")
        sys.exit(1)

    thesis_id = sys.argv[1]
    main(thesis_id)

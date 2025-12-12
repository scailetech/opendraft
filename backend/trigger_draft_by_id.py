"""Trigger draft generation for a specific draft ID."""
import modal
import os
import sys

app = modal.App("trigger-draft")
image = modal.Image.debian_slim().pip_install("supabase>=2.24.0")

@app.function(
    image=image,
    secrets=[modal.Secret.from_name("supabase-credentials")],
)
def trigger_by_id(draft_id: str):
    from supabase import create_client

    supabase = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"]
    )

    print(f"🔍 Looking for draft: {draft_id}")

    # Find draft in theses table
    resp = supabase.table("theses").select("*").eq("id", draft_id).execute()

    if not resp.data:
        print(f"❌ Draft not found in theses table: {draft_id}")
        return None

    draft = resp.data[0]
    print(f"✅ Found draft")
    print(f"   Topic: {draft['topic']}")
    print(f"   Status: {draft['status']}")
    print(f"   User ID: {draft['user_id']}")
    print("")

    # Prepare user data dict for process_single_user
    # The function expects certain fields, so we map them appropriately
    user_data = {
        "user_id": draft["user_id"],
        "email": f"user_{draft['user_id']}@opendraft.xyz",  # Placeholder, will be overridden
        "draft_topic": draft["topic"],
        "topic": draft["topic"],
        "language": draft["language"],
        "academic_level": draft["academic_level"],
        "full_name": draft.get("author_name"),
        "author_name": draft.get("author_name"),
        "institution": draft.get("institution"),
        "department": draft.get("department"),
        "faculty": draft.get("faculty"),
        "advisor": draft.get("advisor"),
        "location": draft.get("location"),
        "waitlist_id": draft.get("waitlist_id"),  # May be NULL for direct generation
    }

    # Call the actual draft generator with draft_id
    print("🚀 Spawning Modal draft generator...")
    process_fn = modal.Function.from_name("draft-generator", "process_single_user")
    call = process_fn.spawn(user_data, draft_id)  # Pass draft_id as second argument

    print(f"✅ Generation started!")
    print(f"   Draft ID: {draft_id}")
    print(f"   Call ID: {call.object_id}")
    print(f"   Monitor: https://modal.com")

    return {"draft_id": draft_id, "call_id": call.object_id}

@app.local_entrypoint()
def main(draft_id: str):
    result = trigger_by_id.remote(draft_id)
    if result:
        print(f"\n✅ Successfully triggered draft generation!")
        print(f"   Draft ID: {result['draft_id']}")
        print(f"   Modal Call ID: {result['call_id']}")


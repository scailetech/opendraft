"""Trigger thesis generation for a specific thesis ID."""
import modal
import os
import sys

app = modal.App("trigger-thesis")
image = modal.Image.debian_slim().pip_install("supabase>=2.24.0")

@app.function(
    image=image,
    secrets=[modal.Secret.from_name("supabase-credentials")],
)
def trigger_by_id(thesis_id: str):
    from supabase import create_client

    supabase = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"]
    )

    print(f"🔍 Looking for thesis: {thesis_id}")

    # Find thesis in theses table
    resp = supabase.table("theses").select("*").eq("id", thesis_id).execute()

    if not resp.data:
        print(f"❌ Thesis not found in theses table: {thesis_id}")
        return None

    thesis = resp.data[0]
    print(f"✅ Found thesis")
    print(f"   Topic: {thesis['topic']}")
    print(f"   Status: {thesis['status']}")
    print(f"   User ID: {thesis['user_id']}")
    print("")

    # Prepare user data dict for process_single_user
    # The function expects certain fields, so we map them appropriately
    user_data = {
        "user_id": thesis["user_id"],
        "email": f"user_{thesis['user_id']}@opendraft.xyz",  # Placeholder, will be overridden
        "thesis_topic": thesis["topic"],
        "topic": thesis["topic"],
        "language": thesis["language"],
        "academic_level": thesis["academic_level"],
        "full_name": thesis.get("author_name"),
        "author_name": thesis.get("author_name"),
        "institution": thesis.get("institution"),
        "department": thesis.get("department"),
        "faculty": thesis.get("faculty"),
        "advisor": thesis.get("advisor"),
        "location": thesis.get("location"),
        "waitlist_id": thesis.get("waitlist_id"),  # May be NULL for direct generation
    }

    # Call the actual thesis generator with thesis_id
    print("🚀 Spawning Modal thesis generator...")
    process_fn = modal.Function.from_name("thesis-generator", "process_single_user")
    call = process_fn.spawn(user_data, thesis_id)  # Pass thesis_id as second argument

    print(f"✅ Generation started!")
    print(f"   Thesis ID: {thesis_id}")
    print(f"   Call ID: {call.object_id}")
    print(f"   Monitor: https://modal.com")

    return {"thesis_id": thesis_id, "call_id": call.object_id}

@app.local_entrypoint()
def main(thesis_id: str):
    result = trigger_by_id.remote(thesis_id)
    if result:
        print(f"\n✅ Successfully triggered thesis generation!")
        print(f"   Thesis ID: {result['thesis_id']}")
        print(f"   Modal Call ID: {result['call_id']}")


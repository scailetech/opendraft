"""Trigger Modal directly via Python API - uses Modal function to fetch data"""
import modal
import sys

draft_id = sys.argv[1] if len(sys.argv) > 1 else None
if not draft_id:
    print("Usage: python3 trigger_via_python.py <draft_id>")
    sys.exit(1)

print(f"🔍 Triggering draft: {draft_id}")

# Create a Modal function that will fetch the draft and trigger processing
app = modal.App("trigger-draft-direct")
image = modal.Image.debian_slim().pip_install("supabase>=2.24.0")

@app.function(
    image=image,
    secrets=[modal.Secret.from_name("supabase-credentials")],
)
def trigger_draft(draft_id: str):
    import os
    from supabase import create_client
    
    supabase = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"]
    )
    
    print(f"🔍 Looking for draft: {draft_id}")
    resp = supabase.table("waitlist").select("*").eq("id", draft_id).execute()
    
    if not resp.data:
        print(f"❌ Draft not found: {draft_id}")
        return None
    
    user = resp.data[0]
    print(f"✅ Found draft: {user['draft_topic']}")
    
    # Trigger the actual draft generator
    print("🚀 Spawning draft generator...")
    process_fn = modal.Function.from_name("draft-generator", "process_single_user")
    call = process_fn.spawn(user)
    
    print(f"✅ Generation started! Call ID: {call.object_id}")
    return {"draft_id": draft_id, "call_id": call.object_id}

@app.local_entrypoint()
def main(draft_id: str):
    result = trigger_draft.remote(draft_id)
    if result:
        print(f"\n✅ Successfully triggered!")
        print(f"   Draft ID: {result['draft_id']}")
        print(f"   Modal Call ID: {result['call_id']}")
    else:
        print("\n❌ Failed to trigger draft generation")

if __name__ == "__main__":
    main(draft_id)

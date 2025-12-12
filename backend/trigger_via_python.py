"""Trigger Modal directly via Python API - uses Modal function to fetch data"""
import modal
import sys

thesis_id = sys.argv[1] if len(sys.argv) > 1 else None
if not thesis_id:
    print("Usage: python3 trigger_via_python.py <thesis_id>")
    sys.exit(1)

print(f"🔍 Triggering thesis: {thesis_id}")

# Create a Modal function that will fetch the thesis and trigger processing
app = modal.App("trigger-thesis-direct")
image = modal.Image.debian_slim().pip_install("supabase>=2.24.0")

@app.function(
    image=image,
    secrets=[modal.Secret.from_name("supabase-credentials")],
)
def trigger_thesis(thesis_id: str):
    import os
    from supabase import create_client
    
    supabase = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"]
    )
    
    print(f"🔍 Looking for thesis: {thesis_id}")
    resp = supabase.table("waitlist").select("*").eq("id", thesis_id).execute()
    
    if not resp.data:
        print(f"❌ Thesis not found: {thesis_id}")
        return None
    
    user = resp.data[0]
    print(f"✅ Found thesis: {user['thesis_topic']}")
    
    # Trigger the actual thesis generator
    print("🚀 Spawning thesis generator...")
    process_fn = modal.Function.from_name("thesis-generator", "process_single_user")
    call = process_fn.spawn(user)
    
    print(f"✅ Generation started! Call ID: {call.object_id}")
    return {"thesis_id": thesis_id, "call_id": call.object_id}

@app.local_entrypoint()
def main(thesis_id: str):
    result = trigger_thesis.remote(thesis_id)
    if result:
        print(f"\n✅ Successfully triggered!")
        print(f"   Thesis ID: {result['thesis_id']}")
        print(f"   Modal Call ID: {result['call_id']}")
    else:
        print("\n❌ Failed to trigger thesis generation")

if __name__ == "__main__":
    main(thesis_id)

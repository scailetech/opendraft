"""Direct Modal trigger - bypasses CLI issues"""
import modal
import os
import sys

# Get thesis ID from command line
thesis_id = sys.argv[1] if len(sys.argv) > 1 else None
if not thesis_id:
    print("Usage: python3 trigger_direct.py <thesis_id>")
    sys.exit(1)

print(f"🔍 Triggering thesis: {thesis_id}")

# Connect to Supabase to get user data
from supabase import create_client

supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_KEY")

if not supabase_url or not supabase_key:
    print("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables")
    sys.exit(1)

supabase = create_client(supabase_url, supabase_key)

# Fetch thesis data
resp = supabase.table("waitlist").select("*").eq("id", thesis_id).execute()

if not resp.data:
    print(f"❌ Thesis not found: {thesis_id}")
    sys.exit(1)

user = resp.data[0]
print(f"✅ Found thesis: {user['thesis_topic']}")
print(f"   Status: {user['status']}")

# Get Modal function
try:
    process_fn = modal.Function.from_name("thesis-generator", "process_single_user")
    print("🚀 Spawning Modal function...")
    call = process_fn.spawn(user)
    print(f"✅ Generation started!")
    print(f"   Call ID: {call.object_id}")
    print(f"   Monitor: https://modal.com/apps/tech-opendraft/main/deployed/thesis-generator")
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)


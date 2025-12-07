"""Simulate 2 AM UTC batch run - process verified users."""
import modal
import os

app = modal.App("simulate-batch")
image = modal.Image.debian_slim().pip_install("supabase>=2.24.0")

@app.function(
    image=image,
    secrets=[modal.Secret.from_name("supabase-credentials")],
)
def simulate_batch():
    """Simulate the daily batch - fetch verified users and trigger processing."""
    from supabase import create_client
    
    supabase = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"]
    )
    
    print("🕐 Simulating 2 AM UTC batch run...")
    print("=" * 60)
    
    # Get next verified users (same query as daily batch)
    response = supabase.table("waitlist") \
        .select("*") \
        .eq("status", "waiting") \
        .eq("email_verified", True) \
        .order("position", desc=False) \
        .limit(20) \
        .execute()
    
    users = response.data
    print(f"📊 Found {len(users)} verified users to process")
    print("")
    
    if not users:
        print("✅ No users to process!")
        return {"processed": 0}
    
    # Show users that will be processed
    print("Users to process:")
    for i, user in enumerate(users, 1):
        print(f"  {i}. {user['email']} - Position #{user['position']} - Topic: {user['thesis_topic'][:50]}...")
    print("")
    
    # Trigger processing for each user
    process_fn = modal.Function.from_name("thesis-generator", "process_single_user")
    
    print("🚀 Triggering thesis generation for users...")
    print("")
    
    calls = []
    for user in users:
        email = user['email']
        position = user['position']
        print(f"  → Spawning thesis for {email} (position #{position})...")
        call = process_fn.spawn(user)
        calls.append({
            "email": email,
            "position": position,
            "call_id": call.object_id,
            "user_id": user['id']
        })
        print(f"     ✅ Spawned! Call ID: {call.object_id}")
    
    print("")
    print("=" * 60)
    print("✅ Batch simulation complete!")
    print(f"📧 Triggered {len(calls)} thesis generations")
    print("")
    print("Monitor progress at:")
    print("  https://modal.com/apps/tech-opendraft/main/deployed/thesis-generator")
    print("")
    print("Users will receive completion emails when their thesis is ready.")
    
    return {
        "processed": len(calls),
        "calls": calls
    }

if __name__ == "__main__":
    with modal.enable_output():
        with app.run():
            result = simulate_batch.remote()
            if result:
                print(f"\n📊 Summary:")
                print(f"   Processed: {result['processed']} users")
                if result.get('calls'):
                    print(f"\n   Call IDs:")
                    for call in result['calls']:
                        print(f"     - {call['email']}: {call['call_id']}")


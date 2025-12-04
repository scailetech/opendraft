#!/usr/bin/env python3
"""Monitor thesis generation progress."""
import modal
import os

app = modal.App("monitor-progress")
image = modal.Image.debian_slim().pip_install("supabase>=2.24.0")

@app.function(image=image, secrets=[modal.Secret.from_name("supabase-credentials")])
def check_progress():
    from supabase import create_client
    
    supabase = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"]
    )
    
    # Count by status for loadtest users
    statuses = {}
    for status in ["waiting", "processing", "completed", "failed"]:
        result = supabase.table("waitlist")\
            .select("id", count="exact")\
            .like("email", "loadtest-%")\
            .eq("status", status)\
            .execute()
        statuses[status] = result.count or 0
    
    total = sum(statuses.values())
    completed = statuses.get("completed", 0)
    processing = statuses.get("processing", 0)
    failed = statuses.get("failed", 0)
    waiting = statuses.get("waiting", 0)
    
    print(f"\n{'='*50}")
    print(f"📊 LOAD TEST PROGRESS")
    print(f"{'='*50}")
    print(f"✅ Completed: {completed}/{total} ({100*completed/total:.1f}%)")
    print(f"🔄 Processing: {processing}")
    print(f"⏳ Waiting: {waiting}")
    print(f"❌ Failed: {failed}")
    print(f"{'='*50}")
    
    # Show recent completions
    recent = supabase.table("waitlist")\
        .select("email,full_name,thesis_topic,completed_at")\
        .like("email", "loadtest-%")\
        .eq("status", "completed")\
        .order("completed_at", desc=True)\
        .limit(5)\
        .execute()
    
    if recent.data:
        print(f"\n📝 Recent completions:")
        for r in recent.data:
            print(f"   • {r['full_name']}: {r['thesis_topic'][:40]}...")
    
    return statuses

if __name__ == "__main__":
    with modal.enable_output():
        with app.run():
            check_progress.remote()


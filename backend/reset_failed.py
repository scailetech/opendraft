#!/usr/bin/env python3
"""Reset failed users to retry them."""
import modal
import os

app = modal.App("reset-failed")
image = modal.Image.debian_slim().pip_install("supabase>=2.24.0")

@app.function(image=image, secrets=[modal.Secret.from_name("supabase-credentials")])
def reset_failed():
    from supabase import create_client
    
    supabase = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"]
    )
    
    # Get failed loadtest users
    result = supabase.table("waitlist")\
        .select("id,email")\
        .like("email", "loadtest-%")\
        .eq("status", "failed")\
        .execute()
    
    count = len(result.data)
    print(f"🔄 Resetting {count} failed users...")
    
    # Reset to waiting
    supabase.table("waitlist")\
        .update({"status": "waiting", "error_message": None})\
        .like("email", "loadtest-%")\
        .eq("status", "failed")\
        .execute()
    
    print(f"✅ Reset {count} users to 'waiting' status")
    return count

if __name__ == "__main__":
    with modal.enable_output():
        with app.run():
            reset_failed.remote()


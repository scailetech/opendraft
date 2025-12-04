#!/usr/bin/env python3
"""Check failed thesis details."""
import modal
import os

app = modal.App("check-failures")
image = modal.Image.debian_slim().pip_install("supabase>=2.24.0")

@app.function(image=image, secrets=[modal.Secret.from_name("supabase-credentials")])
def check_failures():
    from supabase import create_client
    
    supabase = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"]
    )
    
    result = supabase.table("waitlist")\
        .select("email,full_name,thesis_topic,error_message")\
        .like("email", "loadtest-%")\
        .eq("status", "failed")\
        .execute()
    
    print(f"\n❌ FAILED THESES: {len(result.data)}\n")
    for r in result.data:
        error = r.get('error_message', 'Unknown')[:200] if r.get('error_message') else 'Unknown'
        print(f"• {r['email']}: {error}...")
        print()

if __name__ == "__main__":
    with modal.enable_output():
        with app.run():
            check_failures.remote()


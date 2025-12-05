"""Monitor thesis generation progress."""
import modal
import os
import time

app = modal.App("monitor-progress")
image = modal.Image.debian_slim().pip_install("supabase>=2.24.0")

@app.function(
    image=image,
    secrets=[modal.Secret.from_name("supabase-credentials")],
)
def check_status(user_id: str):
    from supabase import create_client
    
    supabase = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"]
    )
    
    resp = supabase.table("waitlist").select("*").eq("id", user_id).single().execute()
    user = resp.data
    
    print("=" * 60)
    print(f"STATUS CHECK: {user['full_name']}")
    print("=" * 60)
    print(f"Status:  {user['status']}")
    print(f"Topic:   {user['thesis_topic'][:60]}...")
    
    if user['processing_started_at']:
        print(f"Started: {user['processing_started_at']}")
    if user['completed_at']:
        print(f"Done:    {user['completed_at']}")
    if user['error_message']:
        print(f"Error:   {user['error_message']}")
    
    print()
    if user['pdf_url']:
        print(f"PDF:  {user['pdf_url'][:80]}...")
    if user['docx_url']:
        print(f"DOCX: {user['docx_url'][:80]}...")
    if user.get('zip_url'):
        print(f"ZIP:  {user['zip_url'][:80]}...")
    
    print("=" * 60)
    return user['status']

if __name__ == "__main__":
    user_id = "07b4e61c-47d7-4713-82b3-3597b64f77bb"
    with modal.enable_output():
        with app.run():
            check_status.remote(user_id)

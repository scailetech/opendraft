#!/usr/bin/env python3
"""Check thesis generation status for a user."""
import modal
import os

app = modal.App("check-status")
image = modal.Image.debian_slim().pip_install("supabase>=2.24.0")

@app.function(image=image, secrets=[modal.Secret.from_name("supabase-credentials")])
def check_user():
    from supabase import create_client
    supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])
    
    user = supabase.table("waitlist").select("*").eq("email", "test-academic2@opendraft.dev").execute()
    if user.data:
        u = user.data[0]
        print(f"Full Name: {u.get('full_name', 'N/A')}")
        print(f"Status: {u['status']}")
        print(f"PDF URL: {u.get('pdf_url', 'N/A')}")
        print(f"DOCX URL: {u.get('docx_url', 'N/A')}")
    return user.data

if __name__ == "__main__":
    with modal.enable_output():
        with app.run():
            check_user.remote()


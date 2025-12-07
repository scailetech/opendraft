"""Trigger thesis generation for f.deponte@yahoo.de"""
import modal
import os

app = modal.App("thesis-generator")
image = modal.Image.debian_slim().pip_install("supabase>=2.24.0")

@app.function(
    image=image,
    secrets=[modal.Secret.from_name("supabase-credentials")],
)
def trigger():
    from supabase import create_client
    
    supabase = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"]
    )
    
    email = "f.deponte@yahoo.de"
    
    print(f"🔍 Looking for user: {email}")
    
    # Find user
    resp = supabase.table("waitlist").select("*").eq("email", email).execute()
    
    if not resp.data:
        print(f"❌ No user found with email: {email}")
        return None
    
    user = resp.data[0]
    print(f"✅ Found user: {user['id']}")
    print(f"   Position: #{user['position']}")
    print(f"   Status: {user['status']}")
    print(f"   Email verified: {user['email_verified']}")
    print(f"   Topic: {user['thesis_topic']}")
    print("")
    
    if user['status'] != 'waiting':
        print(f"⚠️ User status is '{user['status']}', resetting to 'waiting'...")
        supabase.table("waitlist").update({
            "status": "waiting",
            "processing_started_at": None,
            "completed_at": None,
            "pdf_url": None,
            "docx_url": None,
            "zip_url": None,
            "error_message": None,
        }).eq("id", user['id']).execute()
        print("✅ Status reset to 'waiting'")
        print("")
        
        # Fetch updated user
        user = supabase.table("waitlist").select("*").eq("id", user['id']).single().execute().data
    
    if not user['email_verified']:
        print(f"⚠️ Email not verified! Verifying now...")
        supabase.table("waitlist").update({
            "email_verified": True,
        }).eq("id", user['id']).execute()
        print("✅ Email marked as verified")
        print("")
        user['email_verified'] = True
    
    # Trigger thesis generation
    print("🚀 Triggering thesis generation...")
    print(f"   Topic: {user['thesis_topic']}")
    print(f"   Language: {user['language']}")
    print(f"   Level: {user['academic_level']}")
    print("")
    
    process_fn = modal.Function.from_name("thesis-generator", "process_single_user")
    call = process_fn.spawn(user)
    
    print(f"✅ Thesis generation spawned!")
    print(f"   Call ID: {call.object_id}")
    print("")
    print("📊 Monitor progress:")
    print(f"   https://modal.com/apps/tech-opendraft/main/deployed/thesis-generator")
    print("")
    print("📧 You'll receive a completion email when the thesis is ready!")
    
    return {"user_id": user['id'], "call_id": call.object_id, "email": email}

if __name__ == "__main__":
    with modal.enable_output():
        with app.run():
            result = trigger.remote()
            if result:
                print(f"\n✅ Success!")
                print(f"   User ID: {result['user_id']}")
                print(f"   Call ID: {result['call_id']}")
                print(f"   Email: {result['email']}")


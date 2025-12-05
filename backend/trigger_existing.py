"""Find existing user and trigger thesis."""
import modal
import os

app = modal.App("trigger-existing")
image = modal.Image.debian_slim().pip_install("supabase>=2.24.0")

@app.function(
    image=image,
    secrets=[modal.Secret.from_name("supabase-credentials")],
)
def trigger():
    from supabase import create_client
    from datetime import datetime
    
    supabase = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"]
    )
    
    email = "depontefede@gmail.com"
    topic = "The Death of Three-Tier Pricing? Computational Evidence on SaaS Pricing Model Evolution in the Multi-Agent AI Era"
    
    # Find existing user
    resp = supabase.table("waitlist").select("*").eq("email", email).execute()
    
    if resp.data:
        user = resp.data[0]
        print(f"Found existing user: {user['id']}")
        print(f"Current status: {user['status']}")
        print(f"Current topic: {user['thesis_topic']}")
        
        # Update topic and reset status
        supabase.table("waitlist").update({
            "thesis_topic": topic,
            "status": "waiting",
            "processing_started_at": None,
            "completed_at": None,
            "pdf_url": None,
            "docx_url": None,
            "zip_url": None,
            "error_message": None,
        }).eq("id", user['id']).execute()
        
        print(f"\nUpdated topic to: {topic}")
        print(f"Reset status to: waiting")
        
        # Fetch updated user
        user = supabase.table("waitlist").select("*").eq("id", user['id']).single().execute().data
        
        # Trigger thesis
        print(f"\nTriggering thesis generation...")
        process_fn = modal.Function.from_name("thesis-generator", "process_single_user")
        call = process_fn.spawn(user)
        print(f"Spawned! Call ID: {call.object_id}")
        print(f"\nMonitor: https://modal.com/apps/tech-opendraft/main/deployed/thesis-generator")
        
        return {"user_id": user['id'], "call_id": call.object_id}
    else:
        print(f"No user found with email: {email}")
        return None

if __name__ == "__main__":
    with modal.enable_output():
        with app.run():
            result = trigger.remote()
            if result:
                print(f"\nUser ID: {result['user_id']}")

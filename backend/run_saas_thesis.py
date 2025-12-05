"""Create user and trigger thesis generation for SaaS pricing topic."""
import modal
import os
import uuid
from datetime import datetime, timedelta

app = modal.App("run-saas-thesis")
image = modal.Image.debian_slim().pip_install("supabase>=2.24.0")

@app.function(
    image=image,
    secrets=[modal.Secret.from_name("supabase-credentials")],
)
def create_and_trigger():
    from supabase import create_client
    
    supabase = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"]
    )
    
    # Create user
    user_id = str(uuid.uuid4())
    topic = "The Death of Three-Tier Pricing? Computational Evidence on SaaS Pricing Model Evolution in the Multi-Agent AI Era"
    
    # Get max position
    resp = supabase.table("waitlist").select("position").order("position", desc=True).limit(1).execute()
    position = (resp.data[0]['position'] + 1) if resp.data else 1
    
    user_data = {
        "id": user_id,
        "email": "depontefede@gmail.com",
        "full_name": "Federico De Ponte",
        "thesis_topic": topic,
        "language": "en",
        "academic_level": "master",
        "position": position,
        "original_position": position,
        "referral_code": uuid.uuid4().hex[:8].upper(),
        "email_verified": True,
        "verified_at": datetime.now().isoformat(),
        "status": "waiting",
        "created_at": datetime.now().isoformat(),
    }
    
    supabase.table("waitlist").insert(user_data).execute()
    print(f"Created user: {user_id}")
    print(f"Topic: {topic}")
    print(f"Position: #{position}")
    
    # Trigger thesis generation using the deployed app
    print(f"\nTriggering thesis generation...")
    process_fn = modal.Function.from_name("thesis-generator", "process_single_user")
    
    # Fetch full user data
    user = supabase.table("waitlist").select("*").eq("id", user_id).single().execute().data
    
    # Spawn async so we can monitor
    call = process_fn.spawn(user)
    print(f"Spawned! Call ID: {call.object_id}")
    print(f"\nMonitor at: https://modal.com/apps/tech-opendraft/main/deployed/thesis-generator")
    
    return {"user_id": user_id, "call_id": call.object_id}

if __name__ == "__main__":
    with modal.enable_output():
        with app.run():
            result = create_and_trigger.remote()
            print(f"\nTo check status later:")
            print(f"   User ID: {result['user_id']}")

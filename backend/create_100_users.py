#!/usr/bin/env python3
"""Create 100 test users for production load test."""
import modal
import os
from datetime import datetime
import uuid
import random

app = modal.App("create-100-users")
image = modal.Image.debian_slim().pip_install("supabase>=2.24.0")

# Diverse thesis topics for testing
TOPICS = [
    "Machine Learning in Healthcare Diagnostics",
    "Renewable Energy Grid Integration",
    "Natural Language Processing for Legal Documents",
    "Blockchain Applications in Supply Chain",
    "Computer Vision for Autonomous Vehicles",
    "Cybersecurity in IoT Networks",
    "Climate Change Impact on Agriculture",
    "Deep Learning for Drug Discovery",
    "Quantum Computing Algorithms",
    "Sustainable Urban Planning",
    "Financial Risk Modeling with AI",
    "Robotics in Manufacturing",
    "Social Media Sentiment Analysis",
    "Genomics and Personalized Medicine",
    "Smart City Infrastructure",
    "Neural Networks for Speech Recognition",
    "E-commerce Recommendation Systems",
    "Environmental Monitoring with Drones",
    "Telemedicine and Remote Healthcare",
    "Artificial Intelligence in Education",
]

NAMES = [
    "Emma Wilson", "James Chen", "Sofia Garcia", "Liam Johnson", "Olivia Brown",
    "Noah Martinez", "Ava Anderson", "William Taylor", "Isabella Thomas", "Mason Lee",
    "Mia Harris", "Ethan Clark", "Charlotte Lewis", "Alexander Robinson", "Amelia Walker",
    "Daniel Hall", "Harper Young", "Matthew King", "Evelyn Wright", "Michael Scott",
]

LEVELS = ["bachelor", "master", "phd"]

@app.function(
    image=image, 
    secrets=[modal.Secret.from_name("supabase-credentials")],
    timeout=300,
)
def create_users(count: int = 100):
    """Create test users in Supabase."""
    from supabase import create_client
    
    supabase = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"]
    )
    
    created = 0
    skipped = 0
    
    for i in range(count):
        name = random.choice(NAMES)
        topic = random.choice(TOPICS)
        level = random.choice(LEVELS)
        
        user = {
            "id": str(uuid.uuid4()),
            "email": f"loadtest-{i+1:03d}@opendraft.dev",
            "full_name": f"{name} #{i+1}",
            "thesis_topic": f"{topic}: A {level.title()} Study",
            "academic_level": level,
            "language": "en",
            "position": i + 1,
            "original_position": i + 1,
            "referral_code": f"LOAD-{uuid.uuid4().hex[:6].upper()}",
            "status": "waiting",
            "email_verified": True,
            "created_at": datetime.now().isoformat(),
        }
        
        try:
            # Check if exists
            existing = supabase.table("waitlist").select("id").eq("email", user["email"]).execute()
            if existing.data:
                # Reset status
                supabase.table("waitlist").update({
                    "status": "waiting",
                    "email_verified": True
                }).eq("email", user["email"]).execute()
                skipped += 1
            else:
                supabase.table("waitlist").insert(user).execute()
                created += 1
                
            if (i + 1) % 10 == 0:
                print(f"Progress: {i + 1}/{count}")
                
        except Exception as e:
            print(f"Error creating user {i+1}: {e}")
    
    print(f"\n✅ Created: {created} new users")
    print(f"🔄 Reset: {skipped} existing users")
    print(f"📊 Total ready: {created + skipped}")
    
    return {"created": created, "reset": skipped, "total": created + skipped}


if __name__ == "__main__":
    import sys
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 100
    
    with modal.enable_output():
        with app.run():
            result = create_users.remote(count)
            print(f"\n🎯 Result: {result}")


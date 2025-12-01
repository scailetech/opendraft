"""
Modal.com worker for automated thesis generation
Runs daily at 9am UTC, processes 100 waiting users from Supabase IN PARALLEL
"""

import modal
import os
from datetime import datetime

# Create Modal app
app = modal.App("thesis-generator")

# Modal image with system dependencies, Python packages, and codebase
image = (modal.Image.debian_slim()
    # System packages for WeasyPrint PDF generation
    .apt_install(
        "libpango-1.0-0",
        "libpangocairo-1.0-0",
        "libgdk-pixbuf2.0-0",
        "libffi-dev",
        "shared-mime-info"
    )
    # Python packages
    .pip_install(
        # Infrastructure
        "supabase>=2.24.0",
        "resend==0.7.0",
        "python-dotenv>=1.0.0",
        # LLM APIs
        "google-generativeai>=0.8.0",
        "anthropic>=0.20.0",
        "openai>=1.0.0",
        # Citation Management
        "pybtex>=0.24.0",
        "citeproc-py>=0.6.0",
        "PyYAML>=6.0.0",
        # Document Export
        "markdown>=3.5.0",
        "weasyprint>=60.0",
        "python-docx>=1.0.0",
        # HTTP & Web Scraping
        "requests>=2.31.0",
        "beautifulsoup4>=4.12.0",
        "lxml>=4.9.0",
        # Utilities
        "rich>=13.0.0"
    )
    # Add entire codebase into image
    .add_local_dir("./opendraft", "/root/opendraft/opendraft")
    .add_local_dir("./utils", "/root/opendraft/utils")
    .add_local_dir("./prompts", "/root/opendraft/prompts")
    .add_local_dir("./concurrency", "/root/opendraft/concurrency")
    .add_local_dir("./backend", "/root/opendraft/backend")
    .add_local_dir("./tests", "/root/opendraft/tests")
    .add_local_file("./config.py", "/root/opendraft/config.py")
)

# Persistent volume for temporary thesis files
volume = modal.Volume.from_name("thesis-temp", create_if_missing=True)


@app.function(
    timeout=3600,  # 1 hour max per thesis
    volumes={"/tmp/thesis": volume},
    secrets=[
        modal.Secret.from_name("supabase-credentials"),
        modal.Secret.from_name("gemini-api-key"),
        modal.Secret.from_name("resend-api-key"),
    ],
    image=image,
    retries=2,  # Auto-retry on failure
)
def process_single_user(user: dict) -> dict:
    """
    Process a single user thesis - runs in its own container.
    Modal will spin up 100 of these in parallel!
    """
    import resend
    from supabase import create_client
    
    supabase = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"]
    )
    resend.api_key = os.environ["RESEND_API_KEY"]
    
    user_id = user["id"]
    email = user["email"]
    pdf_url = None
    docx_url = None
    thesis_generated = False
    
    try:
        print(f"🚀 Starting thesis for {email}...")
        
        # Update status to processing
        supabase.table("waitlist").update({
            "status": "processing",
            "processing_started_at": datetime.now().isoformat()
        }).eq("id", user_id).execute()
        
        # Generate thesis
        pdf_path, docx_path = generate_thesis_real(
            topic=user["thesis_topic"],
            language=user["language"],
            academic_level=user["academic_level"],
            user_id=user_id  # For unique output paths
        )
        
        # Upload to Supabase Storage
        with open(pdf_path, "rb") as pdf_file:
            supabase.storage.from_("thesis-files").upload(
                f"{user_id}/thesis.pdf",
                pdf_file.read(),
                file_options={"content-type": "application/pdf", "upsert": "true"}
            )
        
        with open(docx_path, "rb") as docx_file:
            supabase.storage.from_("thesis-files").upload(
                f"{user_id}/thesis.docx",
                docx_file.read(),
                file_options={"content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "upsert": "true"}
            )
        
        # Get signed URLs (7-day expiry)
        pdf_signed = supabase.storage.from_("thesis-files").create_signed_url(
            f"{user_id}/thesis.pdf", expires_in=604800
        )
        docx_signed = supabase.storage.from_("thesis-files").create_signed_url(
            f"{user_id}/thesis.docx", expires_in=604800
        )
        
        pdf_url = pdf_signed["signedURL"]
        docx_url = docx_signed["signedURL"]
        thesis_generated = True
        
        # Update status to completed
        supabase.table("waitlist").update({
            "status": "completed",
            "completed_at": datetime.now().isoformat(),
            "pdf_url": pdf_url,
            "docx_url": docx_url
        }).eq("id", user_id).execute()
        
        print(f"✅ Thesis generated and uploaded for {email}")
        
    except Exception as e:
        print(f"❌ Failed thesis generation for {email}: {e}")
        # Only mark as failed if thesis wasn't generated
        if not thesis_generated:
            supabase.table("waitlist").update({
                "status": "failed",
                "error_message": str(e)[:500]  # Truncate long errors
            }).eq("id", user_id).execute()
            return {"email": email, "status": "failed", "error": str(e)}
    
    # Send completion email (separate try/except - don't fail if email fails)
    if thesis_generated and pdf_url and docx_url:
        try:
            send_completion_email(
                email,
                user["full_name"],
                pdf_url,
                docx_url
            )
            print(f"📧 Email sent to {email}")
        except Exception as e:
            print(f"⚠️ Email failed for {email} (thesis still completed): {e}")
            # Don't mark as failed - thesis was generated successfully
    
    print(f"✅ Completed thesis for {email}")
    return {"email": email, "status": "success"}


@app.function(
    schedule=modal.Cron("0 9 * * *"),  # Daily at 9am UTC
    timeout=7200,  # 5 min to orchestrate (actual work is parallel)
    secrets=[modal.Secret.from_name("supabase-credentials")],
    image=image,
)
def daily_thesis_batch():
    """
    Main scheduled function - fetches users and spawns parallel processing.
    """
    from supabase import create_client
    
    print(f"[{datetime.now()}] Starting daily thesis batch...")
    
    supabase = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"]
    )
    
    # Get next 100 waiting users (FIFO, email verified)
    response = supabase.table("waitlist") \
        .select("*") \
        .eq("status", "waiting") \
        .eq("email_verified", True) \
        .order("position", desc=False) \
        .limit(100) \
        .execute()
    
    users = response.data
    print(f"Found {len(users)} users to process")
    
    if not users:
        print("No users to process today!")
        return
    
    # 🚀 PARALLEL PROCESSING - spawn all at once!
    # Modal will create up to 100 containers simultaneously
    print(f"Spawning {len(users)} parallel thesis generations...")
    
    results = list(process_single_user.map(users))
    
    # Count results
    success_count = sum(1 for r in results if r["status"] == "success")
    failed_count = sum(1 for r in results if r["status"] == "failed")
    
    print(f"[{datetime.now()}] Batch complete: {success_count} success, {failed_count} failed")
    
    # Log daily stats (upsert to handle reruns)
    try:
        supabase.table("daily_processing_log").upsert({
            "date": datetime.now().date().isoformat(),
            "processed_count": success_count,
            "failed_count": failed_count,
            "completed_at": datetime.now().isoformat()
        }, on_conflict="date").execute()
    except:
        pass  # Ignore logging errors


def generate_thesis_real(topic: str, language: str, academic_level: str, user_id: str = "test"):
    """Generate thesis using the AI framework."""
    import sys
    from pathlib import Path
    
    sys.path.insert(0, "/root/opendraft")
    
    if "GOOGLE_API_KEY" not in os.environ and "GEMINI_API_KEY" in os.environ:
        os.environ["GOOGLE_API_KEY"] = os.environ["GEMINI_API_KEY"]
    
    from backend.thesis_generator import generate_thesis
    
    # Each user gets their own output directory
    output_dir = Path(f"/tmp/thesis/{user_id}")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    pdf_path, docx_path = generate_thesis(
        topic=topic,
        language=language,
        academic_level=academic_level,
        output_dir=output_dir,
        skip_validation=True,
        verbose=True
    )
    
    return str(pdf_path), str(docx_path)


def send_completion_email(email: str, name: str, pdf_url: str, docx_url: str):
    """Send thesis completion notification email."""
    import resend
    
    resend.Emails.send({
        "from": "OpenDraft <hello@opendraft.io>",
        "to": email,
        "subject": "Your AI-Generated Thesis is Ready! 🎓",
        "html": f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #0a0a0a; color: #fafafa; margin: 0; padding: 0; }}
                    .container {{ background-color: #0a0a0a; margin: 0 auto; padding: 40px; max-width: 600px; }}
                    .header {{ font-size: 28px; font-weight: bold; margin-bottom: 24px; }}
                    .content {{ font-size: 16px; line-height: 1.6; color: #a1a1aa; margin-bottom: 32px; }}
                    .button-container {{ margin: 32px 0; }}
                    .button {{ background-color: #3b82f6; border-radius: 8px; color: #fff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 28px; display: inline-block; margin-right: 12px; }}
                    .button-secondary {{ background-color: #27272a; }}
                    .footer {{ color: #71717a; font-size: 14px; margin-top: 48px; padding-top: 24px; border-top: 1px solid #27272a; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <h1 class="header">Your Thesis is Ready, {name}! 🎓</h1>
                    <p class="content">Great news! Our 19 AI agents have finished generating your thesis. Download it now:</p>
                    <div class="button-container">
                        <a href="{pdf_url}" class="button">Download PDF</a>
                        <a href="{docx_url}" class="button button-secondary">Download Word</a>
                    </div>
                    <p class="content" style="font-size: 14px;">⏰ These links expire in 7 days. Make sure to download your files!</p>
                    <p class="footer">
                        Love your thesis? Star us on <a href="https://github.com/federicodeponte/opendraft" style="color: #3b82f6;">GitHub</a>!<br/>
                        — The OpenDraft Team
                    </p>
                </div>
            </body>
            </html>
        """
    })


@app.local_entrypoint()
def main():
    """Test function - triggers the batch."""
    daily_thesis_batch.remote()

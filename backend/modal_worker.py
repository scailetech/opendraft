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
    # Add pre-rendered email templates
    .add_local_dir("./backend/email_templates", "/root/opendraft/backend/email_templates")
)

# Persistent volume for temporary thesis files
volume = modal.Volume.from_name("thesis-temp", create_if_missing=True)


@app.function(
    timeout=3600,  # 1 hour max per thesis
    volumes={"/tmp/thesis": volume},
    secrets=[
        modal.Secret.from_name("supabase-credentials"),
        modal.Secret.from_name("gemini-api-key"),
        modal.Secret.from_name("gemini-api-key-fallback"),
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
            # Note: error_message column may not exist, so just log it
            try:
                supabase.table("waitlist").update({
                    "status": "failed",
                    "error_message": str(e)[:500]  # Truncate long errors
                }).eq("id", user_id).execute()
            except Exception as db_err:
                # Column might not exist, try without error_message
                print(f"⚠️ Could not save error_message (column may not exist): {db_err}")
                supabase.table("waitlist").update({
                    "status": "failed"
                }).eq("id", user_id).execute()
            return {"email": email, "status": "failed", "error": str(e)}

    # Send completion email (separate try/except - don't fail if email fails)
    # Skip emails for test users (scale testing)
    is_test_user = email.endswith("@opendraft-test.local")
    
    if thesis_generated and pdf_url and docx_url and not is_test_user:
        try:
            send_completion_email(
                email=email,
                name=user["full_name"],
                pdf_url=pdf_url,
                docx_url=docx_url,
                thesis_topic=user.get("thesis_topic", ""),
                academic_level=user.get("academic_level", "Master's"),
                language=user.get("language", "English"),
            )
            print(f"📧 Email sent to {email}")
        except Exception as e:
            print(f"⚠️ Email failed for {email} (thesis still completed): {e}")
            # Don't mark as failed - thesis was generated successfully
    elif is_test_user:
        print(f"📧 Skipping email for test user: {email}")

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

    # Process in batches of 20 to avoid API rate limits
    BATCH_SIZE = 20
    total_success = 0
    total_failed = 0
    
    for batch_num in range(0, len(users), BATCH_SIZE):
        batch = users[batch_num:batch_num + BATCH_SIZE]
        print(f"Processing batch {batch_num // BATCH_SIZE + 1}: {len(batch)} users (jobs {batch_num + 1}-{batch_num + len(batch)} of {len(users)})")
        
        results = []
        for result in process_single_user.map(batch, return_exceptions=True):
            if isinstance(result, Exception):
                print(f"Job failed with: {result}")
                results.append({"status": "failed", "error": str(result)})
            else:
                results.append(result)
                email = result.get("email", "unknown")
                print(f"Job completed: {email}")
        
        batch_success = sum(1 for r in results if r.get("status") == "success")
        batch_failed = sum(1 for r in results if r.get("status") == "failed")
        total_success += batch_success
        total_failed += batch_failed
        
        print(f"Batch {batch_num // BATCH_SIZE + 1} complete: {batch_success} success, {batch_failed} failed")
    
    print(f"All batches complete: {total_success} success, {total_failed} failed out of {len(users)}")
    return {"success": total_success, "failed": total_failed, "total": len(users)}


def generate_thesis_real(topic: str, language: str, academic_level: str, user_id: str = "test"):
    """Generate thesis using the AI framework."""
    import sys
    from pathlib import Path

    sys.path.insert(0, "/root/opendraft")

    # Set up API keys with fallback for rate limiting
    primary_key = os.environ.get("GEMINI_API_KEY", "")
    fallback_key = os.environ.get("GEMINI_API_KEY_FALLBACK", "")
    
    # Use both keys via round-robin based on user_id hash
    if primary_key and fallback_key:
        # Distribute load across keys based on user_id
        key_index = hash(user_id) % 2
        api_key = primary_key if key_index == 0 else fallback_key
        print(f"Using API key {'primary' if key_index == 0 else 'fallback'} for {user_id}")
    else:
        api_key = primary_key or fallback_key
    
    os.environ["GOOGLE_API_KEY"] = api_key

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


def send_completion_email(
    email: str,
    name: str,
    pdf_url: str,
    docx_url: str,
    thesis_topic: str = "",
    academic_level: str = "Master's",
    language: str = "English",
    citation_count: int = 0,
    word_count: str = "~30,000",
):
    """Send thesis completion notification email using pre-rendered React Email template."""
    import resend
    from pathlib import Path
    from urllib.parse import quote

    # Email configuration - matches website/lib/config/waitlist.ts
    FROM_EMAIL = "OpenDraft <hello@clients.opendraft.xyz>"
    REPLY_TO_EMAIL = "support@opendraft.ai"

    # Try to load pre-rendered template
    template_path = Path("/root/opendraft/backend/email_templates/completion.html")

    if template_path.exists():
        html = template_path.read_text()

        # Replace placeholders with actual values
        html = html.replace("{{FULL_NAME}}", name)
        html = html.replace("{{THESIS_TOPIC}}", thesis_topic)
        html = html.replace("{{PDF_URL}}", pdf_url)
        html = html.replace("{{DOCX_URL}}", docx_url)
        html = html.replace("{{ACADEMIC_LEVEL}}", academic_level)
        html = html.replace("{{LANGUAGE}}", language)
        html = html.replace("{{CITATION_COUNT}}", str(citation_count) if citation_count > 0 else "~60")
        html = html.replace("{{WORD_COUNT}}", word_count)

        # Generate unsubscribe/preferences URLs
        encoded_email = quote(email)
        html = html.replace("{{UNSUBSCRIBE_URL}}", f"https://opendraft.io/unsubscribe?email={encoded_email}")
        html = html.replace("{{PREFERENCES_URL}}", f"https://opendraft.io/preferences?email={encoded_email}")
    else:
        # Fallback HTML (matches React Email design tokens)
        html = _get_fallback_html(name, pdf_url, docx_url, email)

    resend.Emails.send({
        "from": FROM_EMAIL,
        "reply_to": REPLY_TO_EMAIL,
        "to": email,
        "subject": "Your AI-Generated Thesis is Ready!",
        "html": html
    })


def _get_fallback_html(name: str, pdf_url: str, docx_url: str, email: str) -> str:
    """Fallback HTML matching React Email design tokens (styles.ts)."""
    from urllib.parse import quote
    encoded_email = quote(email)

    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <style>
        @media (prefers-color-scheme: light) {{
            .email-body {{ background-color: #ffffff !important; }}
            .email-container {{ background-color: #ffffff !important; }}
            .email-text {{ color: #171717 !important; }}
            .email-text-muted {{ color: #525252 !important; }}
            .email-card {{ background-color: #f5f5f5 !important; border-color: #d4d4d4 !important; }}
            .email-footer {{ border-color: #d4d4d4 !important; }}
            .email-button-primary {{ background-color: #16a34a !important; }}
        }}
    </style>
</head>
<body class="email-body" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; background-color: #171717; color: #fafafa; margin: 0; padding: 40px 24px;">
    <div class="email-container" style="max-width: 600px; margin: 0 auto; background-color: #171717;">
        <p class="email-text" style="font-size: 24px; font-weight: bold; margin: 0 0 32px 0; color: #fafafa;">OpenDraft</p>

        <h1 class="email-text" style="font-size: 24px; font-weight: bold; margin: 24px 0; color: #fafafa;">Your Thesis is Ready!</h1>

        <p class="email-text-muted" style="color: #a3a3a3; line-height: 1.625; margin: 16px 0;">Hi {name},</p>

        <p class="email-text-muted" style="color: #a3a3a3; line-height: 1.625; margin: 16px 0;">Great news! Your AI-generated thesis is complete. Download it now:</p>

        <div style="margin: 24px 0; text-align: center;">
            <a href="{pdf_url}" class="email-button-primary" style="background-color: #22c55e; color: #000000; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block; margin-right: 12px;">Download PDF</a>
            <a href="{docx_url}" style="background-color: #262626; color: #fafafa; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block; border: 1px solid #404040;">Download Word</a>
        </div>

        <div style="background-color: #2d2517; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p class="email-text" style="color: #fafafa; font-weight: 600; font-size: 14px; margin: 0 0 8px 0;">Download links expire in 7 days</p>
            <p class="email-text-muted" style="color: #a3a3a3; font-size: 14px; margin: 0; line-height: 1.625;">Make sure to download your thesis files before they expire.</p>
        </div>

        <div class="email-footer" style="color: #737373; font-size: 14px; margin-top: 40px; padding-top: 24px; border-top: 1px solid #404040;">
            <p style="margin: 0;">OpenDraft - AI-Powered Academic Thesis Generation</p>
            <p style="margin: 8px 0 0 0;">Questions? Reply to this email or contact <a href="mailto:support@clients.opendraft.xyz" style="color: #22c55e; text-decoration: underline;">support@clients.opendraft.xyz</a></p>
            <p style="margin: 16px 0 0 0; font-size: 12px;">© 2025 OpenDraft Inc.</p>
            <p style="margin: 8px 0 0 0; font-size: 12px;">
                <a href="https://opendraft.io/unsubscribe?email={encoded_email}" style="color: #22c55e; text-decoration: underline; font-size: 12px;">Unsubscribe</a>
                 •
                <a href="https://opendraft.io/preferences?email={encoded_email}" style="color: #22c55e; text-decoration: underline; font-size: 12px;">Email Preferences</a>
            </p>
        </div>
    </div>
</body>
</html>"""


@app.local_entrypoint()
def main():
    """Test function - triggers the batch."""
    daily_thesis_batch.remote()

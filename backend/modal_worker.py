"""
Modal.com worker for automated thesis generation
Runs daily at 9am UTC, processes 100 waiting users from Supabase
"""

import modal
import os
from datetime import datetime
from supabase import create_client
import resend

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
        "supabase>=2.10.0",  # Supports new sb_secret/sb_publishable key format
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
    .add_local_dir("../opendraft", "/root/opendraft/opendraft")
    .add_local_dir("../utils", "/root/opendraft/utils")
    .add_local_dir("../prompts", "/root/opendraft/prompts")
    .add_local_dir("../concurrency", "/root/opendraft/concurrency")
    .add_local_dir("../backend", "/root/opendraft/backend")
    .add_local_file("../config.py", "/root/opendraft/config.py")
)

# Persistent volume for temporary thesis files
volume = modal.Volume.from_name("thesis-temp", create_if_missing=True)

@app.function(
    schedule=modal.Cron("0 9 * * *"),  # Daily at 9am UTC (cron format)
    timeout=3600,  # 1 hour max (60 minutes for thesis generation)
    volumes={"/tmp/thesis": volume},
    secrets=[
        modal.Secret.from_name("supabase-credentials"),  # SUPABASE_URL, SUPABASE_SERVICE_KEY
        modal.Secret.from_name("gemini-api-key"),  # GOOGLE_API_KEY (renamed for consistency)
        modal.Secret.from_name("resend-api-key"),  # RESEND_API_KEY
    ],
    image=image,
)
def daily_thesis_batch():
    """
    Main scheduled function - processes 100 waiting users daily
    """
    print(f"[{datetime.now()}] Starting daily thesis batch...")

    # Initialize clients
    supabase = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"]
    )
    resend.api_key = os.environ["RESEND_API_KEY"]

    # Get next 100 waiting users (FIFO, email verified)
    response = supabase.table('waitlist') \
        .select('*') \
        .eq('status', 'waiting') \
        .eq('email_verified', True) \
        .order('position', desc=False) \
        .limit(100) \
        .execute()

    users = response.data
    print(f"Found {len(users)} users to process")

    success_count = 0
    failed_count = 0

    # Process each thesis
    for user in users:
        max_retries = 3
        retry_count = 0
        success = False

        while retry_count < max_retries and not success:
            try:
                if retry_count > 0:
                    print(f"Retry {retry_count}/{max_retries} for {user['email']}...")
                else:
                    print(f"Processing thesis for {user['email']}...")

                # Update status to processing (only on first attempt)
                if retry_count == 0:
                    supabase.table('waitlist').update({
                        'status': 'processing',
                        'processing_started_at': datetime.now().isoformat()
                    }).eq('id', user['id']).execute()

                # Generate thesis using real AI framework
                pdf_path, docx_path = generate_thesis_real(
                    topic=user['thesis_topic'],
                    language=user['language'],
                    academic_level=user['academic_level']
                )

                # Upload to Supabase Storage (overwrite if retrying)
                with open(pdf_path, 'rb') as pdf_file:
                    supabase.storage.from_('thesis-files').upload(
                        f"{user['id']}/thesis.pdf",
                        pdf_file.read(),
                        file_options={"content-type": "application/pdf", "upsert": "true"}
                    )

                with open(docx_path, 'rb') as docx_file:
                    supabase.storage.from_('thesis-files').upload(
                        f"{user['id']}/thesis.docx",
                        docx_file.read(),
                        file_options={"content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "upsert": "true"}
                    )

                # Get signed URLs (7-day expiry)
                pdf_signed = supabase.storage.from_('thesis-files').create_signed_url(
                    f"{user['id']}/thesis.pdf",
                    expires_in=604800  # 7 days
                )
                docx_signed = supabase.storage.from_('thesis-files').create_signed_url(
                    f"{user['id']}/thesis.docx",
                    expires_in=604800
                )

                # Update status to completed
                supabase.table('waitlist').update({
                    'status': 'completed',
                    'completed_at': datetime.now().isoformat(),
                    'pdf_url': pdf_signed['signedURL'],
                    'docx_url': docx_signed['signedURL']
                }).eq('id', user['id']).execute()

                # Send completion email
                send_completion_email(
                    user['email'],
                    user['full_name'],
                    pdf_signed['signedURL'],
                    docx_signed['signedURL']
                )

                success_count += 1
                success = True
                print(f"✅ Completed thesis for {user['email']}")

            except Exception as e:
                retry_count += 1
                print(f"❌ Error processing {user['email']} (attempt {retry_count}/{max_retries}): {e}")

                if retry_count >= max_retries:
                    # Mark as failed only after all retries exhausted
                    supabase.table('waitlist').update({
                        'status': 'failed'
                    }).eq('id', user['id']).execute()
                    failed_count += 1
                    print(f"💀 Permanently failed thesis for {user['email']} after {max_retries} attempts")
                else:
                    # Wait before retrying (exponential backoff: 5s, 10s, 20s)
                    import time
                    wait_time = 5 * (2 ** (retry_count - 1))
                    print(f"⏳ Waiting {wait_time}s before retry...")
                    time.sleep(wait_time)

    print(f"[{datetime.now()}] Batch complete: {success_count} success, {failed_count} failed")

    # Log daily stats
    supabase.table('daily_processing_log').insert({
        'date': datetime.now().date().isoformat(),
        'processed_count': success_count,
        'failed_count': failed_count,
        'completed_at': datetime.now().isoformat()
    }).execute()


def generate_thesis_real(topic: str, language: str, academic_level: str):
    """
    Real thesis generation using Academic Thesis AI framework.

    Integrates the standalone thesis_generator.py module with 15+ AI agents.

    Args:
        topic: Thesis topic (e.g., "Machine Learning for Climate Prediction")
        language: 'en' or 'de' (English/German)
        academic_level: 'bachelor', 'master', or 'phd'

    Returns:
        tuple: (pdf_path, docx_path) - Paths to generated PDF and DOCX files

    Raises:
        Exception: If thesis generation fails
    """
    import sys
    from pathlib import Path

    # Add mounted codebase to Python path
    sys.path.insert(0, "/root/opendraft")

    # Set environment variable for API key (Modal secret → env var)
    import os
    if "GOOGLE_API_KEY" not in os.environ and "GEMINI_API_KEY" in os.environ:
        os.environ["GOOGLE_API_KEY"] = os.environ["GEMINI_API_KEY"]

    # Import thesis generator
    from backend.thesis_generator import generate_thesis

    # Generate thesis with automated settings
    try:
        pdf_path, docx_path = generate_thesis(
            topic=topic,
            language=language,
            academic_level=academic_level,
            output_dir=Path("/tmp/thesis"),
            skip_validation=True,  # Skip strict validation for automated runs
            verbose=True
        )

        return str(pdf_path), str(docx_path)

    except Exception as e:
        print(f"❌ Thesis generation failed: {str(e)}")
        raise


def send_completion_email(email: str, name: str, pdf_url: str, docx_url: str):
    """Send thesis completion notification email using React Email template"""
    # Note: Python backend uses simple HTML for now
    # For proper React Email templates, integrate with Next.js API route
    resend.Emails.send({
        "from": "Academic Thesis AI <hello@academic-thesis.ai>",
        "to": email,
        "subject": "Your AI-Generated Thesis is Ready! 🎓",
        "html": f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif; background-color: #f6f9fc; margin: 0; padding: 0; }}
                    .container {{ background-color: #ffffff; margin: 0 auto; padding: 20px 0 48px; max-width: 600px; }}
                    .header {{ color: #26251e; font-size: 24px; font-weight: bold; margin: 40px 0; padding: 0 40px; text-align: center; }}
                    .content {{ color: #4b5563; font-size: 16px; line-height: 24px; margin: 16px 0; padding: 0 40px; }}
                    .button-container {{ padding: 27px 40px; text-align: center; }}
                    .button-pdf {{ background-color: #8B5CF6; border-radius: 8px; color: #fff; font-size: 16px; font-weight: bold; text-decoration: none; padding: 12px 24px; margin: 8px 8px 8px 0; display: inline-block; }}
                    .button-docx {{ background-color: #6366f1; border-radius: 8px; color: #fff; font-size: 16px; font-weight: bold; text-decoration: none; padding: 12px 24px; margin: 8px 0; display: inline-block; }}
                    .alert-box {{ background-color: #fef3c7; border-radius: 8px; margin: 24px 40px; padding: 16px; border: 1px solid #fbbf24; }}
                    .alert-text {{ color: #26251e; font-size: 14px; line-height: 20px; margin: 0 0 8px 0; }}
                    .footer {{ color: #6b7280; font-size: 14px; line-height: 24px; margin: 32px 0; padding: 0 40px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <h1 class="header">Your Thesis is Ready, {name}! 🎓</h1>
                    <p class="content">We've generated your thesis using our 15 AI agents. Download it now:</p>
                    <div class="button-container">
                        <a href="{pdf_url}" class="button-pdf">Download PDF</a>
                        <a href="{docx_url}" class="button-docx">Download Word</a>
                    </div>
                    <div class="alert-box">
                        <p class="alert-text"><strong>⏰ These links expire in 7 days.</strong><br/>Make sure to download your thesis files before they expire.</p>
                    </div>
                    <p class="content">Love your thesis? Star us on <a href="https://github.com/federicodeponte/opendraft" style="color: #8B5CF6; text-decoration: underline;">GitHub</a>!</p>
                    <p class="footer">Thanks,<br/>OpenDraft Team</p>
                </div>
            </body>
            </html>
        """
    })


# For manual testing
@app.local_entrypoint()
def main():
    """Test function locally"""
    daily_thesis_batch.remote()

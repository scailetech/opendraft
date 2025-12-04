"""Test script for single thesis generation with new folder structure."""
import modal
import os

# Create a test app with its own image definition (matching modal_worker)
test_app = modal.App("thesis-test")

image = (modal.Image.debian_slim()
    .apt_install(
        "libpango-1.0-0", "libpangocairo-1.0-0", "libgdk-pixbuf2.0-0",
        "libffi-dev", "shared-mime-info",
        "pandoc", "texlive-xetex", "texlive-fonts-recommended",
        "texlive-fonts-extra", "texlive-latex-extra", "lmodern",
        "fonts-liberation", "fonts-dejavu",
    )
    .pip_install(
        "supabase>=2.24.0", "resend==0.7.0", "python-dotenv>=1.0.0",
        "google-generativeai>=0.8.0", "anthropic>=0.20.0", "openai>=1.0.0",
        "pybtex>=0.24.0", "citeproc-py>=0.6.0", "PyYAML>=6.0.0",
        "markdown>=3.5.0", "weasyprint>=60.0", "python-docx>=1.0.0",
        "requests>=2.31.0", "beautifulsoup4>=4.12.0", "lxml>=4.9.0",
        "rich>=13.0.0"
    )
    .env({"GEMINI_MODEL": "gemini-3-pro-preview"})
    .add_local_dir("./utils", "/root/opendraft/utils")
    .add_local_dir("./prompts", "/root/opendraft/prompts")
    .add_local_dir("./concurrency", "/root/opendraft/concurrency")
    .add_local_dir("./backend", "/root/opendraft/backend")
    .add_local_dir("./tests", "/root/opendraft/tests")
    .add_local_dir("./examples", "/root/opendraft/examples")
    .add_local_dir("./templates", "/root/opendraft/templates")
    .add_local_file("./config.py", "/root/opendraft/config.py")
)

@test_app.function(
    timeout=3600,  # 1 hour
    secrets=[modal.Secret.from_name("gemini-api-key")],
    image=image,
)
def test_thesis_generation():
    """Test thesis generation with new folder structure (no DB/email)."""
    import sys
    from pathlib import Path
    
    sys.path.insert(0, "/root/opendraft")
    
    # Use the Gemini API key from secrets
    api_key = os.environ.get("GEMINI_API_KEY", "")
    os.environ["GOOGLE_API_KEY"] = api_key
    
    from backend.thesis_generator import generate_thesis
    
    topic = "The Impact of Generative AI on Software Engineering Productivity"
    output_dir = Path("/tmp/thesis/test-folder-structure")
    
    print("🚀 Testing thesis generation with new folder structure")
    print(f"   Topic: {topic}")
    print(f"   Model: {os.environ.get('GEMINI_MODEL', 'gemini-3-pro-preview')}")
    print(f"   Output: {output_dir}")
    print()
    
    pdf_path, docx_path = generate_thesis(
        topic=topic,
        language="en",
        academic_level="master",
        output_dir=output_dir,
        skip_validation=True,
        verbose=True,
        author_name="Test User",
        institution="Test University",
        department="Computer Science",
        faculty="Engineering",
        advisor="Prof. Test Supervisor",
        location="Munich",
    )
    
    # List output folder structure
    print("\n📂 Output folder structure:")
    for root, dirs, files in os.walk(output_dir):
        level = root.replace(str(output_dir), '').count(os.sep)
        indent = ' ' * 2 * level
        print(f'{indent}{os.path.basename(root)}/')
        subindent = ' ' * 2 * (level + 1)
        for file in files:
            print(f'{subindent}{file}')
    
    return {"pdf": str(pdf_path), "docx": str(docx_path)}


@test_app.local_entrypoint()
def main():
    """Run the test."""
    print("🚀 Starting thesis generation test...")
    result = test_thesis_generation.remote()
    print(f"\n✅ Result: {result}")

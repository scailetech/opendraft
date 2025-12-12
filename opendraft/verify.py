"""Installation verification for OpenDraft."""

import sys
import os
import subprocess
from pathlib import Path


def check_python_version():
    """Check if Python version is compatible."""
    version = sys.version_info
    required = (3, 9)

    print(f"🐍 Python version: {version.major}.{version.minor}.{version.micro}")

    if version >= required:
        print(f"   ✅ Compatible (>= {required[0]}.{required[1]})")
        return True
    else:
        print(f"   ❌ Too old (need >= {required[0]}.{required[1]})")
        return False


def check_dependencies():
    """Check if all required dependencies are installed."""
    required_packages = [
        "anthropic",
        "openai",
        "google.generativeai",
        "pybtex",
        "citeproc",
        "yaml",
        "markdown",
        "weasyprint",
        "docx",
        "requests",
        "bs4",
        "lxml",
        "dotenv",
        "rich",
    ]

    print("\n📦 Dependencies:")
    all_installed = True

    for package in required_packages:
        try:
            __import__(package.replace("-", "_"))
            print(f"   ✅ {package}")
        except ImportError:
            print(f"   ❌ {package} (missing)")
            all_installed = False

    return all_installed


def check_api_keys():
    """Check if API keys are configured."""
    print("\n🔑 API Keys (from environment):")

    keys = {
        "GOOGLE_API_KEY": "Google Gemini (primary)",
        "GEMINI_API_KEY": "Google Gemini (alias)",
        "ANTHROPIC_API_KEY": "Anthropic Claude",
        "OPENAI_API_KEY": "OpenAI GPT",
    }

    env_file = Path(".env")
    if env_file.exists():
        print(f"   ℹ️  Found .env file: {env_file.absolute()}")
        from dotenv import load_dotenv
        load_dotenv()
    else:
        print(f"   ⚠️  No .env file found (using system environment)")

    found_any = False
    for key, name in keys.items():
        value = os.getenv(key)
        if value:
            # Mask the key for security
            masked = value[:8] + "..." + value[-4:] if len(value) > 12 else "***"
            print(f"   ✅ {name}: {masked}")
            found_any = True
        else:
            print(f"   ⚠️  {name}: Not set")

    if not found_any:
        print("\n   ⚠️  WARNING: No API keys configured!")
        print("   You need at least one LLM API key to generate theses.")
        print("   See: https://github.com/federicodeponte/opendraft#setup")

    return found_any


def check_pdf_engines():
    """Check if PDF generation engines are available."""
    print("\n📄 PDF Engines:")

    engines = [
        ("weasyprint", "WeasyPrint (recommended)"),
        ("pandoc", "Pandoc"),
        ("libreoffice", "LibreOffice"),
    ]

    available_count = 0

    for cmd, name in engines:
        try:
            result = subprocess.run(
                [cmd, "--version"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                version = result.stdout.split("\n")[0][:50]
                print(f"   ✅ {name}: {version}")
                available_count += 1
            else:
                print(f"   ❌ {name}: Not available")
        except (FileNotFoundError, subprocess.TimeoutExpired):
            print(f"   ❌ {name}: Not available")

    if available_count == 0:
        print("\n   ⚠️  WARNING: No PDF engines found!")
        print("   You need at least one PDF engine to export theses.")
        print("   Install WeasyPrint: pip install weasyprint")

    return available_count > 0


def check_file_structure():
    """Check if project structure is intact."""
    print("\n📁 Project Structure:")

    required_dirs = [
        "utils",
        "concurrency",
        "prompts",
        "examples",
    ]

    all_exist = True

    for dir_name in required_dirs:
        dir_path = Path(dir_name)
        if dir_path.exists() and dir_path.is_dir():
            file_count = len(list(dir_path.glob("**/*.py")))
            print(f"   ✅ {dir_name}/ ({file_count} Python files)")
        else:
            print(f"   ❌ {dir_name}/ (missing)")
            all_exist = False

    return all_exist


def verify_installation():
    """Main verification function."""
    print("=" * 60)
    print("  OpenDraft - Installation Verification")
    print("=" * 60)

    results = {}

    results["python"] = check_python_version()
    results["dependencies"] = check_dependencies()
    results["api_keys"] = check_api_keys()
    results["pdf_engines"] = check_pdf_engines()
    results["structure"] = check_file_structure()

    print("\n" + "=" * 60)
    print("  SUMMARY")
    print("=" * 60)

    all_passed = all(results.values())

    for check, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status:10} {check.replace('_', ' ').title()}")

    print("=" * 60)

    if all_passed:
        print("\n✅ Installation verified successfully!")
        print("   You're ready to generate academic theses.")
        print("\nNext steps:")
        print("  1. Review QUICKSTART.md for usage examples")
        print("  2. Run: python tests/scripts/test_ai_pricing_draft.py")
        print("  3. Check examples/ for sample theses")
        return 0
    else:
        print("\n⚠️  Installation has issues (see above)")
        print("\nTroubleshooting:")
        print("  - Install missing dependencies: pip install -e .")
        print("  - Configure API keys in .env file")
        print("  - See: https://github.com/federicodeponte/opendraft#troubleshooting")
        return 1


if __name__ == "__main__":
    sys.exit(verify_installation())

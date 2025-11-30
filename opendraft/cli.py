"""Command-line interface for OpenDraft."""

import sys
import argparse
from opendraft.version import __version__


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        prog="opendraft",
        description="AI-Powered Academic Writing Framework",
        epilog="For more information, visit: https://github.com/federicodeponte/opendraft"
    )

    parser.add_argument(
        "--version",
        action="version",
        version=f"%(prog)s {__version__}"
    )

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Verify command
    verify_parser = subparsers.add_parser(
        "verify",
        help="Verify installation and configuration"
    )

    # Generate command
    generate_parser = subparsers.add_parser(
        "generate",
        help="Generate a thesis from a topic"
    )
    generate_parser.add_argument(
        "--topic",
        type=str,
        required=True,
        help="Research topic for the thesis"
    )
    generate_parser.add_argument(
        "--language",
        type=str,
        default="en",
        choices=["en", "de"],
        help="Thesis language (default: en)"
    )
    generate_parser.add_argument(
        "--level",
        type=str,
        default="master",
        choices=["bachelor", "master", "phd"],
        help="Academic level (default: master)"
    )
    generate_parser.add_argument(
        "--output",
        type=str,
        help="Output directory (default: ./output)"
    )

    args = parser.parse_args()

    if args.command == "verify":
        from opendraft.verify import verify_installation
        sys.exit(verify_installation())
    elif args.command == "generate":
        from pathlib import Path
        try:
            from backend.thesis_generator import generate_thesis
        except ImportError:
            # Try with sys.path adjustment for non-installed usage
            import os
            sys.path.insert(0, str(Path(__file__).parent.parent))
            from backend.thesis_generator import generate_thesis

        output_dir = Path(args.output) if args.output else Path("./output")

        print(f"🎓 Generating thesis on: {args.topic}")
        print(f"   Language: {args.language}")
        print(f"   Level: {args.level}")
        print(f"   Output: {output_dir}")
        print()

        try:
            pdf_path, docx_path = generate_thesis(
                topic=args.topic,
                language=args.language,
                academic_level=args.level,
                output_dir=output_dir,
                skip_validation=True,
                verbose=True
            )
            print(f"\n✅ Thesis generated successfully!")
            print(f"   PDF:  {pdf_path}")
            print(f"   DOCX: {docx_path}")
            sys.exit(0)
        except Exception as e:
            print(f"\n❌ Generation failed: {e}")
            sys.exit(1)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()

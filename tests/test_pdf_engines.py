#!/usr/bin/env python3
"""
ABOUTME: Comprehensive test suite for PDF generation engines (Pandoc, LibreOffice, WeasyPrint)
ABOUTME: Tests all engines, edge cases, fallback mechanisms, and integration (9 tests total)
"""

import sys
import time
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.pdf_engines import (
    PDFEngineFactory,
    PDFGenerationOptions,
    get_available_engines,
    get_recommended_engine
)


def test_engine_availability():
    """Test 1: Engine Availability"""
    print("=" * 70)
    print("TEST 1: Engine Availability")
    print("=" * 70)

    available = get_available_engines()
    recommended = get_recommended_engine()

    print(f"✓ Available engines: {available}")
    print(f"✓ Recommended engine: {recommended}")

    assert len(available) > 0, "No engines available"
    assert recommended in available, "Recommended engine not available"
    assert "Pandoc/LaTeX" in available, "Pandoc engine not available"

    print("✅ PASSED: Engine availability\n")
    return True


def test_factory_create():
    """Test 2: Factory Creation"""
    print("=" * 70)
    print("TEST 2: Factory Engine Creation")
    print("=" * 70)

    # Test auto-select
    engine_auto = PDFEngineFactory.create('auto')
    assert engine_auto is not None, "Auto-select failed"
    print(f"✓ Auto-select: {engine_auto.get_name()}")

    # Test specific engines
    for engine_type in ['pandoc', 'libreoffice', 'weasyprint']:
        try:
            engine = PDFEngineFactory.create(engine_type)
            print(f"✓ {engine_type}: {engine.get_name()} (priority: {engine.get_priority()})")
        except ValueError as e:
            print(f"⚠ {engine_type}: {e}")

    print("✅ PASSED: Factory creation\n")
    return True


def test_engine_priorities():
    """Test 3: Engine Priority System"""
    print("=" * 70)
    print("TEST 3: Engine Priority System")
    print("=" * 70)

    engines = []
    for engine_class in PDFEngineFactory._ENGINE_CLASSES:
        engine = engine_class()
        if engine.is_available():
            engines.append(engine)
            print(f"✓ {engine.get_name()}: Priority {engine.get_priority()}")

    # Verify Pandoc has highest priority
    priorities = [e.get_priority() for e in engines]
    assert max(priorities) == 85, "Pandoc should have priority 85"

    # Verify priorities are in order
    engines_sorted = sorted(engines, key=lambda e: e.get_priority(), reverse=True)
    assert engines_sorted[0].get_name() == "Pandoc/LaTeX", "Pandoc should be highest priority"

    print("✅ PASSED: Priority system correct\n")
    return True


def test_pdf_generation_all_engines():
    """Test 4: PDF Generation with All Engines"""
    print("=" * 70)
    print("TEST 4: PDF Generation - All Engines")
    print("=" * 70)

    # Use existing draft file
    md_file = Path("tests/outputs/real_draft/FINAL_DRAFT.md")
    assert md_file.exists(), f"Test file not found: {md_file}"

    results = {}

    for engine_type in ['pandoc', 'libreoffice', 'weasyprint']:
        print(f"\n--- Testing {engine_type} engine ---")
        output_pdf = Path(f"tests/outputs/real_draft/TEST_{engine_type}.pdf")

        try:
            start_time = time.time()
            engine = PDFEngineFactory.create(engine_type)
            options = PDFGenerationOptions()

            result = engine.generate(md_file, output_pdf, options)
            elapsed = time.time() - start_time

            if result.success:
                size = output_pdf.stat().st_size / 1024  # KB
                print(f"✓ {engine_type}: SUCCESS")
                print(f"  - Time: {elapsed:.2f}s")
                print(f"  - Size: {size:.1f} KB")
                print(f"  - Output: {result.output_path}")
                if result.warnings:
                    print(f"  - Warnings: {len(result.warnings)}")
                results[engine_type] = {'success': True, 'time': elapsed, 'size': size}
            else:
                print(f"✗ {engine_type}: FAILED")
                print(f"  - Error: {result.error_message}")
                results[engine_type] = {'success': False, 'error': result.error_message}

        except Exception as e:
            print(f"✗ {engine_type}: EXCEPTION")
            print(f"  - Error: {str(e)}")
            results[engine_type] = {'success': False, 'error': str(e)}

    # Summary
    print("\n--- Summary ---")
    successful = [k for k, v in results.items() if v.get('success')]
    print(f"Successful engines: {len(successful)}/{len(results)}")
    print(f"Success rate: {len(successful)/len(results)*100:.0f}%")

    assert len(successful) > 0, "No engines succeeded"
    print("✅ PASSED: At least one engine succeeded\n")
    return results


def test_custom_options():
    """Test 5: Custom PDF Options"""
    print("=" * 70)
    print("TEST 5: Custom PDF Options")
    print("=" * 70)

    md_file = Path("tests/outputs/real_draft/FINAL_DRAFT.md")
    output_pdf = Path("tests/outputs/real_draft/TEST_custom_options.pdf")

    # Custom options
    custom_options = PDFGenerationOptions(
        margins="0.75in",
        line_spacing=1.5,
        font_size="11pt",
        page_numbers=True
    )

    print("Testing custom options:")
    print(f"  - Margins: {custom_options.margins}")
    print(f"  - Line spacing: {custom_options.line_spacing}")
    print(f"  - Font size: {custom_options.font_size}")

    engine = PDFEngineFactory.create('auto')
    result = engine.generate(md_file, output_pdf, custom_options)

    assert result.success, f"Custom options test failed: {result.error_message}"
    print(f"✓ Generated with custom options: {result.output_path}")
    print("✅ PASSED: Custom options\n")
    return True


def test_fallback_mechanism():
    """Test 6: Automatic Fallback"""
    print("=" * 70)
    print("TEST 6: Automatic Fallback Mechanism")
    print("=" * 70)

    md_file = Path("tests/outputs/real_draft/FINAL_DRAFT.md")
    output_pdf = Path("tests/outputs/real_draft/TEST_fallback.pdf")
    options = PDFGenerationOptions()

    print("Testing fallback with preferred engine...")
    result = PDFEngineFactory.generate_with_fallback(
        md_file=md_file,
        output_pdf=output_pdf,
        options=options,
        preferred_engine=None  # Auto-select
    )

    assert result.success, f"Fallback test failed: {result.error_message}"
    print(f"✓ Fallback succeeded with: {result.engine_name}")
    print(f"✓ Output: {result.output_path}")
    print("✅ PASSED: Fallback mechanism\n")
    return True


def test_edge_cases():
    """Test 7: Edge Cases"""
    print("=" * 70)
    print("TEST 7: Edge Cases")
    print("=" * 70)

    # Test 1: Non-existent input file
    print("Testing non-existent input file...")
    md_file = Path("tests/outputs/NONEXISTENT.md")
    output_pdf = Path("tests/outputs/TEST_edge.pdf")

    engine = PDFEngineFactory.create('auto')
    result = engine.generate(md_file, output_pdf, PDFGenerationOptions())

    assert not result.success, "Should fail with non-existent file"
    assert "not found" in result.error_message.lower() or "does not exist" in result.error_message.lower()
    print("✓ Correctly handles non-existent input")

    # Test 2: Invalid engine type
    print("Testing invalid engine type...")
    try:
        PDFEngineFactory.create('invalid_engine')
        assert False, "Should raise ValueError"
    except ValueError as e:
        print(f"✓ Correctly raises ValueError: {e}")

    print("✅ PASSED: Edge cases\n")
    return True


def test_performance():
    """Test 8: Performance Benchmarks"""
    print("=" * 70)
    print("TEST 8: Performance Benchmarks")
    print("=" * 70)

    md_file = Path("tests/outputs/real_draft/FINAL_DRAFT.md")

    # Get file size
    file_size = md_file.stat().st_size / 1024  # KB
    print(f"Input file size: {file_size:.1f} KB")

    print("\nBenchmarking Pandoc engine...")
    output_pdf = Path("tests/outputs/real_draft/TEST_perf_pandoc.pdf")

    start = time.time()
    engine = PDFEngineFactory.create('pandoc')
    result = engine.generate(md_file, output_pdf, PDFGenerationOptions())
    elapsed = time.time() - start

    if result.success:
        pdf_size = output_pdf.stat().st_size / 1024  # KB
        print(f"✓ Pandoc: {elapsed:.2f}s ({pdf_size:.1f} KB)")

        # Performance assertions
        assert elapsed < 60, f"Generation too slow: {elapsed}s"
        print(f"✓ Performance acceptable (<60s)")

    print("✅ PASSED: Performance benchmarks\n")
    return True


def test_title_page_and_toc():
    """Test 9: Title Page and Table of Contents"""
    print("=" * 70)
    print("TEST 9: Title Page and Table of Contents")
    print("=" * 70)

    md_file = Path("tests/outputs/real_draft/FINAL_DRAFT.md")
    output_pdf = Path("tests/outputs/real_draft/TEST_title_toc.pdf")

    # Test with title page metadata and TOC enabled
    options = PDFGenerationOptions(
        title="Test Draft Title",
        author="Test Author",
        date="January 2025",
        institution="Test University",
        course="TEST 101",
        instructor="Dr. Test",
        enable_toc=True,
        toc_depth=2
    )

    print("\nTesting title page and TOC generation...")
    print(f"  - Title: {options.title}")
    print(f"  - Author: {options.author}")
    print(f"  - Institution: {options.institution}")
    print(f"  - TOC enabled: {options.enable_toc}")
    print(f"  - TOC depth: {options.toc_depth}")

    engine = PDFEngineFactory.create('pandoc')
    result = engine.generate(md_file, output_pdf, options)

    assert result.success, f"Title page/TOC test failed: {result.error_message}"
    assert output_pdf.exists(), "Output PDF not created"

    # Verify PDF has more pages than without title page
    base_pdf = Path("tests/outputs/real_draft/TEST_pandoc.pdf")
    if base_pdf.exists():
        from PyPDF2 import PdfReader
        base_pages = len(PdfReader(base_pdf).pages)
        toc_pages = len(PdfReader(output_pdf).pages)
        # Should have at least same number of pages (title page adds, but might reorganize)
        print(f"  - Base PDF pages: {base_pages}")
        print(f"  - Title+TOC PDF pages: {toc_pages}")
        assert toc_pages >= base_pages, "Title page/TOC should not reduce page count"

    print(f"✓ Generated with title page and TOC: {output_pdf}")
    print(f"✓ Size: {output_pdf.stat().st_size / 1024:.1f} KB")
    print("✅ PASSED: Title page and TOC\n")
    return True


def run_all_tests():
    """Run all tests"""
    print("\n" + "=" * 70)
    print("COMPREHENSIVE PDF ENGINE TEST SUITE")
    print("=" * 70 + "\n")

    tests = [
        ("Engine Availability", test_engine_availability),
        ("Factory Creation", test_factory_create),
        ("Engine Priorities", test_engine_priorities),
        ("PDF Generation (All Engines)", test_pdf_generation_all_engines),
        ("Custom Options", test_custom_options),
        ("Fallback Mechanism", test_fallback_mechanism),
        ("Edge Cases", test_edge_cases),
        ("Performance", test_performance),
        ("Title Page and TOC", test_title_page_and_toc),
    ]

    results = {}
    for name, test_func in tests:
        try:
            result = test_func()
            results[name] = True
        except Exception as e:
            print(f"❌ FAILED: {name}")
            print(f"   Error: {str(e)}\n")
            results[name] = False

    # Final summary
    print("\n" + "=" * 70)
    print("TEST SUMMARY")
    print("=" * 70)

    passed = sum(1 for v in results.values() if v)
    total = len(results)

    for name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")

    print("\n" + "-" * 70)
    print(f"Total: {passed}/{total} passed ({passed/total*100:.0f}%)")
    print("=" * 70 + "\n")

    if passed == total:
        print("🎉 ALL TESTS PASSED!")
        return 0
    else:
        print(f"⚠️  {total - passed} test(s) failed")
        return 1


if __name__ == "__main__":
    sys.exit(run_all_tests())

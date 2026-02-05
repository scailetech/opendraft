"""
Zip Bundle Manager - Creates ZIP bundles containing all research artifacts

This module handles the creation of downloadable ZIP bundles that include:
- PDF and DOCX exports
- Markdown file

The ZIP structure matches opendraft's simple, direct approach:
- Designed for easy distribution and download
- Contains the 3 essential exports: PDF, DOCX, MD

Usage:
    from utils.zip_bundle_manager import ZipBundleManager

    manager = ZipBundleManager(output_dir)
    zip_path = manager.create_bundle(
        bundle_name="research_project",
        exports={"pdf": pdf_path, "docx": docx_path, "md": md_path},
    )
"""

import os
import logging
import zipfile
from pathlib import Path
from typing import Dict, Optional, List

logger = logging.getLogger(__name__)


class ZipBundleManager:
    """
    Creates ZIP bundles containing research exports (PDF, DOCX, MD).

    Follows opendraft's simple, direct approach:
    - ZIP contains just the essential 3 files at root level
    - Easy to download and use
    - All files are in the root of the ZIP (no subfolders)

    Structure in ZIP:
    research_bundle.zip
    ├── paper.pdf
    ├── paper.docx
    └── paper.md

    Attributes:
        output_dir: Directory where the ZIP bundle will be created
    """

    def __init__(self, output_dir: Path):
        """
        Initialize the ZipBundleManager.

        Args:
            output_dir: Path to the directory where ZIP bundle will be saved
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        logger.info(
            f"📦 ZipBundleManager initialized with output_dir: {self.output_dir}"
        )

    def create_bundle(
        self,
        bundle_name: str,
        exports: Dict[str, Path],
        exports_dir: Optional[Path] = None,
        research_dir: Optional[Path] = None,
        drafts_dir: Optional[Path] = None,
        tools_dir: Optional[Path] = None,
    ) -> Optional[Path]:
        """
        Create a ZIP bundle with export files and optional project folder structure.

        The ZIP includes:
        - Optional exports/ folder with PDF, DOCX, MD files
        - Optional research/, drafts/, tools/ folders with complete project structure

        ZIP Structure:
            bundle.zip
            ├── exports/               # Optional: Exports at organized level
            │   ├── paper.pdf
            │   ├── paper.docx
            │   └── paper.md
            ├── research/              # Optional: Full research materials
            │   ├── papers/
            │   ├── combined_research.md
            │   └── bibliography.json
            ├── drafts/                # Optional: Section drafts
            │   ├── 00_outline.md
            │   └── ...
            └── tools/                 # Optional: Refinement tools
                └── .cursorrules

        Args:
            bundle_name: Base name for the ZIP file (without .zip extension)
            exports: Dict mapping file type to path (deprecated, use exports_dir)
            exports_dir: Optional path to exports folder to include
            research_dir: Optional path to research folder to include
            drafts_dir: Optional path to drafts folder to include
            tools_dir: Optional path to tools folder to include

        Returns:
            Path to the created ZIP file, or None if creation failed
        """
        zip_path = self.output_dir / f"{bundle_name}.zip"

        logger.info(f"📦 Creating ZIP bundle: {zip_path}")
        logger.debug(f"  - Exports: {list(exports.keys())}")
        if research_dir:
            logger.debug(f"  - Research folder: {research_dir}")
        if drafts_dir:
            logger.debug(f"  - Drafts folder: {drafts_dir}")
        if tools_dir:
            logger.debug(f"  - Tools folder: {tools_dir}")

        try:
            with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
                files_added = 0

                # Add optional folder structures (exports, research, drafts, tools)
                folders_to_add = [
                    ("exports", exports_dir),
                    ("research", research_dir),
                    ("drafts", drafts_dir),
                    ("tools", tools_dir),
                ]

                for folder_name, folder_path in folders_to_add:
                    if folder_path and Path(folder_path).exists():
                        folder_files_count = self._add_folder_to_zip(
                            zf, folder_path, folder_name
                        )
                        logger.info(
                            f"  ✓ Added folder: {folder_name}/ ({folder_files_count} files)"
                        )
                        files_added += folder_files_count
                    elif folder_path:
                        logger.warning(
                            f"  ⚠️  Folder does not exist: {folder_name} -> {folder_path}"
                        )
                    else:
                        logger.debug(
                            f"  ⓘ Skipping folder (not provided): {folder_name}"
                        )

                # For backward compatibility: add individual export files if exports_dir not provided
                if not exports_dir:
                    for file_type, file_path in exports.items():
                        if file_path and Path(file_path).exists():
                            arcname = Path(file_path).name
                            zf.write(file_path, arcname)
                            files_added += 1
                            logger.debug(f"  ✓ Added (legacy): {arcname}")

                logger.info(f"✅ ZIP bundle created successfully: {zip_path}")
                logger.info(
                    f"   Total entries: {len(zf.namelist())}, Size: {zip_path.stat().st_size:,} bytes"
                )

            return zip_path

        except Exception as e:
            logger.error(f"❌ Failed to create ZIP bundle: {str(e)}", exc_info=True)
            # Clean up partial zip file if it exists
            if zip_path.exists():
                try:
                    zip_path.unlink()
                    logger.debug(f"  🧹 Cleaned up partial zip file")
                except Exception:
                    pass
            return None

    def _add_folder_to_zip(
        self, zf: zipfile.ZipFile, folder_path: Path, folder_name: str
    ) -> int:
        """
        Recursively add a folder and all its contents to a ZIP file.

        Args:
            zf: Open ZipFile object
            folder_path: Path to the folder to add
            folder_name: Name to use for the folder in the ZIP (e.g., "research")

        Returns:
            Number of files added
        """
        files_count = 0

        for item in Path(folder_path).rglob("*"):
            if item.is_file():
                # Calculate the archive name relative to parent
                rel_path = item.relative_to(folder_path.parent)
                arcname = str(rel_path)

                zf.write(item, arcname)
                files_count += 1

        return files_count

    def create_bundle_from_existing_folder(
        self,
        bundle_name: str,
        source_folder: Path,
    ) -> Optional[Path]:
        """
        Create a ZIP bundle from an existing folder structure.

        This is useful for testing or bundling entire project folders.
        The entire folder structure is preserved in the ZIP.

        Args:
            bundle_name: Name for the ZIP file (without .zip extension)
            source_folder: Path to the folder to compress

        Returns:
            Path to the created ZIP file, or None if creation failed

        Example:
            # Test with esg-portfolio folder
            zip_path = manager.create_bundle_from_existing_folder(
                bundle_name="esg_test",
                source_folder=Path("/Users/.../esg-portfolio")
            )
        """
        zip_path = self.output_dir / f"{bundle_name}.zip"

        logger.info(f"📦 Creating ZIP from folder: {source_folder} -> {zip_path}")

        if not source_folder.exists():
            logger.error(f"❌ Source folder does not exist: {source_folder}")
            return None

        try:
            with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
                files_added = 0

                for root, dirs, files in os.walk(source_folder):
                    rel_root = Path(root).relative_to(source_folder)

                    for file in files:
                        source_file = Path(root) / file
                        if str(rel_root) == ".":
                            arcname = file
                        else:
                            arcname = f"{rel_root}/{file}"

                        zf.write(source_file, arcname)
                        files_added += 1

                logger.info(
                    f"✅ ZIP created: {files_added} files, {zip_path.stat().st_size:,} bytes"
                )

            return zip_path

        except Exception as e:
            logger.error(f"❌ Failed to create ZIP: {str(e)}", exc_info=True)
            return None


def create_research_bundle(
    output_dir: Path,
    bundle_name: str,
    pdf_path: Optional[Path] = None,
    docx_path: Optional[Path] = None,
    md_path: Optional[Path] = None,
    research_dir: Optional[Path] = None,
    drafts_dir: Optional[Path] = None,
    tools_dir: Optional[Path] = None,
) -> Optional[Path]:
    """
    Convenience function to create a research bundle ZIP.

    This is the primary interface for bundling export files and project folders.
    Creates a ZIP with:
    - Export files (PDF, DOCX, MD) at root level for quick access
    - Optional research/, drafts/, tools/ folders with complete project structure

    Args:
        output_dir: Where to save the ZIP file
        bundle_name: Name for the ZIP (without extension)
        pdf_path: Path to PDF export
        docx_path: Path to DOCX export
        md_path: Path to Markdown export
        research_dir: Optional path to research folder to include
        drafts_dir: Optional path to drafts folder to include
        tools_dir: Optional path to tools folder to include

    Returns:
        Path to created ZIP file, or None if failed

    Example:
        zip_path = create_research_bundle(
            output_dir=Path("./exports"),
            bundle_name="my_research",
            pdf_path=Path("paper.pdf"),
            docx_path=Path("paper.docx"),
            md_path=Path("paper.md"),
            research_dir=Path("research/"),
            drafts_dir=Path("drafts/"),
            tools_dir=Path("tools/")
        )
    """
    manager = ZipBundleManager(output_dir)

    exports = {}
    if pdf_path:
        exports["pdf"] = pdf_path
    if docx_path:
        exports["docx"] = docx_path
    if md_path:
        exports["md"] = md_path

    return manager.create_bundle(
        bundle_name=bundle_name,
        exports=exports,
        research_dir=research_dir,
        drafts_dir=drafts_dir,
        tools_dir=tools_dir,
    )

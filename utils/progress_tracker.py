"""
Progress tracking utility for thesis generation.
Updates database with real-time progress information.
"""
import os
from typing import Optional, Dict, Any
from datetime import datetime


class ProgressTracker:
    """Tracks and updates thesis generation progress in real-time."""

    def __init__(self, thesis_id: str = None, user_id: str = None, table_name: str = "theses", supabase_client=None):
        """
        Initialize progress tracker.

        Args:
            thesis_id: Thesis ID to track progress for (preferred for new theses table)
            user_id: User ID to track progress for (legacy, for waitlist table)
            table_name: Table name to update ('theses' or 'waitlist'). Default: 'theses'
            supabase_client: Supabase client instance (optional, will create if not provided)
        """
        self.thesis_id = thesis_id
        self.user_id = user_id or thesis_id  # Fallback to thesis_id if user_id not provided
        self.table_name = table_name
        self.record_id = thesis_id if thesis_id else user_id  # ID to use for queries

        if supabase_client:
            self.supabase = supabase_client
        else:
            from supabase import create_client
            supabase_url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
            supabase_key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
            self.supabase = create_client(supabase_url, supabase_key)
    
    def update_phase(
        self,
        phase: str,
        progress_percent: int = 0,
        sources_count: Optional[int] = None,
        chapters_count: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        """
        Update the current phase and progress.
        
        Args:
            phase: Phase name (research, writing, formatting, exporting, completed)
            progress_percent: Overall progress percentage (0-100)
            sources_count: Number of sources/citations found
            chapters_count: Number of chapters generated
            details: Additional details (dict) to store
        """
        try:
            update_data = {
                "current_phase": phase,
                "progress_percent": progress_percent,
                "updated_at": datetime.now().isoformat()
            }
            
            if sources_count is not None:
                update_data["sources_count"] = sources_count
            
            if chapters_count is not None:
                update_data["chapters_count"] = chapters_count
            
            if details:
                update_data["progress_details"] = details

            self.supabase.table(self.table_name).update(update_data).eq("id", self.record_id).execute()

            print(f"📊 Progress [{self.table_name}]: {phase} ({progress_percent}%) | Sources: {sources_count or 0} | Chapters: {chapters_count or 0}")
            
        except Exception as e:
            # Don't fail thesis generation if progress update fails
            print(f"⚠️  Progress update failed: {e}")
    
    def update_research(self, sources_count: int, phase_detail: str = ""):
        """Update research phase progress."""
        self.update_phase(
            phase="research",
            progress_percent=20,
            sources_count=sources_count,
            details={"phase_detail": phase_detail} if phase_detail else None
        )
    
    def update_writing(self, chapters_count: int, chapter_name: str = ""):
        """Update writing phase progress."""
        # Progress: 20% (research done) + 50% * (chapters / expected 6-8 chapters)
        progress = 20 + int(50 * min(chapters_count / 7, 1))
        
        self.update_phase(
            phase="writing",
            progress_percent=progress,
            chapters_count=chapters_count,
            details={"current_chapter": chapter_name} if chapter_name else None
        )
    
    def update_formatting(self):
        """Update formatting phase progress."""
        self.update_phase(
            phase="formatting",
            progress_percent=75,
            details={"stage": "formatting_and_citations"}
        )
    
    def update_exporting(self, export_type: str = ""):
        """Update export phase progress."""
        self.update_phase(
            phase="exporting",
            progress_percent=90,
            details={"export_type": export_type} if export_type else None
        )
    
    def mark_completed(self):
        """Mark thesis as completed."""
        self.update_phase(
            phase="completed",
            progress_percent=100
        )


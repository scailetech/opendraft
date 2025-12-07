"""
Detailed Progress Helper - Makes granular updates easy
"""

class DetailedProgressTracker:
    """Helper to make many small progress updates without repetitive code."""
    
    def __init__(self, tracker, streamer=None):
        self.tracker = tracker
        self.streamer = streamer
        self.current_progress = 0
    
    def update(self, percent: int, phase: str, stage: str, sources: int = 0, chapters: int = 0, milestone: str = None):
        """Quick update with all params."""
        self.current_progress = percent
        details = {"stage": stage}
        if milestone:
            details["milestone"] = milestone
        
        if self.tracker:
            self.tracker.update_phase(
                phase=phase,
                progress_percent=percent,
                sources_count=sources if sources > 0 else None,
                chapters_count=chapters if chapters > 0 else None,
                details=details
            )
    
    def update_phase(self, phase: str, progress_percent: int, sources_count: int = None, chapters_count: int = None, details: dict = None):
        """Passthrough method for compatibility with existing code."""
        if self.tracker:
            self.tracker.update_phase(phase, progress_percent, sources_count, chapters_count, details)
    
    # Convenience methods for each phase
    def research_start(self): self.update(2, "research", "starting_research")
    def research_crossref(self): self.update(5, "research", "querying_crossref")
    def research_semantic(self): self.update(8, "research", "querying_semantic_scholar")
    def research_gemini(self): self.update(12, "research", "using_gemini_grounded")
    def research_found(self, count): self.update(18, "research", f"found_{count}_sources", sources=count)
    def research_complete(self, count): self.update(22, "research", "research_complete", sources=count, milestone="research_complete")
    
    def structure_architect(self): self.update(25, "structure", "creating_outline")
    def structure_formatter(self): self.update(28, "structure", "applying_formatting")
    def structure_complete(self): self.update(30, "structure", "outline_complete", milestone="outline_complete")
    def citations_processing(self, count): self.update(32, "structure", "processing_citations", sources=count)
    
    def writing_intro_start(self): self.update(36, "writing", "writing_introduction")
    def writing_intro_done(self): self.update(42, "writing", "introduction_complete", chapters=1, milestone="introduction_complete")
    def writing_body_start(self): self.update(45, "writing", "writing_main_body")
    def writing_body_done(self): self.update(62, "writing", "main_body_complete", chapters=2, milestone="main_body_complete")
    def writing_conclusion_start(self): self.update(66, "writing", "writing_conclusion")
    def writing_conclusion_done(self): self.update(72, "writing", "conclusion_complete", chapters=3, milestone="conclusion_complete")
    
    def compile_start(self): self.update(74, "compiling", "assembling_thesis")
    def compile_citations(self): self.update(77, "compiling", "inserting_citations")
    def compile_enhance(self): self.update(80, "compiling", "enhancing_content")
    def compile_done(self): self.update(85, "compiling", "compilation_complete", milestone="compilation_complete")
    
    def export_pdf_start(self): self.update(88, "exporting", "generating_pdf")
    def export_pdf_done(self): self.update(92, "exporting", "pdf_complete")
    def export_docx_start(self): self.update(94, "exporting", "generating_docx")
    def export_docx_done(self): self.update(97, "exporting", "docx_complete")
    def export_zip(self): self.update(99, "exporting", "creating_zip")
    def complete(self): self.update(100, "completed", "thesis_ready", milestone="thesis_complete")
    
    # Compatibility methods for existing code
    def update_research(self, sources_count: int, phase_detail: str = ""):
        """Update research with source count."""
        self.update(20, "research", phase_detail or "research_complete", sources=sources_count, milestone="research_complete")
    
    def update_writing(self, chapters_count: int, chapter_name: str = ""):
        """Update writing with chapter count."""
        progress = 36 + min(chapters_count * 12, 36)  # 36-72%
        self.update(progress, "writing", chapter_name or f"chapter_{chapters_count}", chapters=chapters_count)
    
    def update_formatting(self):
        """Update formatting phase."""
        self.update(75, "compiling", "formatting_document")
    
    def update_exporting(self, export_type: str = ""):
        """Update export phase."""
        self.update(90, "exporting", export_type or "exporting")
    
    def mark_completed(self):
        """Mark as complete."""
        self.complete()


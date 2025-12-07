"""
Milestone Streaming - Upload partial results and notify users at key milestones.
Provides early value and keeps users engaged during long-running thesis generation.
"""
import os
from typing import Optional
from pathlib import Path
from datetime import datetime
import json


class MilestoneStreamer:
    """Streams partial thesis results to Supabase and sends progressive notifications."""
    
    def __init__(self, user_id: str, email: str, supabase_client, resend_api_key: str):
        """
        Initialize milestone streamer.
        
        Args:
            user_id: User ID
            email: User email for notifications
            supabase_client: Supabase client instance
            resend_api_key: Resend API key for emails
        """
        self.user_id = user_id
        self.email = email
        self.supabase = supabase_client
        self.resend_api_key = resend_api_key
    
    def upload_milestone_file(self, file_path: Path, milestone_name: str) -> Optional[str]:
        """
        Upload a milestone file to Supabase storage.
        
        Args:
            file_path: Path to the file to upload
            milestone_name: Name for the milestone (e.g., "research", "outline", "chapter_1")
        
        Returns:
            Signed URL to the uploaded file, or None if failed
        """
        try:
            if not file_path.exists():
                print(f"⚠️  Milestone file not found: {file_path}")
                return None
            
            # Determine file type
            suffix = file_path.suffix.lower()
            content_types = {
                '.pdf': 'application/pdf',
                '.md': 'text/markdown',
                '.json': 'application/json',
                '.txt': 'text/plain',
                '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            }
            content_type = content_types.get(suffix, 'application/octet-stream')
            
            # Upload to storage under milestones folder
            storage_path = f"{self.user_id}/milestones/{milestone_name}{suffix}"
            
            with open(file_path, "rb") as f:
                self.supabase.storage.from_("thesis-files").upload(
                    storage_path,
                    f.read(),
                    file_options={"content-type": content_type, "upsert": "true"}
                )
            
            # Create signed URL (7 days)
            signed = self.supabase.storage.from_("thesis-files").create_signed_url(
                storage_path, 
                expires_in=604800
            )
            
            url = signed.get("signedURL") or signed.get("signedUrl")
            print(f"✅ Uploaded milestone: {milestone_name} → {url[:80]}...")
            return url
            
        except Exception as e:
            print(f"⚠️  Failed to upload milestone {milestone_name}: {e}")
            return None
    
    def send_milestone_email(
        self,
        milestone_name: str,
        milestone_title: str,
        message: str,
        file_url: Optional[str] = None,
        metadata: Optional[dict] = None
    ):
        """
        Send progressive notification email for a milestone.
        
        Args:
            milestone_name: Internal milestone name (research, outline, etc.)
            milestone_title: User-facing title ("Research Complete!")
            message: Email message body
            file_url: Optional URL to download milestone result
            metadata: Optional metadata (sources count, chapter count, etc.)
        """
        try:
            import resend
            resend.api_key = self.resend_api_key
            
            # Build email HTML
            html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; }}
                    .content {{ background: #f9fafb; padding: 30px; border-radius: 8px; margin: 20px 0; }}
                    .milestone {{ background: white; padding: 20px; border-radius: 6px; border-left: 4px solid #667eea; margin: 15px 0; }}
                    .button {{ display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 15px 0; }}
                    .metadata {{ background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0; }}
                    .footer {{ text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }}
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🎉 {milestone_title}</h1>
                    <p>Your thesis is making progress!</p>
                </div>
                
                <div class="content">
                    <p>{message}</p>
                    
                    {f'<div class="metadata"><strong>Quick Stats:</strong><br>' + '<br>'.join([f'• {k}: {v}' for k, v in metadata.items()]) + '</div>' if metadata else ''}
                    
                    {f'<a href="{file_url}" class="button">📥 Download {milestone_title}</a>' if file_url else ''}
                    
                    <div class="milestone">
                        <strong>What's Next?</strong><br>
                        We're continuing to work on your complete thesis. You'll receive another update when the next milestone is reached, and a final email when everything is ready!
                    </div>
                </div>
                
                <div class="footer">
                    <p>OpenDraft - AI-Powered Academic Writing</p>
                    <p>This is an automated progress update for your thesis generation.</p>
                </div>
            </body>
            </html>
            """
            
            resend.Emails.send({
                "from": "OpenDraft <hello@clients.opendraft.xyz>",
                "to": self.email,
                "subject": f"🎓 {milestone_title} - Thesis Progress Update",
                "html": html
            })
            
            print(f"📧 Milestone email sent: {milestone_title}")
            
        except Exception as e:
            print(f"⚠️  Failed to send milestone email: {e}")
    
    def stream_research_complete(self, sources_count: int, bibliography_path: Optional[Path] = None):
        """
        Stream research completion milestone.
        
        Args:
            sources_count: Number of sources found
            bibliography_path: Optional path to bibliography JSON file
        """
        print(f"\n📤 MILESTONE: Research Complete ({sources_count} sources)")
        
        # Upload bibliography if available
        bib_url = None
        if bibliography_path and bibliography_path.exists():
            bib_url = self.upload_milestone_file(bibliography_path, "research_bibliography")
        
        # Send email
        self.send_milestone_email(
            milestone_name="research",
            milestone_title="Research Complete!",
            message=f"Great news! We've completed the research phase and found <strong>{sources_count} high-quality academic sources</strong> for your thesis. The research phase typically takes the longest, so the rest should go faster!",
            file_url=bib_url,
            metadata={
                "Sources Found": sources_count,
                "Phase": "Research ✅",
                "Next": "Outline & Structure"
            }
        )
        
        # Update database with milestone
        try:
            self.supabase.table("waitlist").update({
                "progress_details": {
                    "last_milestone": "research_complete",
                    "research_url": bib_url,
                    "milestone_timestamp": datetime.now().isoformat()
                }
            }).eq("id", self.user_id).execute()
        except Exception as e:
            print(f"⚠️  Failed to update milestone in DB: {e}")
    
    def stream_outline_complete(self, outline_path: Optional[Path] = None, chapters_count: int = 0):
        """
        Stream outline completion milestone.
        
        Args:
            outline_path: Path to outline markdown file
            chapters_count: Expected number of chapters
        """
        print(f"\n📤 MILESTONE: Outline Complete ({chapters_count} chapters planned)")
        
        # Upload outline if available
        outline_url = None
        if outline_path and outline_path.exists():
            outline_url = self.upload_milestone_file(outline_path, "thesis_outline")
        
        # Send email
        self.send_milestone_email(
            milestone_name="outline",
            milestone_title="Thesis Outline Ready!",
            message=f"Your thesis structure is complete! We've created a detailed outline with <strong>{chapters_count} chapters</strong>. Now we're moving into the writing phase - this is where your thesis really comes to life!",
            file_url=outline_url,
            metadata={
                "Chapters Planned": chapters_count,
                "Phase": "Structure ✅",
                "Next": "Writing Content"
            }
        )
    
    def stream_chapter_complete(self, chapter_num: int, chapter_name: str, chapter_path: Optional[Path] = None):
        """
        Stream individual chapter completion.
        
        Args:
            chapter_num: Chapter number
            chapter_name: Chapter title
            chapter_path: Path to chapter file
        """
        print(f"\n📤 MILESTONE: Chapter {chapter_num} Complete - {chapter_name}")
        
        # Upload chapter if available
        chapter_url = None
        if chapter_path and chapter_path.exists():
            chapter_url = self.upload_milestone_file(chapter_path, f"chapter_{chapter_num:02d}")
        
        # Only send email for major chapters (Introduction, Conclusion, every 2nd chapter)
        # To avoid email spam, we're selective about which chapters trigger emails
        should_email = (chapter_num == 1 or  # Introduction
                       chapter_num % 2 == 0 or  # Every other chapter
                       "conclusion" in chapter_name.lower())
        
        if should_email:
            self.send_milestone_email(
                milestone_name=f"chapter_{chapter_num}",
                milestone_title=f"Chapter {chapter_num} Complete: {chapter_name}",
                message=f"Another chapter done! <strong>Chapter {chapter_num}: {chapter_name}</strong> has been written and is ready for you to preview.",
                file_url=chapter_url,
                metadata={
                    "Chapter": f"{chapter_num}: {chapter_name}",
                    "Phase": "Writing 📝",
                    "Status": "Draft Complete"
                }
            )


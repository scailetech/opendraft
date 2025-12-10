#!/usr/bin/env python3
"""
OpenDraft Worker Poller - Replaces Modal.com

Polls Supabase for pending theses and processes them directly on Render.
This is the equivalent of Modal's poll_pending_batches() but running on a persistent worker.
"""

import os
import sys
import time
import logging
from datetime import datetime
from supabase import create_client, Client

# Add parent directory to path to import backend modules
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)  # /Users/federicodeponte/opendraft
sys.path.insert(0, project_root)

from backend.thesis_generator import generate_thesis

# Setup logging
log_dir = os.path.join(project_root, 'logs')
os.makedirs(log_dir, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(os.path.join(log_dir, 'worker.log'))
    ]
)
logger = logging.getLogger(__name__)

# Environment variables
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
POLL_INTERVAL = int(os.getenv('POLL_INTERVAL', '10'))  # seconds

if not all([SUPABASE_URL, SUPABASE_SERVICE_KEY, GEMINI_API_KEY]):
    logger.error("Missing required environment variables!")
    sys.exit(1)

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
logger.info(f"✓ Supabase connected: {SUPABASE_URL}")


def poll_and_process():
    """
    Poll database for pending theses and process them one at a time.
    Similar to Modal's poll_pending_batches() but simpler.
    """
    while True:
        try:
            # Query for oldest pending thesis
            result = supabase.table('theses')\
                .select('*')\
                .eq('status', 'pending')\
                .order('created_at', desc=False)\
                .limit(1)\
                .execute()

            if not result.data:
                # No pending theses, wait and check again
                time.sleep(POLL_INTERVAL)
                continue

            thesis = result.data[0]
            thesis_id = thesis['id']
            topic = thesis['topic']
            user_id = thesis['user_id']

            logger.info(f"="*80)
            logger.info(f"📝 Processing thesis: {thesis_id}")
            logger.info(f"   Topic: {topic}")
            logger.info(f"   User: {user_id}")
            logger.info(f"="*80)

            # Mark as processing
            supabase.table('theses')\
                .update({
                    'status': 'processing',
                    'current_phase': 'initializing',
                    'progress': 0,
                    'updated_at': datetime.utcnow().isoformat()
                })\
                .eq('id', thesis_id)\
                .execute()

            # Process thesis using ThesisGenerator
            try:
                generator = ThesisGenerator(
                    topic=thesis['topic'],
                    language=thesis.get('language', 'en'),
                    academic_level=thesis.get('academic_level', 'master'),
                    citation_style=thesis.get('citation_style', 'apa'),
                    target_word_count=thesis.get('target_word_count', 20000),
                    thesis_id=thesis_id,
                    supabase_url=SUPABASE_URL,
                    supabase_key=SUPABASE_SERVICE_KEY
                )

                # Generate thesis (this will take 5-30 minutes)
                logger.info(f"[{thesis_id}] Starting thesis generation...")
                start_time = time.time()

                result = generator.generate()

                elapsed = time.time() - start_time
                logger.info(f"[{thesis_id}] ✓ Thesis generated in {elapsed/60:.1f} minutes")

                # Mark as completed
                supabase.table('theses')\
                    .update({
                        'status': 'completed',
                        'progress': 100,
                        'pdf_path': result.get('pdf_path'),
                        'docx_path': result.get('docx_path'),
                        'markdown_path': result.get('markdown_path'),
                        'word_count': result.get('word_count'),
                        'research_metadata': result.get('research_metadata', {}),
                        'updated_at': datetime.utcnow().isoformat()
                    })\
                    .eq('id', thesis_id)\
                    .execute()

                logger.info(f"[{thesis_id}] ✅ COMPLETED - Word count: {result.get('word_count')}")

            except Exception as e:
                logger.error(f"[{thesis_id}] ❌ Generation failed: {e}", exc_info=True)

                # Mark as failed
                supabase.table('theses')\
                    .update({
                        'status': 'failed',
                        'error_message': str(e),
                        'updated_at': datetime.utcnow().isoformat()
                    })\
                    .eq('id', thesis_id)\
                    .execute()

        except Exception as e:
            logger.error(f"Poller error: {e}", exc_info=True)
            time.sleep(POLL_INTERVAL)


if __name__ == '__main__':
    logger.info("="*80)
    logger.info("OpenDraft Worker Poller - STARTED")
    logger.info("="*80)
    logger.info(f"Poll interval: {POLL_INTERVAL}s")
    logger.info(f"Gemini API key: {'✓ Set' if GEMINI_API_KEY else '✗ Missing'}")
    logger.info("="*80)

    try:
        poll_and_process()
    except KeyboardInterrupt:
        logger.info("\n👋 Worker stopped by user")
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)

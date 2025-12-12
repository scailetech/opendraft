#!/usr/bin/env python3
"""
Full Thesis Generation Test - Verify Optimizations
"""
import requests
import time
from supabase import create_client

SUPABASE_URL = 'https://rnuiiqgkytwmztgsanng.supabase.co'
SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJudWlpcWdreXR3bXp0Z3Nhbm5nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDY4NjUzMywiZXhwIjoyMDgwMDQ2NTMzfQ.W1RHChD4C-GQPwc0vxzz85Wc8XanQeZdixIrjY6NobQ'

def main():
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    print('='*70)
    print('FULL THESIS GENERATION TEST - OPTIMIZATIONS VERIFICATION')
    print('='*70)

    # Create thesis
    result = supabase.table('theses').insert({
        'user_id': 'ed9754c2-9929-4506-aa99-b5f1de9d5735',
        'topic': 'Machine Learning Applications in Climate Change Prediction',
        'language': 'en',
        'academic_level': 'master',
        'status': 'pending'
    }).execute()

    thesis_id = result.data[0]['id']
    print(f'\n✓ Thesis Created: {thesis_id}')
    print(f'  Topic: Machine Learning Applications in Climate Change Prediction')

    # Trigger Modal
    print(f'\nTriggering Modal worker...')
    response = requests.post(
        'https://tech-opendraft--thesis-generator-trigger-thesis-http.modal.run',
        json={'thesis_id': thesis_id},
        timeout=30
    )
    print(f'✓ Modal Response: {response.json()}')

    print(f'\n{"="*70}')
    print(f'MONITORING THESIS GENERATION TO COMPLETION')
    print(f'Thesis ID: {thesis_id}')
    print(f'{"="*70}\n')

    start_time = time.time()
    last_phase = None
    last_progress = -1

    while True:
        elapsed = int(time.time() - start_time)
        result = supabase.table('theses').select(
            'status,current_phase,progress_percent,error_message'
        ).eq('id', thesis_id).single().execute()

        status = result.data.get('status')
        phase = result.data.get('current_phase')
        progress = result.data.get('progress_percent', 0)
        error = result.data.get('error_message')

        # Only print on changes
        if phase != last_phase or progress != last_progress:
            mins = elapsed // 60
            secs = elapsed % 60
            print(f'[{mins}m {secs:02d}s] Phase: {phase or "pending":15s} | Progress: {progress:3d}% | Status: {status}')
            last_phase = phase
            last_progress = progress

        if status == 'completed':
            mins = elapsed // 60
            secs = elapsed % 60
            print(f'\n{"="*70}')
            print(f'✅ THESIS COMPLETED SUCCESSFULLY!')
            print(f'⏱️  Total Time: {mins} minutes {secs} seconds')
            print(f'{"="*70}')
            break
        elif status == 'failed':
            mins = elapsed // 60
            secs = elapsed % 60
            print(f'\n❌ FAILED after {mins}m {secs}s')
            print(f'Error: {error}')
            break

        if elapsed > 1800:  # 30 min timeout
            print(f'\n⏱️ TIMEOUT after 30 minutes (still {status})')
            break

        time.sleep(5)

if __name__ == '__main__':
    main()

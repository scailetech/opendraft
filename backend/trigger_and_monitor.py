"""Trigger Modal and monitor progress"""
import modal
import time
import requests
import json

THESIS_ID = "0d2c69c2-420d-45f0-a598-d9bb0631dad6"
API_URL = f"http://localhost:3000/api/thesis/{THESIS_ID}/status"

def get_status():
    try:
        resp = requests.get(API_URL, timeout=5)
        if resp.ok:
            return resp.json()
    except:
        pass
    return None

def trigger_modal():
    """Trigger Modal function directly via Python API"""
    print(f"🚀 Triggering Modal for thesis: {THESIS_ID}")
    
    try:
        # Get the function reference
        process_fn = modal.Function.from_name("thesis-generator", "process_single_user")
        
        # We need to get the user data first - but we can't access Supabase locally
        # So we'll use the trigger_thesis_by_id Modal function instead
        trigger_fn = modal.Function.from_name("trigger-thesis", "trigger_by_id")
        
        print("📞 Calling trigger function on Modal...")
        # This should work even with outdated CLI since we're using the Python API
        result = trigger_fn.remote(THESIS_ID)
        
        if result:
            print(f"✅ Modal triggered!")
            print(f"   Call ID: {result.get('call_id', 'N/A')}")
            return True
        else:
            print("❌ Trigger returned None")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def monitor_progress():
    """Monitor thesis progress"""
    print(f"\n📊 Monitoring thesis: {THESIS_ID}")
    print("=" * 60)
    
    last_status = None
    last_percent = -1
    
    while True:
        status_data = get_status()
        
        if status_data:
            current_status = status_data.get('status', 'unknown')
            current_phase = status_data.get('current_phase', 'None')
            progress = status_data.get('progress_percent', 0)
            sources = status_data.get('sources_count', 0)
            chapters = status_data.get('chapters_count', 0)
            started = status_data.get('processing_started_at')
            error = status_data.get('error_message')
            
            # Only print if something changed
            if (current_status != last_status or 
                progress != last_percent or 
                current_phase != (status_data.get('_last_phase') if hasattr(status_data, '_last_phase') else None)):
                
                timestamp = time.strftime("%H:%M:%S")
                print(f"\n[{timestamp}] Status: {current_status} | Phase: {current_phase} | Progress: {progress}%")
                print(f"           Sources: {sources} | Chapters: {chapters}")
                
                if started:
                    print(f"           Started: {started}")
                if error:
                    print(f"           ⚠️  Error: {error}")
                
                last_status = current_status
                last_percent = progress
                status_data['_last_phase'] = current_phase
            
            # Check if completed
            if current_status == 'completed':
                print(f"\n✅ Thesis generation completed!")
                print(f"   PDF: {status_data.get('pdf_url', 'N/A')}")
                print(f"   DOCX: {status_data.get('docx_url', 'N/A')}")
                break
            
            # Check if failed
            if current_status == 'failed' or error:
                print(f"\n❌ Thesis generation failed!")
                if error:
                    print(f"   Error: {error}")
                break
        
        time.sleep(3)

if __name__ == "__main__":
    print("=" * 60)
    print("🎯 Modal Trigger & Monitor")
    print("=" * 60)
    
    # Trigger Modal
    triggered = trigger_modal()
    
    if triggered:
        # Wait a moment for Modal to start
        print("\n⏳ Waiting 5 seconds for Modal to initialize...")
        time.sleep(5)
        
        # Start monitoring
        monitor_progress()
    else:
        print("\n❌ Could not trigger Modal. Please check Modal setup.")


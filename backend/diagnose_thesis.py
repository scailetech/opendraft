#!/usr/bin/env python3
"""
Detailed diagnostics for thesis generation - shows exactly what's happening
"""
import modal
import sys
from datetime import datetime

def main():
    print("=" * 80)
    print("🔍 DETAILED THESIS GENERATION DIAGNOSTICS")
    print("=" * 80)
    print()
    
    # Get the app
    try:
        app = modal.App.lookup("thesis-generator", create_if_missing=False)
        print("✅ Found Modal app: thesis-generator")
    except Exception as e:
        print(f"❌ Could not find Modal app: {e}")
        return 1
    
    print()
    print("📊 CHECKING RUNNING FUNCTIONS...")
    print("-" * 80)
    
    try:
        # Get function handles
        function_names = ["process_single_user", "daily_thesis_batch"]
        
        for func_name in function_names:
            print(f"\n🔧 Function: {func_name}")
            try:
                # Try to get function info
                func = getattr(app, func_name, None)
                if func:
                    print(f"   ✅ Function exists")
                else:
                    print(f"   ⚠️  Function not accessible via app object")
            except Exception as e:
                print(f"   ⚠️  Error accessing function: {e}")
    
    except Exception as e:
        print(f"❌ Error checking functions: {e}")
    
    print()
    print("-" * 80)
    print("\n💡 To see detailed logs, run:")
    print("   modal app logs thesis-generator --follow")
    print()
    print("💡 To see running containers:")
    print("   modal container list --app thesis-generator")
    print()
    print("💡 To view in dashboard:")
    print("   https://modal.com/apps/tech-opendraft/main/deployed/thesis-generator")
    print()
    print("=" * 80)
    
    return 0

if __name__ == "__main__":
    sys.exit(main())


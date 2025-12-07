#!/bin/bash
# Comprehensive thesis generation monitoring script

EMAIL="f.deponte@yahoo.de"
SUPABASE_URL="https://rnuiiqgkytwmztgsanng.supabase.co"
SUPABASE_KEY="sb_secret_hI42whqNsWRQIgRzkcSmag_FRbIWlqh"

check_count=0
last_status=""
last_phase=""

while true; do
    check_count=$((check_count + 1))
    clear
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎓 THESIS GENERATION MONITOR - Check #$check_count"
    echo "📧 Email: $EMAIL"
    echo "🕐 Time: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Check database status
    cd ../website
    DB_STATUS=$(npx tsx -e "
        import {createClient} from '@supabase/supabase-js';
        const s=createClient('$SUPABASE_URL','$SUPABASE_KEY');
        (async()=>{
            const {data:u}=await s.from('waitlist')
                .select('status,processing_started_at,pdf_url,docx_url,zip_url,error_message')
                .eq('email','$EMAIL').single();
            
            if(!u) {
                console.log('ERROR:User not found');
                return;
            }
            
            const status = u.status;
            const elapsed = u.processing_started_at 
                ? Math.floor((Date.now()-new Date(u.processing_started_at))/60000)
                : 0;
            
            const pdf = u.pdf_url ? '✅' : '⏳';
            const docx = u.docx_url ? '✅' : '⏳';
            const zip = u.zip_url ? '✅' : '⏳';
            
            console.log('STATUS:'+status);
            console.log('ELAPSED:'+elapsed);
            console.log('PDF:'+pdf);
            console.log('DOCX:'+docx);
            console.log('ZIP:'+zip);
            
            if(u.error_message) {
                console.log('ERROR:'+u.error_message);
            }
        })();
    " 2>&1 | grep -v "npm\|tsx\|node")
    
    # Parse database status
    STATUS=$(echo "$DB_STATUS" | grep "^STATUS:" | cut -d':' -f2)
    ELAPSED=$(echo "$DB_STATUS" | grep "^ELAPSED:" | cut -d':' -f2)
    PDF=$(echo "$DB_STATUS" | grep "^PDF:" | cut -d':' -f2)
    DOCX=$(echo "$DB_STATUS" | grep "^DOCX:" | cut -d':' -f2)
    ZIP=$(echo "$DB_STATUS" | grep "^ZIP:" | cut -d':' -f2)
    ERROR=$(echo "$DB_STATUS" | grep "^ERROR:" | cut -d':' -f2-)
    
    echo "📊 DATABASE STATUS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Status: $STATUS"
    if [ ! -z "$ELAPSED" ] && [ "$ELAPSED" != "0" ]; then
        echo "  Elapsed: ${ELAPSED}m"
    fi
    echo "  Files: PDF:$PDF  DOCX:$DOCX  ZIP:$ZIP"
    
    if [ ! -z "$ERROR" ]; then
        echo "  ⚠️  Error: $ERROR"
    fi
    echo ""
    
    # Check Modal logs for phase progress
    cd ../backend
    echo "📋 MODAL LOGS (Recent Activity)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    LOGS=$(/opt/homebrew/bin/python3.10 -m modal app logs thesis-generator 2>&1 | \
        grep -E "(PHASE|✅|Scout|Scribe|Signal|Architect|Formatter|✍️|📦|Status:|Completed|FAILED|Error|rate limit|fallback|DataForSEO)" | \
        tail -15)
    
    if [ ! -z "$LOGS" ]; then
        echo "$LOGS" | sed 's/^/  /'
    else
        echo "  (No recent logs)"
    fi
    echo ""
    
    # Status change detection
    if [ "$STATUS" != "$last_status" ]; then
        echo "🔔 STATUS CHANGE: $last_status → $STATUS"
        last_status="$STATUS"
    fi
    
    # Check for completion or failure
    if [ "$STATUS" = "completed" ]; then
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "🎉 ✅ ✅ ✅ THESIS GENERATION COMPLETE! ✅ ✅ ✅"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "Generated files:"
        echo "  PDF:  $PDF"
        echo "  DOCX: $DOCX"
        echo "  ZIP:  $ZIP"
        echo ""
        break
    fi
    
    if [ "$STATUS" = "failed" ]; then
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "❌ THESIS GENERATION FAILED"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        if [ ! -z "$ERROR" ]; then
            echo ""
            echo "Error message: $ERROR"
        fi
        echo ""
        echo "Check Modal logs for details:"
        echo "  /opt/homebrew/bin/python3.10 -m modal app logs thesis-generator"
        echo ""
        break
    fi
    
    # Progress indicator
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "⏳ Next check in 30 seconds... (Press Ctrl+C to stop monitoring)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    sleep 30
done


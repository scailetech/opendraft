#!/bin/bash
# Real-time progress monitoring with phase tracking

EMAIL="${1:-f.deponte@yahoo.de}"
SUPABASE_URL="https://rnuiiqgkytwmztgsanng.supabase.co"
SUPABASE_KEY="sb_secret_hI42whqNsWRQIgRzkcSmag_FRbIWlqh"

while true; do
    clear
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎓 THESIS GENERATION PROGRESS MONITOR"
    echo "📧 Email: $EMAIL"
    echo "🕐 Time: $(date '+%H:%M:%S')"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    cd ../website
    npx tsx -e "
import {createClient} from '@supabase/supabase-js';
const s=createClient('$SUPABASE_URL','$SUPABASE_KEY');

(async()=>{
    const {data:u}=await s.from('waitlist')
        .select('status,processing_started_at,current_phase,progress_percent,sources_count,chapters_count,progress_details,error_message,pdf_url,docx_url')
        .eq('email','$EMAIL').single();
    
    if(!u) {
        console.log('❌ User not found');
        return;
    }
    
    const elapsed = u.processing_started_at 
        ? Math.floor((Date.now()-new Date(u.processing_started_at))/60000)
        : 0;
    
    console.log('');
    console.log('📊 STATUS:', u.status?.toUpperCase() || 'UNKNOWN');
    console.log('📍 PHASE:', u.current_phase || 'not started');
    console.log('📈 PROGRESS:', (u.progress_percent || 0) + '%');
    
    if(elapsed > 0) {
        console.log('⏱️  ELAPSED:', elapsed + 'm');
    }
    
    console.log('');
    console.log('📚 SOURCES:', u.sources_count || 0, 'citations');
    console.log('📝 CHAPTERS:', u.chapters_count || 0, 'completed');
    
    if(u.progress_details && Object.keys(u.progress_details).length > 0) {
        console.log('');
        console.log('📋 DETAILS:');
        Object.entries(u.progress_details).forEach(([k,v]) => {
            console.log('  ', k + ':', v);
        });
    }
    
    console.log('');
    console.log('📄 FILES: PDF:' + (u.pdf_url?'✅':'⏳') + ' | DOCX:' + (u.docx_url?'✅':'⏳'));
    
    if(u.error_message) {
        console.log('');
        console.log('⚠️  ERROR:', u.error_message);
    }
    
    if(u.status === 'completed') {
        console.log('');
        console.log('🎉🎉🎉 THESIS COMPLETE! 🎉🎉🎉');
    } else if(u.status === 'failed') {
        console.log('');
        console.log('❌ GENERATION FAILED');
    }
})();
    " 2>&1 | grep -v "npm\|^$"
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Press Ctrl+C to stop | Refreshing every 15 seconds..."
    
    sleep 15
done


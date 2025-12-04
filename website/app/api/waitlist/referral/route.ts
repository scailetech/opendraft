import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Get referral stats for a referral code
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Missing referral code' }, { status: 400 });
    }

    // Get user by referral code
    const { data: user, error: userError } = await supabaseAdmin
      .from('waitlist')
      .select('id, full_name, position, original_position, created_at')
      .eq('referral_code', code)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 });
    }

    // Get referral count
    const { count: totalReferrals } = await supabaseAdmin
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_code', code);

    // Get verified referral count (joined with waitlist to check email_verified)
    const { data: verifiedReferrals } = await supabaseAdmin
      .from('referrals')
      .select(`
        id,
        waitlist!inner(email_verified)
      `)
      .eq('referrer_code', code);

    const verifiedCount = verifiedReferrals?.filter(
      (r: any) => r.waitlist?.email_verified
    ).length || 0;

    return NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        name: user.full_name,
        position: user.position,
        originalPosition: user.original_position,
        positionsSkipped: user.original_position - user.position,
        totalReferrals: totalReferrals || 0,
        verifiedReferrals: verifiedCount,
        joinedAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('Referral stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

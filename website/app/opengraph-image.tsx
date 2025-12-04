// ABOUTME: Generates OpenGraph preview image (1200x630) for social media sharing
// ABOUTME: Shown when landing page URL is shared on Twitter, LinkedIn, Facebook, Slack

import { ImageResponse } from 'next/og'
import { BRAND_CONFIG } from '@/lib/brand-config'

export const alt = 'OpenDraft - Write Your Thesis 10x Faster'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 60,
          background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #60a5fa 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          padding: '80px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ fontSize: 100, marginBottom: 30 }}>{BRAND_CONFIG.icon}</div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: 20,
            lineHeight: 1.2,
          }}
        >
          OpenDraft
        </div>
        <div
          style={{
            fontSize: 40,
            textAlign: 'center',
            opacity: 0.9,
            marginBottom: 30,
          }}
        >
          Write Your Thesis 10x Faster
        </div>
        <div
          style={{
            fontSize: 28,
            textAlign: 'center',
            opacity: 0.8,
            maxWidth: 900,
          }}
        >
          19 Specialized AI Agents • 200M+ Research Papers • FREE Tier Available
        </div>
        <div
          style={{
            fontSize: 24,
            marginTop: 40,
            padding: '15px 30px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: 10,
          }}
        >
          100% Free & Open Source
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}

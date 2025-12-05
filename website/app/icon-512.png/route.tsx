// ABOUTME: Generates 512x512 icon for PWA
// ABOUTME: Used in manifest.json for splash screens

import { ImageResponse } from 'next/og'
import { BRAND_CONFIG, getIconStyle } from '@/lib/brand-config'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div style={getIconStyle(380, '64px')}>
        {BRAND_CONFIG.icon}
      </div>
    ),
    {
      width: 512,
      height: 512,
    }
  )
}


// ABOUTME: Generates 512x512 icon for PWA
// ABOUTME: Used in manifest.json for splash screens

import { ImageResponse } from 'next/og'
import { BRAND_CONFIG, getIconStyle } from '@/lib/brand-config'

export const size = {
  width: 512,
  height: 512,
}
export const contentType = 'image/png'

export default function Icon512() {
  return new ImageResponse(
    (
      <div style={getIconStyle(380, '64px')}>
        {BRAND_CONFIG.icon}
      </div>
    ),
    {
      ...size,
    }
  )
}


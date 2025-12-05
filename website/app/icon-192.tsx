// ABOUTME: Generates 192x192 icon for PWA
// ABOUTME: Used in manifest.json for Android/Chrome

import { ImageResponse } from 'next/og'
import { BRAND_CONFIG, getIconStyle } from '@/lib/brand-config'

export const size = {
  width: 192,
  height: 192,
}
export const contentType = 'image/png'

export default function Icon192() {
  return new ImageResponse(
    (
      <div style={getIconStyle(140, '32px')}>
        {BRAND_CONFIG.icon}
      </div>
    ),
    {
      ...size,
    }
  )
}


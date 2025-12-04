// ABOUTME: Generates dynamic favicon (32x32) for browser tabs and bookmarks
// ABOUTME: Uses shared brand config to maintain consistency across all icons

import { ImageResponse } from 'next/og'
import { BRAND_CONFIG, getIconStyle } from '@/lib/brand-config'

export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div style={getIconStyle(24, '6px')}>
        {BRAND_CONFIG.icon}
      </div>
    ),
    {
      ...size,
    }
  )
}

// ABOUTME: Generates iOS home screen icon (180x180) for Apple devices
// ABOUTME: Uses shared brand config to maintain consistency across all icons

import { ImageResponse } from 'next/og'
import { BRAND_CONFIG, getIconStyle } from '@/lib/brand-config'

export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={getIconStyle(120, '36px')}>
        {BRAND_CONFIG.icon}
      </div>
    ),
    {
      ...size,
    }
  )
}

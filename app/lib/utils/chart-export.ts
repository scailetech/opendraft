/**
 * Chart Export Utilities
 * Functions for exporting charts as PNG images and dashboards as PDF
 */

/**
 * Export an SVG element as PNG
 */
export async function exportSVGAsPNG(
  svgElement: SVGSVGElement,
  filename: string,
  width?: number,
  height?: number
): Promise<void> {
  try {
    // Clone the SVG to avoid modifying the original
    const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement
    
    // Get SVG dimensions from viewBox or bounding rect
    const viewBox = clonedSvg.viewBox.baseVal
    const svgRect = svgElement.getBoundingClientRect()
    const svgWidth = width || (viewBox.width || svgRect.width || 800)
    const svgHeight = height || (viewBox.height || svgRect.height || 600)

    // Set explicit width and height on cloned SVG
    clonedSvg.setAttribute('width', svgWidth.toString())
    clonedSvg.setAttribute('height', svgHeight.toString())
    
    // Ensure SVG has proper namespace
    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')

    // Create a canvas
    const canvas = document.createElement('canvas')
    const scale = 2 // Higher resolution
    canvas.width = svgWidth * scale
    canvas.height = svgHeight * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')

    // Set dark background to match theme
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Scale context for higher resolution
    ctx.scale(scale, scale)

    // Create image from SVG
    const svgData = new XMLSerializer().serializeToString(clonedSvg)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        try {
          ctx.drawImage(img, 0, 0, svgWidth, svgHeight)
          URL.revokeObjectURL(url)
          resolve()
        } catch (err) {
          reject(err)
        }
      }
      img.onerror = () => reject(new Error('Failed to load SVG image'))
      img.src = url
    })

    // Download the image
    canvas.toBlob((blob) => {
      if (!blob) {
        throw new Error('Failed to create blob')
      }
      const downloadUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `${filename}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(downloadUrl)
    }, 'image/png')
  } catch (error) {
    console.error('Error exporting SVG as PNG:', error)
    throw error
  }
}

/**
 * Export a chart container as PNG
 * Falls back to SVG export if element contains SVG (for recharts)
 */
export async function exportElementAsPNG(
  element: HTMLElement,
  filename: string
): Promise<void> {
  try {
    // First try: Use SVG export if element contains SVG (recharts uses SVG)
    const svg = element.querySelector('svg')
    if (svg) {
      await exportSVGAsPNG(svg, filename)
      return
    }

    // Fallback: html2canvas not available - SVG export is primary method
    throw new Error('No SVG found in element. SVG export is the primary export method.')
  } catch (error) {
    console.error('Error exporting element as PNG:', error)
    throw error
  }
}

/**
 * Export dashboard as PDF
 * Uses browser print dialog as fallback if jsPDF is not available
 */
export async function exportDashboardAsPDF(
  element: HTMLElement,
  filename: string
): Promise<void> {
  try {
    // Use browser print dialog (Save as PDF) as primary method
    // Note: jsPDF/html2canvas are optional dependencies and not installed
    // Fallback: Use browser print dialog (Save as PDF)
    const printContent = element.cloneNode(true) as HTMLElement
      
      // Create a print-friendly version
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        throw new Error('Could not open print window. Please allow popups.')
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${filename}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                background: #0a0a0a;
                color: #e4e4e7;
                font-family: system-ui, -apple-system, sans-serif;
                padding: 20px;
                font-size: 12px;
              }
              @media print {
                body { margin: 0; padding: 10px; }
                @page { margin: 1cm; }
              }
              .bg-secondary\\/40 { background: rgba(39, 39, 42, 0.4); }
              .border { border: 1px solid rgba(255, 255, 255, 0.1); }
              .rounded-lg { border-radius: 8px; }
              .p-4 { padding: 16px; }
              .text-xs { font-size: 11px; }
              .text-sm { font-size: 13px; }
              .font-medium { font-weight: 500; }
              .font-semibold { font-weight: 600; }
              .text-muted-foreground { color: #a1a1aa; }
              .text-foreground { color: #e4e4e7; }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
          </body>
        </html>
      `)
      printWindow.document.close()
      
    // Wait for content to load, then trigger print
    setTimeout(() => {
      printWindow.print()
    }, 250)
  } catch (error) {
    console.error('Error exporting dashboard as PDF:', error)
    throw error
  }
}

/**
 * Find SVG element in a chart container
 */
export function findChartSVG(container: HTMLElement): SVGSVGElement | null {
  return container.querySelector('svg')
}


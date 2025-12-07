/**
 * Demo data for home page animation
 */

export interface DemoRow {
  id: number
  name: string
  description: string
  summary?: string
  status: 'pending' | 'processing' | 'completed'
}

export const DEMO_ROWS: Omit<DemoRow, 'status' | 'summary'>[] = [
  {
    id: 1,
    name: 'John Doe',
    description: 'Software engineer with 5 years experience in React and Node.js',
  },
  {
    id: 2,
    name: 'Jane Smith',
    description: 'Data scientist specializing in machine learning and Python',
  },
  {
    id: 3,
    name: 'Mike Johnson',
    description: 'Product designer with expertise in UX/UI and design systems',
  },
]

export const DEMO_SUMMARIES = [
  'Experienced full-stack engineer specializing in React and Node.js',
  'ML expert with strong Python skills and data analysis background',
  'Design leader focused on user-centered design and design systems',
]

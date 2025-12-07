// ABOUTME: Redirect /run to /go for backwards compatibility
import { redirect } from 'next/navigation'

export default function RunPage() {
  redirect('/go')
}





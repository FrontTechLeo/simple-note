import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NotesShell from '@/components/notes-shell'

export default async function NotesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: notes, error } = await supabase
    .from('notes')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) {
    return <div className="p-6">加载失败：{error.message}</div>
  }

  return <NotesShell initialNotes={notes ?? []} userEmail={user.email ?? ''} />
}

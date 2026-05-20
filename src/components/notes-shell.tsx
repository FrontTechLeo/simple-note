'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Note } from '@/types/note'
import { useRouter } from 'next/navigation'

type Props = {
  initialNotes: Note[]
  userEmail: string
}

export default function NotesShell({ initialNotes, userEmail }: Props) {
  const router = useRouter()

  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [selectedId, setSelectedId] = useState<string | null>(initialNotes[0]?.id ?? null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [mobileEditing, setMobileEditing] = useState(false)

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId]
  )

  useEffect(() => {
    setTitle(selectedNote?.title ?? '')
    setContent(selectedNote?.content ?? '')
    setLastSavedTitle(selectedNote?.title ?? '')
    setLastSavedContent(selectedNote?.content ?? '')
  }, [selectedNote])

  const [lastSavedTitle, setLastSavedTitle] = useState('')
  const [lastSavedContent, setLastSavedContent] = useState('')

  const hasUnsavedChanges = selectedId !== null && (title !== lastSavedTitle || content !== lastSavedContent)

  async function handleSave() {
    if (!selectedId || !selectedNote) return
    if (title === lastSavedTitle && content === lastSavedContent) return

    const supabase = createClient()
    setSaving(true)

    const { data, error } = await supabase
      .from('notes')
      .update({ title, content })
      .eq('id', selectedId)
      .select()
      .single()

    setSaving(false)

    if (!error && data) {
      setLastSavedTitle(data.title)
      setLastSavedContent(data.content)
      setNotes((prev) =>
        [data, ...prev.filter((n) => n.id !== data.id)].sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )
      )
    }
  }

  async function handleCreate() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('notes')
      .insert({
        title: '未命名笔记',
        content: '',
      })
      .select()
      .single()

    if (!error && data) {
      const nextNotes = [data, ...notes]
      setNotes(nextNotes)
      setSelectedId(data.id)
      setMobileEditing(true)
    }
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    const ok = confirm('确定删除这条笔记吗？')
    if (!ok) return

    const { error } = await supabase.from('notes').delete().eq('id', id)
    if (!error) {
      const nextNotes = notes.filter((n) => n.id !== id)
      setNotes(nextNotes)
      if (selectedId === id) {
        setSelectedId(nextNotes[0]?.id ?? null)
        setMobileEditing(false)
      }
    }
  }

  useEffect(() => {
    if (!selectedId || !hasUnsavedChanges) return

    const timer = setTimeout(() => {
      handleSave()
    }, 2000)

    return () => clearTimeout(timer)
  }, [title, content, selectedId, hasUnsavedChanges])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function handleSelectNote(id: string) {
    setSelectedId(id)
    setMobileEditing(true)
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedId, title, content, lastSavedTitle, lastSavedContent])

  return (
    <main className="h-screen flex flex-col md:flex-row bg-white">
      {/* 侧栏 - 移动端：编辑时隐藏 */}
      <aside
        className={`w-full md:w-80 md:border-r border-b md:border-b-0 flex flex-col ${
          mobileEditing ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="p-4 border-b flex items-center justify-between gap-2">
          <div>
            <h1 className="font-bold text-lg">我的笔记</h1>
            <p className="text-xs text-gray-500 truncate max-w-[160px]">{userEmail}</p>
          </div>
          <button
            onClick={handleCreate}
            className="rounded-lg bg-black text-white px-3 py-2 text-sm hover:bg-gray-800 transition-colors"
          >
            新建
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {notes.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">还没有笔记，先新建一条吧。</div>
          ) : (
            notes.map((note) => (
              <button
                key={note.id}
                onClick={() => handleSelectNote(note.id)}
                className={`w-full text-left p-4 border-b hover:bg-gray-50 transition-colors ${
                  selectedId === note.id ? 'bg-gray-100' : ''
                }`}
              >
                <div className="font-medium truncate">
                  {note.title || '未命名笔记'}
                </div>
                <div className="text-sm text-gray-500 line-clamp-2 mt-1">
                  {note.content || '暂无内容'}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {new Date(note.updated_at).toLocaleString()}
                  </span>
                  <span
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(note.id)
                    }}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    删除
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            className="w-full rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
          >
            退出登录
          </button>
        </div>
      </aside>

      {/* 编辑区 - 移动端：未编辑时隐藏 */}
      <section
        className={`flex-1 flex flex-col ${
          mobileEditing ? 'flex' : 'hidden md:flex'
        }`}
      >
        {selectedId ? (
          <>
            <div className="px-4 py-3 border-b flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobileEditing(false)}
                  className="md:hidden text-gray-500 hover:text-black"
                >
                  ← 返回
                </button>
                <span className="text-sm text-gray-500">
                  {saving ? '保存中...' : hasUnsavedChanges ? '未保存' : '已保存'}
                </span>
              </div>
              <button
                onClick={handleSave}
                disabled={saving || !hasUnsavedChanges}
                className="rounded-lg bg-black text-white px-3 py-1.5 text-sm hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                保存
              </button>
            </div>

            <div className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="标题"
                className="w-full text-2xl font-bold outline-none mb-4 shrink-0"
              />

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="开始记录吧..."
                className="w-full flex-1 resize-none outline-none text-base leading-7"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            请选择或新建一条笔记
          </div>
        )}
      </section>
    </main>
  )
}

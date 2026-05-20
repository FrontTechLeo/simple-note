'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const supabase = createClient()

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setMessage(error.message)
      } else {
        setMessage('注册成功，请登录或查看邮箱确认。')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setMessage(error.message)
      } else {
        router.push('/notes')
        router.refresh()
      }
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow"
      >
        <h1 className="text-2xl font-bold mb-6 text-center">简单记事本</h1>

        <input
          type="email"
          placeholder="邮箱"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border rounded-xl px-4 py-3 mb-3 outline-none focus:ring-2 focus:ring-black/20"
        />

        <input
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full border rounded-xl px-4 py-3 mb-4 outline-none focus:ring-2 focus:ring-black/20"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-black text-white py-3 hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {loading ? '处理中...' : isSignUp ? '注册' : '登录'}
        </button>

        <button
          type="button"
          onClick={() => { setIsSignUp(!isSignUp); setMessage('') }}
          className="w-full mt-3 text-sm text-gray-600 hover:text-black transition-colors"
        >
          {isSignUp ? '已有账号？去登录' : '没有账号？去注册'}
        </button>

        {message && <p className="mt-4 text-sm text-center text-red-500">{message}</p>}
      </form>
    </main>
  )
}

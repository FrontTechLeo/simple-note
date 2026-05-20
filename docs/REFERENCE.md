下面给你一个**可直接开做**的方案：  
**前端：Next.js（App Router，适配 PC/移动端）**  
**后端：Supabase（Auth + Postgres + RLS）**

目标：做一个**简单记事本应用**，支持：
- 注册 / 登录
- 笔记列表
- 新建 / 编辑 / 删除笔记
- 自动保存
- 仅查看自己的笔记
- PC / 移动端自适应

---

# 1. 产品范围

## 1.1 MVP 功能
第一版建议只做这些：

### 用户
- 邮箱注册 / 登录
- 退出登录

### 笔记
- 创建笔记
- 编辑标题和内容
- 删除笔记
- 查看自己的笔记列表
- 按更新时间排序

### 体验
- 左侧笔记列表，右侧编辑区（PC）
- 移动端切换为上下/单栏布局
- 内容自动保存
- 空状态提示

---

# 2. 技术架构

## 2.1 前端
- Next.js 14/15
- TypeScript
- App Router
- Tailwind CSS
- `@supabase/supabase-js`
- `@supabase/ssr`

## 2.2 后端
- Supabase Auth
- Supabase Postgres
- Row Level Security
- 可选：Storage（第一版先不需要）

---

# 3. 页面结构

建议页面：

- `/login` 登录页
- `/notes` 笔记主页面
- `/notes/[id]` 可选，如果你想做路由化编辑
- `/` 重定向到 `/notes` 或 `/login`

第一版为了简单，建议：
- `/notes` 页面完成全部功能
- 左边列表，右边编辑器
- 移动端点击笔记后进入编辑状态

---

# 4. 数据库设计

只需要一张主表就够了。

## 4.1 `notes` 表

```sql
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

---

## 4.2 更新时间自动更新函数

```sql
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
```

```sql
create trigger handle_set_updated_at
before update on public.notes
for each row
execute function public.set_updated_at();
```

---

# 5. RLS 权限策略

这是重点。保证每个用户只能访问自己的笔记。

## 5.1 开启 RLS

```sql
alter table public.notes enable row level security;
```

## 5.2 查询自己的笔记

```sql
create policy "Users can view their own notes"
on public.notes
for select
to authenticated
using (auth.uid() = user_id);
```

## 5.3 新建自己的笔记

```sql
create policy "Users can insert their own notes"
on public.notes
for insert
to authenticated
with check (auth.uid() = user_id);
```

## 5.4 更新自己的笔记

```sql
create policy "Users can update their own notes"
on public.notes
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

## 5.5 删除自己的笔记

```sql
create policy "Users can delete their own notes"
on public.notes
for delete
to authenticated
using (auth.uid() = user_id);
```

---

# 6. Supabase 项目准备

## 6.1 创建项目
在 Supabase 控制台：
- 新建 project
- 进入 SQL Editor
- 执行上面的建表 + trigger + RLS SQL

## 6.2 开启邮箱登录
在：
- Authentication
- Providers
- Email

启用 Email 登录。

如果你想简单一点，可以先开：
- Email + Password

---

# 7. Next.js 项目初始化

```bash
npx create-next-app@latest notes-app
cd notes-app
npm install @supabase/supabase-js @supabase/ssr
npm install -D tailwindcss
```

如果创建项目时已经勾选 Tailwind，就不用额外配。

---

# 8. 环境变量

`.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=你的_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的_supabase_anon_key
```

---

# 9. 目录结构建议

```bash
src/
  app/
    login/
      page.tsx
    notes/
      page.tsx
    layout.tsx
    page.tsx
    globals.css
  components/
    auth-form.tsx
    note-list.tsx
    note-editor.tsx
    notes-shell.tsx
    mobile-header.tsx
  lib/
    supabase/
      client.ts
      server.ts
      middleware.ts
  types/
    note.ts
middleware.ts
```

---

# 10. Supabase 客户端封装

## 10.1 `src/lib/supabase/client.ts`

```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

---

## 10.2 `src/lib/supabase/server.ts`

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

---

# 11. 中间件保护路由

## 11.1 `middleware.ts`

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthPage = request.nextUrl.pathname.startsWith('/login')
  const isNotesPage = request.nextUrl.pathname.startsWith('/notes')

  if (!user && isNotesPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/notes', request.url))
  }

  return response
}

export const config = {
  matcher: ['/login', '/notes/:path*'],
}
```

---

# 12. 首页重定向

## 12.1 `src/app/page.tsx`

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/notes')
  redirect('/login')
}
```

---

# 13. 登录页

## 13.1 `src/app/login/page.tsx`

```tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const supabase = createClient()
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
          className="w-full border rounded-xl px-4 py-3 mb-3"
        />

        <input
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded-xl px-4 py-3 mb-4"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-black text-white py-3"
        >
          {loading ? '处理中...' : isSignUp ? '注册' : '登录'}
        </button>

        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full mt-3 text-sm text-gray-600"
        >
          {isSignUp ? '已有账号？去登录' : '没有账号？去注册'}
        </button>

        {message && <p className="mt-4 text-sm text-center text-red-500">{message}</p>}
      </form>
    </main>
  )
}
```

---

# 14. 类型定义

## 14.1 `src/types/note.ts`

```ts
export type Note = {
  id: string
  user_id: string
  title: string
  content: string
  created_at: string
  updated_at: string
}
```

---

# 15. 笔记主页面

这里采用：
- 服务端先取当前用户
- 客户端负责交互

## 15.1 `src/app/notes/page.tsx`

```tsx
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
```

---

# 16. 核心交互组件

## 16.1 `src/components/notes-shell.tsx`

```tsx
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
  const supabase = createClient()
  const router = useRouter()

  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [selectedId, setSelectedId] = useState<string | null>(initialNotes[0]?.id ?? null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId]
  )

  useEffect(() => {
    setTitle(selectedNote?.title ?? '')
    setContent(selectedNote?.content ?? '')
  }, [selectedNote])

  async function handleCreate() {
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
    }
  }

  async function handleDelete(id: string) {
    const ok = confirm('确定删除这条笔记吗？')
    if (!ok) return

    const { error } = await supabase.from('notes').delete().eq('id', id)
    if (!error) {
      const nextNotes = notes.filter((n) => n.id !== id)
      setNotes(nextNotes)
      if (selectedId === id) {
        setSelectedId(nextNotes[0]?.id ?? null)
      }
    }
  }

  useEffect(() => {
    if (!selectedId) return

    const timer = setTimeout(async () => {
      if (!selectedNote) return
      if (title === selectedNote.title && content === selectedNote.content) return

      setSaving(true)

      const { data, error } = await supabase
        .from('notes')
        .update({ title, content })
        .eq('id', selectedId)
        .select()
        .single()

      setSaving(false)

      if (!error && data) {
        setNotes((prev) =>
          [data, ...prev.filter((n) => n.id !== data.id)].sort(
            (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          )
        )
      }
    }, 800)

    return () => clearTimeout(timer)
  }, [title, content, selectedId, selectedNote, supabase])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <main className="h-screen flex flex-col md:flex-row bg-white">
      <aside className="w-full md:w-80 md:border-r border-b md:border-b-0 flex flex-col">
        <div className="p-4 border-b flex items-center justify-between gap-2">
          <div>
            <h1 className="font-bold text-lg">我的笔记</h1>
            <p className="text-xs text-gray-500 truncate max-w-[160px]">{userEmail}</p>
          </div>
          <button
            onClick={handleCreate}
            className="rounded-lg bg-black text-white px-3 py-2 text-sm"
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
                onClick={() => setSelectedId(note.id)}
                className={`w-full text-left p-4 border-b hover:bg-gray-50 ${
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
                    className="text-xs text-red-500"
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
            className="w-full rounded-lg border px-3 py-2 text-sm"
          >
            退出登录
          </button>
        </div>
      </aside>

      <section className="flex-1 flex flex-col">
        {selectedId ? (
          <>
            <div className="px-4 py-3 border-b text-sm text-gray-500">
              {saving ? '保存中...' : '已自动保存'}
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="标题"
                className="w-full text-2xl font-bold outline-none mb-4"
              />

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="开始记录吧..."
                className="w-full min-h-[60vh] resize-none outline-none text-base leading-7"
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
```

---

# 17. 一个关键问题：插入时 `user_id` 怎么办？

因为 `notes.user_id` 是 `not null`，而上面 `insert` 时没有传。  
有两种方案：

## 方案 A：前端插入时显式传 `user_id`
需要先拿当前用户 id。

## 方案 B：数据库自动填充 `user_id`
**更推荐**，更简单。

你可以给 `user_id` 设置默认值：

```sql
alter table public.notes alter column user_id set default auth.uid();
```

这样前端插入时就不用传 `user_id` 了。

---

# 18. 最终推荐 SQL 一次性版本

你可以直接跑下面这份：

```sql
create extension if not exists pgcrypto;

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default '',
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger handle_set_updated_at
before update on public.notes
for each row
execute function public.set_updated_at();

alter table public.notes enable row level security;

create policy "Users can view their own notes"
on public.notes
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own notes"
on public.notes
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own notes"
on public.notes
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own notes"
on public.notes
for delete
to authenticated
using (auth.uid() = user_id);
```

---

# 19. 响应式设计建议

这个应用很适合做成：

## PC
- 左侧：笔记列表
- 右侧：编辑器

## 移动端
- 顶部：标题栏 + 新建按钮
- 中间：笔记列表
- 点击笔记进入编辑视图
- 编辑页顶部有返回按钮

你现在这版组件已经能基本自适应，但如果你想更像原生 App，可以在移动端拆成两个页面：
- `/notes`
- `/notes/[id]`

这样体验更好。

---

# 20. 建议的第二版功能

等第一版跑起来后，可以加：

- 搜索笔记
- 标签
- 收藏 / 置顶
- 回收站
- Markdown 编辑
- 富文本编辑
- 深色模式
- 离线缓存
- 多端实时同步
- 导出 txt / markdown

---

# 21. 部署方案

## 前端部署
推荐：
- Vercel

## 后端
- Supabase 云平台

部署时把环境变量配置到 Vercel：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

# 22. 你现在最适合的开发顺序

建议你按这个顺序做：

### 第一步
创建 Supabase 项目，执行 SQL

### 第二步
创建 Next.js 项目，配置环境变量

### 第三步
先做登录页

### 第四步
做 `/notes` 页面，先实现：
- 列表展示
- 新建
- 编辑
- 删除

### 第五步
优化移动端样式

### 第六步
部署到 Vercel

---

# 23. 我给你的结论

**这个“简单记事本应用”非常适合用 Next.js + Supabase 来实现。**  
而且这是一个非常好的练手项目，难度适中，功能完整，能学到：

- Next.js App Router
- Supabase Auth
- PostgreSQL
- RLS 权限控制
- 响应式布局
- 前后端联动


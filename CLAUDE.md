# CLAUDE.md — 简单记事本项目

@AGENTS.md

## 项目概述

基于 Next.js 16 + Supabase 的在线记事本应用，支持邮箱登录、笔记 CRUD、自动保存、手动保存、PC/移动端自适应布局。

## 技术栈

- **框架**: Next.js 16（App Router）
- **语言**: TypeScript
- **样式**: Tailwind CSS 4
- **后端**: Supabase（Auth + Postgres + RLS）
- **包管理**: npm（官方源，见 `.npmrc`）

## 关键约定

### Next.js 16 注意事项

- 本项目使用 Next.js 16，存在破坏性变更，编写代码前查阅 `node_modules/next/dist/docs/` 下对应文档
- **middleware 已弃用**，路由保护使用 `src/proxy.ts`（函数名 `proxy`，非 `middleware`）
- Supabase 客户端不在组件/模块顶层创建，而是在函数内部延迟初始化，避免构建时因空环境变量报错

### Supabase

- 浏览器端客户端: `@/lib/supabase/client` → `createClient()`
- 服务端客户端: `@/lib/supabase/server` → `createClient()`
- 数据库建表和 RLS 语句在项目根目录 `supabase-setup.sql`

### 响应式布局

- PC: 左侧笔记列表（`w-80`）+ 右侧编辑区
- 移动端: 通过 `mobileEditing` 状态切换列表/编辑视图，编辑区顶部有"← 返回"按钮

### 保存机制

- 自动保存: 2 秒防抖，仅在有未保存变更时触发
- 手动保存: 编辑区右上角"保存"按钮
- 快捷键保存: `Ctrl+Enter`（避免与浏览器 `Ctrl+S` 等冲突）
- 保存状态追踪: `lastSavedTitle` / `lastSavedContent` 精确比对已保存内容

## 目录结构

```
src/
  app/
    login/page.tsx          登录/注册页（'use client'）
    notes/page.tsx          笔记主页（服务端获取数据，传给客户端组件）
    page.tsx                首页重定向
    layout.tsx              根布局（lang="zh-CN"）
    globals.css             全局样式
  components/
    notes-shell.tsx         核心交互组件（列表+编辑器+移动端切换）
  lib/supabase/
    client.ts               浏览器端 Supabase 客户端
    server.ts               服务端 Supabase 客户端
  types/
    note.ts                 Note 类型定义
  proxy.ts                  路由保护（认证拦截，未登录→/login，已登录→/notes）
supabase-setup.sql          数据库初始化 SQL
```

## 常用命令

```bash
npm run dev       # 启动开发服务器
npm run build     # 生产构建
npm run start     # 启动生产服务器
npm run lint      # ESLint 检查
```

## 环境变量

`.env.local` 中配置：

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase 项目 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase Anon Key

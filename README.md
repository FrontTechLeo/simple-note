# 简单记事本

基于 Next.js + Supabase 的在线记事本应用，支持 PC 和移动端自适应。

## 功能

- 邮箱注册 / 登录
- 创建、编辑、删除笔记
- 自动保存（2 秒防抖）
- 手动保存按钮 + `Ctrl+Enter` 快捷键
- 按更新时间排序
- 用户数据隔离（RLS 行级安全）
- PC 左右分栏 / 移动端列表与编辑切换

## 技术栈

- Next.js 16（App Router）
- TypeScript
- Tailwind CSS 4
- Supabase（Auth + Postgres + RLS）

## 项目结构

```
src/
  app/
    login/page.tsx         登录/注册页
    notes/page.tsx         笔记主页
    page.tsx               首页（自动重定向）
    layout.tsx             根布局
    globals.css            全局样式
  components/
    notes-shell.tsx        笔记列表 + 编辑器
  lib/supabase/
    client.ts              浏览器端 Supabase 客户端
    server.ts              服务端 Supabase 客户端
  types/
    note.ts                Note 类型定义
  proxy.ts                 路由保护（认证拦截）
supabase-setup.sql         数据库建表 + RLS 语句
```

## 快速开始

### 1. 创建 Supabase 项目

在 [Supabase 控制台](https://supabase.com) 新建项目，进入 SQL Editor 执行 `supabase-setup.sql`。

同时在 **Authentication → Providers → Email** 中启用邮箱登录。

### 2. 配置环境变量

复制并填写 `.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=你的_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的_supabase_anon_key
```

### 3. 安装依赖并启动

```bash
npm install
npm run dev
```

浏览器打开 http://localhost:3000 即可使用。

## 部署

推荐部署到 [Vercel](https://vercel.com)，在项目设置中添加上述环境变量即可。

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Enter` | 保存当前笔记 |

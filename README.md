# 🪄 ResuMagic（简历魔法师）

> 面向海投求职者的 AI 简历匹配工作台。输入一段大白话经历 + 一个岗位 JD，大模型自动生成 STAR 法则专业简历描述，带三色关键词高亮，支持五种写作风格一键切换对比。

## ✨ 功能

- **🗂️ 职位管理舱** — 按岗位分类管理多个 JD 卡片，全部数据本地浏览器持久化，无需登录
- **🧙 AI 动态匹配** — 调用 DeepSeek 大模型，将流水账经历润色为 STAR 格式专业 Bullet Points
- **⏳ 流式打字机** — 生成过程逐字吐出，不等结果
- **🎨 三色高亮** — 🟢 绿（JD关键词）🔵 蓝（动作动词）🟠 橙（量化结果）
- **🔄 五种风格切换** — 综合版 / 技术实现 / 业务结果 / 管理协作 / 创新突破，一键多版本对比

## 🚀 本地运行

```bash
# 1. 安装依赖
npm install

# 2. 配置 API Key
cp .env.local.example .env.local
# 打开 .env.local，将 AI_API_KEY 替换为你的 DeepSeek API Key
# 获取 Key：https://platform.deepseek.com

# 3. 启动
npm run dev
```

浏览器打开 `http://localhost:3000`。

## 🛠️ 技术栈

- **框架：** Next.js (App Router) + TypeScript
- **样式：** Tailwind CSS + Shadcn UI
- **大模型：** DeepSeek API（兼容所有 OpenAI 格式的国产模型：智谱、Kimi 等）
- **存储：** localStorage（无需后端数据库）

## ☁️ 一键部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. 点击上方按钮 → 导入项目
2. 在 Vercel 环境变量中设置 `AI_API_KEY`、`AI_BASE_URL`、`AI_MODEL`
3. 部署完成，获得公网链接

## ⚠️ 注意

- `.env.local` 已加入 `.gitignore`，不会上传到 Git
- 部署到公网后，API 费用由你的 DeepSeek 账户承担（一次匹配约几分钱）
- 数据存储在用户各自的浏览器中，不会上传到服务器

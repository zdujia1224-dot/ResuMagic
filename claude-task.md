# ResuMagic Pro 重构开发任务（Claude Code 执行版）

你是资深全栈工程师，请基于当前项目进行**增量式重构（Incremental Refactor）**，而不是推翻重做。

目标是在保留当前网站风格的前提下，将项目升级为：

> **“个人经历数据库 + 动态简历匹配与组装工作台”**

请严格遵守以下要求。

---

# 一、严格限制（非常重要）

## UI / 风格限制

1. **禁止推翻现有 UI。**
2. **保持当前视觉风格完全一致：**

   * spacing
   * padding
   * color
   * typography
   * card 风格
   * 三栏布局风格
3. **左栏禁止重构。**
   仅允许增加状态管理与数据联动。
4. 优先复用现有组件。
5. 不允许更换组件库。
6. 不允许大规模修改 Tailwind class。
7. 不允许擅自 redesign。

目标是：

> **像是原网站自然升级了功能，而不是重新做了一个网站。**

---

## 工程限制

1. 不允许删除现有 API route。
2. 不允许删除现有 stream 流式逻辑。
3. 优先复用已有 hooks / utils / state。
4. 尽量减少对旧代码影响。
5. 所有开发采用**增量式开发**。

禁止一次性重构全部代码。

---

# 二、项目定位

## 产品定位

ResuMagic Pro 是一个：

> **面向海投求职者的“个人经历数据库 + 动态简历匹配与组装工作台”**

解决的问题：

求职者在海投时，需要反复：

* 修改简历
* 删除经历
* 拼接项目
* 对不同岗位调整内容

目标是：

用户维护一个长期经历库。

之后：

> 导入岗位 JD → 勾选相关经历 → AI 动态生成针对性 STAR bullet points

---

# 三、整体布局（保持当前风格）

采用：

> **标准三栏布局（保持当前样式）**

---

## 左栏：职位管理舱（Job Navigator）

保持当前 UI。

功能：

### 分类管理

支持：

* 创建分类
* 删除分类
* 重命名分类

例如：

* 产品经理
* 数据分析师
* 商业分析

---

### JD 卡片管理

每个分类下：

支持：

* 添加 JD 卡片
* 删除
* 编辑

例如：

> 字节跳动 - 数据分析实习生

字段：

```ts
{
  id: string;
  category: string;
  company: string;
  position: string;
  jdText: string;
}
```

---

### 联动逻辑

点击左栏某个 JD：

自动：

1. 加载中栏 JD 内容
2. 加载该岗位的 selectedExpIds
3. 加载历史 outputs
4. 加载 selectedStyle

---

## 中栏：JD + 经历库工作台

分上下结构。

---

### 上半部分：岗位 JD 输入区

一个大文本框。

要求：

* 支持手动编辑
* 自动保存
* 与左栏 JD 联动

---

### 写作风格 Tabs

保留原有 tabs：

* 综合版
* 技术实现
* 业务结果
* 管理协作
* 创新突破

切换后：

更新 selectedStyle。

---

### 下半部分：经历库

顶部：

按钮：

> * 新增经历

点击：

打开 Dialog Modal。

字段：

```ts
interface Experience {
  id: string;
  title: string;
  date: string;
  rawContent: string;
}
```

例如：

title：

> 字节跳动运营实习

date：

> 2025.07-2025.10

rawContent：

> 大白话流水账经历

---

### 经历卡片列表

显示：

所有经历。

每个卡片：

左侧带 checkbox。

---

### 动态联动逻辑

用户勾选经历：

右栏立即出现对应卡片。

但：

**此时不调用 AI。**

右栏显示：

> 等待 AI 匹配

取消勾选：

立即移除对应卡片。

---

### 主按钮

中栏底部：

按钮：

> AI 针对性动态匹配

点击后：

开始调用模型。

---

# 四、右栏：微型简历画布（Resume Canvas）

### 核心形态

不是聊天输出。

而是：

> 微型简历排版区

按经历拆分区块。

示例：

**字节跳动运营实习**
(2025.07 - 2025.10)

• bullet point 1

• bullet point 2

---

### 动态监听

监听：

selectedExpIds

勾选即显示卡片。

未生成：

```txt
等待 AI 匹配
```

---

### 每个卡片状态

必须支持：

```ts
type GenerateStatus =
  | "idle"
  | "loading"
  | "success"
  | "error";
```

生成时：

显示 loading。

支持流式更新。

---

### 一键复制

右上角：

按钮：

> 一键复制

要求：

自动移除 HTML 标签。

复制纯文本 bullet points。

---

# 五、三色高亮规则（HTML）

模型返回 HTML。

高亮规则：

### JD 关键词

绿色：

```html
<span class="text-green-600 font-medium">
关键词
</span>
```

---

### Action 动词

蓝色：

```html
<span class="text-blue-600 font-medium">
主导
</span>
```

---

### Result 数字

橙色：

```html
<span class="text-orange-600 font-medium">
提升15%
</span>
```

---

# 六、安全要求（必须）

模型返回 HTML 后：

**必须 sanitize。**

使用：

```ts
DOMPurify
```

禁止：

```tsx
dangerouslySetInnerHTML
```

直接渲染未处理内容。

---

# 七、本地存储（localStorage）

项目是纯前端。

使用 localStorage。

统一 schema：

```ts
interface AppStorage {
  version: "v2";
  experiences: Experience[];
  jobCards: JobCard[];
}
```

---

### JobCard

```ts
interface JobCard {
  id: string;
  category: string;
  company: string;
  position: string;
  jdText: string;

  selectedExpIds: string[];

  outputs: {
    [experienceId: string]: {
      [style: string]: string;
    };
  };

  selectedStyle: string;
}
```

---

# 八、模型调用逻辑

点击：

> AI 针对性动态匹配

后：

遍历 selectedExpIds。

## MVP 阶段

严格：

> 串行调用

不要并发。

顺序：

按用户勾选顺序。

---

### 缓存逻辑

如果：

experienceId + style

已有结果：

直接使用缓存。

不要重复请求。

---

### Stream

保留现有 stream 逻辑。

实现：

> 打字机流式更新

每个卡片独立 loading 状态。

---

# 九、系统 Prompt（严格使用）

你是一位拥有10年经验的大厂资深 HR 兼简历包装专家。

你的任务是将用户的【特定单项经历】，根据【目标岗位JD】和用户指定的【写作风格】进行动态匹配和深度重写，输出可以直接写进简历的 Bullet Points。

【当前上下文】

* 目标岗位JD：${currentJD}
* 用户指定的写作风格：${selectedStyle}
* 当前要改写的原始经历：${currentExpContent}

【硬性包装规则】

1. 必须严格遵循 STAR 法则。

2. 遣词造句专业化、大厂化、干练。

3. 精准命中 JD 核心关键词。

4. 避免 AI 味。

5. 不夸大。

6. 如果原始经历没有量化结果：

禁止编造精确数字。

请使用：

[提升X%]

[影响XX用户]

[缩短XX时间]

作为占位符。

7. 风格对齐：

技术实现：

侧重技术架构与工具链。

业务结果：

侧重 ROI、GMV、效率提升。

管理协作：

侧重沟通协调与跨团队。

创新突破：

侧重增长实验与突破。

【严格输出规则】

你只能返回：

多个 `<li>` HTML 标签。

禁止输出：

* Markdown
* ```html
  ```
* `<ul>`
* 开场白
* JSON
* 解释说明

错误示例：

以下是优化结果：

<li>...</li>

正确示例：

<li>...</li>
<li>...</li>

【高亮规则】

JD关键词：

```html
<span class="text-green-600 font-medium">
关键词
</span>
```

Action 动词：

```html
<span class="text-blue-600 font-medium">
主导
</span>
```

量化结果：

```html
<span class="text-orange-600 font-medium">
提升15%
</span>
```

---

# 十、开发阶段（严格按顺序）

## Phase 1：备份 + UI 骨架

1. 备份：

`app/page.tsx`

→

`app/page-v1-backup.tsx`

2. 重构：

仅中栏 + 右栏。

左栏只允许联动。

3. 使用 mock data。

4. 完成：

* JD 输入区
* tabs
* 经历列表 checkbox
* 勾选联动
* 右栏空白卡片

不要接模型。

完成后：

停止开发。

输出：

> Phase 1 finished

---

## Phase 2：经历库 + localStorage

实现：

* 新增经历 dialog
* CRUD
* localStorage

完成：

停止。

输出：

> Phase 2 finished

---

## Phase 3：模型与流式生成

迁移：

旧 API route

旧 stream logic

实现：

* 串行生成
* loading 状态
* 流式更新
* sanitize
* 缓存

完成：

停止。

输出：

> Phase 3 finished

---

开始执行。

先做：

> Phase 1

严格禁止跨阶段开发。

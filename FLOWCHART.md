# 🧙 ResuMagic — AI 简历魔法师 产品流程图

> **让 AI 读懂 JD，把你的大白话经历一键重写成 STAR 法则专业简历。**

---

## 📌 用户操作全流程（7 步，从大白话到成品简历）

```mermaid
flowchart TB
    subgraph LEFT["🗂️ 职位管理舱（左栏）"]
        A["📌 步骤 1<br>创建岗位分类<br>粘贴目标 JD"] --> B["🏢 分类：产品经理<br>├ 字节跳动 · 高级PM<br>├ 腾讯 · 微信生态PM<br>🏢 分类：数据分析<br>├ 阿里巴巴 · 数据分析师"]
    end

    subgraph MID["⚙️ 经历匹配工作台（中栏）"]
        C["📝 步骤 2<br>录入经历库<br>（大白话流水账）"] --> D["🗂️ 经历库<br>├ 字节运营实习<br>├ 阿里数据分析实习<br>├ 腾讯产品助理实习<br>└ 美团商家运营项目"]
        D --> E["🎯 步骤 3<br>勾选相关经历<br>选择写作风格"]
        E --> F{"5 种写作风格"}
        F --> F1["🎯 综合版"]
        F --> F2["🛠️ 技术实现"]
        F --> F3["📈 业务结果"]
        F --> F4["👥 管理协作"]
        F --> F5["💡 创新突破"]
        F1 & F2 & F3 & F4 & F5 --> G["✨ 步骤 4<br>点击「AI 针对性匹配」<br>流式生成开始"]
    end

    subgraph RIGHT["🎨 简历画布（右栏）"]
        H["✅ 步骤 5<br>实时预览生成结果<br>三色智能高亮"]
        H --> H1["🟢 绿色 = JD 关键词命中"]
        H --> H2["🔵 蓝色 = 强力 Action 动词"]
        H --> H3["🟠 橙色 = 量化 Result 数据"]
        H1 & H2 & H3 --> I["📋 步骤 6<br>一键复制全部"]
    end

    subgraph LOOP["🔄 海投循环"]
        J["🚀 步骤 7<br>切换下一个 JD 卡片<br>同一段经历，重新生成"]
    end

    A --> C
    B --> E
    G --> H
    I --> J
    J -.-> E

    style A fill:#3b82f6,color:#fff
    style C fill:#8b5cf6,color:#fff
    style E fill:#ec4899,color:#fff
    style G fill:#f59e0b,color:#1a1a2e
    style H fill:#10b981,color:#fff
    style I fill:#6366f1,color:#fff
    style J fill:#ef4444,color:#fff
```

---

## 🧠 AI 引擎内部流程

```mermaid
flowchart LR
    subgraph INPUT["📥 输入"]
        A1["📋 用户原始经历<br>（大白话流水账）"]
        A2["📄 目标岗位 JD"]
        A3["🎨 选定写作风格"]
    end

    subgraph ENGINE["🤖 AI 大模型引擎 (DeepSeek / GPT / 任意)"]
        B1["🔍 提取 JD 关键词"]
        B2["📐 套用 STAR 法则框架"]
        B3["🎯 注入风格化指令"]
        B4["📊 强制量化 Result"]
    end

    subgraph OUTPUT["📤 流式输出"]
        C1["⚡ SSE 逐字流式传输"]
        C2["<span style='color:green'>🟢 JD关键词高亮</span>"]
        C3["<span style='color:blue'>🔵 Action动词高亮</span>"]
        C4["<span style='color:orange'>🟠 量化结果高亮</span>"]
    end

    A1 & A2 & A3 --> B1
    B1 --> B2 --> B3 --> B4
    B4 --> C1 --> C2 & C3 & C4
```

---

## 💡 核心卖点一图流

```mermaid
mindmap
  root((ResuMagic<br>AI简历魔法师))
    智能匹配
      STAR法则自动重写
      JD关键词精准命中
      大厂HR级Prompt
    高效海投
      一次录入经历
      无限JD复配
      5种风格任意切换
    专业输出
      三色高亮渲染
      量化结果强制
      复制即是成品
    隐私安全
      数据全本地存储
      API Key自控
      无服务器上传
    大模型兼容
      DeepSeek
      OpenAI
      智谱/通义/Kimi
```

---

## 🎯 一句话总结

> **ResuMagic = 你的私人简历参谋部。把经历丢进去，AI 帮你对齐 JD、重构措辞、量化结果、三色高亮——复制粘贴就是一份专为该岗位定制的 STAR 简历。**

🌐 立即体验：[resu-magic-d3fp.vercel.app](https://resu-magic-d3fp.vercel.app)
📄 流程图页面：[resu-magic-d3fp.vercel.app/flowchart.html](https://resu-magic-d3fp.vercel.app/flowchart.html)

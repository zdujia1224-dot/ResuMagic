"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Sparkles,
  Copy,
  Briefcase,
  FileText,
  Star,
} from "lucide-react";

/* ============================================================
   类型定义（Phase 2 会抽到独立文件）
   ============================================================ */
interface JDCard {
  id: string;
  company: string;
  position: string;
  jdContent: string;
}

interface Category {
  id: string;
  name: string;
  jdCards: JDCard[];
}

/* ============================================================
   占位数据（Phase 2 会从 localStorage 读写）
   ============================================================ */
const DEMO_CATEGORIES: Category[] = [
  {
    id: "cat-1",
    name: "产品经理",
    jdCards: [
      {
        id: "jd-1",
        company: "字节跳动",
        position: "高级产品经理",
        jdContent:
          "负责用户增长方向，要求具备数据分析能力，熟悉 A/B 测试，能独立主导跨部门项目…",
      },
      {
        id: "jd-2",
        company: "腾讯",
        position: "产品经理（微信生态）",
        jdContent:
          "负责微信小程序生态的产品规划与落地，要求有 B 端 SaaS 经验，擅长用户研究…",
      },
    ],
  },
  {
    id: "cat-2",
    name: "数据分析师",
    jdCards: [
      {
        id: "jd-3",
        company: "阿里巴巴",
        position: "数据分析师",
        jdContent:
          "负责业务数据建模与可视化，精通 SQL/Python，能独立完成埋点设计与用户画像分析…",
      },
    ],
  },
  {
    id: "cat-3",
    name: "运营经理",
    jdCards: [],
  },
];

export default function Home() {
  /* ---- 交互状态 ---- */
  const [categories] = useState<Category[]>(DEMO_CATEGORIES);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(
    new Set(["cat-1"])
  );
  const [selectedJD, setSelectedJD] = useState<JDCard | null>(null);
  const [rawExperience, setRawExperience] = useState("");
  const [jdText, setJdText] = useState("");

  /* ---- 分类折叠/展开 ---- */
  const toggleCategory = (catId: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      next.has(catId) ? next.delete(catId) : next.add(catId);
      return next;
    });
  };

  /* ---- 点击 JD 卡片 ---- */
  const handleSelectJD = (card: JDCard) => {
    setSelectedJD(card);
    setJdText(card.jdContent);
  };

  /* ============================================================
     UI 渲染
     ============================================================ */
  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F5F7]">
      {/* ==================== 左栏：职位管理舱 ==================== */}
      <aside className="w-72 flex flex-col bg-white border-r border-border shrink-0">
        {/* 左栏 Header */}
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground tracking-tight">
              职位管理舱
            </h2>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="新建分类">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <Separator />

        {/* 分类列表 */}
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-1">
            {categories.map((cat) => {
              const isExpanded = expandedCats.has(cat.id);
              return (
                <div key={cat.id}>
                  {/* 分类名 */}
                  <button
                    onClick={() => toggleCategory(cat.id)}
                    className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-sm text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                    {cat.name}
                    <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0 h-5">
                      {cat.jdCards.length}
                    </Badge>
                  </button>

                  {/* JD 卡片列表 */}
                  {isExpanded && (
                    <div className="ml-3 mt-0.5 space-y-1">
                      {cat.jdCards.length === 0 ? (
                        <p className="text-xs text-muted-foreground px-2 py-3 italic">
                          暂无 JD，点击 + 添加
                        </p>
                      ) : (
                        cat.jdCards.map((card) => {
                          const isActive = selectedJD?.id === card.id;
                          return (
                            <button
                              key={card.id}
                              onClick={() => handleSelectJD(card)}
                              className={`w-full text-left px-3 py-2 rounded-sm text-xs transition-colors border ${
                                isActive
                                  ? "bg-primary/5 border-primary/30 text-foreground"
                                  : "bg-white border-transparent hover:bg-muted text-muted-foreground"
                              }`}
                            >
                              <p className="font-medium text-foreground truncate">
                                {card.company}
                              </p>
                              <p className="truncate mt-0.5">{card.position}</p>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* 左栏底部：新建分类输入（Phase 2 功能入口） */}
        <Separator />
        <div className="p-3">
          <div className="flex gap-2">
            <Input
              placeholder="新分类名…"
              className="h-8 text-xs"
              disabled
            />
            <Button size="sm" className="h-8 text-xs shrink-0 bg-primary" disabled>
              新建
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 px-0.5">
            Phase 2 启用 · 当前展示占位数据
          </p>
        </div>
      </aside>

      {/* ==================== 中栏：魔法匹配输入区 ==================== */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* 中栏 Header */}
        <div className="px-6 py-4 flex items-center gap-2 bg-white border-b border-border">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground tracking-tight">
            魔法匹配
          </h2>
        </div>

        {/* 输入区域 */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* 原始经历 */}
            <Card className="shadow-none border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  原始经历
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  把你的流水账、旧简历、大白话经历直接丢进来
                </p>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="例：我在上家公司做活动运营，负责策划线上活动，拉新用户，然后也做一些数据分析，看活动效果怎么样…"
                  className="min-h-[180px] resize-y text-sm leading-relaxed"
                  value={rawExperience}
                  onChange={(e) => setRawExperience(e.target.value)}
                />
              </CardContent>
            </Card>

            {/* 目标岗位 JD */}
            <Card className="shadow-none border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-muted-foreground" />
                  目标岗位 JD
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {selectedJD
                    ? `已关联：${selectedJD.company} - ${selectedJD.position}`
                    : "从左侧选择职位卡片，或直接粘贴 JD 内容"}
                </p>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="粘贴目标岗位的职位描述（JD）…"
                  className="min-h-[180px] resize-y text-sm leading-relaxed"
                  value={jdText}
                  onChange={(e) => {
                    setJdText(e.target.value);
                    // 手动修改时解除关联
                    if (selectedJD && e.target.value !== selectedJD.jdContent) {
                      setSelectedJD(null);
                    }
                  }}
                />
              </CardContent>
            </Card>

            {/* AI 按钮 */}
            <div className="flex justify-center pt-2">
              <Button
                size="lg"
                className="px-10 text-sm font-semibold tracking-wide bg-primary hover:bg-primary/90 transition-colors"
                disabled
              >
                <Sparkles className="w-4 h-4 mr-2" />
                AI 一键动态匹配
              </Button>
            </div>
            <p className="text-center text-[10px] text-muted-foreground">
              Phase 3 接通大模型 API · 当前按钮为静态占位
            </p>
          </div>
        </ScrollArea>
      </main>

      {/* ==================== 右栏：STAR 闪耀输出区 ==================== */}
      <aside className="flex-1 flex flex-col bg-white border-l border-border min-w-0">
        {/* 右栏 Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground tracking-tight">
              STAR 闪耀输出
            </h2>
          </div>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" disabled>
            <Copy className="w-3.5 h-3.5" />
            一键复制
          </Button>
        </div>

        {/* 输出内容区 */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-4">
            {/* 预览示例 */}
            <div className="rounded-sm border border-border bg-[#F4F5F7]/50 p-5 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                生成预览
              </p>

              {/* 示例 Bullet Point 1 */}
              <div className="text-sm leading-relaxed">
                <span className="text-blue-600 font-medium">主导</span>
                了用户增长项目，利用{" "}
                <span className="text-green-600 font-medium">
                  Python 进行数据分析
                </span>{" "}
                洞察用户流失漏斗，
                <span className="text-blue-600 font-medium">优化</span>
                了注册留存策略，最终使次日留存率
                <span className="text-orange-600 font-medium">提升了 15%</span>。
              </div>

              {/* 示例 Bullet Point 2 */}
              <div className="text-sm leading-relaxed">
                <span className="text-blue-600 font-medium">搭建</span>
                了公司级的{" "}
                <span className="text-green-600 font-medium">
                  埋点设计与用户画像
                </span>{" "}
                体系，
                <span className="text-blue-600 font-medium">推动</span>
                数据驱动决策落地，覆盖
                <span className="text-orange-600 font-medium">3 条核心业务线</span>
                ，数据查询效率
                <span className="text-orange-600 font-medium">提升 40%</span>。
              </div>

              {/* 示例 Bullet Point 3 */}
              <div className="text-sm leading-relaxed">
                <span className="text-blue-600 font-medium">策划</span>
                并
                <span className="text-blue-600 font-medium">执行</span>
                了{" "}
                <span className="text-green-600 font-medium">
                  多场线上线下联动活动
                </span>
                ，整合渠道资源，实现单场活动新增用户
                <span className="text-orange-600 font-medium">8.2 万</span>，
                ROI
                <span className="text-orange-600 font-medium">达到 3.5 倍</span>。
              </div>
            </div>

            {/* 高亮图例 */}
            <Card className="shadow-none border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  高亮规则
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="inline-block w-3 h-3 rounded-sm bg-green-100 border border-green-300" />
                  <span className="text-green-700 font-medium">绿色高亮</span>
                  <span className="text-muted-foreground">
                    — 命中 JD 的关键词
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="inline-block w-3 h-3 rounded-sm bg-blue-100 border border-blue-300" />
                  <span className="text-blue-700 font-medium">蓝色高亮</span>
                  <span className="text-muted-foreground">
                    — 强有力的 Action 动词
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="inline-block w-3 h-3 rounded-sm bg-orange-100 border border-orange-300" />
                  <span className="text-orange-700 font-medium">橙色高亮</span>
                  <span className="text-muted-foreground">
                    — 量化的 Result 结果/数字
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </aside>
    </div>
  );
}

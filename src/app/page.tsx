"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  Pencil,
  Trash2,
  Check,
  X,
  GripVertical,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { STYLE_META, type StyleMeta } from "@/lib/prompt";
import type { JDCard } from "@/lib/types";

/* ---- 版本数据结构 ---- */
interface OutputVersion {
  id: string;
  styleKey: string;
  label: string;
  html: string;
}

let _versionCounter = 0;
function nextVersionId() {
  _versionCounter++;
  return `v${Date.now()}-${_versionCounter}`;
}

export default function Home() {
  /* ---- 数据层 ---- */
  const {
    categories,
    mounted,
    addCategory,
    renameCategory,
    deleteCategory,
    addJDCard,
    updateJDCard,
    deleteJDCard,
  } = useWorkspace();

  /* ---- 交互状态 ---- */
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [selectedJD, setSelectedJD] = useState<JDCard | null>(null);
  const [rawExperience, setRawExperience] = useState("");
  const [jdText, setJdText] = useState("");

  /* ---- AI 生成状态 ---- */
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* ---- 多版本 + 风格 ---- */
  const [selectedStyle, setSelectedStyle] = useState<string>("balanced");
  const [versions, setVersions] = useState<OutputVersion[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);

  /* ---- 当前活跃版本的输出 ---- */
  const activeVersion = versions.find((v) => v.id === activeVersionId);
  const aiOutput = activeVersion?.html || "";

  /* ---- 新建分类 ---- */
  const [newCatName, setNewCatName] = useState("");

  /* ---- 重命名分类 ---- */
  const [renamingCatId, setRenamingCatId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  /* ---- 新建 JD 卡片 ---- */
  const [addingJDCatId, setAddingJDCatId] = useState<string | null>(null);
  const [newJD, setNewJD] = useState({ company: "", position: "", jdContent: "" });

  /* ---- 编辑 JD 卡片 ---- */
  const [editingJD, setEditingJD] = useState<{
    catId: string;
    card: JDCard;
  } | null>(null);
  const [editJDValues, setEditJDValues] = useState({
    company: "",
    position: "",
    jdContent: "",
  });

  /* ---- 挂载后自动展开第一个分类 ---- */
  useEffect(() => {
    if (mounted && categories.length > 0) {
      setExpandedCats((prev) => {
        if (prev.size === 0) return new Set([categories[0].id]);
        return prev;
      });
    }
  }, [mounted, categories]);

  /* ---- 重命名：自动聚焦 ---- */
  useEffect(() => {
    if (renamingCatId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingCatId]);

  /* ---- AI 输出变化时自动滚动到底部 ---- */
  useEffect(() => {
    if (aiOutput && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [aiOutput]);

  /* ======== 分类操作 ======== */

  const handleAddCategory = () => {
    addCategory(newCatName);
    setNewCatName("");
  };

  const handleStartRename = (catId: string, currentName: string) => {
    setRenamingCatId(catId);
    setRenameValue(currentName);
  };

  const handleConfirmRename = (catId: string) => {
    renameCategory(catId, renameValue);
    setRenamingCatId(null);
    setRenameValue("");
  };

  const handleCancelRename = () => {
    setRenamingCatId(null);
    setRenameValue("");
  };

  const handleDeleteCategory = (catId: string) => {
    if (
      selectedJD &&
      categories
        .find((c) => c.id === catId)
        ?.jdCards.find((j) => j.id === selectedJD.id)
    ) {
      setSelectedJD(null);
      setJdText("");
    }
    deleteCategory(catId);
  };

  /* ======== JD 卡片操作 ======== */

  const handleSelectJD = (card: JDCard) => {
    setSelectedJD(card);
    setJdText(card.jdContent);
  };

  const handleAddJD = (catId: string) => {
    addJDCard(catId, newJD);
    setAddingJDCatId(null);
    setNewJD({ company: "", position: "", jdContent: "" });
  };

  const handleStartEditJD = (catId: string, card: JDCard) => {
    setEditingJD({ catId, card });
    setEditJDValues({
      company: card.company,
      position: card.position,
      jdContent: card.jdContent,
    });
  };

  const handleConfirmEditJD = () => {
    if (!editingJD) return;
    updateJDCard(editingJD.catId, editingJD.card.id, editJDValues);
    if (selectedJD?.id === editingJD.card.id) {
      setSelectedJD({ ...editingJD.card, ...editJDValues });
      setJdText(editJDValues.jdContent);
    }
    setEditingJD(null);
  };

  const handleCancelEditJD = () => {
    setEditingJD(null);
  };

  const handleDeleteJD = (catId: string, cardId: string) => {
    if (selectedJD?.id === cardId) {
      setSelectedJD(null);
      setJdText("");
    }
    deleteJDCard(catId, cardId);
  };

  /* ======== AI 一键动态匹配 ======== */

  const handleGenerate = useCallback(async () => {
    if (!rawExperience.trim() || !jdText.trim()) return;

    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setGenerating(true);
    setAiError(null);

    // 为这个新版本建立占位入口
    const styleMeta = STYLE_META.find((s) => s.key === selectedStyle) || STYLE_META[0];
    const versionId = nextVersionId();
    const newVersion: OutputVersion = {
      id: versionId,
      styleKey: selectedStyle,
      label: `${styleMeta.icon} ${styleMeta.label}`,
      html: "",
    };
    setVersions((prev) => [...prev, newVersion]);
    setActiveVersionId(versionId);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experience: rawExperience,
          jd: jdText,
          style: selectedStyle,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || `请求失败 (${response.status})`);
      }

      if (!response.body) {
        throw new Error("浏览器不支持流式读取");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;

          const dataStr = trimmed.slice(5).trim();
          if (dataStr === "[DONE]") continue;

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              setVersions((prev) =>
                prev.map((v) =>
                  v.id === versionId ? { ...v, html: v.html + content } : v
                )
              );
            }
          } catch (e) {
            if ((e as Error).message !== "Unexpected end of JSON input") {
              throw e;
            }
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // 删除已创建的空版本
        setVersions((prev) => {
          const filtered = prev.filter((v) => v.id !== versionId);
          if (activeVersionId === versionId) {
            const last = filtered[filtered.length - 1];
            setActiveVersionId(last?.id || null);
          }
          return filtered;
        });
        return;
      }
      const message =
        err instanceof Error ? err.message : "未知错误，请稍后重试";
      setAiError(message);
    } finally {
      setGenerating(false);
      abortRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawExperience, jdText, selectedStyle, activeVersionId]);

  /* ======== 一键复制 ======== */

  const handleCopy = useCallback(async () => {
    if (!aiOutput) return;
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = aiOutput;
    const plainText = tempDiv.textContent || tempDiv.innerText || "";
    try {
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = plainText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [aiOutput]);

  /* ======== 中止生成 ======== */
  const handleAbort = () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
  };

  /* ---- 未挂载 ---- */
  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F4F5F7]">
        <p className="text-sm text-muted-foreground">加载中…</p>
      </div>
    );
  }

  /* ============================================================
     UI 渲染
     ============================================================ */
  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F5F7]">
      {/* ==================== 左栏：职位管理舱 ==================== */}
      <aside className="w-72 flex flex-col bg-white border-r border-border shrink-0">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground tracking-tight">
              职位管理舱
            </h2>
          </div>
        </div>
        <Separator />

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-1">
            {categories.map((cat) => {
              const isExpanded = expandedCats.has(cat.id);
              const isRenaming = renamingCatId === cat.id;
              const isAddingJD = addingJDCatId === cat.id;

              return (
                <div key={cat.id}>
                  <div className="flex items-center gap-1 group/cat">
                    <button
                      onClick={() =>
                        setExpandedCats((prev) => {
                          const next = new Set(prev);
                          next.has(cat.id)
                            ? next.delete(cat.id)
                            : next.add(cat.id);
                          return next;
                        })
                      }
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded-sm text-sm font-medium text-foreground hover:bg-muted transition-colors flex-1 min-w-0"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      )}

                      {isRenaming ? (
                        <span
                          className="flex items-center gap-1 flex-1 min-w-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            ref={renameInputRef}
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                handleConfirmRename(cat.id);
                              if (e.key === "Escape") handleCancelRename();
                            }}
                            className="h-6 px-1.5 text-xs border border-primary/40 rounded-sm bg-white flex-1 min-w-0 outline-none"
                          />
                          <button
                            onClick={() => handleConfirmRename(cat.id)}
                            className="p-0.5 text-green-600 hover:bg-green-50 rounded-sm"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={handleCancelRename}
                            className="p-0.5 text-muted-foreground hover:bg-muted rounded-sm"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ) : (
                        <span className="truncate">{cat.name}</span>
                      )}

                      <Badge
                        variant="secondary"
                        className="ml-auto text-[10px] px-1.5 py-0 h-5 shrink-0"
                      >
                        {cat.jdCards.length}
                      </Badge>
                    </button>

                    {!isRenaming && (
                      <div className="flex items-center shrink-0 opacity-0 group-hover/cat:opacity-100 transition-opacity">
                        <button
                          onClick={() =>
                            handleStartRename(cat.id, cat.name)
                          }
                          className="p-0.5 text-muted-foreground hover:text-foreground rounded-sm"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-0.5 text-muted-foreground hover:text-destructive rounded-sm"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="ml-3 mt-0.5 space-y-1">
                      {cat.jdCards.map((card) => {
                        const isActive = selectedJD?.id === card.id;
                        const isEditing = editingJD?.card.id === card.id;

                        return (
                          <div key={card.id} className="group/jd relative">
                            {isEditing ? (
                              <div className="px-2 py-2 rounded-sm border border-primary/30 bg-white space-y-1.5">
                                <input
                                  value={editJDValues.company}
                                  onChange={(e) =>
                                    setEditJDValues((prev) => ({
                                      ...prev,
                                      company: e.target.value,
                                    }))
                                  }
                                  placeholder="公司名"
                                  className="w-full h-7 px-1.5 text-xs border border-border rounded-sm outline-none focus:border-primary/50"
                                />
                                <input
                                  value={editJDValues.position}
                                  onChange={(e) =>
                                    setEditJDValues((prev) => ({
                                      ...prev,
                                      position: e.target.value,
                                    }))
                                  }
                                  placeholder="职位名"
                                  className="w-full h-7 px-1.5 text-xs border border-border rounded-sm outline-none focus:border-primary/50"
                                />
                                <Textarea
                                  value={editJDValues.jdContent}
                                  onChange={(e) =>
                                    setEditJDValues((prev) => ({
                                      ...prev,
                                      jdContent: e.target.value,
                                    }))
                                  }
                                  placeholder="JD 内容…"
                                  className="text-xs min-h-[60px] resize-y"
                                />
                                <div className="flex gap-1.5 justify-end">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-xs"
                                    onClick={handleCancelEditJD}
                                  >
                                    <X className="w-3 h-3 mr-1" />
                                    取消
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="h-6 text-xs bg-primary"
                                    onClick={handleConfirmEditJD}
                                  >
                                    <Check className="w-3 h-3 mr-1" />
                                    保存
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleSelectJD(card)}
                                className={`w-full text-left px-3 py-2 rounded-sm text-xs transition-colors border ${
                                  isActive
                                    ? "bg-primary/5 border-primary/30 text-foreground"
                                    : "bg-white border-transparent hover:bg-muted text-muted-foreground"
                                }`}
                              >
                                <div className="flex items-center gap-1">
                                  <GripVertical className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                                  <span className="font-medium text-foreground truncate flex-1">
                                    {card.company}
                                  </span>
                                  <div className="flex items-center shrink-0 opacity-0 group-hover/jd:opacity-100 transition-opacity">
                                    <span
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStartEditJD(cat.id, card);
                                      }}
                                      className="p-0.5 text-muted-foreground hover:text-foreground"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </span>
                                    <span
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteJD(cat.id, card.id);
                                      }}
                                      className="p-0.5 text-muted-foreground hover:text-destructive"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </span>
                                  </div>
                                </div>
                                <p className="truncate mt-0.5 ml-4">
                                  {card.position}
                                </p>
                              </button>
                            )}
                          </div>
                        );
                      })}

                      {isAddingJD ? (
                        <div className="px-2 py-2 rounded-sm border border-dashed border-primary/40 bg-white space-y-1.5">
                          <input
                            value={newJD.company}
                            onChange={(e) =>
                              setNewJD((prev) => ({
                                ...prev,
                                company: e.target.value,
                              }))
                            }
                            placeholder="公司名"
                            className="w-full h-7 px-1.5 text-xs border border-border rounded-sm outline-none focus:border-primary/50"
                            autoFocus
                          />
                          <input
                            value={newJD.position}
                            onChange={(e) =>
                              setNewJD((prev) => ({
                                ...prev,
                                position: e.target.value,
                              }))
                            }
                            placeholder="职位名"
                            className="w-full h-7 px-1.5 text-xs border border-border rounded-sm outline-none focus:border-primary/50"
                          />
                          <Textarea
                            value={newJD.jdContent}
                            onChange={(e) =>
                              setNewJD((prev) => ({
                                ...prev,
                                jdContent: e.target.value,
                              }))
                            }
                            placeholder="粘贴 JD 内容…"
                            className="text-xs min-h-[60px] resize-y"
                          />
                          <div className="flex gap-1.5 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs"
                              onClick={() => {
                                setAddingJDCatId(null);
                                setNewJD({
                                  company: "",
                                  position: "",
                                  jdContent: "",
                                });
                              }}
                            >
                              <X className="w-3 h-3 mr-1" />
                              取消
                            </Button>
                            <Button
                              size="sm"
                              className="h-6 text-xs bg-primary"
                              onClick={() => handleAddJD(cat.id)}
                            >
                              <Check className="w-3 h-3 mr-1" />
                              添加
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingJDCatId(cat.id)}
                          className="w-full flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          添加 JD 卡片
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <Separator />
        <div className="p-3">
          <div className="flex gap-2">
            <Input
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddCategory();
              }}
              placeholder="输入新分类名…"
              className="h-8 text-xs"
            />
            <Button
              size="sm"
              className="h-8 text-xs shrink-0 bg-primary"
              onClick={handleAddCategory}
              disabled={!newCatName.trim()}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              新建
            </Button>
          </div>
        </div>
      </aside>

      {/* ==================== 中栏：魔法匹配输入区 ==================== */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="px-6 py-4 flex items-center gap-2 bg-white border-b border-border">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground tracking-tight">
            魔法匹配
          </h2>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
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
                  disabled={generating}
                />
              </CardContent>
            </Card>

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
                    if (
                      selectedJD &&
                      e.target.value !== selectedJD.jdContent
                    ) {
                      setSelectedJD(null);
                    }
                  }}
                  disabled={generating}
                />
              </CardContent>
            </Card>

            {/* ---- 风格选择器 ---- */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                选择写作风格
              </p>
              <div className="flex flex-wrap gap-1.5">
                {STYLE_META.map((s: StyleMeta) => (
                  <button
                    key={s.key}
                    onClick={() => setSelectedStyle(s.key)}
                    disabled={generating}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-sm text-xs font-medium border transition-colors ${
                      selectedStyle === s.key
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-white text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                    }`}
                    title={s.desc}
                  >
                    <span className="text-sm leading-none">{s.icon}</span>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ---- AI 按钮 ---- */}
            <div className="flex flex-col items-center gap-2 pt-2">
              {generating ? (
                <div className="flex items-center gap-3">
                  <Button
                    size="lg"
                    className="px-10 text-sm font-semibold tracking-wide bg-primary/80"
                    disabled
                  >
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    匹配中…
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs"
                    onClick={handleAbort}
                  >
                    取消
                  </Button>
                </div>
              ) : (
                <Button
                  size="lg"
                  className="px-10 text-sm font-semibold tracking-wide bg-primary hover:bg-primary/90 transition-colors"
                  onClick={handleGenerate}
                  disabled={!rawExperience.trim() || !jdText.trim()}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {versions.length === 0
                    ? "AI 一键动态匹配"
                    : "再次匹配（新版本）"}
                </Button>
              )}

              {aiError && (
                <div className="flex items-center gap-1.5 text-xs text-destructive mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {aiError}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </main>

      {/* ==================== 右栏：STAR 闪耀输出区 ==================== */}
      <aside className="flex-1 flex flex-col bg-white border-l border-border min-w-0">
        <div className="px-6 py-4 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground tracking-tight">
              STAR 闪耀输出
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {/* 再次匹配快捷按钮 */}
            {versions.length > 0 && !generating && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={handleGenerate}
                disabled={!rawExperience.trim() || !jdText.trim()}
                title={`以 ${STYLE_META.find((s) => s.key === selectedStyle)?.label} 风格再次生成`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                再生成一版
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={handleCopy}
              disabled={!aiOutput || generating}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  一键复制
                </>
              )}
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-4">
            {/* ---- 版本选项卡 ---- */}
            {versions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {versions.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setActiveVersionId(v.id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs font-medium border transition-colors ${
                      activeVersionId === v.id
                        ? "bg-primary/10 border-primary/40 text-primary"
                        : "bg-white border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            )}

            {/* ---- AI 输出 / 预览 ---- */}
            <div className="rounded-sm border border-border bg-[#F4F5F7]/50 p-5 min-h-[240px]">
              {aiOutput ? (
                <div
                  ref={outputRef}
                  className="text-sm leading-relaxed space-y-1 max-h-[480px] overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: aiOutput }}
                />
              ) : generating ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  AI 正在思考并生成
                  {(() => {
                    const styleMeta = STYLE_META.find((s) => s.key === selectedStyle);
                    return styleMeta ? `（${styleMeta.icon} ${styleMeta.label}）…` : "…";
                  })()}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    生成预览
                  </p>
                  <div className="text-sm leading-relaxed">
                    <span className="text-blue-600 font-medium">主导</span>
                    了用户增长项目，利用{" "}
                    <span className="text-green-600 font-medium">
                      Python 进行数据分析
                    </span>{" "}
                    洞察用户流失漏斗，
                    <span className="text-blue-600 font-medium">优化</span>
                    了注册留存策略，最终使次日留存率
                    <span className="text-orange-600 font-medium">
                      提升了 15%
                    </span>
                    。
                  </div>
                  <div className="text-sm leading-relaxed">
                    <span className="text-blue-600 font-medium">搭建</span>
                    了公司级的{" "}
                    <span className="text-green-600 font-medium">
                      埋点设计与用户画像
                    </span>{" "}
                    体系，
                    <span className="text-blue-600 font-medium">推动</span>
                    数据驱动决策落地，覆盖
                    <span className="text-orange-600 font-medium">
                      3 条核心业务线
                    </span>
                    ，数据查询效率
                    <span className="text-orange-600 font-medium">
                      提升 40%
                    </span>
                    。
                  </div>
                </div>
              )}
            </div>

            {/* ---- 高亮图例 ---- */}
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

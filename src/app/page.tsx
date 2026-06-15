"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import DOMPurify from "dompurify";
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
  Star,
  Pencil,
  Trash2,
  Check,
  X,
  GripVertical,
  Clock,
  Layers,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useExperiences } from "@/hooks/useExperiences";
import { STYLE_META, type StyleMeta } from "@/lib/prompt";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { JDCard, Experience, GenerateStatus } from "@/lib/types";

export default function Home() {
  /* ---- 左栏：复用 useWorkspace ---- */
  const {
    categories,
    mounted,
    addCategory,
    renameCategory,
    deleteCategory,
    addJDCard,
    updateJDCard,
    deleteJDCard,
    syncJobCardState,
  } = useWorkspace();

  /* ---- 左栏交互 ---- */
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [newCatName, setNewCatName] = useState("");
  const [renamingCatId, setRenamingCatId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [addingJDCatId, setAddingJDCatId] = useState<string | null>(null);
  const [newJD, setNewJD] = useState({ company: "", position: "", jdContent: "" });
  const [editingJD, setEditingJD] = useState<{
    catId: string;
    card: JDCard;
  } | null>(null);
  const [editJDValues, setEditJDValues] = useState({
    company: "",
    position: "",
    jdContent: "",
  });

  /* ---- JD 联动 ---- */
  const [selectedJD, setSelectedJD] = useState<JDCard | null>(null);
  const [selectedJDCatId, setSelectedJDCatId] = useState<string | null>(null);
  const [jdText, setJdText] = useState("");

  /* ---- 经历库：hook 驱动 + localStorage ---- */
  const { experiences, addExperience, updateExperience, deleteExperience } = useExperiences();
  const [selectedExpIds, setSelectedExpIds] = useState<Set<string>>(new Set());

  /* ---- AI 生成状态 ---- */
  const [selectedStyle, setSelectedStyle] = useState<string>("balanced");
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // 缓存: key = `${expId}:${style}`
  const [expOutputs, setExpOutputs] = useState<Record<string, string>>({});
  const [expStatuses, setExpStatuses] = useState<Record<string, GenerateStatus>>({});

  const cacheKey = (expId: string) => `${expId}:${selectedStyle}`;

  /* ---- 串行生成 ---- */
  const handleGenerate = useCallback(async () => {
    if (!jdText.trim() || selectedExpIds.size === 0) return;

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setGenerating(true);
    setAiError(null);

    const ordered = Array.from(selectedExpIds);
    const updatedOutputs = { ...expOutputs };
    const updatedStatuses = { ...expStatuses };

    for (const expId of ordered) {
      if (controller.signal.aborted) break;

      const key = cacheKey(expId);
      // 缓存命中 — 跳过
      if (updatedOutputs[key]) continue;

      const exp = experiences.find((e) => e.id === expId);
      if (!exp) continue;

      updatedStatuses[expId] = "loading";
      setExpStatuses({ ...updatedStatuses });

      try {
        const resp = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            experience: exp.rawContent,
            jd: jdText,
            style: selectedStyle,
            promptVersion: "pro",
          }),
          signal: controller.signal,
        });

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ error: "请求失败" }));
          throw new Error(err.error || `HTTP ${resp.status}`);
        }

        if (!resp.body) throw new Error("不支持流式读取");

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let html = "";

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
              if (parsed.error) throw new Error(parsed.error);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                html += content;
                updatedOutputs[key] = html;
                setExpOutputs({ ...updatedOutputs });
              }
            } catch (e) {
              if ((e as Error).message !== "Unexpected end of JSON input") throw e;
            }
          }
        }

        updatedStatuses[expId] = "success";
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") break;
        updatedStatuses[expId] = "error";
        setAiError(err instanceof Error ? err.message : "生成失败");
        break; // 出错后停止后续请求
      } finally {
        setExpStatuses({ ...updatedStatuses });
      }
    }

    setGenerating(false);
    abortRef.current = null;
  }, [jdText, selectedExpIds, selectedStyle, experiences, expOutputs, expStatuses]);

  const handleAbort = () => { if (abortRef.current) abortRef.current.abort(); };

  /* ---- 经历弹窗 ---- */
  const [expDialogOpen, setExpDialogOpen] = useState(false);
  const [editingExpId, setEditingExpId] = useState<string | null>(null);
  const [expForm, setExpForm] = useState({ title: "", date: "", rawContent: "" });

  const openNewExpDialog = () => {
    setEditingExpId(null);
    setExpForm({ title: "", date: "", rawContent: "" });
    setExpDialogOpen(true);
  };

  const openEditExpDialog = (exp: Experience) => {
    setEditingExpId(exp.id);
    setExpForm({ title: exp.title, date: exp.date, rawContent: exp.rawContent });
    setExpDialogOpen(true);
  };

  const handleSaveExp = () => {
    if (!expForm.title.trim()) return;
    if (editingExpId) {
      updateExperience(editingExpId, expForm);
    } else {
      addExperience(expForm);
    }
    setExpDialogOpen(false);
  };

  /* ---- 移动端 ---- */
  type Panel = "workspace" | "input" | "output";
  const [mobilePanel, setMobilePanel] = useState<Panel>("input");

  /* ---- Auto expand first category ---- */
  useEffect(() => {
    if (mounted && categories.length > 0) {
      setExpandedCats((prev) => {
        if (prev.size === 0) return new Set([categories[0].id]);
        return prev;
      });
    }
  }, [mounted, categories]);

  /* ---- 重命名自动聚焦 ---- */
  useEffect(() => {
    if (renamingCatId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingCatId]);

  /* ---- 勾选变化 → 同步到 JobCard ---- */
  useEffect(() => {
    if (!selectedJDCatId || !selectedJD) return;
    syncJobCardState(selectedJDCatId, selectedJD.id, {
      selectedExpIds: Array.from(selectedExpIds),
    });
  }, [selectedExpIds, selectedJDCatId, selectedJD, syncJobCardState]);

  /* ---- 生成结果变化 → 同步到 JobCard ---- */
  useEffect(() => {
    if (!selectedJDCatId || !selectedJD) return;
    syncJobCardState(selectedJDCatId, selectedJD.id, { outputs: { ...expOutputs } });
  }, [expOutputs, selectedJDCatId, selectedJD, syncJobCardState]);

  /* ---- 风格变化 → 同步到 JobCard ---- */
  useEffect(() => {
    if (!selectedJDCatId || !selectedJD) return;
    syncJobCardState(selectedJDCatId, selectedJD.id, { selectedStyle });
  }, [selectedStyle, selectedJDCatId, selectedJD, syncJobCardState]);

  /* ======== 左栏操作（与 Phase 5 一致） ======== */
  const handleAddCategory = () => { addCategory(newCatName); setNewCatName(""); };
  const handleStartRename = (catId: string, currentName: string) => {
    setRenamingCatId(catId); setRenameValue(currentName);
  };
  const handleConfirmRename = (catId: string) => {
    renameCategory(catId, renameValue); setRenamingCatId(null); setRenameValue("");
  };
  const handleCancelRename = () => { setRenamingCatId(null); setRenameValue(""); };
  const handleDeleteCategory = (catId: string) => {
    if (selectedJD && categories.find((c) => c.id === catId)?.jdCards.find((j) => j.id === selectedJD.id)) {
      setSelectedJD(null); setJdText("");
    }
    deleteCategory(catId);
  };
  const handleSelectJD = (catId: string, card: JDCard) => {
    setSelectedJD(card);
    setSelectedJDCatId(catId);
    setJdText(card.jdContent);
    setSelectedExpIds(new Set(card.selectedExpIds || []));
    setExpOutputs({ ...(card.outputs || {}) });
    setSelectedStyle(card.selectedStyle || "balanced");
    // derive statuses from outputs
    const statuses: Record<string, GenerateStatus> = {};
    for (const key of Object.keys(card.outputs || {})) {
      const expId = key.split(":")[0];
      if (expId) statuses[expId] = "success";
    }
    setExpStatuses(statuses);
  };
  const handleAddJD = (catId: string) => {
    addJDCard(catId, newJD); setAddingJDCatId(null); setNewJD({ company: "", position: "", jdContent: "" });
  };
  const handleStartEditJD = (catId: string, card: JDCard) => {
    setEditingJD({ catId, card });
    setEditJDValues({ company: card.company, position: card.position, jdContent: card.jdContent });
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
  const handleCancelEditJD = () => { setEditingJD(null); };
  const handleDeleteJD = (catId: string, cardId: string) => {
    if (selectedJD?.id === cardId) { setSelectedJD(null); setJdText(""); }
    deleteJDCard(catId, cardId);
  };

  /* ======== 经历勾选 ======== */
  const toggleExpSelection = (expId: string) => {
    setSelectedExpIds((prev) => {
      const next = new Set(prev);
      next.has(expId) ? next.delete(expId) : next.add(expId);
      return next;
    });
  };

  const selectedExperiences = experiences.filter((e) => selectedExpIds.has(e.id));

  /* ======== Copy all outputs ======== */
  const [copied, setCopied] = useState(false);

  const handleCopyAll = async () => {
    const selected = Array.from(selectedExpIds);
    const parts: string[] = [];
    for (const expId of selected) {
      const exp = experiences.find((e) => e.id === expId);
      const output = expOutputs[cacheKey(expId)];
      if (!output) continue;
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = output;
      const plain = (tempDiv.textContent || tempDiv.innerText || "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => `• ${l}`)
        .join("\n");
      if (plain) {
        if (exp) parts.push(`【${exp.title}】`);
        parts.push(plain);
      }
    }
    if (!parts.length) return;
    const text = parts.join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F4F5F7]">
        <p className="text-sm text-muted-foreground">加载中…</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F5F7]">
      {/* ==================== 左栏：保留 Phase 5 UI，不做重构 ==================== */}
      <aside className={`w-72 flex flex-col bg-white border-r border-border shrink-0 max-lg:pb-16 ${mobilePanel !== "workspace" ? "max-lg:hidden" : ""}`}>
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground tracking-tight">职位管理舱</h2>
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
                      onClick={() => setExpandedCats((prev) => {
                        const next = new Set(prev);
                        next.has(cat.id) ? next.delete(cat.id) : next.add(cat.id);
                        return next;
                      })}
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded-sm text-sm font-medium text-foreground hover:bg-muted transition-colors flex-1 min-w-0"
                    >
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                      {isRenaming ? (
                        <span className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                          <input ref={renameInputRef} value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleConfirmRename(cat.id); if (e.key === "Escape") handleCancelRename(); }}
                            className="h-6 px-1.5 text-xs border border-primary/40 rounded-sm bg-white flex-1 min-w-0 outline-none" />
                          <button onClick={() => handleConfirmRename(cat.id)} className="p-0.5 text-green-600 hover:bg-green-50 rounded-sm"><Check className="w-3 h-3" /></button>
                          <button onClick={handleCancelRename} className="p-0.5 text-muted-foreground hover:bg-muted rounded-sm"><X className="w-3 h-3" /></button>
                        </span>
                      ) : (<span className="truncate">{cat.name}</span>)}
                      <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0 h-5 shrink-0">{cat.jdCards.length}</Badge>
                    </button>
                    {!isRenaming && (
                      <div className="flex items-center shrink-0 opacity-0 group-hover/cat:opacity-100 transition-opacity">
                        <button onClick={() => handleStartRename(cat.id, cat.name)} className="p-0.5 text-muted-foreground hover:text-foreground rounded-sm"><Pencil className="w-3 h-3" /></button>
                        <button onClick={() => handleDeleteCategory(cat.id)} className="p-0.5 text-muted-foreground hover:text-destructive rounded-sm"><Trash2 className="w-3 h-3" /></button>
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
                                <input value={editJDValues.company} onChange={(e) => setEditJDValues((prev) => ({ ...prev, company: e.target.value }))} placeholder="公司名" className="w-full h-7 px-1.5 text-xs border border-border rounded-sm outline-none focus:border-primary/50" />
                                <input value={editJDValues.position} onChange={(e) => setEditJDValues((prev) => ({ ...prev, position: e.target.value }))} placeholder="职位名" className="w-full h-7 px-1.5 text-xs border border-border rounded-sm outline-none focus:border-primary/50" />
                                <Textarea value={editJDValues.jdContent} onChange={(e) => setEditJDValues((prev) => ({ ...prev, jdContent: e.target.value }))} placeholder="JD 内容…" className="text-xs min-h-[60px] resize-y" />
                                <div className="flex gap-1.5 justify-end">
                                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={handleCancelEditJD}><X className="w-3 h-3 mr-1" />取消</Button>
                                  <Button size="sm" className="h-6 text-xs bg-primary" onClick={handleConfirmEditJD}><Check className="w-3 h-3 mr-1" />保存</Button>
                                </div>
                              </div>
                            ) : (
                              <button onClick={() => handleSelectJD(cat.id, card)}
                                className={`w-full text-left px-3 py-2 rounded-sm text-xs transition-colors border ${isActive ? "bg-primary/5 border-primary/30 text-foreground" : "bg-white border-transparent hover:bg-muted text-muted-foreground"}`}>
                                <div className="flex items-center gap-1">
                                  <GripVertical className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                                  <span className="font-medium text-foreground truncate flex-1">{card.company}</span>
                                  <div className="flex items-center shrink-0 opacity-0 group-hover/jd:opacity-100 transition-opacity">
                                    <span onClick={(e) => { e.stopPropagation(); handleStartEditJD(cat.id, card); }} className="p-0.5 text-muted-foreground hover:text-foreground"><Pencil className="w-3 h-3" /></span>
                                    <span onClick={(e) => { e.stopPropagation(); handleDeleteJD(cat.id, card.id); }} className="p-0.5 text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></span>
                                  </div>
                                </div>
                                <p className="truncate mt-0.5 ml-4">{card.position}</p>
                              </button>
                            )}
                          </div>
                        );
                      })}
                      {isAddingJD ? (
                        <div className="px-2 py-2 rounded-sm border border-dashed border-primary/40 bg-white space-y-1.5">
                          <input value={newJD.company} onChange={(e) => setNewJD((prev) => ({ ...prev, company: e.target.value }))} placeholder="公司名" className="w-full h-7 px-1.5 text-xs border border-border rounded-sm outline-none focus:border-primary/50" autoFocus />
                          <input value={newJD.position} onChange={(e) => setNewJD((prev) => ({ ...prev, position: e.target.value }))} placeholder="职位名" className="w-full h-7 px-1.5 text-xs border border-border rounded-sm outline-none focus:border-primary/50" />
                          <Textarea value={newJD.jdContent} onChange={(e) => setNewJD((prev) => ({ ...prev, jdContent: e.target.value }))} placeholder="粘贴 JD 内容…" className="text-xs min-h-[60px] resize-y" />
                          <div className="flex gap-1.5 justify-end">
                            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => { setAddingJDCatId(null); setNewJD({ company: "", position: "", jdContent: "" }); }}><X className="w-3 h-3 mr-1" />取消</Button>
                            <Button size="sm" className="h-6 text-xs bg-primary" onClick={() => handleAddJD(cat.id)}><Check className="w-3 h-3 mr-1" />添加</Button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setAddingJDCatId(cat.id)} className="w-full flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                          <Plus className="w-3 h-3" />添加 JD 卡片
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
            <Input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleAddCategory(); }} placeholder="输入新分类名…" className="h-8 text-xs" />
            <Button size="sm" className="h-8 text-xs shrink-0 bg-primary" onClick={handleAddCategory} disabled={!newCatName.trim()}><Plus className="w-3.5 h-3.5 mr-1" />新建</Button>
          </div>
        </div>
      </aside>

      {/* ==================== 中栏：JD + 经历库工作台（重构） ==================== */}
      <main className={`flex-1 flex flex-col min-w-0 max-lg:pb-16 ${mobilePanel !== "input" ? "max-lg:hidden" : ""}`}>
        <div className="px-5 py-2.5 flex items-center gap-2 bg-white border-b border-border">
          <Layers className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground tracking-tight">经历匹配</h2>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3.5">
            {/* ---- 上半：岗位 JD ---- */}
            <Card className="shadow-none border-border">
              <CardHeader className="pb-1.5 pt-3 px-4">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-muted-foreground" />目标岗位 JD
                  {selectedJD && <span className="text-[11px] font-normal text-muted-foreground truncate">— {selectedJD.company} · {selectedJD.position}</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <Textarea
                  placeholder="粘贴目标岗位的职位描述（JD）…"
                  className="min-h-[100px] resize-y text-sm leading-relaxed"
                  value={jdText}
                  onChange={(e) => { setJdText(e.target.value); if (selectedJD && e.target.value !== selectedJD.jdContent) setSelectedJD(null); }}
                />
              </CardContent>
            </Card>

            {/* ---- 风格选择器 ---- */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">写作风格</p>
              <div className="flex flex-wrap gap-1.5">
                {STYLE_META.map((s: StyleMeta) => (
                  <button key={s.key} onClick={() => setSelectedStyle(s.key)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs font-medium border transition-colors ${selectedStyle === s.key ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-white text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"}`}
                    title={s.desc}>
                    <span className="text-sm leading-none">{s.icon}</span>{s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ---- 经历库 ---- */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">
                  经历库 <span className="text-muted-foreground/60">（勾选相关经历）</span>
                </p>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={openNewExpDialog}>
                  <Plus className="w-3.5 h-3.5" />新增经历
                </Button>
              </div>

              <div className="space-y-1.5">
                {experiences.map((exp) => {
                  const isChecked = selectedExpIds.has(exp.id);
                  return (
                    <label key={exp.id}
                      className={`flex items-center gap-2 p-2 rounded-sm border cursor-pointer transition-colors group/exp ${isChecked ? "bg-primary/5 border-primary/30" : "bg-white border-border hover:bg-muted/50"}`}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleExpSelection(exp.id)}
                        className="h-3.5 w-3.5 rounded-sm border-border accent-primary cursor-pointer shrink-0"
                      />
                      <span className="text-sm font-medium text-foreground truncate flex-1">{exp.title}</span>
                      <span className="text-[11px] text-muted-foreground shrink-0 flex items-center gap-1">
                        <Clock className="w-3 h-3" />{exp.date}
                      </span>
                      {/* 编辑 / 删除 */}
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover/exp:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEditExpDialog(exp); }}
                          className="p-1 text-muted-foreground hover:text-foreground rounded-sm"
                          title="编辑经历"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteExperience(exp.id); setSelectedExpIds((prev) => { const next = new Set(prev); next.delete(exp.id); return next; }); setExpOutputs((prev) => { const next = { ...prev }; Object.keys(next).forEach((k) => { if (k.startsWith(exp.id + ":")) delete next[k]; }); return next; }); setExpStatuses((prev) => { const next = { ...prev }; delete next[exp.id]; return next; }); }}
                          className="p-1 text-muted-foreground hover:text-destructive rounded-sm"
                          title="删除经历"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* ---- 主按钮 ---- */}
            <div className="flex flex-col items-center gap-1.5">
              {generating ? (
                <div className="flex items-center gap-3">
                  <Button size="lg" className="px-10 text-sm font-semibold tracking-wide bg-primary/80" disabled>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />匹配中…
                  </Button>
                  <Button variant="outline" size="sm" className="h-9 text-xs" onClick={handleAbort}>取消</Button>
                </div>
              ) : (
                <Button size="lg"
                  className="px-10 text-sm font-semibold tracking-wide bg-primary hover:bg-primary/90 transition-colors"
                  onClick={handleGenerate}
                  disabled={selectedExpIds.size === 0 || !jdText.trim()}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI 针对性动态匹配
                </Button>
              )}
              {aiError && (
                <div className="flex items-center gap-1.5 text-xs text-destructive mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />{aiError}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </main>

      {/* ==================== 右栏：微型简历画布（重构） ==================== */}
      <aside className={`flex-1 flex flex-col bg-white border-l border-border min-w-0 max-lg:pb-16 ${mobilePanel !== "output" ? "max-lg:hidden" : ""}`}>
        <div className="px-6 py-4 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground tracking-tight">简历画布</h2>
          </div>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5"
            onClick={handleCopyAll} disabled={selectedExpIds.size === 0}>
            {copied ? <><Check className="w-3.5 h-3.5" />已复制</> : <><Copy className="w-3.5 h-3.5" />一键复制</>}
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-5">
            {selectedExperiences.length === 0 ? (
              /* ---- idle 状态 ---- */
              <div className="rounded-sm border border-dashed border-border bg-[#F4F5F7]/50 p-8 text-center">
                <Star className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">等待勾选经历</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  在中栏勾选经历后，对应的简历区块将出现在这里
                </p>
              </div>
            ) : (
              /* ---- 经历卡片列表 ---- */
              selectedExperiences.map((exp) => {
                const status: GenerateStatus = expStatuses[exp.id] || "idle";
                const output = expOutputs[cacheKey(exp.id)] || "";
                return (
                  <Card key={exp.id} className="shadow-none border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold text-foreground">{exp.title}</CardTitle>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />{exp.date}
                      </p>
                    </CardHeader>
                    <CardContent>
                      {status === "loading" && (
                        <div className="rounded-sm bg-[#F4F5F7] p-3">
                          {output ? (
                            <div
                              className="text-sm leading-relaxed space-y-0.5"
                              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(`<ul>${output}</ul>`) }}
                            />
                          ) : (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />AI 生成中…
                            </div>
                          )}
                        </div>
                      )}
                      {status === "success" && (
                        <div
                          className="text-sm leading-relaxed space-y-0.5"
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(`<ul>${output}</ul>`) }}
                        />
                      )}
                      {status === "error" && (
                        <div className="rounded-sm bg-red-50 p-3 text-center">
                          <p className="text-xs text-destructive">生成失败，请重试</p>
                        </div>
                      )}
                      {status === "idle" && (
                        <div className="rounded-sm bg-[#F4F5F7] p-3 text-center">
                          <p className="text-xs text-muted-foreground">等待 AI 匹配</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}

            {/* ---- 高亮图例 ---- */}
            <Card className="shadow-none border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">高亮规则</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="inline-block w-3 h-3 rounded-sm bg-green-100 border border-green-300" />
                  <span className="text-green-700 font-medium">绿色高亮</span>
                  <span className="text-muted-foreground">— 命中 JD 的关键词</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="inline-block w-3 h-3 rounded-sm bg-blue-100 border border-blue-300" />
                  <span className="text-blue-700 font-medium">蓝色高亮</span>
                  <span className="text-muted-foreground">— 强有力的 Action 动词</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="inline-block w-3 h-3 rounded-sm bg-orange-100 border border-orange-300" />
                  <span className="text-orange-700 font-medium">橙色高亮</span>
                  <span className="text-muted-foreground">— 量化的 Result 结果/数字</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </aside>

      {/* ==================== 经历弹窗 ==================== */}
      <Dialog open={expDialogOpen} onOpenChange={setExpDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingExpId ? "编辑经历" : "新增经历"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">经历标题</label>
              <Input
                value={expForm.title}
                onChange={(e) => setExpForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="如：字节跳动运营实习"
                className="h-9 text-sm"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">时间段</label>
              <Input
                value={expForm.date}
                onChange={(e) => setExpForm((prev) => ({ ...prev, date: e.target.value }))}
                placeholder="如：2025.07-2025.10"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">原始经历（大白话流水账）</label>
              <Textarea
                value={expForm.rawContent}
                onChange={(e) => setExpForm((prev) => ({ ...prev, rawContent: e.target.value }))}
                placeholder="把你这段经历的流水账、大白话直接写进来…"
                className="min-h-[120px] resize-y text-sm leading-relaxed"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setExpDialogOpen(false)}>
                取消
              </Button>
              <Button size="sm" className="h-8 text-xs bg-primary" onClick={handleSaveExp} disabled={!expForm.title.trim()}>
                {editingExpId ? "保存修改" : "添加经历"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================== 移动端底部导航（保留 Phase 5） ==================== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-14 bg-white border-t border-border z-50 flex items-center justify-around">
        {([
          ["workspace", Briefcase, "职位"],
          ["input", Layers, "匹配"],
          ["output", Star, "画布"],
        ] as const).map(([panel, Icon, label]) => (
          <button key={panel} onClick={() => setMobilePanel(panel)}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-sm ${mobilePanel === panel ? "text-primary" : "text-muted-foreground"}`}>
            <Icon className="w-5 h-5" /><span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

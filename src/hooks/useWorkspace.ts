"use client";

import { useState, useEffect, useCallback } from "react";
import type { Category, JDCard } from "@/lib/types";
import { loadWorkspace, saveWorkspace } from "@/lib/storage";

/* ---- 工具：生成 ID ---- */
function genId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // fallback
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/* ---- 首次启动时的占位演示数据 ---- */
const DEMO_CATEGORIES: Category[] = [
  {
    id: genId(),
    name: "产品经理",
    jdCards: [
      {
        id: genId(),
        company: "字节跳动",
        position: "高级产品经理",
        jdContent:
          "负责用户增长方向，要求具备数据分析能力，熟悉 A/B 测试，能独立主导跨部门项目…",
      },
      {
        id: genId(),
        company: "腾讯",
        position: "产品经理（微信生态）",
        jdContent:
          "负责微信小程序生态的产品规划与落地，要求有 B 端 SaaS 经验，擅长用户研究…",
      },
    ],
  },
  {
    id: genId(),
    name: "数据分析师",
    jdCards: [
      {
        id: genId(),
        company: "阿里巴巴",
        position: "数据分析师",
        jdContent:
          "负责业务数据建模与可视化，精通 SQL/Python，能独立完成埋点设计与用户画像分析…",
      },
    ],
  },
  {
    id: genId(),
    name: "运营经理",
    jdCards: [],
  },
];

export function useWorkspace() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [mounted, setMounted] = useState(false);

  /* ---- 初始化：从 localStorage 加载（无数据时用 Demo） ---- */
  useEffect(() => {
    const saved = loadWorkspace();
    setCategories(saved && saved.length > 0 ? saved : DEMO_CATEGORIES);
    setMounted(true);
  }, []);

  /* ---- 自动持久化（首次挂载不触发，避免覆盖 Demo） ---- */
  useEffect(() => {
    if (mounted) {
      saveWorkspace(categories);
    }
  }, [categories, mounted]);

  /* ======== 分类操作 ======== */

  const addCategory = useCallback((name: string) => {
    if (!name.trim()) return;
    setCategories((prev) => [
      ...prev,
      { id: genId(), name: name.trim(), jdCards: [] },
    ]);
  }, []);

  const renameCategory = useCallback((catId: string, newName: string) => {
    if (!newName.trim()) return;
    setCategories((prev) =>
      prev.map((c) => (c.id === catId ? { ...c, name: newName.trim() } : c))
    );
  }, []);

  const deleteCategory = useCallback((catId: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== catId));
  }, []);

  /* ======== JD 卡片操作 ======== */

  const addJDCard = useCallback(
    (catId: string, card: Pick<JDCard, "company" | "position" | "jdContent">) => {
      if (!card.company.trim()) return;
      setCategories((prev) =>
        prev.map((c) =>
          c.id === catId
            ? {
                ...c,
                jdCards: [
                  ...c.jdCards,
                  {
                    id: genId(),
                    company: card.company.trim(),
                    position: card.position.trim(),
                    jdContent: card.jdContent.trim(),
                  },
                ],
              }
            : c
        )
      );
    },
    []
  );

  const updateJDCard = useCallback(
    (catId: string, cardId: string, updates: Partial<Omit<JDCard, "id">>) => {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === catId
            ? {
                ...c,
                jdCards: c.jdCards.map((card) =>
                  card.id === cardId ? { ...card, ...updates } : card
                ),
              }
            : c
        )
      );
    },
    []
  );

  const deleteJDCard = useCallback((catId: string, cardId: string) => {
    setCategories((prev) =>
      prev.map((c) =>
        c.id === catId
          ? { ...c, jdCards: c.jdCards.filter((card) => card.id !== cardId) }
          : c
      )
    );
  }, []);

  return {
    categories,
    mounted,
    // 分类
    addCategory,
    renameCategory,
    deleteCategory,
    // JD 卡片
    addJDCard,
    updateJDCard,
    deleteJDCard,
  };
}

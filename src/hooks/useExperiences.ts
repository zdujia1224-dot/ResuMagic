"use client";

import { useState, useEffect, useCallback } from "react";
import type { Experience } from "@/lib/types";
import { loadExperiences, saveExperiences } from "@/lib/storage";

function genId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const MOCK_EXPERIENCES: Experience[] = [
  {
    id: "exp-1",
    title: "字节跳动运营实习",
    date: "2025.07-2025.10",
    rawContent: "在字节跳动负责抖音电商活动的策划与执行，写文案和活动页，看数据复盘，也协助做了一些用户调研和竞品分析。",
  },
  {
    id: "exp-2",
    title: "阿里巴巴数据分析实习",
    date: "2025.01-2025.06",
    rawContent: "用 SQL 取数和 Python 做一些用户行为分析，搭过几个数据看板，帮运营团队看活动效果，偶尔也做埋点需求。",
  },
  {
    id: "exp-3",
    title: "腾讯产品助理实习",
    date: "2024.07-2024.12",
    rawContent: "参与微信小程序的产品迭代，写 PRD，画原型，跟开发沟通需求，也做过一些用户访谈和功能验收测试。",
  },
  {
    id: "exp-4",
    title: "美团商家运营项目",
    date: "2024.03-2024.06",
    rawContent: "协助 BD 团队对接餐饮商家入驻，做一些商家培训和日常答疑，整理商家反馈并推动产品优化。",
  },
];

export function useExperiences() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = loadExperiences();
    setExperiences(saved && saved.length > 0 ? saved : MOCK_EXPERIENCES);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      saveExperiences(experiences);
    }
  }, [experiences, mounted]);

  const addExperience = useCallback(
    (exp: Pick<Experience, "title" | "date" | "rawContent">) => {
      if (!exp.title.trim()) return;
      setExperiences((prev) => [
        ...prev,
        { id: genId(), title: exp.title.trim(), date: exp.date.trim(), rawContent: exp.rawContent.trim() },
      ]);
    },
    []
  );

  const updateExperience = useCallback(
    (id: string, updates: Partial<Pick<Experience, "title" | "date" | "rawContent">>) => {
      setExperiences((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
      );
    },
    []
  );

  const deleteExperience = useCallback((id: string) => {
    setExperiences((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { experiences, mounted, addExperience, updateExperience, deleteExperience };
}

import type { Category, Experience } from "@/lib/types";

const WORKSPACE_KEY = "resumagic-workspace";
const EXPERIENCES_KEY = "resumagic-experiences";

/**
 * 从 localStorage 读取工作区数据。
 * 如果读取失败或数据格式不对，返回 null。
 */
export function loadWorkspace(): Category[] | null {
  try {
    const raw = localStorage.getItem(WORKSPACE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return null;

    // Backward compat: ensure all JDCards have the new fields
    for (const cat of data) {
      if (!cat.jdCards) continue;
      for (const card of cat.jdCards) {
        if (!Array.isArray(card.selectedExpIds)) card.selectedExpIds = [];
        if (!card.outputs || typeof card.outputs !== "object") card.outputs = {};
        if (!card.selectedStyle) card.selectedStyle = "balanced";
      }
    }

    return data as Category[];
  } catch {
    return null;
  }
}

/**
 * 将工作区数据写入 localStorage。
 */
export function saveWorkspace(categories: Category[]): void {
  try {
    localStorage.setItem(WORKSPACE_KEY, JSON.stringify(categories));
  } catch {
    console.warn("localStorage 写入失败（可能空间已满）");
  }
}

/**
 * 清空工作区数据（调试用）。
 */
export function clearWorkspace(): void {
  try {
    localStorage.removeItem(WORKSPACE_KEY);
  } catch {
    // ignore
  }
}

/* ---- 经历库 ---- */

export function loadExperiences(): Experience[] | null {
  try {
    const raw = localStorage.getItem(EXPERIENCES_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return null;
    return data as Experience[];
  } catch {
    return null;
  }
}

export function saveExperiences(experiences: Experience[]): void {
  try {
    localStorage.setItem(EXPERIENCES_KEY, JSON.stringify(experiences));
  } catch {
    console.warn("localStorage 写入经历失败");
  }
}

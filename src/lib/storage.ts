import type { Category } from "@/lib/types";

const STORAGE_KEY = "resumagic-workspace";

/**
 * 从 localStorage 读取工作区数据。
 * 如果读取失败或数据格式不对，返回 null。
 */
export function loadWorkspace(): Category[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw);
    // 基本校验：必须是数组
    if (!Array.isArray(data)) return null;

    return data as Category[];
  } catch {
    // 数据损坏静默回退
    return null;
  }
}

/**
 * 将工作区数据写入 localStorage。
 */
export function saveWorkspace(categories: Category[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
  } catch {
    console.warn("localStorage 写入失败（可能空间已满）");
  }
}

/**
 * 清空工作区数据（调试用）。
 */
export function clearWorkspace(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

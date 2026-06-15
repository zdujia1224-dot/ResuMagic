/** 岗位分类 */
export interface Category {
  id: string;
  name: string;
  jdCards: JDCard[];
}

/** 单个 JD 卡片 */
export interface JDCard {
  id: string;
  company: string;
  position: string;
  jdContent: string;
  selectedExpIds: string[];
  outputs: Record<string, string>; // key: `${expId}:${style}`
  selectedStyle: string;
}

/** 全局个人经历 */
export interface Experience {
  id: string;
  title: string;
  date: string;
  rawContent: string;
}

/** 生成状态 */
export type GenerateStatus = "idle" | "loading" | "success" | "error";

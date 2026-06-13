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
}

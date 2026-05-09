/**
 * 标签系统类型定义
 * 与后端完全保持一致的类型定义
 *
 * 注意：课程相关筛选请使用 types/knowledge.ts 中的知识点类型。
 *
 * @author 庆之
 * @version 2.0
 */

/**
 * 标签DTO - 与后端LabelTagDTO完全一致
 */
export interface LabelTagDTO {
  /** 标签ID */
  id: string
  /** 标签名称 */
  labelName: string
  /** 标签类别 (SCENARIO/GENERAL) */
  labelCategory: string
  /** 排序序号 */
  sortOrder?: number
}

/**
 * 标签类型枚举 - 与后端LabelTypeEnum完全一致
 * 当前仅保留行业场景标签类型
 */
export enum LabelTypeEnum {
  /** 行业场景 */
  INDUSTRY = 'INDUSTRY'
}

/**
 * 标签简要信息VO - 与后端LabelTagSimpleVO完全一致
 */
export interface LabelTagSimpleVO {
  /** 标签ID */
  id: string
  /** 标签名称 */
  labelName: string
  /** 标签类型 */
  labelType: LabelTypeEnum
}

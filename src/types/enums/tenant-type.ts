/**
 * 租户类型枚举 - 与后端 TenantTypeEnum 完全对应
 * 对应产品版本：初心版、星光版、智教版
 */
export enum TenantTypeEnum {
  /** 初心版（AI积分：200） */
  CHUXIN = 'CHUXIN',
  /** 星光版（AI积分：1000） */
  XINGGUANG = 'XINGGUANG',
  /** 智教版（AI积分：1500） */
  ZHIJIAO = 'ZHIJIAO',
}

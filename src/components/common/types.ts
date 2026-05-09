/**
 * 类描述：通用组件共享类型定义
 * OverviewStatCards统计卡片组件的公共类型
 *
 * @author : 庆之
 * @version : 1.0
 */
import type { Component } from 'vue'

/** 统计卡片色调 */
export type Tone = 'blue' | 'cyan' | 'orange' | 'pink' | 'green' | 'red' | 'purple'

/** 统计卡片项 */
export interface StatItem {
  key?: string | number
  label: string
  value: string | number
  unit?: string
  subText?: string
  tone?: Tone
  icon?: Component
  onClick?: () => void
}

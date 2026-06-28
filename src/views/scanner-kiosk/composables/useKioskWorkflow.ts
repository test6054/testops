/**
 * 考试扫描一体机 workflow 入口（兼容旧 import 路径）。
 * 实现已迁移至 useExamKioskWorkflow，统一走 work-order API。
 */
export {
  getSemesterDescription,
  SemesterOptions,
  useExamKioskWorkflow as useKioskWorkflow,
} from './useExamKioskWorkflow'
export type {
  ExamKioskWorkflow,
  KioskWorkflow,
} from './useExamKioskWorkflow'

/**
 * 路由配置汇总
 * 按角色拆分为独立模块，此处统一导出
 */
import type { RouteRecordRaw } from 'vue-router'
import { commonRoutes, errorRoutes } from './common'
import { constantRoutes } from './constant'
import { examWorkspaceRoutes } from './exam-workspace'
import { portfolioRoutes } from './portfolio'
import { qualityRoutes } from './quality'
import { studentRoutes } from './student'
import { teacherRoutes } from './teacher'

export {
  commonRoutes,
  constantRoutes,
  errorRoutes,
  examWorkspaceRoutes,
  qualityRoutes,
  portfolioRoutes,
  studentRoutes,
  teacherRoutes,
}

export const allRoutes: RouteRecordRaw[] = [
    ...constantRoutes,
    ...teacherRoutes,
    examWorkspaceRoutes,
    ...qualityRoutes,
    ...portfolioRoutes,
    ...studentRoutes,
    ...commonRoutes,
    ...errorRoutes,
]

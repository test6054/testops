/**
 * 路由配置汇总
 * 按角色拆分为独立模块，此处统一导出
 */
import type { RouteRecordRaw } from 'vue-router'
import { adminRoutes } from './admin'
import { commonRoutes, errorRoutes } from './common'
import { constantRoutes } from './constant'
import { qualityRoutes } from './quality'
import { studentRoutes } from './student'
import { teacherRoutes } from './teacher'

export {
  adminRoutes,
  commonRoutes,
  constantRoutes,
  errorRoutes,
  qualityRoutes,
  studentRoutes,
  teacherRoutes,
}

export const allRoutes: RouteRecordRaw[] = [
    ...constantRoutes,
    ...adminRoutes,
    ...teacherRoutes,
    ...qualityRoutes,
    ...studentRoutes,
    ...commonRoutes,
    ...errorRoutes,
]

/**
 * 归档卷详情工作台（独立全屏 layout，对标 exam-workspace-layout）
 *
 * 路径：/teacher/archive-volumes/:volumeId/detail
 * 不在 TeacherLayout 内，进入后隐藏全局侧栏，使用卷专属侧栏导航。
 */
import type { RouteRecordRaw } from 'vue-router'
import { RoleEnum } from '@/utils/permission'

const TEACHER_ROLES = [RoleEnum.SCH_TECH, RoleEnum.CROP_ADMIN, RoleEnum.CROP_USER]

export const archiveVolumeWorkspaceRoutes: RouteRecordRaw = {
  path: '/teacher/archive-volumes/:volumeId',
  name: 'TeacherArchiveVolumeWorkspace',
  component: () => import('@/views/teacher/archive-volume-detail-layout.vue'),
  redirect: (to) => ({
    name: 'TeacherArchiveVolumeDetail',
    params: { volumeId: to.params.volumeId },
  }),
  meta: {
    title: '归档卷详情',
    roles: TEACHER_ROLES,
    hideInMenu: true,
    layout: 'ArchiveVolumeDetail',
    requiresAuth: true,
    activeMenu: '/teacher/archive-volumes',
  },
  children: [
    {
      path: 'detail',
      name: 'TeacherArchiveVolumeDetail',
      component: () => import('@/views/teacher/archive-volume/archive-volume-detail.vue'),
      meta: {
        title: '归档卷详情',
        roles: TEACHER_ROLES,
        hideInMenu: true,
        noCache: true,
        layout: 'ArchiveVolumeDetail',
        requiresAuth: true,
        activeMenu: '/teacher/archive-volumes',
        hasWorkbenchShell: true,
      },
    },
  ],
}

/**
 * 考试阅卷路由（/teacher）
 *
 * L0 全局左栏：
 *   - 教师业务：阅卷概览、考试列表、历史归档、扫描运营等租户内能力
 *   - 租户级 AI 分析：跨考试 / 校级质量（L0 侧栏，非单场考试内）
 *   - SUPER_ADMIN SaaS 治理：平台管理中的归档模板等平台配置
 * L1：/teacher/exam-workspace/:examId/* 考试详情工作台
 */
import type { RouteRecordRaw } from 'vue-router'
import { RoleEnum } from '@/utils/permission'

const TEACHER_ROLES = [RoleEnum.SCH_TECH, RoleEnum.CROP_ADMIN, RoleEnum.CROP_USER]
const ALL_TEACHER_ROLES = [RoleEnum.SUPER_ADMIN, ...TEACHER_ROLES]
const SUPER_ADMIN_ROLES = [RoleEnum.SUPER_ADMIN]
const SCANNER_ADMIN_ROLES = [RoleEnum.CROP_ADMIN, RoleEnum.SUPER_ADMIN]

export const teacherRoutes: RouteRecordRaw[] = [
  {
    path: '/teacher',
    name: 'TeacherLayout',
    component: () => import('@/layout/index.vue'),
    redirect: '/teacher/dashboard',
    meta: {
      title: '考试阅卷',
      roles: ALL_TEACHER_ROLES,
      icon: 'audit',
      hideInMenu: true,
      hideInBreadcrumb: true,
    },
    children: [
      {
        path: 'dashboard',
        name: 'TeacherMarkingOverview',
        component: () => import('@/views/teacher/marking-overview.vue'),
        meta: {
          title: '阅卷概览',
          roles: ALL_TEACHER_ROLES,
          icon: 'dashboard',
          hideInMenu: false,
          keepAlive: true,
        },
      },
      {
        path: 'exam-list',
        name: 'TeacherExamList',
        component: () => import('@/views/teacher/exam-list.vue'),
        meta: {
          title: '考试列表',
          roles: TEACHER_ROLES,
          icon: 'unordered-list',
          hideInMenu: false,
          keepAlive: true,
        },
      },
      {
        path: 'exam-create',
        name: 'TeacherExamCreate',
        component: () => import('@/views/teacher/exam-create/exam-create.vue'),
        meta: {
          title: '新建考试',
          roles: TEACHER_ROLES,
          hideInMenu: true,
          activeMenu: '/teacher/exam-list',
        },
      },
      {
        path: 'paper-archive-list',
        redirect: {
          name: 'TeacherArchiveVolumeList',
          query: { sourceType: 'HISTORY_IMPORT' },
        },
      },
      {
        path: 'archive-volumes',
        name: 'TeacherArchiveVolumeList',
        component: () => import('@/views/teacher/archive-volume/archive-volume-list.vue'),
        meta: {
          title: '历史归档',
          roles: TEACHER_ROLES,
          icon: 'container',
          hideInMenu: false,
          keepAlive: true,
        },
      },
      {
        path: 'archive-volumes/search',
        name: 'TeacherArchiveVolumeSearch',
        component: () => import('@/views/teacher/archive-volume-search.vue'),
        meta: {
          title: '归档 OCR 检索',
          roles: TEACHER_ROLES,
          icon: 'search',
          hideInMenu: true,
          keepAlive: true,
          activeMenu: '/teacher/archive-volumes',
        },
      },
      {
        path: 'archive-volumes/statistics',
        name: 'TeacherArchiveVolumeStatistics',
        component: () => import('@/views/teacher/archive-volume/archive-volume-statistics.vue'),
        meta: {
          title: '迎评统计',
          roles: TEACHER_ROLES,
          hideInMenu: true,
          keepAlive: true,
          activeMenu: '/teacher/archive-volumes',
        },
      },
      {
        path: 'archive-volumes/readiness',
        name: 'TeacherArchiveVolumeReadinessMatrix',
        component: () => import('@/views/teacher/archive-volume/archive-volume-readiness-matrix.vue'),
        meta: {
          title: '迎评就绪度矩阵',
          roles: TEACHER_ROLES,
          hideInMenu: true,
          keepAlive: true,
          activeMenu: '/teacher/archive-volumes',
        },
      },
      {
        path: 'archive-volumes/ledger',
        name: 'TeacherArchiveVolumeLedger',
        component: () => import('@/views/teacher/archive-volume/archive-volume-ledger.vue'),
        meta: {
          title: '查阅台账',
          roles: TEACHER_ROLES,
          hideInMenu: true,
          keepAlive: true,
          activeMenu: '/teacher/archive-volumes',
        },
      },
      {
        path: 'archive-volumes/audit',
        name: 'TeacherArchiveVolumeAudit',
        component: () => import('@/views/teacher/archive-volume/archive-volume-audit.vue'),
        meta: {
          title: '归档审计',
          roles: TEACHER_ROLES,
          hideInMenu: true,
          keepAlive: true,
          activeMenu: '/teacher/archive-volumes',
        },
      },
      {
        path: 'archive-volumes/create-offline',
        name: 'TeacherArchiveVolumeCreateOffline',
        component: () => import('@/views/teacher/archive-volume/archive-volume-create-offline/archive-volume-create-offline.vue'),
        meta: {
          title: '线下建卷',
          roles: TEACHER_ROLES,
          hideInMenu: true,
          noCache: true,
          activeMenu: '/teacher/archive-volumes',
        },
      },
      {
        path: 'archive-volumes/:volumeId/detail',
        name: 'TeacherArchiveVolumeDetail',
        component: () => import('@/views/teacher/archive-volume/archive-volume-detail.vue'),
        meta: {
          title: '归档卷详情',
          roles: TEACHER_ROLES,
          hideInMenu: true,
          noCache: true,
          activeMenu: '/teacher/archive-volumes',
        },
      },
      {
        path: 'scanner-exception-dashboard',
        name: 'TeacherScannerExceptionDashboard',
        component: () => import('@/views/teacher/scanner-exception-dashboard.vue'),
        meta: {
          title: '扫描异常看板',
          roles: TEACHER_ROLES,
          icon: 'warning',
          hideInMenu: false,
          keepAlive: true,
        },
      },
      {
        path: 'scanner-operation-logs',
        name: 'TeacherScannerOperationLogs',
        component: () => import('@/views/teacher/scanner-operation-logs.vue'),
        meta: {
          title: '扫描操作日志',
          roles: TEACHER_ROLES,
          icon: 'file-text',
          hideInMenu: false,
          keepAlive: true,
        },
      },
      {
        path: 'scanner-ops',
        name: 'TeacherScannerOpsDashboard',
        component: () => import('@/views/teacher/scanner-ops/ScannerOpsDashboard.vue'),
        meta: {
          title: '扫描运营看板',
          roles: TEACHER_ROLES,
          icon: 'bar-chart',
          hideInMenu: false,
          keepAlive: true,
        },
      },
      {
        path: 'scanner-agent-releases',
        name: 'TeacherScannerAgentReleases',
        component: () => import('@/views/teacher/scanner-agent-releases.vue'),
        meta: {
          title: 'Agent 版本发布',
          roles: SCANNER_ADMIN_ROLES,
          icon: 'cloud-upload',
          hideInMenu: false,
          keepAlive: true,
        },
      },
      {
        path: 'archive-volume-search',
        name: 'TeacherArchiveVolumeSearchLegacy',
        redirect: { name: 'TeacherArchiveVolumeSearch' },
        meta: {
          title: '归档 OCR 检索',
          roles: TEACHER_ROLES,
          hideInMenu: true,
        },
      },
      {
        path: 'archive-supervision-inspect',
        name: 'TeacherArchiveSupervisionInspect',
        redirect: { name: 'TeacherArchiveVolumeList', query: { tab: 'supervision' } },
        meta: {
          title: '督导抽查',
          roles: TEACHER_ROLES,
          hideInMenu: true,
        },
      },
      {
        path: 'archive-evaluation-remediation',
        name: 'TeacherArchiveEvaluationRemediation',
        redirect: { name: 'TeacherArchiveVolumeList', query: { tab: 'remediation' } },
        meta: {
          title: '迎评整改',
          roles: TEACHER_ROLES,
          hideInMenu: true,
        },
      },
      {
        path: 'audit-trail',
        name: 'AdminAuditTrail',
        component: () => import('@/views/admin/audit-trail.vue'),
        meta: {
          title: '批改审计',
          roles: TEACHER_ROLES,
          icon: 'file-protect',
          hideInMenu: true,
          keepAlive: true,
        },
      },
      {
        path: 'marking-organization',
        name: 'TeacherMarkingOrganizationIndex',
        component: () => import('@/views/admin/marking-organization/index.vue'),
        meta: {
          title: '阅卷组织',
          roles: TEACHER_ROLES,
          icon: 'team',
          hideInMenu: true,
          keepAlive: true,
        },
      },
      {
        path: 'marking-organization/:organizationId',
        name: 'TeacherMarkingOrganizationDetail',
        component: () => import('@/views/admin/marking-organization/detail.vue'),
        meta: {
          title: '组织详情',
          roles: TEACHER_ROLES,
          icon: 'setting',
          hideInMenu: true,
          noCache: true,
          activeMenu: '/teacher/exam-list',
        },
      },
      {
        path: 'marking-organization/:organizationId/sessions',
        name: 'TeacherMarkingOrganizationSessions',
        component: () => import('@/views/admin/marking-organization/sessions.vue'),
        meta: {
          title: '试评 / 正评',
          roles: TEACHER_ROLES,
          icon: 'play-circle',
          hideInMenu: true,
          noCache: true,
          activeMenu: '/teacher/exam-list',
        },
      },
      {
        path: 'cross-exam-dashboard',
        name: 'AdminCrossExamDashboard',
        component: () => import('@/views/admin/cross-exam-dashboard.vue'),
        meta: {
          title: '跨考试纵向分析',
          roles: TEACHER_ROLES,
          icon: 'line-chart',
          hideInMenu: false,
          menuGroup: 'ai-analysis',
          menuGroupTitle: 'AI 分析',
          menuGroupIcon: 'experiment',
          menuGroupOrder: 5,
        },
      },
      {
        path: 'school-quality-dashboard',
        name: 'AdminSchoolQualityDashboard',
        component: () => import('@/views/admin/school-quality-dashboard.vue'),
        meta: {
          title: '校级质量分析',
          roles: TEACHER_ROLES,
          icon: 'bank',
          hideInMenu: false,
          menuGroup: 'ai-analysis',
          menuGroupTitle: 'AI 分析',
          menuGroupIcon: 'experiment',
          menuGroupOrder: 5,
        },
      },
      {
        path: 'marking-quality',
        name: 'AdminMarkingQuality',
        component: () => import('@/views/admin/marking-quality-dashboard.vue'),
        meta: {
          title: '阅卷质量监控',
          roles: TEACHER_ROLES,
          icon: 'safety',
          hideInMenu: true,
          keepAlive: true,
        },
      },
      {
        path: 'exam-exports',
        name: 'AdminExamExports',
        component: () => import('@/views/common/exam-export-tasks.vue'),
        meta: {
          title: '导出任务',
          roles: TEACHER_ROLES,
          icon: 'cloud-download',
          hideInMenu: true,
          keepAlive: true,
        },
      },
      {
        path: 'teaching-affairs-sync',
        name: 'AdminTeachingAffairsSync',
        component: () => import('@/views/admin/teaching-affairs-sync.vue'),
        meta: {
          title: '教务同步',
          roles: TEACHER_ROLES,
          icon: 'api',
          hideInMenu: true,
          keepAlive: true,
        },
      },
      {
        path: 'paper-archive/:archiveSetId/detail',
        redirect: {
          name: 'TeacherArchiveVolumeList',
          query: { sourceType: 'HISTORY_IMPORT' },
        },
      },
      {
        path: 'archive/:archiveId/detail',
        redirect: to => ({
          name: 'TeacherArchiveVolumeDetail',
          params: { volumeId: to.params.archiveId },
        }),
        meta: {
          title: '归档详情',
          roles: TEACHER_ROLES,
          hideInMenu: true,
        },
      },
    ],
  },
]

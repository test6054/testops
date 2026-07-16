/**
 * 考试阅卷路由（/teacher）
 *
 * L0 全局左栏：
 *   - 教师业务：阅卷概览、考试列表、归档工作台
 *   - AI 分析中心：教学 / 趋势 / 聚类 / 校级（单页 4 Tab）
 * L1：/teacher/exam-workspace/:examId/* 考试详情工作台
 */
import type { RouteRecordRaw } from 'vue-router'
import { RoleEnum } from '@/utils/permission'

const TEACHER_ROLES = [RoleEnum.SCH_TECH]
const ALL_TEACHER_ROLES = [RoleEnum.SUPER_ADMIN, ...TEACHER_ROLES]
const SCANNER_ADMIN_ROLES = [RoleEnum.SUPER_ADMIN]

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
          menuGroup: 'marking-workbench',
          menuGroupTitle: '工作台',
          menuGroupIcon: 'dashboard',
          menuGroupOrder: 1,
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
          menuGroup: 'marking-workbench',
          menuGroupTitle: '工作台',
          menuGroupIcon: 'dashboard',
          menuGroupOrder: 1,
        },
      },
      {
        path: 'exam-create',
        redirect: { name: 'TeacherCreateExam' },
      },
      {
        path: 'archive-volumes',
        name: 'TeacherArchiveVolumeList',
        component: () => import('@/views/teacher/archive-volume/archive-volume-list.vue'),
        meta: {
          title: '课程考核归档卷',
          roles: TEACHER_ROLES,
          icon: 'container',
          hideInMenu: false,
          keepAlive: true,
          menuGroup: 'archive-workbench',
          menuGroupTitle: '课程考核归档',
          menuGroupIcon: 'container',
          menuGroupOrder: 2,
        },
      },
      {
        path: 'archive-volumes/settings',
        name: 'TeacherArchiveVolumeSettings',
        component: () => import('@/views/teacher/archive-volume/archive-volume-settings.vue'),
        props: route => ({
          initialTab: typeof route.query.settingsTab === 'string'
            ? route.query.settingsTab
            : typeof route.query.tab === 'string'
              ? route.query.tab
              : undefined,
        }),
        meta: {
          title: '课程考核归档卷配置',
          roles: TEACHER_ROLES,
          hideInMenu: true,
          keepAlive: true,
          activeMenu: '/teacher/archive-volumes/settings',
        },
      },
      {
        path: 'archive-volumes/search',
        name: 'TeacherArchiveVolumeSearch',
        component: () => import('@/views/teacher/archive-volume-search.vue'),
        meta: {
          title: '材料检索',
          roles: TEACHER_ROLES,
          icon: 'search',
          hideInMenu: false,
          keepAlive: true,
          menuGroup: 'archive-workbench',
          menuGroupTitle: '课程考核归档',
          menuGroupIcon: 'container',
          menuGroupOrder: 2,
          activeMenu: '/teacher/archive-volumes/search',
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
        path: 'archive-volumes/eval-campaign',
        name: 'TeacherArchiveVolumeEvalCampaign',
        component: () => import('@/views/teacher/archive-volume/archive-volume-eval-campaign.vue'),
        meta: {
          title: '评估迎评',
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
        path: 'archive-volumes/access-pending',
        name: 'TeacherArchiveVolumeAccessPending',
        component: () => import('@/views/teacher/archive-volume/archive-volume-access-pending.vue'),
        meta: {
          title: '待审批查阅',
          roles: TEACHER_ROLES,
          hideInMenu: true,
          keepAlive: true,
          activeMenu: '/teacher/archive-volumes',
        },
      },
      {
        path: 'archive-volumes/suspected-mixed-scan',
        name: 'TeacherArchiveVolumeSuspectedMixedScan',
        component: () =>
          import('@/views/teacher/archive-volume/archive-volume-suspected-mixed-scan.vue'),
        meta: {
          title: '混扫复核待办',
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
          title: '课程考核归档卷审计',
          roles: TEACHER_ROLES,
          hideInMenu: true,
          keepAlive: true,
          activeMenu: '/teacher/archive-volumes',
        },
      },
      {
        path: 'archive-volumes/create',
        redirect: { name: 'TeacherCreateArchiveTask' },
      },
      {
        path: 'archive-volumes/create-offline',
        redirect: (to) => ({
          name: 'TeacherCreateArchiveTask',
          query: { ...to.query, provenance: 'CURRENT_TERM_OFFLINE' },
        }),
      },
      {
        path: 'archive-volumes/create-supplement',
        redirect: (to) => ({
          name: 'TeacherCreateArchiveTask',
          query: { ...to.query, provenance: 'HISTORICAL_DIGITIZE' },
        }),
      },
      {
        path: 'archive-volumes/remediation/:taskId',
        name: 'TeacherArchiveVolumeRemediationDetail',
        component: () => import('@/views/teacher/archive-volume/archive-volume-remediation-detail.vue'),
        meta: {
          title: '整改任务详情',
          roles: TEACHER_ROLES,
          hideInMenu: true,
          noCache: true,
          activeMenu: '/teacher/archive-volumes',
        },
      },
      {
        path: 'archive-volumes/scan-ops',
        name: 'TeacherArchiveScanOps',
        component: () => import('@/views/teacher/archive-volume/archive-scan-ops.vue'),
        meta: {
          title: '归档扫描运营',
          roles: TEACHER_ROLES,
          hideInMenu: true,
          keepAlive: true,
          activeMenu: '/teacher/archive-volumes',
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
          menuGroup: 'quality-admin',
          menuGroupTitle: '系统管理',
          menuGroupIcon: 'setting',
          menuGroupOrder: 5,
        },
      },
      {
        path: 'mark-tenant-grading-policy',
        name: 'AdminMarkTenantGradingPolicy',
        component: () => import('@/views/admin/mark-tenant-grading-policy.vue'),
        meta: {
          title: '租户阅卷策略',
          roles: TEACHER_ROLES,
          requireTenantAdmin: true,
          icon: 'setting',
          hideInMenu: false,
          keepAlive: true,
          menuGroup: 'quality-admin',
          menuGroupTitle: '系统管理',
          menuGroupIcon: 'setting',
          menuGroupOrder: 5,
        },
      },
      {
        path: 'archive-platform-templates',
        name: 'AdminArchivePlatformTemplates',
        component: () => import('@/views/teacher/archive-platform-template-admin.vue'),
        meta: {
          title: '归档模板配置',
          roles: ALL_TEACHER_ROLES,
          requireTenantAdmin: true,
          icon: 'database',
          hideInMenu: false,
          keepAlive: true,
          menuGroup: 'quality-admin',
          menuGroupTitle: '系统管理',
          menuGroupIcon: 'setting',
          menuGroupOrder: 5,
        },
      },
      {
        path: 'ai-analysis-center',
        name: 'TeacherAiAnalysisCenter',
        component: () => import('@/views/teacher/ai-analysis-center.vue'),
        meta: {
          title: 'AI 分析中心',
          roles: TEACHER_ROLES,
          icon: 'experiment',
          hideInMenu: false,
          keepAlive: true,
          menuGroup: 'ai-analysis',
          menuGroupTitle: 'AI 分析',
          menuGroupIcon: 'experiment',
          menuGroupOrder: 5,
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
    ],
  },
]

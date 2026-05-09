/**
 * 教师（SCH_TECH / CROP_ADMIN / CROP_USER）路由
 *
 * 阅卷端教师工作台包含四大主链路：
 *   ① 考试管理：考试列表、试卷模板、答题卡模板、考生名册
 *   ② 扫描与识别：扫描录入、异常待办、影像账本
 *   ③ 批阅流程：分派批阅、匿名批阅、进度看板、仲裁裁定
 *   ④ 成绩与发布：成绩确认、成绩发布、复核处理、成绩统计
 */
import type { RouteRecordRaw } from 'vue-router'
import { RoleEnum } from '@/utils/permission'

const TEACHER_ROLES = [RoleEnum.SCH_TECH, RoleEnum.CROP_ADMIN, RoleEnum.CROP_USER]
const ALL_TEACHER_ROLES = [RoleEnum.SUPER_ADMIN, ...TEACHER_ROLES]

export const teacherRoutes: RouteRecordRaw[] = [
  {
    path: '/teacher',
    name: 'TeacherLayout',
    component: () => import('@/layout/index.vue'),
    redirect: '/teacher/marking-overview',
    meta: {
      title: '阅卷工作台',
      roles: ALL_TEACHER_ROLES,
      icon: 'audit',
      hideInMenu: false,
    },
    children: [
      {
        path: 'marking-overview',
        name: 'TeacherMarkingOverview',
        component: () => import('@/views/teacher/marking-overview.vue'),
        meta: {
          title: '阅卷概览',
          roles: TEACHER_ROLES,
          icon: 'dashboard',
          hideInMenu: false,
        },
      },

      // ─── 考试管理 ─────────────────────────────────────────
      {
        path: 'exam-list',
        name: 'TeacherExamList',
        component: () => import('@/views/teacher/exam-list.vue'),
        meta: {
          title: '考试列表',
          roles: TEACHER_ROLES,
          icon: 'profile',
          hideInMenu: false,
          keepAlive: true,
          menuGroup: 'exam',
          menuGroupTitle: '考试管理',
          menuGroupIcon: 'schedule',
          menuGroupOrder: 1,
        },
      },
      {
        path: 'paper-template',
        name: 'TeacherPaperTemplate',
        component: () => import('@/views/teacher/paper-template.vue'),
        meta: {
          title: '试卷模板',
          roles: TEACHER_ROLES,
          icon: 'file-text',
          hideInMenu: false,
          keepAlive: true,
          menuGroup: 'exam',
          menuGroupTitle: '考试管理',
          menuGroupIcon: 'schedule',
          menuGroupOrder: 1,
        },
      },
      {
        path: 'answer-sheet-template',
        name: 'TeacherAnswerSheetTemplate',
        component: () => import('@/views/teacher/answer-sheet-template.vue'),
        meta: {
          title: '答题卡模板',
          roles: TEACHER_ROLES,
          icon: 'form',
          hideInMenu: false,
          keepAlive: true,
          menuGroup: 'exam',
          menuGroupTitle: '考试管理',
          menuGroupIcon: 'schedule',
          menuGroupOrder: 1,
        },
      },
      {
        path: 'candidate-roster',
        name: 'TeacherCandidateRoster',
        component: () => import('@/views/teacher/candidate-roster.vue'),
        meta: {
          title: '考生名册',
          roles: TEACHER_ROLES,
          icon: 'team',
          hideInMenu: false,
          keepAlive: true,
          menuGroup: 'exam',
          menuGroupTitle: '考试管理',
          menuGroupIcon: 'schedule',
          menuGroupOrder: 1,
        },
      },
      {
        path: 'exam/:examId/detail',
        name: 'TeacherExamDetail',
        component: () => import('@/views/teacher/exam-detail.vue'),
        meta: {
          title: '考试详情',
          roles: TEACHER_ROLES,
          icon: 'eye',
          hideInMenu: true,
          noCache: true,
        },
      },

      // ─── 扫描与识别 ───────────────────────────────────────
      {
        path: 'scan-upload',
        name: 'TeacherScanUpload',
        component: () => import('@/views/teacher/scan-upload.vue'),
        meta: {
          title: '扫描录入',
          roles: TEACHER_ROLES,
          icon: 'cloud-upload',
          hideInMenu: false,
          menuGroup: 'scan',
          menuGroupTitle: '扫描与识别',
          menuGroupIcon: 'scan',
          menuGroupOrder: 2,
        },
      },
      {
        path: 'scan-attention',
        name: 'TeacherScanAttention',
        component: () => import('@/views/teacher/scan-attention.vue'),
        meta: {
          title: '异常待办',
          roles: TEACHER_ROLES,
          icon: 'warning',
          hideInMenu: false,
          keepAlive: true,
          menuGroup: 'scan',
          menuGroupTitle: '扫描与识别',
          menuGroupIcon: 'scan',
          menuGroupOrder: 2,
        },
      },
      {
        path: 'image-ledger',
        name: 'TeacherImageLedger',
        component: () => import('@/views/teacher/image-ledger.vue'),
        meta: {
          title: '影像账本',
          roles: TEACHER_ROLES,
          icon: 'book',
          hideInMenu: false,
          keepAlive: true,
          menuGroup: 'scan',
          menuGroupTitle: '扫描与识别',
          menuGroupIcon: 'scan',
          menuGroupOrder: 2,
        },
      },
      {
        path: 'printer-management',
        name: 'TeacherPrinterManagement',
        component: () => import('@/views/teacher/printer-management.vue'),
        meta: {
          title: '设备管理',
          roles: TEACHER_ROLES,
          icon: 'printer',
          hideInMenu: false,
          keepAlive: true,
          menuGroup: 'scan',
          menuGroupTitle: '扫描与识别',
          menuGroupIcon: 'scan',
          menuGroupOrder: 2,
        },
      },

      // ─── 批阅流程 ─────────────────────────────────────────
      {
        path: 'review-assignment',
        name: 'TeacherReviewAssignment',
        component: () => import('@/views/teacher/review-assignment.vue'),
        meta: {
          title: '分派批阅',
          roles: TEACHER_ROLES,
          icon: 'deployment-unit',
          hideInMenu: false,
          menuGroup: 'review',
          menuGroupTitle: '批阅流程',
          menuGroupIcon: 'edit',
          menuGroupOrder: 3,
        },
      },
      {
        path: 'review-workspace',
        name: 'TeacherReviewWorkspace',
        component: () => import('@/views/teacher/review-workspace.vue'),
        meta: {
          title: '匿名批阅',
          roles: TEACHER_ROLES,
          icon: 'edit',
          hideInMenu: false,
          menuGroup: 'review',
          menuGroupTitle: '批阅流程',
          menuGroupIcon: 'edit',
          menuGroupOrder: 3,
        },
      },
      {
        path: 'review-progress',
        name: 'TeacherReviewProgress',
        component: () => import('@/views/teacher/review-progress.vue'),
        meta: {
          title: '进度看板',
          roles: TEACHER_ROLES,
          icon: 'line-chart',
          hideInMenu: false,
          keepAlive: true,
          menuGroup: 'review',
          menuGroupTitle: '批阅流程',
          menuGroupIcon: 'edit',
          menuGroupOrder: 3,
        },
      },
      {
        path: 'review-arbitration',
        name: 'TeacherReviewArbitration',
        component: () => import('@/views/teacher/review-arbitration.vue'),
        meta: {
          title: '仲裁裁定',
          roles: TEACHER_ROLES,
          icon: 'solution',
          hideInMenu: false,
          menuGroup: 'review',
          menuGroupTitle: '批阅流程',
          menuGroupIcon: 'edit',
          menuGroupOrder: 3,
        },
      },
      {
        path: 'review/task/:taskId',
        name: 'TeacherReviewTaskDetail',
        component: () => import('@/views/teacher/review-task-detail.vue'),
        meta: {
          title: '批阅任务',
          roles: TEACHER_ROLES,
          icon: 'edit',
          hideInMenu: true,
          noCache: true,
        },
      },

      // ─── 成绩与发布 ───────────────────────────────────────
      {
        path: 'score-finalize',
        name: 'TeacherScoreFinalize',
        component: () => import('@/views/teacher/score-finalize.vue'),
        meta: {
          title: '成绩确认',
          roles: TEACHER_ROLES,
          icon: 'check-square',
          hideInMenu: false,
          menuGroup: 'score',
          menuGroupTitle: '成绩与发布',
          menuGroupIcon: 'trophy',
          menuGroupOrder: 4,
        },
      },
      {
        path: 'score-publish',
        name: 'TeacherScorePublish',
        component: () => import('@/views/teacher/score-publish.vue'),
        meta: {
          title: '成绩发布',
          roles: TEACHER_ROLES,
          icon: 'notification',
          hideInMenu: false,
          menuGroup: 'score',
          menuGroupTitle: '成绩与发布',
          menuGroupIcon: 'trophy',
          menuGroupOrder: 4,
        },
      },
      {
        path: 'appeal-handle',
        name: 'TeacherAppealHandle',
        component: () => import('@/views/teacher/appeal-handle.vue'),
        meta: {
          title: '复核处理',
          roles: TEACHER_ROLES,
          icon: 'interaction',
          hideInMenu: false,
          keepAlive: true,
          menuGroup: 'score',
          menuGroupTitle: '成绩与发布',
          menuGroupIcon: 'trophy',
          menuGroupOrder: 4,
        },
      },
      {
        path: 'statistics',
        name: 'TeacherStatistics',
        component: () => import('@/views/teacher/statistics.vue'),
        meta: {
          title: '成绩统计',
          roles: TEACHER_ROLES,
          icon: 'bar-chart',
          hideInMenu: false,
          keepAlive: true,
          menuGroup: 'score',
          menuGroupTitle: '成绩与发布',
          menuGroupIcon: 'trophy',
          menuGroupOrder: 4,
        },
      },
    ],
  },
]

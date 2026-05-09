/**
 * 学生（SCH_STU）路由
 *
 * 阅卷端学生视角只面向"已发布的成绩"，三条主链路：
 *   - 我的成绩（最新一次考试的题目维度回看）
 *   - 历次考试（历史成绩列表）
 *   - 复核申请（对客观题异常判定或主观题评分提交复核）
 */
import type { RouteRecordRaw } from 'vue-router'
import { RoleEnum } from '@/utils/permission'

const STUDENT_ROLES = [RoleEnum.SCH_STU]

export const studentRoutes: RouteRecordRaw[] = [
  {
    path: '/student',
    name: 'StudentLayout',
    component: () => import('@/layout/index.vue'),
    redirect: '/student/score',
    meta: {
      title: '我的阅卷',
      roles: STUDENT_ROLES,
      icon: 'profile',
      hideInMenu: false,
    },
    children: [
      {
        path: 'score',
        name: 'StudentScore',
        component: () => import('@/views/student/score.vue'),
        meta: {
          title: '我的成绩',
          roles: STUDENT_ROLES,
          icon: 'file-done',
          hideInMenu: false,
        },
      },
      {
        path: 'exam-history',
        name: 'StudentExamHistory',
        component: () => import('@/views/student/exam-history.vue'),
        meta: {
          title: '历次考试',
          roles: STUDENT_ROLES,
          icon: 'history',
          hideInMenu: false,
          keepAlive: true,
        },
      },
      {
        path: 'appeal',
        name: 'StudentAppeal',
        component: () => import('@/views/student/appeal.vue'),
        meta: {
          title: '复核申请',
          roles: STUDENT_ROLES,
          icon: 'mail',
          hideInMenu: false,
        },
      },
      {
        path: 'score/:examId/detail',
        name: 'StudentScoreDetail',
        component: () => import('@/views/student/score-detail.vue'),
        meta: {
          title: '成绩详情',
          roles: STUDENT_ROLES,
          icon: 'eye',
          hideInMenu: true,
          noCache: true,
        },
      },
    ],
  },
]

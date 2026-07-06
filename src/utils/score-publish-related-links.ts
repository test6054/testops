/** 成绩发布旅程跨页导航项配置。 */
export type ScorePublishRelatedVariant = 'absence' | 'appeal' | 'confirm' | 'publish'

export interface ScorePublishRelatedLink {
  key: string
  label: string
  description: string
  routeName: string
}

export const SCORE_PUBLISH_RELATED_LINKS: Record<ScorePublishRelatedVariant, ScorePublishRelatedLink[]> = {
  absence: [
    {
      key: 'appeal',
      label: '成绩复核管理',
      description: '处理缺考相关的复核申请与成绩纠正。',
      routeName: 'TeacherExamWorkspaceScoreAppeal',
    },
    {
      key: 'exports',
      label: '导出含缺考标记的成绩',
      description: '生成含缺考、补考标记的 Excel 或 PDF 报表。',
      routeName: 'TeacherExamWorkspaceArchiveExports',
    },
    {
      key: 'marking-progress',
      label: '正评进度',
      description: '查看缺考试卷的阅卷与绑定状态。',
      routeName: 'TeacherExamWorkspaceMarkingProgress',
    },
  ],
  appeal: [
    {
      key: 'teaching-affairs',
      label: '教务同步回传',
      description: '将确认成绩同步至教务系统并查看对账。',
      routeName: 'TeacherExamWorkspaceArchiveTeachingAffairs',
    },
    {
      key: 'exports',
      label: '导出成绩报表',
      description: '生成 Excel / PDF 成绩文件与异步导出记录。',
      routeName: 'TeacherExamWorkspaceArchiveExports',
    },
    {
      key: 'question-analysis',
      label: '题目质量分析',
      description: '分析区分度、难度与重判计划。',
      routeName: 'TeacherExamWorkspaceArchiveQuestionAnalysis',
    },
    {
      key: 'absence',
      label: '缺考管理',
      description: '确认缺考记录、推导补考名单。',
      routeName: 'TeacherExamWorkspaceScoreAbsence',
    },
  ],
  confirm: [
    {
      key: 'publish',
      label: '成绩发布',
      description: '确认完成后向学生侧下发成绩。',
      routeName: 'TeacherExamWorkspaceScoreRelease',
    },
    {
      key: 'absence',
      label: '缺考确认',
      description: '核对出勤并确认缺考记录。',
      routeName: 'TeacherExamWorkspaceScoreAbsence',
    },
    {
      key: 'exports',
      label: '导出任务',
      description: '查看成绩与报表异步导出进度。',
      routeName: 'TeacherExamWorkspaceArchiveExports',
    },
  ],
  publish: [
    {
      key: 'confirm',
      label: '返回成绩确认',
      description: '复核异常成绩与风险项后再发布。',
      routeName: 'TeacherExamWorkspaceScoreSummary',
    },
    {
      key: 'absence',
      label: '缺考确认',
      description: '发布前须完成待确认缺考核对。',
      routeName: 'TeacherExamWorkspaceScoreAbsence',
    },
    {
      key: 'appeal',
      label: '成绩复核',
      description: '处理复核申请与批量纠正计划。',
      routeName: 'TeacherExamWorkspaceScoreAppeal',
    },
  ],
}

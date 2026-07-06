import type { ColumnType } from 'ant-design-vue/es/table'
import type { ExamScoreSummaryItemVO } from '@/apis/mark/exam-score'

export type ExamScoreSummaryTableVariant = 'finalize' | 'publish'

/** 成绩确认 / 发布页考生成绩表列；对齐原型 scores 表头，字段来自 ExamScoreSummaryItemVO。 */
export function buildExamScoreSummaryTableColumns(
  variant: ExamScoreSummaryTableVariant,
  hasDailyScoreConfig: boolean,
): ColumnType<ExamScoreSummaryItemVO>[] {
  const identityColumns: ColumnType<ExamScoreSummaryItemVO>[] = [
    { title: '学号', key: 'studentNo', width: 120 },
    { title: '姓名', key: 'studentName', width: 96 },
    {
      title: '班级',
      dataIndex: 'studentClassName',
      key: 'studentClassName',
      width: 140,
      ellipsis: true,
    },
  ]

  const scoreColumns: ColumnType<ExamScoreSummaryItemVO>[] = hasDailyScoreConfig
    ? [
        { title: '卷面分', key: 'examScore', width: 88, align: 'right' },
        { title: '平时分', key: 'dailyScore', width: 88, align: 'right' },
        { title: '总分', key: 'finalScore', width: 88, align: 'right' },
      ]
    : [{ title: '教师复核评分', key: 'finalScore', width: 112, align: 'right' }]

  const statusColumn: ColumnType<ExamScoreSummaryItemVO> = {
    title: '状态',
    key: 'finalScoreStatus',
    width: 100,
  }

  const confirmedColumn: ColumnType<ExamScoreSummaryItemVO> = {
    title: '确认时间',
    key: 'confirmedTime',
    width: 160,
  }

  const actionsColumn: ColumnType<ExamScoreSummaryItemVO> = {
    title: '操作',
    key: 'actions',
    width: variant === 'finalize' ? 320 : 280,
    fixed: 'right',
  }

  if (variant === 'finalize') {
    return [
      ...identityColumns,
      ...scoreColumns,
      { title: '偏差', key: 'bias', width: 120 },
      statusColumn,
      confirmedColumn,
      actionsColumn,
    ]
  }

  return [...identityColumns, ...scoreColumns, statusColumn, confirmedColumn, actionsColumn]
}

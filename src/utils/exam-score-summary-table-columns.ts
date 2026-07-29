import type { ColumnType } from 'ant-design-vue/es/table'
import type { ExamScoreSummaryItemResponse } from '@/apis/mark/exam-score'

export type ExamScoreSummaryTableVariant = 'finalize' | 'publish'

/** 成绩确认 / 发布页考生成绩表列；对齐原型 scores 表头，字段来自 ExamScoreSummaryItemResponse。 */
export function buildExamScoreSummaryTableColumns(
  variant: ExamScoreSummaryTableVariant,
  hasDailyScoreConfig: boolean,
): ColumnType<ExamScoreSummaryItemResponse>[] {
  const identityColumns: ColumnType<ExamScoreSummaryItemResponse>[] = [
    { title: '学号', key: 'studentNo', width: 120, fixed: 'left' },
    { title: '姓名', key: 'studentName', width: 96 },
    {
      title: '班级',
      dataIndex: 'studentClassName',
      key: 'studentClassName',
      width: 140,
      ellipsis: true,
    },
  ]

  const scoreColumns: ColumnType<ExamScoreSummaryItemResponse>[] = hasDailyScoreConfig
    ? [
        { title: '卷面分', key: 'examScore', width: 88, align: 'right' },
        { title: '平时分', key: 'dailyScore', width: 88, align: 'right' },
        { title: '总分', key: 'finalScore', width: 88, align: 'right' },
      ]
    : [{ title: '教师复核评分', key: 'finalScore', width: 112, align: 'right' }]

  const statusColumn: ColumnType<ExamScoreSummaryItemResponse> = {
    title: '状态',
    key: 'finalScoreStatus',
    width: 100,
  }

  const confirmedColumn: ColumnType<ExamScoreSummaryItemResponse> = {
    title: '确认时间',
    key: 'confirmedTime',
    width: 160,
  }

  const actionsColumn: ColumnType<ExamScoreSummaryItemResponse> = {
    title: '主行动',
    key: 'actions',
    align: 'right',
    // 行内 1 主行动 + ⋯，列宽收敛避免操作链占屏
    width: variant === 'finalize' ? 148 : 120,
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

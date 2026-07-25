import type { ColumnsType } from 'ant-design-vue/es/table'

export const dsColumns: ColumnsType = [
  { title: '渠道', dataIndex: 'channelCode', key: 'channelCode', width: 160 },
  { title: '通路', dataIndex: 'pathwayCode', key: 'pathwayCode', width: 120 },
  { title: '名称', dataIndex: 'datasourceName', key: 'datasourceName' },
  { title: '状态', key: 'enabled', width: 90 },
  { title: '最近同步', dataIndex: 'lastSyncTime', key: 'lastSyncTime', width: 170 },
  { title: '操作', key: 'actions', width: 200 },
]

export const mappingColumns: ColumnsType = [
  { title: '源字段', dataIndex: 'sourceFieldCode', key: 'sourceFieldCode', width: 160 },
  { title: '目标字段', dataIndex: 'targetFieldCode', key: 'targetFieldCode', width: 160 },
  { title: '目标分类', dataIndex: 'targetCategoryCode', key: 'targetCategoryCode', width: 140 },
  { title: '字典', dataIndex: 'dictionaryCode', key: 'dictionaryCode', width: 120 },
  { title: '转换', dataIndex: 'transformType', key: 'transformType', width: 140 },
  { title: '转换表达式', dataIndex: 'transformExpr', key: 'transformExpr', width: 180 },
  { title: '状态', key: 'enabled', width: 90 },
]

export const syncColumns: ColumnsType = [
  { title: '渠道', dataIndex: 'channelCode', key: 'channelCode', width: 140 },
  { title: '状态', dataIndex: 'taskStatus', key: 'taskStatus', width: 120 },
  { title: '成功', dataIndex: 'successCount', key: 'successCount', width: 80 },
  { title: '失败', dataIndex: 'failedCount', key: 'failedCount', width: 80 },
  { title: '跳过', dataIndex: 'skippedCount', key: 'skippedCount', width: 80 },
  { title: '开始时间', dataIndex: 'startedTime', key: 'startedTime', width: 170 },
  { title: '摘要', dataIndex: 'errorSummary', key: 'errorSummary', ellipsis: true },
]

export const unmatchedColumns: ColumnsType = [
  { title: '渠道', dataIndex: 'channelCode', key: 'channelCode', width: 140 },
  { title: '外部工号', dataIndex: 'externalTeacherCode', key: 'externalTeacherCode', width: 140 },
  { title: '外部姓名', dataIndex: 'externalName', key: 'externalName', width: 120 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 120 },
  { title: '操作', key: 'actions', width: 200 },
]

export const conflictColumns: ColumnsType = [
  { title: '渠道', dataIndex: 'channelCode', key: 'channelCode', width: 120 },
  { title: '字段', dataIndex: 'fieldCode', key: 'fieldCode', width: 120 },
  { title: '教师编号', dataIndex: 'teacherId', key: 'teacherId', width: 120 },
  { title: '外部值', dataIndex: 'externalValue', key: 'externalValue', ellipsis: true },
  { title: '本地值', dataIndex: 'localValue', key: 'localValue', ellipsis: true },
  { title: '状态', dataIndex: 'ticketStatus', key: 'ticketStatus', width: 120 },
  { title: '操作', key: 'actions', width: 280 },
]

export const failedMessageColumns: ColumnsType = [
  { title: '渠道', dataIndex: 'channelCode', key: 'channelCode', width: 130 },
  { title: '消息键', dataIndex: 'messageKey', key: 'messageKey', width: 210, ellipsis: true },
  { title: '契约', key: 'payloadContract', width: 90 },
  { title: '重试次数', dataIndex: 'retryCount', key: 'retryCount', width: 90 },
  { title: '失败原因', dataIndex: 'processMessage', key: 'processMessage', ellipsis: true },
  { title: '失败时间', dataIndex: 'processedTime', key: 'processedTime', width: 170 },
  { title: '操作', key: 'actions', width: 190, fixed: 'right' },
]

export const MESSAGE_ENVELOPE_RESERVED_FIELD_CODES = new Set([
  'teacher_number',
  'teacher_code',
  'teacher_name',
  'external_record_key',
])

export function hasReservedBagFieldCode(fields: Array<{ fieldCode: string }>) {
  return fields.some((item) => MESSAGE_ENVELOPE_RESERVED_FIELD_CODES.has(item.fieldCode.trim()))
}

export const cleanLogColumns: ColumnsType = [
  { title: '渠道', dataIndex: 'channelCode', key: 'channelCode', width: 130 },
  { title: '源字段', dataIndex: 'sourceFieldCode', key: 'sourceFieldCode', width: 140 },
  { title: '目标字段', dataIndex: 'targetFieldCode', key: 'targetFieldCode', width: 140 },
  { title: '转换', dataIndex: 'transformType', key: 'transformType', width: 120 },
  { title: '原始值', dataIndex: 'rawValue', key: 'rawValue', ellipsis: true },
  { title: '清洗值', dataIndex: 'cleanedValue', key: 'cleanedValue', ellipsis: true },
  { title: '说明', dataIndex: 'detailMessage', key: 'detailMessage', ellipsis: true },
  { title: '时间', dataIndex: 'createTime', key: 'createTime', width: 170 },
]

export const courseCodeMapColumns: ColumnsType = [
  { title: '来源系统', dataIndex: 'sourceSystemCode', key: 'sourceSystemCode', width: 140 },
  { title: '源课程', key: 'sourceCourse', width: 220 },
  { title: '规范课程', key: 'canonicalCourse', width: 220 },
  { title: '状态', key: 'enabled', width: 90 },
  { title: '更新时间', dataIndex: 'updateTime', key: 'updateTime', width: 170 },
  { title: '操作', key: 'actions', width: 140, fixed: 'right' },
]

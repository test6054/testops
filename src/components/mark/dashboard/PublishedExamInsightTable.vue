<template>
  <UiEmpty v-if="!insights.length" description="暂无已发布成绩学情" />
  <UiDataTable
    v-else
    :columns="columns"
    :data-source="insights"
    :pagination="false"
    row-key="examId"
    size="small"
    flat
  >
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'academicTerm'">
        {{ formatAcademicTerm(record) || '—' }}
      </template>
      <template v-else-if="column.key === 'passRate'">
        {{ formatPassRate(record.passRate) }}
      </template>
      <template v-else-if="column.key === 'scoreRange'">
        <span v-if="record.minScore != null && record.maxScore != null">
          {{ record.minScore }} ~ {{ record.maxScore }}
        </span>
        <span v-else>—</span>
      </template>
      <template v-else-if="column.key === 'passLine'">
        <span v-if="record.passScore != null && record.fullScore != null">
          {{ record.passScore }} / {{ record.fullScore }}
        </span>
        <span v-else-if="record.passScore != null">{{ record.passScore }}</span>
        <span v-else>—</span>
      </template>
      <template v-else-if="column.key === 'actions'">
        <UiButton size="sm" variant="ghost" @click="emit('statistics', record.examId)">
          统计
        </UiButton>
      </template>
    </template>
  </UiDataTable>
</template>

<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue'
import type { MarkTeacherDashboardPublishedExamInsightItemVO } from '@/apis/mark/teacher-dashboard'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import { formatSemester } from '@/types/enums/semester-enum'

defineOptions({ name: 'PublishedExamInsightTable' })

defineProps<{
  insights: MarkTeacherDashboardPublishedExamInsightItemVO[]
}>()

const emit = defineEmits<{
  statistics: [examId: string]
}>()

const columns: TableColumnsType<MarkTeacherDashboardPublishedExamInsightItemVO> = [
  { title: '考试', dataIndex: 'examName', ellipsis: true, width: 160 },
  { title: '学年学期', key: 'academicTerm', width: 120 },
  { title: '参考人数', dataIndex: 'participantCount', width: 80 },
  { title: '平均分', dataIndex: 'averageScore', width: 72 },
  { title: '分数段', key: 'scoreRange', width: 96 },
  { title: '及格线', key: 'passLine', width: 88 },
  { title: '及格率', key: 'passRate', width: 72 },
  { title: '操作', key: 'actions', width: 72, fixed: 'right' },
]

function formatAcademicTerm(record: MarkTeacherDashboardPublishedExamInsightItemVO): string {
  if (!record.academicYear && !record.semester) return ''
  return [record.academicYear, formatSemester(record.semester)].filter(Boolean).join(' · ')
}

function formatPassRate(value?: string): string {
  if (value == null || value === '') return '—'
  const rate = Number(value)
  if (!Number.isFinite(rate)) return '—'
  return `${(rate * 100).toFixed(1)}%`
}
</script>

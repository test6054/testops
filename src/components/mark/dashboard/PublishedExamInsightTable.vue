<template>
  <section class="published-insight-table">
    <header class="published-insight-table__head">
      <strong class="published-insight-table__title">学情明细</strong>
    </header>
    <UiEmpty
      v-if="!insights.length"
      size="sm"
      description="暂无已发布成绩学情"
      class="published-insight-table__empty"
    />
    <UiDataTable
      v-else
      pagination-mode="none"
      :columns="columns"
      :data-source="insights"
      :show-pagination="false"
      :sticky-header="false"
      row-key="examId"
      size="small"
      flat
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'academicYear'">
          {{ record.academicYear || '—' }}
        </template>
        <template v-else-if="column.key === 'semester'">
          {{ record.semester ? formatSemester(record.semester) : '—' }}
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
          <UiTableActions
            :items="[{ key: 'statistics', label: '统计' }]"
            split
            @action="() => emit('statistics', record.examId)"
          />
        </template>
      </template>
    </UiDataTable>
  </section>
</template>

<script lang="ts" setup>
import type { ColumnsType as TableColumnsType } from 'ant-design-vue/es/table'
import type { MarkTeacherDashboardPublishedExamInsightItemVO } from '@/apis/mark/teacher-dashboard'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import { formatSemester } from '@/types/enums/semester-enum'

defineOptions({ name: 'PublishedExamInsightTable' })

defineProps<{
  insights: MarkTeacherDashboardPublishedExamInsightItemVO[]
}>()

const emit = defineEmits<{
  statistics: [examId: string]
}>()

const columns: TableColumnsType<MarkTeacherDashboardPublishedExamInsightItemVO> = [
  { title: '考试', dataIndex: 'examName', ellipsis: true, width: 160, fixed: 'left' },
  { title: '学年', key: 'academicYear', width: 96 },
  { title: '学期', key: 'semester', width: 88 },
  { title: '参考人数', dataIndex: 'participantCount', width: 80 },
  { title: '平均分', dataIndex: 'averageScore', width: 72 },
  { title: '分数段', key: 'scoreRange', width: 96 },
  { title: '及格线', key: 'passLine', width: 88 },
  { title: '及格率', key: 'passRate', width: 72 },
  { title: '操作', key: 'actions', width: 72 },
]

function formatPassRate(value?: number): string {
  if (value == null) return '—'
  return `${(value * 100).toFixed(1)}%`
}
</script>

<style scoped>
.published-insight-table {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 88px;
}

.published-insight-table__head {
  margin-bottom: var(--dp-space-component);
}

.published-insight-table__title {
  font-size: var(--dp-font-size-md);
  font-weight: 600;
  color: var(--dp-text-primary);
}

.published-insight-table__empty {
  flex: 1;
  min-height: 88px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--dp-surface);
}
</style>

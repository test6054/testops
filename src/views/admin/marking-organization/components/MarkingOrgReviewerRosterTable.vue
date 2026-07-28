<template>
  <WorkbenchSurfaceCard flush class="org-roster">
    <template #head>
      <div class="org-roster__head">
        <h3 class="org-roster__title">阅卷教师</h3>
        <UiButton variant="ghost" size="sm" :loading="loading" @click="emit('refresh')">
          刷新指标
        </UiButton>
      </div>
    </template>

    <UiDataTable
      pagination-mode="none"
      :columns="columns"
      :data-source="rows"
      row-key="rowKey"
      size="middle"
      :show-pagination="false"
      flat
      :loading="loading"
      :total="rows.length"
      empty-description="暂无阅卷教师，请先在题组中配置"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'reviewerName'">
          <span class="org-roster__name">{{ record.reviewerName }}</span>
          <div v-if="record.reviewerTeacherNo" class="org-roster__sub">
            {{ record.reviewerTeacherNo }}
          </div>
        </template>
        <template v-else-if="column.key === 'role'">
          <UiTag :tone="record.roleTone" size="sm">{{ record.roleLabel }}</UiTag>
        </template>
        <template v-else-if="column.key === 'completion'">
          <div class="org-roster__progress">
            <div class="org-roster__bar">
              <div
                class="org-roster__bar-fill"
                :style="{
                  transform: `scaleX(${Math.max(0, Math.min(1, record.completionPercent / 100))})`,
                }"
              />
            </div>
            <span>{{ record.completionLabel }}</span>
          </div>
        </template>
        <template v-else-if="column.key === 'consistency'">
          <span :class="{ 'org-roster__warn': record.consistencyWarn }">{{
            record.consistencyLabel
          }}</span>
        </template>
      </template>
    </UiDataTable>
  </WorkbenchSurfaceCard>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { QuestionMarkingGroupResponse } from '@/apis/mark/marking-organization'
import type { ReviewerQualityMetricResponse } from '@/apis/mark/marking-quality'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { computed } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'

defineOptions({ name: 'MarkingOrgReviewerRosterTable' })

const props = defineProps<{
  groups: QuestionMarkingGroupResponse[]
  reviewerMetrics: ReviewerQualityMetricResponse[]
  loading?: boolean
}>()

const emit = defineEmits<{
  refresh: []
}>()

interface RosterRow {
  rowKey: string
  reviewerName: string
  reviewerTeacherNo: string
  groupName: string
  roleLabel: string
  roleTone: BadgeTone
  totalTasks: number | string
  submittedTasks: number | string
  completionPercent: number
  completionLabel: string
  consistencyLabel: string
  consistencyWarn: boolean
  avgTimeLabel: string
}

const columns: ColumnType<RosterRow>[] = [
  { title: '姓名', key: 'reviewerName', width: 140 },
  { title: '题组', dataIndex: 'groupName', key: 'groupName', width: 140 },
  { title: '角色', key: 'role', width: 88 },
  { title: '分配任务', dataIndex: 'totalTasks', key: 'totalTasks', width: 88, align: 'right' },
  {
    title: '已完成',
    dataIndex: 'submittedTasks',
    key: 'submittedTasks',
    width: 88,
    align: 'right',
  },
  { title: '完成率', key: 'completion', width: 120 },
  { title: '一致性', key: 'consistency', width: 88, align: 'right' },
  { title: '平均用时', dataIndex: 'avgTimeLabel', key: 'avgTimeLabel', width: 96, align: 'right' },
]

function formatConsistency(value: number | null | undefined): { label: string, warn: boolean } {
  if (value == null || Number.isNaN(value)) {
    return { label: '—', warn: false }
  }
  const numeric = Number(value)
  return {
    label: `${numeric.toFixed(1)}%`,
    warn: numeric < 90,
  }
}

function formatCompletion(total: number, submitted: number): { percent: number, label: string } {
  if (total <= 0) {
    return { percent: 0, label: '—' }
  }
  const percent = Math.round((submitted * 100) / total)
  return { percent, label: `${percent}%` }
}

const rows = computed((): RosterRow[] => {
  if (props.reviewerMetrics.length > 0) {
    return props.reviewerMetrics.map((metric) => {
      const group = props.groups.find((item) => item.id === metric.groupId)
      const isLeader = group?.leaderUserId === metric.reviewerUserId
      const completion = formatCompletion(metric.totalTasks, metric.submittedTasks)
      const consistency = formatConsistency(metric.consistencyRate)
      return {
        rowKey: `${metric.groupId ?? 'org'}-${metric.reviewerUserId}`,
        reviewerName: metric.reviewerUserName,
        reviewerTeacherNo: metric.reviewerTeacherNo,
        groupName: metric.groupName ?? '—',
        roleLabel: isLeader ? '组长' : '阅卷教师',
        roleTone: isLeader ? 'blue' : 'gray',
        totalTasks: metric.totalTasks,
        submittedTasks: metric.submittedTasks,
        completionPercent: completion.percent,
        completionLabel: completion.label,
        consistencyLabel: consistency.label,
        consistencyWarn: consistency.warn,
        avgTimeLabel: metric.avgTimeSeconds != null ? `${metric.avgTimeSeconds}s` : '—',
      }
    })
  }

  const fallbackRows: RosterRow[] = []
  for (const group of props.groups) {
    for (const reviewer of group.reviewers) {
      const isLeader = group.leaderUserId === reviewer.reviewerUserId
      fallbackRows.push({
        rowKey: `${group.id}-${reviewer.reviewerUserId}`,
        reviewerName: reviewer.reviewerUserName,
        reviewerTeacherNo: reviewer.reviewerTeacherNo,
        groupName: group.groupName,
        roleLabel: isLeader ? '组长' : '阅卷教师',
        roleTone: isLeader ? 'blue' : 'gray',
        totalTasks: '—',
        submittedTasks: '—',
        completionPercent: 0,
        completionLabel: '—',
        consistencyLabel: '—',
        consistencyWarn: false,
        avgTimeLabel: '—',
      })
    }
  }
  return fallbackRows
})
</script>

<style lang="scss" scoped>
.org-roster {
  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--dp-space-component);
    width: 100%;
  }

  &__title {
    margin: 0;
    font-size: var(--dp-font-size-md);
    font-weight: 600;
  }

  &__name {
    font-weight: 600;
  }

  &__sub {
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-muted);
  }

  &__progress {
    display: flex;
    align-items: center;
    gap: var(--dp-space-component-tight);
    font-size: var(--dp-font-size-xs);
  }

  &__bar {
    flex: 1;
    max-width: 60px;
    height: 3px;
    border-radius: 2px;
    background: var(--dp-bg-muted);
    overflow: hidden;
  }

  &__bar-fill {
    width: 100%;
    height: 100%;
    background: var(--dp-color-primary);
    transform-origin: left center;
    transition: transform var(--dp-duration-normal) var(--dp-ease-default);
  }

  &__warn {
    color: var(--dp-warning);
    font-weight: 600;
  }
}
</style>

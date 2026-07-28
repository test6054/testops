<template>
  <WorkbenchSurfaceCard flush class="org-assignment">
    <template #head>
      <div class="org-assignment__head">
        <h3 class="org-assignment__title">试题分配规则</h3>
        <UiButton v-if="canManage === true" variant="primary" size="sm" @click="emit('create-group')">
          <template #icon><PlusOutlined /></template>
          新建题组
        </UiButton>
      </div>
    </template>

    <UiDataTable
      pagination-mode="none"
      :columns="columns"
      :data-source="rows"
      row-key="groupId"
      size="small"
      :show-pagination="false"
      flat
      :total="rows.length"
      :empty-description="emptyDescription"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'groupName'">
          <span class="org-assignment__group-name">{{ record.groupName }}</span>
        </template>
        <template v-else-if="column.key === 'questions'">
          <div class="org-assignment__chips">
            <span v-for="q in record.questionLabels" :key="q" class="org-assignment__chip">{{
              q
            }}</span>
            <span v-if="record.questionLabels.length === 0" class="org-assignment__muted">整卷题组</span>
          </div>
        </template>
        <template v-else-if="column.key === 'questionType'">
          <UiTag :tone="record.typeTone" size="sm">{{ record.typeLabel }}</UiTag>
        </template>
        <template v-else-if="column.key === 'strategy'">
          <span class="org-assignment__strategy">{{ record.strategyLabel }}</span>
        </template>
        <template v-else-if="column.key === 'anonymity'">
          <UiTag :tone="record.anonymityTone" size="sm">{{ record.anonymityLabel }}</UiTag>
        </template>
        <template v-else-if="column.key === 'action'">
          <UiTableActions
            v-if="canManage === true && record.editable"
            :items="[{ key: 'edit', label: '编辑' }]"
            split
            @action="() => emit('edit-group', record.groupId)"
          />
        </template>
      </template>
      <template v-if="rows.length > 0" #summary>
        <UiTableSummaryRow>
          <UiTableSummaryCell :index="0">合计</UiTableSummaryCell>
          <UiTableSummaryCell :index="1">
            <span class="org-assignment__muted">{{ summaryQuestionCount }} 题</span>
          </UiTableSummaryCell>
          <UiTableSummaryCell :index="2" />
          <UiTableSummaryCell :index="3">
            <strong class="org-assignment__summary-num">{{ summaryTotalScore }}</strong>
          </UiTableSummaryCell>
          <UiTableSummaryCell :index="4" />
          <UiTableSummaryCell :index="5">
            <strong class="org-assignment__summary-num">{{ summaryReviewerCount }}</strong>
          </UiTableSummaryCell>
          <UiTableSummaryCell :index="6" />
          <UiTableSummaryCell :index="7" />
        </UiTableSummaryRow>
      </template>
    </UiDataTable>
  </WorkbenchSurfaceCard>
</template>

<script lang="ts" setup>
// MVR-945：canManage* 控制流仅认 === true
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  AllocationPolicyResponse,
  QuestionMarkingGroupResponse,
} from '@/apis/mark/marking-organization'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import { computed } from 'vue'
import { AnonymityModeDescription } from '@/apis/mark/anonymity-mode'
import {
  AllocationUnitDescription,
  MarkingAllocationModeDescription,
} from '@/apis/mark/marking-organization'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTableSummaryCell from '@/components/ui-guide/ui/UiTableSummaryCell.vue'
import UiTableSummaryRow from '@/components/ui-guide/ui/UiTableSummaryRow.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { AnonymityModeCode } from '@/types/enums/anonymity-mode-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'MarkingOrgAssignmentTable' })

const props = withDefaults(
  defineProps<{

  groups: QuestionMarkingGroupResponse[]
  allocationPolicies: AllocationPolicyResponse[]
  canManage?: boolean
}>(),
  {
  canManage: false,
  },
)

const emit = defineEmits<{
  'create-group': []
  'edit-group': [groupId: string]
}>()

interface AssignmentRow {
  groupId: string
  groupName: string
  questionLabels: string[]
  typeLabel: string
  typeTone: BadgeTone
  totalScore: number
  strategyLabel: string
  reviewerCount: number
  anonymityLabel: string
  anonymityTone: BadgeTone
  editable: boolean
}

const columns: ColumnType<AssignmentRow>[] = [
  { title: '阅卷题组', key: 'groupName', width: 160 },
  { title: '分配题目', key: 'questions', width: 220 },
  { title: '题目类型', key: 'questionType', width: 100 },
  { title: '分值合计', key: 'totalScore', dataIndex: 'totalScore', width: 88, align: 'right' },
  { title: '分配策略', key: 'strategy', width: 160 },
  {
    title: '评阅人数',
    key: 'reviewerCount',
    dataIndex: 'reviewerCount',
    width: 88,
    align: 'right',
  },
  { title: '匿名阅卷', key: 'anonymity', width: 96 },
  { title: '操作', key: 'action', width: 72 },
]

const emptyDescription = computed(() =>
  props.groups.length === 0 ? '暂无题组，创建后可配置题目范围与阅卷教师' : '当前筛选条件下无题组',
)

function resolveGroupPolicy(groupId: string): AllocationPolicyResponse | undefined {
  const groupPolicy = props.allocationPolicies.find((item) => item.groupId === groupId)
  if (groupPolicy) return groupPolicy
  return props.allocationPolicies.find((item) => item.groupId == null)
}

function resolveTypeLabel(group: QuestionMarkingGroupResponse): { label: string, tone: BadgeTone } {
  if (group.questions.length === 0) {
    return { label: '整卷', tone: 'gray' }
  }
  const messages = new Set(group.questions.map((q) => q.questionTypeMessage))
  if (messages.size === 1) {
    const label = group.questions[0]?.questionTypeMessage ?? '主观题'
    const tone: BadgeTone = label.includes('选') || label.includes('判断') ? 'blue' : 'orange'
    return { label, tone }
  }
  return { label: '混合', tone: 'gray' }
}

const rows = computed((): AssignmentRow[] =>
  props.groups.map((group) => {
    const policy = resolveGroupPolicy(group.id)
    const type = resolveTypeLabel(group)
    const totalScore = group.questions.reduce((sum, q) => sum + Number(q.fullScore ?? 0), 0)
    const strategyLabel = policy
      ? `${strictEnumLabel(MarkingAllocationModeDescription, policy.allocationMode, '分配模式')} · ${strictEnumLabel(AllocationUnitDescription, policy.allocationUnit, '批阅任务单元')}`
      : '未配置'
    const anonymityLabel = policy
      ? strictEnumLabel(AnonymityModeDescription, policy.anonymityMode, '匿名模式')
      : '—'
    const anonymityTone: BadgeTone
      = policy?.anonymityMode === AnonymityModeCode.ANONYMOUS ? 'green' : 'gray'
    return {
      groupId: group.id,
      groupName: group.groupName,
      questionLabels: group.questions.map((q) => `第${q.questionNo}题`),
      typeLabel: type.label,
      typeTone: type.tone,
      totalScore,
      strategyLabel,
      reviewerCount: group.reviewers.length,
      anonymityLabel,
      anonymityTone,
      // MVR-406：与 BE canEditQuestionGroup 同源；禁止仅认非 CLOSED
      editable: group.canEditQuestionGroup === true,
    }
  }),
)

const summaryQuestionCount = computed(() =>
  props.groups.reduce((sum, group) => sum + group.questions.length, 0),
)

const summaryTotalScore = computed(() => rows.value.reduce((sum, row) => sum + row.totalScore, 0))

const summaryReviewerCount = computed(() => {
  const ids = new Set<string>()
  for (const group of props.groups) {
    for (const reviewer of group.reviewers) {
      ids.add(reviewer.reviewerUserId)
    }
  }
  return ids.size
})
</script>

<style lang="scss" scoped>
.org-assignment {
  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--dp-space-component);
    width: 100%;
  }

  &__title {
    margin: 0;
    font-size: var(--dp-font-size-sm);
    font-weight: 600;
  }

  &__group-name {
    font-weight: 600;
  }

  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--dp-space-component-xs);
  }

  &__chip {
    display: inline-flex;
    padding: 0 var(--dp-space-component-tight);
    border-radius: var(--dp-radius-xs);
    background: var(--dp-bg-muted);
    font-size: var(--dp-font-size-xs);
    font-weight: 500;
    line-height: 20px;
  }

  &__muted {
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-muted);
  }

  &__strategy {
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-secondary);
  }

  &__summary-num {
    display: block;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
}
</style>

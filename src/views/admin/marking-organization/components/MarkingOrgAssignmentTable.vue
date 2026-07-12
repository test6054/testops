<template>
  <WorkbenchSurfaceCard flush class="org-assignment">
    <template #head>
      <div class="org-assignment__head">
        <h3 class="org-assignment__title">试题分配规则</h3>
        <UiButton v-if="canManage" variant="outline" size="sm" @click="emit('create-group')">
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
      size="middle"
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
            v-if="canManage && record.editable"
            :items="[{ key: 'edit', label: '编辑' }]"
            split
            @action="() => emit('edit-group', record.groupId)"
          />
        </template>
      </template>
      <template v-if="rows.length > 0" #summary>
        <a-table-summary-row>
          <a-table-summary-cell :index="0">合计</a-table-summary-cell>
          <a-table-summary-cell :index="1">
            <span class="org-assignment__muted">{{ summaryQuestionCount }} 题</span>
          </a-table-summary-cell>
          <a-table-summary-cell :index="2" />
          <a-table-summary-cell :index="3">
            <strong class="org-assignment__summary-num">{{ summaryTotalScore }}</strong>
          </a-table-summary-cell>
          <a-table-summary-cell :index="4" />
          <a-table-summary-cell :index="5">
            <strong class="org-assignment__summary-num">{{ summaryReviewerCount }}</strong>
          </a-table-summary-cell>
          <a-table-summary-cell :index="6" />
          <a-table-summary-cell :index="7" />
        </a-table-summary-row>
      </template>
    </UiDataTable>

    <footer v-if="rows.length > 0" class="org-assignment__footer">
      <strong>分配说明：</strong>
      主观题组建议启用匿名阅卷并由多名教师独立评分；分差超阈值将进入仲裁。客观题组可按轮询策略自动分配。
    </footer>
  </WorkbenchSurfaceCard>
</template>

<script lang="ts" setup>
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
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { AnonymityModeCode } from '@/types/enums/anonymity-mode-enum'
import { QuestionMarkingGroupStatusCode } from '@/types/enums/question-marking-group-status-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'MarkingOrgAssignmentTable' })

const props = defineProps<{
  groups: QuestionMarkingGroupResponse[]
  allocationPolicies: AllocationPolicyResponse[]
  canManage: boolean
}>()

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
  props.groups.length === 0 ? '暂无题组，创建后可配置题目范围与阅卷教师' : '当前没有可展示的内容',
)

function resolveGroupPolicy(groupId: string): AllocationPolicyResponse | undefined {
  const groupPolicy = props.allocationPolicies.find((item) => item.groupId === groupId)
  if (groupPolicy) return groupPolicy
  return props.allocationPolicies.find((item) => item.groupId == null)
}

function isEditable(status: QuestionMarkingGroupStatusCode): boolean {
  return status !== QuestionMarkingGroupStatusCode.GROUP_CLOSED
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
      editable: isEditable(group.groupStatus),
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
    gap: var(--dp-space-3);
    width: 100%;
  }

  &__title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }

  &__group-name {
    font-weight: 600;
  }

  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  &__chip {
    display: inline-flex;
    padding: 1px 6px;
    border-radius: 4px;
    background: var(--dp-surface-sunken);
    font-size: 12px;
    font-weight: 500;
  }

  &__muted {
    font-size: 12px;
    color: var(--dp-text-muted);
  }

  &__strategy {
    font-size: 12px;
    color: var(--dp-text-secondary);
  }

  &__summary-num {
    display: block;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  &__footer {
    padding: 12px 16px;
    border-top: 1px solid var(--dp-border);
    background: var(--dp-surface-sunken);
    font-size: 12px;
    line-height: 1.5;
    color: var(--dp-text-muted);
  }
}
</style>

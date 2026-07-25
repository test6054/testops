<template>
  <UiDescriptionGrid
    v-if="items.length > 0"
    :title="title"
    :description="description"
    :items="items"
    :columns="2"
    compact
    class="session-group-create-summary"
  />
</template>

<script lang="ts" setup>
import type {
  AllocationPolicyResponse,
  SessionCreateReadinessResponse,
  SessionGroupCreateReadinessResponse,
} from '@/apis/mark/marking-organization'
import type { UiDescriptionItem } from '@/components/ui-guide/ui/types'
import type { MarkingOrgSessionPhase } from '@/composables/useMarkingOrgSessionWorkspace'
import { computed } from 'vue'
import { AnonymityModeDescription } from '@/apis/mark/anonymity-mode'
import {
  AllocationUnitDescription,
  MarkingAllocationModeDescription,
} from '@/apis/mark/marking-organization'
import UiDescriptionGrid from '@/components/ui-guide/ui/UiDescriptionGrid.vue'
import { AllocationUnitCode } from '@/types/enums/allocation-unit-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'SessionGroupCreateSummary' })

const props = defineProps<{
  phase: MarkingOrgSessionPhase
  policy?: AllocationPolicyResponse
  groupReadiness?: SessionGroupCreateReadinessResponse
  sessionReadiness?: SessionCreateReadinessResponse | null
}>()

/** 与 edu-mark MarkingOrganizationServiceImpl.DEFAULT_TRIAL_SAMPLE_SIZE 保持一致 */
const MARKING_TRIAL_DEFAULT_SAMPLE_SIZE = 5

const title = computed(() => (props.phase === 'trial' ? '试评继承配置' : '正评继承配置'))

const description = computed(() =>
  props.phase === 'trial'
    ? '以下信息来自阅卷组织题组策略与当前扫描就绪状态，创建后启动试评时将按此配置抽样派发。'
    : '以下信息来自阅卷组织题组策略与当前扫描就绪状态，创建后在列表启动正评时固化题目范围并派发任务。',
)

const items = computed((): UiDescriptionItem[] => {
  if (!props.policy && !props.groupReadiness) {
    return []
  }

  const rows: UiDescriptionItem[] = []

  if (props.policy) {
    rows.push({
      key: 'allocation-unit',
      label: '批阅任务单元',
      value: strictEnumLabel(
        AllocationUnitDescription,
        props.policy.allocationUnit,
        '批阅任务单元',
      ),
    })
    rows.push({
      key: 'allocation-mode',
      label: '分配模式',
      value: strictEnumLabel(
        MarkingAllocationModeDescription,
        props.policy.allocationMode,
        '分配模式',
      ),
    })
    rows.push({
      key: 'anonymity-mode',
      label: '匿名模式',
      value: strictEnumLabel(AnonymityModeDescription, props.policy.anonymityMode, '匿名模式'),
    })
    if (props.policy.allocationUnit === AllocationUnitCode.RANDOM_QUESTIONS) {
      rows.push({
        key: 'random-sample-size',
        label: '随机题抽样数',
        value: props.policy.randomQuestionSampleSize ?? 0,
        valueTone: (props.policy.randomQuestionSampleSize ?? 0) > 0 ? 'blue' : 'orange',
        helper: '启动时从题组题目范围中随机抽取的题量',
      })
    }
  }

  if (props.groupReadiness) {
    rows.push({
      key: 'active-reviewer-count',
      label: '活跃评阅教师',
      value: props.groupReadiness.activeReviewerCount,
      valueTone: props.groupReadiness.activeReviewerCount > 0 ? 'blue' : 'orange',
    })
  }

  if (props.sessionReadiness) {
    rows.push({
      key: 'gradable-paper-count',
      label: '可评阅答卷',
      value: props.sessionReadiness.gradablePaperCount,
      valueTone: props.sessionReadiness.gradablePaperCount > 0 ? 'blue' : 'orange',
      helper: `已绑定 ${props.sessionReadiness.gradablePaperCount} 份 · 扫描批次 ${props.sessionReadiness.scanBatchCount} 个`,
    })
  }

  const allocationUnit = props.policy?.allocationUnit ?? props.groupReadiness?.allocationUnit
  if (
    allocationUnit
    && allocationUnit !== AllocationUnitCode.WHOLE_PAPER
    && props.groupReadiness?.registeredSliceCount != null
  ) {
    rows.push({
      key: 'registered-slice-count',
      label: '题组作答切片',
      value: props.groupReadiness.registeredSliceCount,
      valueTone: props.groupReadiness.registeredSliceCount > 0 ? 'blue' : 'orange',
      helper: '题组范围内已登记且关联有效扫描页的切片数',
    })
  }

  if (props.phase === 'trial') {
    rows.push({
      key: 'trial-sample-size',
      label: '试评样本量',
      value: `启动时最多 ${MARKING_TRIAL_DEFAULT_SAMPLE_SIZE} 份`,
      helper: '实际抽样不超过可评阅答卷或切片总量',
      span: 2,
    })
  }

  return rows
})
</script>

<style lang="scss" scoped>
.session-group-create-summary {
  margin-top: var(--dp-space-component-xs);
}
</style>

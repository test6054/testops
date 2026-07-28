<template>
  <WorkbenchSurfaceCard flush class="org-strategy">
    <template #head>
      <div class="org-strategy__head">
        <h3 class="org-strategy__title">分配策略</h3>
        <UiButton
          v-if="canManage === true && policiesLoadFailed !== true"
          variant="outline"
          size="sm"
          @click="emit('edit-policy')"
        >
          编辑策略
        </UiButton>
      </div>
    </template>

    <UiAlertStrip
      v-if="policiesLoadFailed"
      tone="error"
      dense
      title="分配策略加载失败"
      class="org-strategy__alert"
    />

    <dl v-else class="org-strategy__list">
      <div class="org-strategy__row">
        <dt>分配模式</dt>
        <dd>{{ allocationModeLabel }}</dd>
      </div>
      <div class="org-strategy__row">
        <dt>分配粒度</dt>
        <dd>{{ allocationUnitLabel }}</dd>
      </div>
      <div class="org-strategy__row">
        <dt>批次大小</dt>
        <dd>{{ allocationPolicy?.batchSize ?? '—' }} 份/批</dd>
      </div>
      <div class="org-strategy__row">
        <dt>在手上限</dt>
        <dd>{{ allocationPolicy?.loadLimit ?? '—' }} 份</dd>
      </div>
      <div class="org-strategy__row">
        <dt>试评样本量</dt>
        <dd>{{ allocationPolicy?.trialSampleSize ?? '—' }} 份</dd>
      </div>
      <div class="org-strategy__row">
        <dt>双评</dt>
        <dd>
          <UiTag :tone="dualMarkEnabled ? 'blue' : 'gray'" size="sm">
            {{ dualMarkEnabled ? '已启用' : '未启用' }}
          </UiTag>
        </dd>
      </div>
      <div v-if="dualMarkEnabled" class="org-strategy__row">
        <dt>双评分差阈值</dt>
        <dd>{{ dualMarkThresholdLabel }}</dd>
      </div>
      <div class="org-strategy__row">
        <dt>自动回收</dt>
        <dd>
          <UiTag :tone="autoRecycleEnabled ? 'green' : 'gray'" size="sm">
            {{ autoRecycleEnabled ? '已启用' : '已关闭' }}
          </UiTag>
        </dd>
      </div>
      <div class="org-strategy__row">
        <dt>回收超时</dt>
        <dd>{{ recyclePolicy?.timeoutMinutes ?? '—' }} min</dd>
      </div>
      <div class="org-strategy__row">
        <dt>匿名模式</dt>
        <dd>{{ anonymityLabel }}</dd>
      </div>
    </dl>
  </WorkbenchSurfaceCard>
</template>

<script lang="ts" setup>
// MVR-945：canManage* 控制流仅认 === true
import type {
  AllocationPolicyResponse,
  RecyclePolicyResponse,
} from '@/apis/mark/marking-organization'
import { computed } from 'vue'
import { AnonymityModeDescription } from '@/apis/mark/anonymity-mode'
import {
  AllocationUnitDescription,
  MarkingAllocationModeDescription,
} from '@/apis/mark/marking-organization'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'MarkingOrgStrategySummaryCard' })

const props = withDefaults(
  defineProps<{

  allocationPolicy?: AllocationPolicyResponse
  recyclePolicy?: RecyclePolicyResponse
  canManage?: boolean
  policiesLoadFailed?: boolean
}>(),
  {
    canManage: false,
  },
)
const emit = defineEmits<{
  'edit-policy': []
}>()

const allocationModeLabel = computed(() =>
  props.allocationPolicy
    ? strictEnumLabel(
        MarkingAllocationModeDescription,
        props.allocationPolicy.allocationMode,
        '分配模式',
      )
    : '未配置',
)

const allocationUnitLabel = computed(() =>
  props.allocationPolicy
    ? strictEnumLabel(
        AllocationUnitDescription,
        props.allocationPolicy.allocationUnit,
        '批阅任务单元',
      )
    : '—',
)

const dualMarkEnabled = computed(() => props.allocationPolicy?.dualMarkEnabled === true)

const dualMarkThresholdLabel = computed(() => {
  if (!dualMarkEnabled.value) {
    return '—'
  }
  const threshold = props.allocationPolicy?.dualMarkScoreDiffThreshold
  if (threshold == null) {
    return '须完全一致'
  }
  return `${threshold} 分`
})

const anonymityLabel = computed(() =>
  props.allocationPolicy
    ? strictEnumLabel(AnonymityModeDescription, props.allocationPolicy.anonymityMode, '匿名模式')
    : '—',
)

const autoRecycleEnabled = computed(() =>
  Boolean(props.recyclePolicy?.timeoutMinutes && props.recyclePolicy.timeoutMinutes > 0),
)
</script>

<style lang="scss" scoped>
.org-strategy {
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

  &__alert {
    margin: var(--dp-space-component-tight) var(--dp-space-component);
  }

  &__list {
    margin: 0;
    padding: var(--dp-space-component-tight) var(--dp-space-component);
  }

  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--dp-space-component);
    padding: var(--dp-space-component-tight) 0;
    border-bottom: 1px solid var(--dp-border-subtle);

    dt {
      margin: 0;
      font-size: var(--dp-font-size-xs);
      color: var(--dp-text-secondary);
    }

    dd {
      margin: 0;
      font-size: var(--dp-font-size-sm);
      color: var(--dp-text-primary);
    }

    &:last-child {
      border-bottom: none;
    }
  }
}
</style>

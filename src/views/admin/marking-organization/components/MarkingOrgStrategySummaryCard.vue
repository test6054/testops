<template>
  <WorkbenchSurfaceCard flush class="org-strategy">
    <template #head>
      <div class="org-strategy__head">
        <h3 class="org-strategy__title">分配策略</h3>
        <UiButton v-if="canManage" variant="outline" size="sm" @click="emit('edit-policy')">
          编辑策略
        </UiButton>
      </div>
    </template>

    <dl class="org-strategy__list">
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

    <footer class="org-strategy__footer">
      <strong>策略说明：</strong>
      {{ strategyHint }}
    </footer>
  </WorkbenchSurfaceCard>
</template>

<script lang="ts" setup>
import type { AllocationPolicyResponse, RecyclePolicyResponse } from '@/apis/mark/marking-organization'
import { computed } from 'vue'
import { AnonymityModeDescription } from '@/apis/mark/anonymity-mode'
import {
  AllocationUnitDescription,
  MarkingAllocationModeDescription,
} from '@/apis/mark/marking-organization'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'MarkingOrgStrategySummaryCard' })

const props = defineProps<{
  allocationPolicy?: AllocationPolicyResponse
  recyclePolicy?: RecyclePolicyResponse
  canManage: boolean
}>()

const emit = defineEmits<{
  'edit-policy': []
}>()

const allocationModeLabel = computed(() =>
  props.allocationPolicy
    ? strictEnumLabel(MarkingAllocationModeDescription, props.allocationPolicy.allocationMode, '分配模式')
    : '未配置',
)

const allocationUnitLabel = computed(() =>
  props.allocationPolicy
    ? strictEnumLabel(AllocationUnitDescription, props.allocationPolicy.allocationUnit, '批阅任务单元')
    : '—',
)

const anonymityLabel = computed(() =>
  props.allocationPolicy
    ? strictEnumLabel(AnonymityModeDescription, props.allocationPolicy.anonymityMode, '匿名模式')
    : '—',
)

const autoRecycleEnabled = computed(() =>
  Boolean(props.recyclePolicy?.timeoutMinutes && props.recyclePolicy.timeoutMinutes > 0),
)

const strategyHint = computed(() => {
  const unit = allocationUnitLabel.value
  const load = props.allocationPolicy?.loadLimit ?? '—'
  const timeout = props.recyclePolicy?.timeoutMinutes ?? '—'
  return `系统按 ${unit} 粒度分配任务，教师同时在手上限 ${load} 份，超时 ${timeout} 分钟未处理的任务将回收并重新分配。`
})
</script>

<style lang="scss" scoped>
.org-strategy {
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

  &__list {
    margin: 0;
    padding: 12px 16px;
  }

  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 0;
    border-bottom: 1px solid var(--dp-border-light, #f1f5f9);

    dt {
      margin: 0;
      font-size: 13px;
      color: var(--dp-text-secondary);
    }

    dd {
      margin: 0;
      font-size: 13px;
      font-weight: 600;
      text-align: right;
    }

    &:last-child {
      border-bottom: none;
    }
  }

  &__footer {
    padding: 12px 16px;
    border-top: 1px solid var(--dp-border);
    background: var(--dp-surface-sunken, #f8fafc);
    font-size: 12px;
    line-height: 1.5;
    color: var(--dp-text-muted);
  }
}
</style>

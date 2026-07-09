<template>
  <div v-if="visible" class="mark-quality-scope-bar">
    <div class="mark-quality-scope-bar__row">
      <span v-if="organizationLoading" class="mark-quality-scope-bar__hint">加载阅卷组织…</span>
      <template v-else-if="organizationDetail">
        <span v-if="mode === 'workbench'" class="mark-quality-scope-bar__org-label">
          阅卷组织：{{ organizationLabel }}
        </span>
        <a-select
          v-else
          :value="selectedOrganizationId"
          class="mark-quality-scope-bar__org-select"
          placeholder="选择阅卷组织"
          :options="organizationOptions"
          allow-clear
          @change="emitOrganizationChange"
        />
      </template>
      <span v-else class="mark-quality-scope-bar__hint">未配置阅卷组织</span>
    </div>
    <div v-if="showGroupScope && organizationDetail" class="mark-quality-scope-bar__row">
      <span class="mark-quality-scope-bar__scope-label">题组范围</span>
      <div class="mark-quality-scope-bar__chips">
        <UiButton
          :variant="selectedGroupId == null ? 'primary' : 'outline'"
          size="sm"
          @click="emitGroupChange(undefined)"
        >
          全部题组
        </UiButton>
        <UiButton
          v-for="group in organizationDetail.groups"
          :key="group.id"
          :variant="selectedGroupId === group.id ? 'primary' : 'outline'"
          size="sm"
          @click="emitGroupChange(group.id)"
        >
          {{ group.groupName }}
        </UiButton>
      </div>
    </div>
    <div
      v-else-if="mode === 'standalone' && organizationDetail"
      class="mark-quality-scope-bar__row"
    >
      <a-select
        :value="selectedGroupId"
        class="mark-quality-scope-bar__group-select"
        placeholder="选择题组（可选）"
        :options="groupOptions"
        allow-clear
        @change="emitGroupChangeSelect"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { DefaultOptionType, SelectValue } from 'ant-design-vue/es/select'
import type { MarkingOrganizationResponse } from '@/apis/mark/marking-organization'
import { computed } from 'vue'
import {
  MarkingOrganizationStatusDescription,
  QuestionMarkingGroupStatusDescription,
} from '@/apis/mark/marking-organization'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'MarkQualityScopeBar' })

const props = withDefaults(
  defineProps<{
    mode: 'workbench' | 'standalone'
    organizationDetail: MarkingOrganizationResponse | null
    selectedOrganizationId?: string
    selectedGroupId?: string
    organizationLoading?: boolean
    showGroupScope?: boolean
    visible?: boolean
  }>(),
  {
    organizationLoading: false,
    showGroupScope: false,
    visible: true,
  },
)

const emit = defineEmits<{
  (e: 'organization-change', organizationId: string | undefined): void
  (e: 'group-change', groupId: string | undefined): void
}>()

const organizationLabel = computed(() => {
  const org = props.organizationDetail
  if (!org) {
    return '—'
  }
  const status = strictEnumLabel(
    MarkingOrganizationStatusDescription,
    org.organizationStatus,
    '阅卷组织状态',
  )
  return `${org.leaderUserName} · ${status}`
})

const organizationOptions = computed<DefaultOptionType[]>(() => {
  const org = props.organizationDetail
  if (!org) {
    return []
  }
  return [
    {
      value: org.id,
      label: `阅卷组织 · ${strictEnumLabel(MarkingOrganizationStatusDescription, org.organizationStatus, '阅卷组织状态')} · 负责人 ${org.leaderUserName}`,
    },
  ]
})

const groupOptions = computed<DefaultOptionType[]>(() =>
  (props.organizationDetail?.groups ?? []).map((group) => ({
    value: group.id,
    label: `${group.groupName} · ${strictEnumLabel(QuestionMarkingGroupStatusDescription, group.groupStatus, '题组状态')} · 组长 ${group.leaderUserName}`,
  })),
)

function emitOrganizationChange(value: SelectValue): void {
  emit('organization-change', value != null ? String(value) : undefined)
}

function emitGroupChange(groupId: string | undefined): void {
  emit('group-change', groupId)
}

function emitGroupChangeSelect(value: SelectValue): void {
  emit('group-change', value != null ? String(value) : undefined)
}
</script>

<style lang="scss" scoped>
.mark-quality-scope-bar {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-3);
  margin-top: var(--dp-space-3);
  padding: var(--dp-space-3) var(--dp-space-4);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface);

  &__row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--dp-space-2);
  }

  &__org-label,
  &__scope-label {
    font-size: var(--dp-type-hint-size);
    color: var(--dp-text-muted);
    flex-shrink: 0;
  }

  &__org-label {
    font-size: var(--dp-type-body-size);
    color: var(--dp-text-primary);
    font-weight: 500;
  }

  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--dp-space-2);
  }

  &__org-select {
    width: 280px;
  }

  &__group-select {
    width: 240px;
  }

  &__hint {
    font-size: var(--dp-type-hint-size);
    color: var(--dp-text-muted);
  }
}
</style>

<script setup lang="ts">
// MVR-946：模板 canManage* 显隐/禁用仅认 === true
import type { ArchiveSelfCheckStatusCode } from '@/apis/mark/archive-volume'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import { computed, onMounted } from 'vue'
import {
  ARCHIVE_SELF_CHECK_STATUS_TONE,
  ArchiveSelfCheckStatusDescription,
} from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import WorkbenchContextGateStrip from '@/components/workbench/WorkbenchContextGateStrip.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useArchiveVolumeSelfCheck } from '@/composables/useArchiveVolumeSelfCheck'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'
import { RoleEnum } from '@/types/enums'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'ArchiveVolumeSelfCheckList' })

const props = withDefaults(
  defineProps<{
    volumeId: string
    selfCheckStatus?: ArchiveSelfCheckStatusCode
    readonly?: boolean
  }>(),
  {
    // MVR-380：默认拒绝假可写；仅父级显式 :readonly="false"（canEditSelfCheck）可勾选
    readonly: true,
  },
)
const emit = defineEmits<{
  "refreshed": []
  'open-sign-off': []
}>()
const authStore = useAuthStore()
const userStore = useUserStore()

/** MVR-247：自查空态「打开归档设置」与 settings 路由 requireTenantAdmin 同源 */
const canManageArchiveConfig = computed(
  () => authStore.userRole === RoleEnum.SUPER_ADMIN || userStore.isTenantAdmin,
)

const emptySelfCheckBody = computed(() =>
  canManageArchiveConfig.value === true
    ? '暂无自查项，请先在设置页配置模板'
    : '暂无自查项，请联系租户管理员在归档配置中配置模板',
)

const {
  loading,
  loadFailed,
  checking,
  exporting,
  items,
  selfCheckStatus,
  allRequiredChecked,
  loadSelfCheck,
  toggleItem,
  exportSelfCheck,
} = useArchiveVolumeSelfCheck(() => props.volumeId)

const effectiveStatus = computed(() => props.selfCheckStatus ?? selfCheckStatus.value)

const requiredCount = computed(() => items.value.filter((item) => item.requiredFlag).length)
const checkedRequiredCount = computed(
  () => items.value.filter((item) => item.requiredFlag && item.checked).length,
)

function statusLabel(code: ArchiveSelfCheckStatusCode) {
  return strictEnumLabel(ArchiveSelfCheckStatusDescription, code, 'selfCheckStatus')
}

function statusTone(code: ArchiveSelfCheckStatusCode): BadgeTone {
  return strictEnumTone(ARCHIVE_SELF_CHECK_STATUS_TONE, code, 'selfCheckStatus')
}

async function handleToggle(templateItemId: string, checked: boolean) {
  // MVR-306/380：与 readonly（!canEditSelfCheck）同源；仅 readonly===false 可写
  if (props.readonly !== false) {
    void message.warning('当前账号无自查项编辑权限')
    return
  }
  const item = items.value.find((row) => row.templateItemId === templateItemId)
  if (!item) return
  await toggleItem(item, checked)
  emit('refreshed')
}

function handleRowClick(item: { templateItemId: string, checked?: boolean }) {
  if (props.readonly !== false || checking.value || loadFailed.value) return
  void handleToggle(item.templateItemId, !item.checked)
}

onMounted(() => {
  void loadSelfCheck()
})

defineExpose({ loadSelfCheck })
</script>

<template>
  <WorkbenchSurfaceCard embedded class="archive-quality-panel archive-volume-self-check-list">
    <section class="archive-quality-panel__section">
      <div class="archive-quality-panel__section-head">
        <h3 class="archive-quality-panel__section-title">自检清单</h3>
        <UiTag :tone="statusTone(effectiveStatus)" size="sm">
          {{ statusLabel(effectiveStatus) }}
        </UiTag>
        <span
          v-if="items.length > 0 && !loadFailed"
          class="archive-volume-self-check-list__progress"
        >
          必查 {{ checkedRequiredCount }}/{{ requiredCount }}
        </span>
        <div class="archive-quality-panel__section-actions">
          <UiButton
            size="sm"
            variant="ghost"
            :loading="exporting === true"
            :disabled="items.length === 0"
            @click="exportSelfCheck"
          >
            导出
          </UiButton>
          <UiButton
            v-if="readonly === false && allRequiredChecked"
            size="sm"
            variant="primary"
            :disabled="loadFailed === true"
            @click="emit('open-sign-off')"
          >
            进入签字确认
          </UiButton>
        </div>
      </div>

      <UiAlertStrip
        v-if="loadFailed"
        tone="warning"
        dense
        inline
        title="自查清单加载失败"
        description="重新加载成功前不能勾选或进入签字确认"
      >
        <template #actions>
          <UiButton size="sm" variant="outline" :loading="loading === true" @click="loadSelfCheck">
            重新加载
          </UiButton>
        </template>
      </UiAlertStrip>

      <UiSkeletonState v-else-if="loading" variant="card" compact />

      <WorkbenchContextGateStrip
        v-else-if="items.length === 0"
        tag="未配置"
        :body="emptySelfCheckBody"
        cta-label="打开归档设置"
        list-route-name="TeacherArchiveVolumeSettings"
        :hide-cta="canManageArchiveConfig !== true"
      />

      <ul v-else class="archive-volume-self-check-list__items" role="list">
        <li
          v-for="item in items"
          :key="item.templateItemId"
          class="self-check-row"
          :class="{
            'self-check-row--interactive': readonly === false && !checking && !loadFailed,
            'self-check-row--done': item.checked,
          }"
          @click="handleRowClick(item)"
        >
          <span
            class="self-check-mark"
            :class="item.checked ? 'self-check-mark--done' : 'self-check-mark--pending'"
            aria-hidden="true"
          >
            {{ item.checked ? '✓' : '' }}
          </span>
          <span class="self-check-row__body">
            <span class="self-check-row__label">
              <span v-if="item.requiredFlag" class="self-check-row__req" aria-label="必查">必</span>
              {{ item.itemText }}
            </span>
            <span v-if="item.checked && item.checkedTime" class="self-check-row__time">
              已确认 · {{ formatDateTime(item.checkedTime) }}
            </span>
          </span>
        </li>
      </ul>
    </section>
  </WorkbenchSurfaceCard>
</template>

<style scoped lang="scss">
.archive-quality-panel {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4);
  padding: var(--dp-space-3) var(--dp-space-4);
}

.archive-quality-panel__section {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-3);
}

.archive-quality-panel__section-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--dp-space-2);
}

.archive-quality-panel__section-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-2);
  margin-left: auto;
}

.archive-quality-panel__section-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.archive-volume-self-check-list__progress {
  font-size: 12px;
  color: var(--dp-text-secondary);
}

.archive-volume-self-check-list__items {
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-control);
  overflow: hidden;
}

.self-check-row {
  display: flex;
  align-items: flex-start;
  gap: var(--dp-space-3);
  padding: 10px 12px;
  border-top: 1px solid var(--dp-border-subtle);
  background: var(--dp-surface);
  transition: background-color 0.2s ease-out;

  &:first-child {
    border-top: none;
  }
}

.self-check-row--done {
  background: color-mix(in srgb, var(--dp-success) 5%, var(--dp-surface));
}

.self-check-row--interactive {
  cursor: pointer;

  &:hover {
    background: var(--dp-surface-subtle);
  }
}

.self-check-mark {
  width: 18px;
  height: 18px;
  margin-top: 1px;
  border-radius: var(--dp-radius-full);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
}

.self-check-mark--done {
  background: var(--dp-green-600);
  color: var(--dp-text-inverse);
}

.self-check-mark--pending {
  background: var(--dp-surface-sunken);
  color: var(--dp-text-muted);
  border: 1px solid var(--dp-border);
}

.self-check-row__body {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.self-check-row__label {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 14px;
  line-height: 1.45;
  color: var(--dp-text-primary);
}

.self-check-row__req {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-top: 1px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  color: var(--dp-warning);
  background: color-mix(in srgb, var(--dp-warning) 14%, var(--dp-surface));
}

.self-check-row__time {
  font-size: 12px;
  font-family: var(--dp-font-mono), ui-monospace, monospace;
  color: var(--dp-text-muted);
}

@media (prefers-reduced-motion: reduce) {
  .self-check-row {
    transition: none;
  }
}
</style>

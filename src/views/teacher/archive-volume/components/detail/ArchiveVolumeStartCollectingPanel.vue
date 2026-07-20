<script setup lang="ts">
import type { ArchiveVolumeDetailResponse } from '@/apis/mark/archive-volume'
import message from 'ant-design-vue/es/message'
import { computed, ref } from 'vue'
import { startArchiveCollecting } from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { ArchiveVolumeStatusCode } from '@/types/enums/archive-volume-status-enum'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'

const props = defineProps<{
  detail: ArchiveVolumeDetailResponse
  canStartCollecting: boolean
}>()

const emit = defineEmits<{
  "started": []
  'open-materials': []
  'open-task-settings': []
  'open-collaborators': []
}>()

const starting = ref(false)

const volume = computed(() => props.detail.volume)
const isDraft = computed(() => volume.value.volumeStatus === ArchiveVolumeStatusCode.DRAFT)
const materialCount = computed(() => props.detail.materials?.length ?? 0)
const collaboratorCount = computed(() => props.detail.collaborators?.length ?? 0)

const readinessRows = computed(() => [
  {
    key: 'template',
    label: '模板套',
    value: volume.value.templateSetCode || '未绑定',
    ready: Boolean(volume.value.templateSetCode),
  },
  {
    key: 'materials',
    label: '材料槽位',
    value: materialCount.value > 0 ? `${materialCount.value} 项` : '无槽位',
    ready: materialCount.value > 0,
  },
  {
    key: 'due',
    label: '归档截止',
    value: formatDateTime(volume.value.archiveDueTime) || '未设置',
    ready: Boolean(volume.value.archiveDueTime),
  },
  {
    key: 'team',
    label: '协作成员',
    value: collaboratorCount.value > 0 ? `${collaboratorCount.value} 人` : '仅责任人',
    ready: true,
  },
])

async function handleStart(): Promise<void> {
  if (starting.value) return
  if (props.canStartCollecting !== true) {
    message.warning('当前账号无开始收材权限')
    return
  }
  starting.value = true
  try {
    await startArchiveCollecting(volume.value.volumeId)
    message.success('已开始收材')
    emit('started')
  } catch (error) {
    showUserError(error, '开始收材失败')
  } finally {
    starting.value = false
  }
}
</script>

<template>
  <WorkbenchSurfaceCard embedded class="av-start">
    <header class="av-start__header">
      <div class="av-start__title-row">
        <h3 class="av-start__title">开始收材</h3>
        <UiTag v-if="isDraft" tone="orange" size="sm">草稿</UiTag>
        <UiTag v-else tone="blue" size="sm">已开收</UiTag>
      </div>
      <p class="av-start__intro">
        确认任务配置与协作人员后，正式进入材料收集阶段。开始后不可回退为草稿。
      </p>
    </header>

    <section class="av-start__section">
      <h4 class="av-start__heading">开收前核对</h4>
      <ul class="av-start__checklist">
        <li v-for="row in readinessRows" :key="row.key" class="av-start__check-row">
          <span
            class="av-start__check-dot"
            :class="row.ready ? 'av-start__check-dot--ready' : 'av-start__check-dot--warn'"
          />
          <span class="av-start__check-label">{{ row.label }}</span>
          <span class="av-start__check-value">{{ row.value }}</span>
        </li>
      </ul>
      <div class="av-start__links">
        <UiButton size="sm" variant="ghost" @click="emit('open-task-settings')">任务设置</UiButton>
        <UiButton size="sm" variant="ghost" @click="emit('open-collaborators')">协作管理</UiButton>
      </div>
    </section>

    <section class="av-start__commit">
      <template v-if="isDraft && canStartCollecting === true">
        <p class="av-start__commit-hint">
          开始收材后，材料登记、扫描与质检链路将对协作老师开放。
        </p>
        <UiButton variant="primary" size="md" :loading="starting" @click="handleStart">
          确认开始收材
        </UiButton>
      </template>
      <template v-else-if="isDraft">
        <p class="av-start__commit-hint">当前账号无开始收材权限，请联系归档责任人操作。</p>
      </template>
      <template v-else>
        <p class="av-start__commit-hint">本卷已进入收材或后续阶段。</p>
        <UiButton size="sm" variant="outline" @click="emit('open-materials')">去材料收集</UiButton>
      </template>
    </section>
  </WorkbenchSurfaceCard>
</template>

<style scoped lang="scss">
.av-start {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4);
  padding: var(--dp-space-4);
  max-width: 640px;
}

.av-start__header {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-2);
}

.av-start__title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--dp-space-2);
}

.av-start__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--dp-text-primary);
}

.av-start__intro {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--dp-text-secondary);
  max-width: 65ch;
}

.av-start__section {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-3);
  padding: var(--dp-space-3);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: var(--dp-radius-control, 6px);
  background: var(--dp-surface-subtle, var(--dp-bg-layout));
}

.av-start__heading {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--dp-text-primary);
}

.av-start__checklist {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.av-start__check-row {
  display: grid;
  grid-template-columns: 10px 96px 1fr;
  align-items: center;
  gap: var(--dp-space-2);
  padding: 8px 10px;
  border-radius: 4px;
  background: var(--dp-surface);
  font-size: 13px;
  transition: background-color 0.15s ease, box-shadow 0.15s ease;

  &:hover {
    background: color-mix(in srgb, var(--dp-primary) 4%, var(--dp-surface));
    box-shadow: 0 1px 2px color-mix(in srgb, var(--dp-text-muted) 8%, transparent);
  }
}

.av-start__check-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--dp-text-muted);

  &--ready {
    background: var(--ant-color-success);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--ant-color-success) 18%, transparent);
  }

  &--warn {
    background: var(--ant-color-warning);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--ant-color-warning) 18%, transparent);
  }
}

.av-start__check-label {
  color: var(--dp-text-muted);
}

.av-start__check-value {
  color: var(--dp-text-primary);
  font-variant-numeric: tabular-nums;
}

.av-start__links {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-1);
}

.av-start__commit {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--dp-space-3);
  padding: var(--dp-space-4);
  border: 1px solid color-mix(in srgb, var(--ant-color-primary) 22%, transparent);
  border-radius: var(--dp-radius-control, 6px);
  background: color-mix(in srgb, var(--ant-color-primary) 5%, var(--dp-surface));
}

.av-start__commit-hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--dp-text-secondary);
  max-width: 52ch;
}

@media (prefers-reduced-motion: reduce) {
  .av-start__check-row {
    transition: none;
  }
}
</style>

<script setup lang="ts">
import type {
  ArchiveVolumeDetailResponse,
  ArchiveVolumeStartCollectingCheckItem,
  ArchiveVolumeStartCollectingPrecheckResponse,
} from '@/apis/mark/archive-volume'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, ref, watch } from 'vue'
import {
  precheckArchiveStartCollecting,
  startArchiveCollecting,
} from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { ArchiveVolumeStatusCode } from '@/types/enums/archive-volume-status-enum'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import ArchiveVolumeCollaboratorStrip from '@/views/teacher/archive-volume/components/ArchiveVolumeCollaboratorStrip.vue'

const props = defineProps<{
  detail: ArchiveVolumeDetailResponse
  canStartCollecting: boolean
}>()

const emit = defineEmits<{
  started: []
  navigate: [tabKey: string]
}>()

const starting = ref(false)
const loadingPrecheck = ref(false)
const precheck = ref<ArchiveVolumeStartCollectingPrecheckResponse | null>(null)
const precheckError = ref<string | null>(null)

const volume = computed(() => props.detail.volume)
const collaborators = computed(() => props.detail.collaborators ?? [])
const isDraft = computed(() => volume.value.volumeStatus === ArchiveVolumeStatusCode.DRAFT)

const readinessRows = computed((): ArchiveVolumeStartCollectingCheckItem[] => {
  return precheck.value?.items ?? []
})

const blockingCount = computed(
  () => readinessRows.value.filter((row) => row.required && !row.ready).length,
)
const warnCount = computed(
  () => readinessRows.value.filter((row) => !row.required && !row.ready).length,
)
const canCommit = computed(
  () =>
    isDraft.value
    && props.canStartCollecting === true
    && precheck.value?.canStart === true
    && blockingCount.value === 0
    && !precheckError.value,
)

const completionSummaryRows = computed(() => [
  { key: 'title', label: '归档标题', value: volume.value.archiveTitle || '—' },
  { key: 'template', label: '模板套', value: volume.value.templateSetCode || '—' },
  {
    key: 'due',
    label: '归档截止',
    value: formatDateTime(volume.value.archiveDueTime) || '未设置',
  },
  {
    key: 'team',
    label: '协作成员',
    value: collaborators.value.length > 0 ? `${collaborators.value.length} 人` : '—',
  },
])

async function loadPrecheck(): Promise<void> {
  if (!isDraft.value) {
    precheck.value = null
    precheckError.value = null
    return
  }
  loadingPrecheck.value = true
  precheckError.value = null
  try {
    precheck.value = await precheckArchiveStartCollecting(volume.value.volumeId)
  } catch (error) {
    precheck.value = null
    precheckError.value = '开收预检加载失败'
    showUserError(error, '加载开收预检失败')
  } finally {
    loadingPrecheck.value = false
  }
}

watch(
  () => [
    volume.value.volumeId,
    volume.value.volumeStatus,
    volume.value.templateSetCode,
    volume.value.archiveDueTime,
    props.detail.materials?.length ?? 0,
    props.detail.collaborators?.length ?? 0,
    props.canStartCollecting,
  ],
  () => {
    void loadPrecheck()
  },
)

onMounted(() => {
  void loadPrecheck()
})

function navigateTo(tabKey: string): void {
  if (!tabKey) return
  emit('navigate', tabKey)
}

function onCheckItemActivate(row: ArchiveVolumeStartCollectingCheckItem): void {
  if (!row.actionTab) return
  navigateTo(row.actionTab)
}

async function handleStart(): Promise<void> {
  if (starting.value) return
  if (props.canStartCollecting !== true) {
    message.warning('当前账号无开始收材权限')
    return
  }
  await loadPrecheck()
  if (precheck.value?.canStart !== true || blockingCount.value > 0) {
    message.warning('请先补齐开收前必填项')
    return
  }
  const confirmed = await confirmAsync({
    title: '确认开始收材？',
    content:
      '开始后卷状态不可回退为草稿。材料登记、扫描与编目将按协作角色对老师开放，并通知协作成员。',
    type: 'warning',
    okText: '确认开始',
    cancelText: '取消',
  })
  if (!confirmed) return
  starting.value = true
  try {
    await startArchiveCollecting(volume.value.volumeId)
    message.success('已开始收材')
    emit('started')
  } catch (error) {
    showUserError(error, '开始收材失败')
    await loadPrecheck()
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
        <template v-if="isDraft">
          确认卷身份、模板与协作分工后正式开收。开始后不可回退草稿，协作老师将按角色获得材料与扫描权限。
        </template>
        <template v-else>
          本卷已进入收材或后续阶段。侧栏不再展示开收入口；本页为深链只读完成态。
        </template>
      </p>
    </header>

    <template v-if="isDraft">
      <section class="av-start__section">
        <div class="av-start__heading-row">
          <h4 class="av-start__heading">开收前核对</h4>
          <UiButton
            size="sm"
            variant="ghost"
            :loading="loadingPrecheck"
            @click="loadPrecheck"
          >
            刷新预检
          </UiButton>
        </div>
        <ul v-if="readinessRows.length" class="av-start__checklist">
          <li
            v-for="row in readinessRows"
            :key="row.itemKey"
            class="av-start__check-row"
            :class="{
              'av-start__check-row--action': Boolean(row.actionTab),
              'av-start__check-row--blocked': row.required && !row.ready,
            }"
            :role="row.actionTab ? 'button' : undefined"
            :tabindex="row.actionTab ? 0 : undefined"
            @click="onCheckItemActivate(row)"
            @keydown.enter.prevent="onCheckItemActivate(row)"
            @keydown.space.prevent="onCheckItemActivate(row)"
          >
            <span
              class="av-start__check-dot"
              :class="row.ready ? 'av-start__check-dot--ready' : 'av-start__check-dot--warn'"
            />
            <span class="av-start__check-label">
              {{ row.label }}
              <span v-if="row.required" class="av-start__required">必填</span>
            </span>
            <span class="av-start__check-value">{{ row.message }}</span>
            <span v-if="row.actionTab" class="av-start__check-go">去处理</span>
          </li>
        </ul>
        <p v-else-if="loadingPrecheck" class="av-start__hint">正在加载预检…</p>
        <p v-else class="av-start__hint av-start__hint--warn">
          {{ precheckError || '预检结果未加载，请刷新后重试。' }}
        </p>
        <div class="av-start__links">
          <UiButton size="sm" variant="ghost" @click="navigateTo('task-settings')">
            任务设置
          </UiButton>
          <UiButton size="sm" variant="ghost" @click="navigateTo('collaborators')">
            协作管理
          </UiButton>
        </div>
      </section>

      <section v-if="collaborators.length" class="av-start__section">
        <div class="av-start__heading-row">
          <h4 class="av-start__heading">将开放给</h4>
          <UiButton
            v-if="canStartCollecting"
            size="sm"
            variant="ghost"
            @click="navigateTo('collaborators')"
          >
            调整分工
          </UiButton>
        </div>
        <ArchiveVolumeCollaboratorStrip
          :collaborators="collaborators"
          :can-manage="false"
        />
        <p class="av-start__hint">
          开收后，材料登记、扫描与质检按上表角色开放；系统将通知协作成员（不含操作者本人）。
        </p>
      </section>

      <section class="av-start__commit">
        <template v-if="canStartCollecting === true">
          <p v-if="precheckError" class="av-start__hint av-start__hint--warn">
            预检未通过加载，无法确认开收。请刷新预检后重试。
          </p>
          <p v-else-if="blockingCount > 0" class="av-start__hint av-start__hint--warn">
            仍有 {{ blockingCount }} 项必填未就绪，补齐后方可开始收材。点击未就绪项可跳转处理。
          </p>
          <p v-else-if="warnCount > 0" class="av-start__hint">
            必填项已就绪；另有 {{ warnCount }} 项建议补齐（不阻断开收）。
          </p>
          <p v-else class="av-start__hint">
            核对通过。确认后状态变为收材中，不可回退。
          </p>
          <UiButton
            variant="primary"
            size="md"
            :loading="starting || loadingPrecheck"
            :disabled="!canCommit"
            @click="handleStart"
          >
            确认开始收材
          </UiButton>
        </template>
        <template v-else>
          <p class="av-start__hint">当前账号无开始收材权限，请联系归档责任人（ORGANIZER）操作。</p>
          <UiButton size="sm" variant="outline" @click="navigateTo('collaborators')">
            查看协作管理
          </UiButton>
        </template>
      </section>
    </template>

    <template v-else>
      <section class="av-start__section">
        <h4 class="av-start__heading">开收完成摘要</h4>
        <dl class="av-start__summary">
          <div v-for="row in completionSummaryRows" :key="row.key" class="av-start__summary-row">
            <dt>{{ row.label }}</dt>
            <dd>{{ row.value }}</dd>
          </div>
        </dl>
      </section>

      <section v-if="collaborators.length" class="av-start__section">
        <h4 class="av-start__heading">协作组</h4>
        <ArchiveVolumeCollaboratorStrip
          :collaborators="collaborators"
          :can-manage="false"
        />
      </section>

      <section class="av-start__commit">
        <p class="av-start__hint">
          收材已开始，请继续材料登记与扫描。侧栏「开始收材」入口已隐藏。
        </p>
        <div class="av-start__links">
          <UiButton variant="primary" size="md" @click="navigateTo('materials')">
            去材料收集
          </UiButton>
          <UiButton size="sm" variant="outline" @click="navigateTo('collaborators')">
            协作管理
          </UiButton>
          <UiButton size="sm" variant="ghost" @click="navigateTo('task-settings')">
            任务设置
          </UiButton>
        </div>
      </section>
    </template>
  </WorkbenchSurfaceCard>
</template>

<style scoped lang="scss">
.av-start {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4);
  padding: var(--dp-space-4);
  max-width: 720px;
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

.av-start__heading-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-2);
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
  grid-template-columns: 10px minmax(96px, 128px) 1fr auto;
  align-items: center;
  gap: var(--dp-space-2);
  padding: 8px 10px;
  border-radius: 4px;
  background: var(--dp-surface);
  font-size: 13px;

  &--action {
    cursor: pointer;

    &:hover {
      background: color-mix(in srgb, var(--ant-color-primary) 6%, var(--dp-surface));
    }

    &:focus-visible {
      outline: 2px solid var(--ant-color-primary);
      outline-offset: 1px;
    }
  }

  &--blocked {
    box-shadow: inset 2px 0 0 var(--ant-color-error);
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
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.av-start__required {
  font-size: 11px;
  color: var(--ant-color-error);
}

.av-start__check-value {
  color: var(--dp-text-primary);
  font-variant-numeric: tabular-nums;
}

.av-start__check-go {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--ant-color-primary);
}

.av-start__summary {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.av-start__summary-row {
  display: grid;
  grid-template-columns: 88px 1fr;
  gap: var(--dp-space-2);
  padding: 8px 10px;
  border-radius: 4px;
  background: var(--dp-surface);
  font-size: 13px;

  dt {
    margin: 0;
    color: var(--dp-text-muted);
  }

  dd {
    margin: 0;
    color: var(--dp-text-primary);
    word-break: break-word;
  }
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

.av-start__hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--dp-text-secondary);
  max-width: 56ch;

  &--warn {
    color: var(--ant-color-warning);
  }
}
</style>

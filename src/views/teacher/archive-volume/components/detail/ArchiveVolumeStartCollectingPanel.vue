<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchiveMaterialCatalogTemplateResponse,
  ArchiveTenantTemplateSetResponse,
} from '@/apis/mark/archive-platform-template'
import type {
  ArchiveVolumeDetailResponse,
  ArchiveVolumeStartCollectingCheckItem,
  ArchiveVolumeStartCollectingPrecheckResponse,
  ArchiveVolumeTaskSettingsUpdateRequest,
} from '@/apis/mark/archive-volume'
import type { UiSelectOption } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, ref, watch } from 'vue'
import { listArchiveTenantTemplateSets } from '@/apis/mark/archive-platform-template'
import {
  precheckArchiveStartCollecting,
  startArchiveCollecting,
  updateArchiveVolumeTaskSettings,
} from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiDatePicker from '@/components/ui-guide/ui/DatePicker.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { ArchiveExamFormDescription } from '@/types/enums/archive-exam-form-enum'
import {
  ArchiveMaterialDeliveryModeCode,
  ArchiveMaterialDeliveryModeDescription,
} from '@/types/enums/archive-material-delivery-mode-enum'
import { ArchiveMaterialTypeDescription } from '@/types/enums/archive-material-type-enum'
import { ArchiveVolumeStatusCode } from '@/types/enums/archive-volume-status-enum'
import { isSemesterCode } from '@/types/enums/semester-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel } from '@/utils/strict-enum'
import ArchiveVolumeCollaboratorStrip from '@/views/teacher/archive-volume/components/ArchiveVolumeCollaboratorStrip.vue'

const props = defineProps<{
  detail: ArchiveVolumeDetailResponse
  canStartCollecting: boolean
  canManageCollaborators: boolean
  canUpdateArchiveDueTime: boolean
}>()

const emit = defineEmits<{
  started: []
  updated: []
  navigate: [tabKey: string]
}>()

const COURSE_ASSESSMENT_PLATFORM_CODES = new Set(['PLATFORM_PAPER_FULL', 'PLATFORM_NONPAPER_FULL'])

const starting = ref(false)
const loadingPrecheck = ref(false)
const savingSettings = ref(false)
const loadingTemplates = ref(false)
const precheck = ref<ArchiveVolumeStartCollectingPrecheckResponse | null>(null)
const precheckError = ref<string | null>(null)
const catalogExpanded = ref(true)
const templateSets = ref<ArchiveTenantTemplateSetResponse[]>([])

const titleEditValue = ref('')
const templateEditValue = ref<string | undefined>()
const dueEditValue = ref<string | undefined>()
const dueReason = ref('')

const volume = computed(() => props.detail.volume)
const collaborators = computed(() => props.detail.collaborators ?? [])
const isDraft = computed(() => volume.value.volumeStatus === ArchiveVolumeStatusCode.DRAFT)
const canEditSettings = computed(
  () => isDraft.value && props.canManageCollaborators,
)

const readinessRows = computed((): ArchiveVolumeStartCollectingCheckItem[] => {
  return precheck.value?.items ?? []
})

const blockingCount = computed(
  () => readinessRows.value.filter((row) => row.required && !row.ready).length,
)
const warnCount = computed(
  () => readinessRows.value.filter((row) => !row.required && !row.ready).length,
)
const readyCount = computed(() => readinessRows.value.filter((row) => row.ready).length)
const canCommit = computed(
  () =>
    isDraft.value
    && props.canStartCollecting
    && precheck.value?.canStart === true
    && blockingCount.value === 0
    && !precheckError.value,
)

const templateSetOptions = computed((): UiSelectOption[] =>
  templateSets.value.map((item) => ({
    value: item.templateSetCode,
    label: item.templateSetName,
  })),
)

const templateExamFormLabel = computed(() => {
  const form = precheck.value?.examForm
  if (!form) return null
  return strictEnumLabel(ArchiveExamFormDescription, form, 'examForm')
})

const catalogRows = computed(() => precheck.value?.catalogPreviewItems ?? [])
const requiredCatalogCount = computed(() => precheck.value?.requiredCatalogCount ?? 0)
const optionalCatalogCount = computed(() => precheck.value?.optionalCatalogCount ?? 0)
const selfCheckItemCount = computed(() => precheck.value?.selfCheckItemCount ?? 0)

interface CatalogPreviewRow {
  rowKey: string
  sortOrderLabel: string
  catalogName: string
  materialTypeLabel: string
  requiredLabel: string
  deliveryModeLabel: string
}

const catalogTableRows = computed((): CatalogPreviewRow[] =>
  catalogRows.value.map((item, index) => ({
    rowKey: String(item.templateItemId ?? item.catalogCode ?? index),
    sortOrderLabel: String(item.sortOrder ?? index + 1),
    catalogName: item.catalogName || '—',
    materialTypeLabel: materialTypeLabel(item),
    requiredLabel: item.requiredFlag === false ? '选交' : '必交',
    deliveryModeLabel: deliveryModeLabel(item),
  })),
)

const catalogColumns: ColumnsType<CatalogPreviewRow> = [
  { title: '序号', dataIndex: 'sortOrderLabel', key: 'sortOrderLabel', width: 64, align: 'center' },
  { title: '目录名称', dataIndex: 'catalogName', key: 'catalogName' },
  { title: '材料类型', dataIndex: 'materialTypeLabel', key: 'materialTypeLabel', width: 140 },
  { title: '必交', dataIndex: 'requiredLabel', key: 'requiredLabel', width: 72, align: 'center' },
  {
    title: '交付方式',
    dataIndex: 'deliveryModeLabel',
    key: 'deliveryModeLabel',
    width: 100,
    align: 'center',
  },
]

const signalMetrics = computed((): SignalMetric[] => {
  if (!isDraft.value) {
    return [
      {
        key: 'status',
        label: '开收状态',
        value: '已开收',
        tone: 'blue',
        iconTone: 'blue',
      },
      {
        key: 'team',
        label: '协作成员',
        value: collaborators.value.length,
        unit: '人',
        tone: 'gray',
        iconTone: 'gray',
        clickable: true,
      },
    ]
  }
  return [
    {
      key: 'blocking',
      label: '阻断项',
      value: blockingCount.value,
      tone: blockingCount.value > 0 ? 'red' : 'green',
      iconTone: blockingCount.value > 0 ? 'gray' : 'green',
    },
    {
      key: 'warn',
      label: '建议项',
      value: warnCount.value,
      tone: warnCount.value > 0 ? 'orange' : 'gray',
      iconTone: 'gray',
    },
    {
      key: 'catalog',
      label: '目录项',
      value: catalogRows.value.length,
      helper:
        catalogRows.value.length > 0
          ? `必交 ${requiredCatalogCount.value} · 选交 ${optionalCatalogCount.value}`
          : undefined,
      tone: catalogRows.value.length > 0 ? 'blue' : 'orange',
      iconTone: catalogRows.value.length > 0 ? 'blue' : 'gray',
    },
    {
      key: 'ready',
      label: '已就绪',
      value: readyCount.value,
      helper: readinessRows.value.length ? `共 ${readinessRows.value.length} 项` : undefined,
      tone: 'gray',
      iconTone: 'gray',
    },
  ]
})

const completionSummaryRows = computed(() => [
  { key: 'title', label: '归档标题', value: volume.value.archiveTitle || '—' },
  { key: 'template', label: '模板套', value: volume.value.templateSetName || '—' },
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

function isCourseAssessmentTemplateSet(item: ArchiveTenantTemplateSetResponse): boolean {
  if (COURSE_ASSESSMENT_PLATFORM_CODES.has(item.templateSetCode)) return true
  const fork = item.forkSourceSetCode
  return Boolean(fork && COURSE_ASSESSMENT_PLATFORM_CODES.has(fork))
}

function materialTypeLabel(item: ArchiveMaterialCatalogTemplateResponse): string {
  return strictEnumLabel(ArchiveMaterialTypeDescription, item.materialType, 'materialType')
}

function deliveryModeLabel(item: ArchiveMaterialCatalogTemplateResponse): string {
  const mode = item.deliveryMode ?? ArchiveMaterialDeliveryModeCode.PHYSICAL_SCAN
  return strictEnumLabel(ArchiveMaterialDeliveryModeDescription, mode, 'deliveryMode')
}

function checkItemMessage(row: ArchiveVolumeStartCollectingCheckItem): string {
  if (row.itemKey === 'ARCHIVE_DUE' && row.ready) {
    return formatDateTime(volume.value.archiveDueTime) || row.message
  }
  return row.message
}

function syncEditorsFromVolume(): void {
  titleEditValue.value = volume.value.archiveTitle || ''
  templateEditValue.value = volume.value.templateSetCode || undefined
  dueEditValue.value = volume.value.archiveDueTime || undefined
  dueReason.value = ''
}

async function loadTemplateSets(): Promise<void> {
  if (!isDraft.value || !props.canManageCollaborators) {
    templateSets.value = []
    return
  }
  loadingTemplates.value = true
  try {
    const allSets = await listArchiveTenantTemplateSets()
    templateSets.value = allSets.filter(isCourseAssessmentTemplateSet)
  } catch (error) {
    templateSets.value = []
    showUserError(error, '加载目录模板套失败')
  } finally {
    loadingTemplates.value = false
  }
}

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
    volume.value.archiveTitle,
    volume.value.archiveDueTime,
    props.detail.materials?.length ?? 0,
    props.detail.collaborators?.length ?? 0,
    props.canStartCollecting,
  ],
  () => {
    syncEditorsFromVolume()
    void loadPrecheck()
  },
)

onMounted(() => {
  syncEditorsFromVolume()
  void loadTemplateSets()
  void loadPrecheck()
})

function navigateTo(tabKey: string): void {
  if (!tabKey) return
  emit('navigate', tabKey)
}

function onSignalMetricClick(key: string): void {
  if (key === 'team') {
    navigateTo('collaborators')
  }
}

function onCheckItemActivate(row: ArchiveVolumeStartCollectingCheckItem): void {
  if (!row.actionTab) return
  if (row.actionTab === 'start-collecting') return
  navigateTo(row.actionTab)
}

async function saveTaskSettings(): Promise<void> {
  if (savingSettings.value || !canEditSettings.value) return
  if (!props.canManageCollaborators) {
    void message.warning('当前账号无任务设置维护权限')
    return
  }

  const nextTitle = titleEditValue.value.trim()
  const nextTemplate = templateEditValue.value?.trim() || ''
  const nextDue = dueEditValue.value || volume.value.archiveDueTime || undefined
  const titleChanged = nextTitle !== (volume.value.archiveTitle || '')
  const templateChanged = nextTemplate !== (volume.value.templateSetCode || '')
  const dueChanged = nextDue !== (volume.value.archiveDueTime || undefined)

  if (!titleChanged && !templateChanged && !dueChanged) {
    void message.info('设置未变更')
    return
  }
  if (!nextTitle) {
    showFormValidationMessage('归档标题不能为空')
    return
  }
  if (!nextTemplate) {
    showFormValidationMessage('请选择目录模板套')
    return
  }
  if (!nextDue) {
    showFormValidationMessage('请设置归档截止时刻')
    return
  }
  if (dueChanged && !dueReason.value.trim()) {
    showFormValidationMessage('修改归档截止须填写原因')
    return
  }

  const v = volume.value
  if (!v.courseId || !v.teachingClassId || !v.departmentId) {
    showFormValidationMessage('课程/班级/院系身份缺失，请到任务设置完整维护')
    return
  }
  if (!v.academicYear || !v.semester || !isSemesterCode(v.semester)) {
    showFormValidationMessage('学年学期缺失或非法，请到任务设置完整维护')
    return
  }
  if (!v.securityLevel || !v.responsibleUserId) {
    showFormValidationMessage('密级/责任人缺失，请到任务设置完整维护')
    return
  }

  const request: ArchiveVolumeTaskSettingsUpdateRequest = {
    volumeId: v.volumeId,
    archiveTitle: nextTitle,
    archiveNo: v.archiveNo || undefined,
    courseId: v.courseId,
    teachingClassId: v.teachingClassId,
    departmentId: v.departmentId,
    academicYear: v.academicYear,
    semester: v.semester,
    relatedExamId: v.relatedExamId ?? null,
    templateSetCode: nextTemplate,
    examForm: v.examForm ?? null,
    securityLevel: v.securityLevel,
    retentionYears: v.permanentRetention ? undefined : v.retentionYears,
    permanentRetention: v.permanentRetention === true,
    responsibleUserId: v.responsibleUserId,
    expectedArchiveDueTime: v.archiveDueTime ?? null,
    archiveDueTime: nextDue,
    reason: dueChanged ? dueReason.value.trim() : undefined,
  }

  savingSettings.value = true
  try {
    await updateArchiveVolumeTaskSettings(request)
    void message.success('任务设置已保存')
    emit('updated')
  } catch (error) {
    showUserError(error, '保存任务设置失败')
  } finally {
    savingSettings.value = false
  }
}

async function handleStart(): Promise<void> {
  if (starting.value) return
  if (!props.canStartCollecting) {
    void message.warning('当前账号无开始收材权限')
    return
  }
  await loadPrecheck()
  if (!precheck.value?.canStart || blockingCount.value > 0) {
    void message.warning('请先补齐开收前必填项')
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
    void message.success('已开始收材')
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
    </header>

    <SignalBand
      :metrics="signalMetrics"
      variant="panel"
      compact
      class="av-start__signal"
      @metric-click="onSignalMetricClick"
    />

    <template v-if="isDraft">
      <section class="av-start__section">
        <div class="av-start__heading-row">
          <h4 class="av-start__heading">任务配置</h4>
          <div class="av-start__heading-actions">
            <UiButton size="sm" variant="ghost" @click="navigateTo('task-settings')">
              完整设置
            </UiButton>
            <UiButton
              v-if="canEditSettings"
              size="sm"
              variant="primary"
              :loading="savingSettings || loadingPrecheck"
              @click="saveTaskSettings"
            >
              保存设置
            </UiButton>
          </div>
        </div>

        <div class="av-start__field">
          <label class="av-start__label">归档标题</label>
          <UiInput
            v-if="canManageCollaborators"
            size="sm"
            v-model="titleEditValue"
            placeholder="归档任务标题"
            :maxlength="512"
          />
          <UiInput v-else size="sm" :value="volume.archiveTitle || '—'" disabled />
        </div>

        <div class="av-start__field">
          <label class="av-start__label">目录模板套</label>
          <UiSelect
            v-if="canManageCollaborators"
            size="sm"
            v-model="templateEditValue"
            :options="templateSetOptions"
            :loading="loadingTemplates"
            allow-search
            option-filter-prop="label"
            placeholder="选择目录模板套"
          />
          <UiInput v-else size="sm" :value="volume.templateSetName || '—'" disabled />
          <div v-if="templateExamFormLabel || selfCheckItemCount > 0" class="av-start__meta-row">
            <UiTag v-if="templateExamFormLabel" tone="gray" size="sm">
              {{ templateExamFormLabel }}
            </UiTag>
            <span v-if="selfCheckItemCount > 0" class="av-start__meta-text">
              自查 {{ selfCheckItemCount }} 项
            </span>
          </div>
        </div>

        <div class="av-start__field">
          <label class="av-start__label">归档截止</label>
          <template v-if="canUpdateArchiveDueTime">
            <UiDatePicker
              size="sm"
              v-model="dueEditValue"
              show-time
              format="YYYY-MM-DD HH:mm"
              value-format="YYYY-MM-DD HH:mm:ss"
              placeholder="选择归档截止时刻"
            />
            <UiInput
              size="sm"
              v-model="dueReason"
              placeholder="覆盖原因（改截止时必填）"
              :maxlength="200"
              class="av-start__due-reason"
            />
          </template>
          <UiInput
            v-else
            size="sm"
            :value="formatDateTime(volume.archiveDueTime) || '未设置'"
            disabled
          />
        </div>
      </section>

      <section class="av-start__section">
        <div class="av-start__heading-row">
          <h4 class="av-start__heading">材料目录</h4>
          <UiButton size="sm" variant="ghost" :loading="loadingPrecheck" @click="loadPrecheck">
            刷新预检
          </UiButton>
        </div>
        <div v-if="catalogRows.length" class="av-start__catalog">
          <div class="av-start__heading-row">
            <span class="av-start__meta-text">
              共 {{ catalogRows.length }} 项（必交 {{ requiredCatalogCount }} · 选交
              {{ optionalCatalogCount }}）
            </span>
            <UiButton size="sm" variant="ghost" @click="catalogExpanded = !catalogExpanded">
              {{ catalogExpanded ? '收起' : '展开' }}
            </UiButton>
          </div>
          <UiDataTable
            v-if="catalogExpanded"
            pagination-mode="none"
            :columns="catalogColumns"
            :data-source="catalogTableRows"
            :show-pagination="false"
            flat
            size="middle"
            row-key="rowKey"
            empty-description="模板未配置材料目录"
          />
        </div>
        <p v-else-if="loadingPrecheck" class="av-start__hint">正在加载目录预览…</p>
        <p v-else class="av-start__hint av-start__hint--warn">
          {{ precheckError || '未绑定可解析的目录模板，请先选择模板套并保存。' }}
        </p>
      </section>

      <section class="av-start__section">
        <div class="av-start__heading-row">
          <h4 class="av-start__heading">开收前核对</h4>
        </div>
        <ul v-if="readinessRows.length" class="av-start__checklist">
          <li
            v-for="row in readinessRows"
            :key="row.itemKey"
            class="av-start__check-row"
            :class="{
              'av-start__check-row--action': Boolean(
                row.actionTab && row.actionTab !== 'start-collecting',
              ),
              'av-start__check-row--blocked': row.required && !row.ready,
            }"
            :role="row.actionTab && row.actionTab !== 'start-collecting' ? 'button' : undefined"
            :tabindex="row.actionTab && row.actionTab !== 'start-collecting' ? 0 : undefined"
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
            <span class="av-start__check-value">{{ checkItemMessage(row) }}</span>
            <span
              v-if="row.actionTab && row.actionTab !== 'start-collecting'"
              class="av-start__check-go"
            >
              去处理
            </span>
          </li>
        </ul>
        <p v-else-if="loadingPrecheck" class="av-start__hint">正在加载预检…</p>
        <p v-else class="av-start__hint av-start__hint--warn">
          {{ precheckError || '预检结果未加载。' }}
        </p>
      </section>

      <section class="av-start__section">
        <div class="av-start__heading-row">
          <h4 class="av-start__heading">协作分工</h4>
          <UiButton
            v-if="canManageCollaborators"
            size="sm"
            variant="ghost"
            @click="navigateTo('collaborators')"
          >
            管理协作
          </UiButton>
        </div>
        <ArchiveVolumeCollaboratorStrip
          v-if="collaborators.length"
          :collaborators="collaborators"
          :can-manage="false"
        />
        <p v-else class="av-start__hint av-start__hint--warn">尚未配置协作成员。</p>
      </section>

      <section class="av-start__commit">
        <template v-if="canStartCollecting">
          <p v-if="precheckError" class="av-start__hint av-start__hint--warn">
            预检未通过加载，无法确认开收。
          </p>
          <p v-else-if="blockingCount > 0" class="av-start__hint av-start__hint--warn">
            仍有 {{ blockingCount }} 项必填未就绪，补齐后方可开始收材。
          </p>
          <p v-else-if="warnCount > 0" class="av-start__hint">
            必填项已就绪；另有 {{ warnCount }} 项建议补齐（不阻断开收）。
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
          <p class="av-start__hint">当前账号无开始收材权限，请联系归档责任人操作。</p>
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
        <ArchiveVolumeCollaboratorStrip :collaborators="collaborators" :can-manage="false" />
      </section>

      <section class="av-start__commit">
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
  gap: var(--dp-space-block);
  padding: var(--dp-space-block);
  max-width: 960px;
}

.av-start__header {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-tight);
}

.av-start__title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
}

.av-start__title {
  margin: 0;
  font-size: var(--dp-font-size-lg);
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--dp-text-primary);
}

.av-start__signal {
  width: 100%;
}

.av-start__section {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component);
  padding: var(--dp-space-component);
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-control, 6px);
  background: var(--dp-surface-subtle, var(--dp-bg-muted));
}

.av-start__heading-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-component-tight);
}

.av-start__heading-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dp-space-component-xs);
}

.av-start__heading {
  margin: 0;
  font-size: var(--dp-font-size-sm);
  font-weight: 600;
  color: var(--dp-text-primary);
}

.av-start__field {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-tight);
}

.av-start__label {
  font-size: var(--dp-font-size-xs);
  font-weight: 500;
  color: var(--dp-text-secondary);
}

.av-start__meta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dp-space-component-tight);
}

.av-start__meta-text {
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-muted);
  font-variant-numeric: tabular-nums;
}

.av-start__due-reason {
  margin-top: 0;
}

.av-start__catalog {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-tight);
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
  gap: var(--dp-space-component-tight);
  padding: var(--dp-space-component-tight) var(--dp-space-component);
  border-radius: var(--dp-radius-xs);
  background: var(--dp-surface);
  font-size: var(--dp-font-size-sm);

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
  gap: var(--dp-space-component-xs);
}

.av-start__required {
  font-size: var(--dp-font-size-xxs);
  color: var(--ant-color-error);
}

.av-start__check-value {
  color: var(--dp-text-primary);
  font-variant-numeric: tabular-nums;
}

.av-start__check-go {
  flex-shrink: 0;
  font-size: var(--dp-font-size-xs);
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
  gap: var(--dp-space-component-tight);
  padding: var(--dp-space-component-tight) var(--dp-space-component);
  border-radius: var(--dp-radius-xs);
  background: var(--dp-surface);
  font-size: var(--dp-font-size-sm);

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
  gap: var(--dp-space-component-xs);
}

.av-start__commit {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--dp-space-component);
  padding: var(--dp-space-block);
  border: 1px solid color-mix(in srgb, var(--ant-color-primary) 22%, transparent);
  border-radius: var(--dp-radius-control, 6px);
  background: color-mix(in srgb, var(--ant-color-primary) 5%, var(--dp-surface));
  position: sticky;
  bottom: 0;
  z-index: 1;
}

.av-start__hint {
  margin: 0;
  font-size: var(--dp-font-size-sm);
  line-height: 1.5;
  color: var(--dp-text-secondary);
  max-width: 56ch;

  &--warn {
    color: var(--ant-color-warning);
  }
}
</style>

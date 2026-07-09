<script setup lang="ts">
import type { IndirectEvaluationFormVO } from '@/apis/quality/indirect-form'
import type { IndirectEvaluationItemVO } from '@/apis/quality/indirect-item'
import type {
  IndirectConversionAuditLogVO,
  IndirectEvaluationResponseSaveRequest,
  IndirectEvaluationResponseVO,
} from '@/apis/quality/indirect-response'
import {
  indirectResponseApi,
  IndirectResponseConversionFilterCode,
} from '@/apis/quality/indirect-response'
import type { UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { computed, ref, watch } from 'vue'
import { ExcelImportSceneKey } from '@/apis/platform/scene-keys'
import UiPlatformExcelImportModal from '@/components/platform/UiPlatformExcelImportModal.vue'
import { ClassSelector, StudentSelector, TeacherSelector } from '@/components/quality/selectors'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { isIndirectEvaluationItemType } from '@/types/enums/indirect-evaluation-item-type-enum'
import { isManualConversionStatus } from '@/types/enums/manual-conversion-status-enum'
import {
  isSystemCollectedRespondentType,
  MANUAL_RESPONDENT_TYPE_OPTIONS,
  RespondentTypeCode,
} from '@/types/enums/respondent-type-enum'
import { showUserError } from '@/utils/error-handler'
import ImportResponseDocumentModal from '../ImportResponseDocumentModal.vue'
import {
  formatConversionAuditAction,
  formatConversionAuditOperator,
  isMultiChoiceItemType,
  isOpenTextItemType,
  isScaleItemType,
  isSingleChoiceItemType,
  isTeacherResponseWritable,
  manualConversionStatusLabel,
  manualConversionStatusTone,
  requiresTeacherScoreConversion,
  respondentTypeLabel,
  responseColumns,
} from './indirect-evaluation-shared'

type ResponseValidFlagEditorValue = 'pending' | 'valid' | 'invalid'

const props = defineProps<{
  selectedForm: IndirectEvaluationFormVO | null
  selectedItem: IndirectEvaluationItemVO | null
}>()

const emit = defineEmits<{
  'import-done': []
}>()

const VALID_FLAG_EDITOR_OPTIONS: Array<{ value: ResponseValidFlagEditorValue; label: string }> = [
  { value: 'pending', label: '待确认' },
  { value: 'valid', label: '有效' },
  { value: 'invalid', label: '无效' },
]

const responses = ref<IndirectEvaluationResponseVO[]>([])
const responsesLoading = ref(false)
const responsePageNum = ref(1)
const responsePageSize = ref(10)
const responseTotal = ref(0)
const conversionFilter = ref<'all' | 'pending' | 'scored' | 'noSubstantive'>('all')
const pendingResponseCount = ref(0)
const convertedResponseCount = ref(0)
const noSubstantiveResponseCount = ref(0)
const conversionAuditLogs = ref<IndirectConversionAuditLogVO[]>([])
const conversionAuditLoading = ref(false)

function resolveConversionFilter(): IndirectResponseConversionFilterCode | undefined {
  if (conversionFilter.value === 'pending') return IndirectResponseConversionFilterCode.PENDING
  if (conversionFilter.value === 'scored') return IndirectResponseConversionFilterCode.CONVERTED
  if (conversionFilter.value === 'noSubstantive')
    return IndirectResponseConversionFilterCode.NO_SUBSTANTIVE
  return undefined
}

const showConversionWorkflow = computed(() =>
  requiresTeacherScoreConversion(props.selectedItem?.itemType),
)

const conversionFilterOptions = computed(() => {
  const pendingLabel =
    pendingResponseCount.value > 0 ? `待换算 (${pendingResponseCount.value})` : '待换算'
  const noSubstantiveLabel =
    noSubstantiveResponseCount.value > 0
      ? `无实质作答 (${noSubstantiveResponseCount.value})`
      : '无实质作答'
  return [
    { label: '全部', value: 'all' as const },
    { label: pendingLabel, value: 'pending' as const },
    { label: '已换算', value: 'scored' as const },
    { label: noSubstantiveLabel, value: 'noSubstantive' as const },
  ]
})

const responseEditorVisible = ref(false)
const responseEditorMode = ref<'create' | 'edit'>('create')
const clearConvertedScore = ref(false)
const responseMultiChoiceValues = ref<string[]>([])
const responseEditorClassId = ref('')
const responseIdentityName = ref('')
const responseIdentityOrganization = ref('')
const responseIdentityContact = ref('')
const responseEditor = ref<IndirectEvaluationResponseSaveRequest>({
  formId: '',
  itemId: '',
  respondentType: RespondentTypeCode.STUDENT,
  respondentId: '',
  scaleValue: undefined,
  singleChoiceValue: '',
  answerSummary: '',
  multipleChoiceValues: [],
  identityValues: [],
  convertedScore: undefined,
  openText: '',
  validFlag: true,
  invalidReason: '',
})

/** validFlag 三态编辑：null=待确认，与表格 UiTag 语义一致 */
const responseEditorValidFlagChoice = computed<ResponseValidFlagEditorValue>({
  get(): ResponseValidFlagEditorValue {
    if (responseEditor.value.validFlag === true) return 'valid'
    if (responseEditor.value.validFlag === false) return 'invalid'
    return 'pending'
  },
  set(value: ResponseValidFlagEditorValue) {
    if (value === 'valid') responseEditor.value.validFlag = true
    else if (value === 'invalid') responseEditor.value.validFlag = false
    else responseEditor.value.validFlag = null
  },
})

const importExcelVisible = ref(false)
const importDocumentVisible = ref(false)

const importExcelContext = computed(() => ({
  formId: props.selectedForm?.id,
}))

function handleResponseClassChange(value: string | null | undefined) {
  responseEditorClassId.value = value ?? ''
  responseEditor.value.respondentId = ''
}

function handleResponseRespondentChange(value: string | string[] | null) {
  if (Array.isArray(value)) {
    message.warning('请单选应答人')
    return
  }
  responseEditor.value.respondentId = value ?? ''
}

function handleResponseRespondentTypeChange() {
  responseEditor.value.respondentId = ''
  responseEditorClassId.value = ''
  responseIdentityName.value = ''
  responseIdentityOrganization.value = ''
  responseIdentityContact.value = ''
}

/** 按当前选中题项分页加载答卷列表 */
async function loadResponses() {
  if (!props.selectedItem) {
    responses.value = []
    responseTotal.value = 0
    pendingResponseCount.value = 0
    convertedResponseCount.value = 0
    noSubstantiveResponseCount.value = 0
    return
  }
  responsesLoading.value = true
  try {
    const conversionFilterCode = resolveConversionFilter()
    const page = await indirectResponseApi.page({
      itemId: props.selectedItem.id,
      conversionFilter: conversionFilterCode,
      pageNum: responsePageNum.value,
      pageSize: responsePageSize.value,
    })
    responses.value = page.list
    responseTotal.value = page.total
    if (showConversionWorkflow.value) {
      const signal = await indirectResponseApi.itemSignalSummary(props.selectedItem.id)
      pendingResponseCount.value = signal.pendingCount
      convertedResponseCount.value = signal.convertedCount
      noSubstantiveResponseCount.value = signal.noSubstantiveCount
    } else {
      pendingResponseCount.value = 0
      convertedResponseCount.value = 0
      noSubstantiveResponseCount.value = 0
    }
  } finally {
    responsesLoading.value = false
  }
}

function handleResponsePageChange(page: { current: number; pageSize: number }) {
  responsePageNum.value = page.current
  responsePageSize.value = page.pageSize
  void loadResponses()
}

function clearResponses() {
  responses.value = []
  responseTotal.value = 0
}

watch(
  () => props.selectedItem?.id,
  () => {
    responsePageNum.value = 1
  },
)

watch(conversionFilter, () => {
  responsePageNum.value = 1
  void loadResponses()
})

function openResponseCreate() {
  if (!props.selectedItem || !props.selectedForm) return
  if (!isTeacherResponseWritable(props.selectedForm)) {
    message.error('问卷已关闭或已归档，不允许录入答卷')
    return
  }
  responseEditorMode.value = 'create'
  clearConvertedScore.value = false
  responseMultiChoiceValues.value = []
  responseEditorClassId.value = ''
  responseIdentityName.value = ''
  responseIdentityOrganization.value = ''
  responseIdentityContact.value = ''
  responseEditor.value = {
    formId: props.selectedForm.id,
    itemId: props.selectedItem.id,
    respondentType: RespondentTypeCode.STUDENT,
    respondentId: '',
    scaleValue: undefined,
    singleChoiceValue: '',
    answerSummary: '',
    multipleChoiceValues: [],
    identityValues: [],
    convertedScore: undefined,
    openText: '',
    validFlag: true,
    invalidReason: '',
  }
  responseEditorVisible.value = true
  conversionAuditLogs.value = []
}

function openResponseEdit(record: IndirectEvaluationResponseVO) {
  if (!props.selectedForm || !isTeacherResponseWritable(props.selectedForm)) {
    message.error('问卷已关闭或已归档，不允许修改答卷')
    return
  }
  conversionAuditLogs.value = []
  responseEditorMode.value = 'edit'
  clearConvertedScore.value = false
  responseMultiChoiceValues.value =
    record.multipleChoiceValues?.map((option) => option.optionValue) ?? []
  responseEditorClassId.value = ''
  responseIdentityName.value =
    record.identityValues?.find((item) => item.fieldKey === 'NAME')?.fieldValue ?? ''
  responseIdentityOrganization.value =
    record.identityValues?.find((item) => item.fieldKey === 'ORGANIZATION')?.fieldValue ?? ''
  responseIdentityContact.value =
    record.identityValues?.find((item) => item.fieldKey === 'CONTACT')?.fieldValue ?? ''
  responseEditor.value = {
    id: record.id,
    formId: record.formId,
    itemId: record.itemId,
    respondentType: record.respondentType,
    respondentId: record.respondentId,
    scaleValue: record.scaleValue,
    singleChoiceValue: record.singleChoiceValue ?? '',
    answerSummary: record.answerSummary ?? '',
    multipleChoiceValues:
      record.multipleChoiceValues?.map((option) => ({
        optionValue: option.optionValue,
        optionLabel: option.optionLabel,
      })) ?? [],
    identityValues:
      record.identityValues?.map((identity) => ({
        fieldKey: identity.fieldKey,
        fieldValue: identity.fieldValue,
      })) ?? [],
    convertedScore: record.convertedScore,
    openText: record.openText ?? '',
    validFlag: record.validFlag,
    invalidReason: record.invalidReason ?? '',
    receivedTime: record.receivedTime,
  }
  responseEditorVisible.value = true
  if (showConversionWorkflow.value && record.id) {
    void loadConversionAudit(record.id)
  } else {
    conversionAuditLogs.value = []
  }
}

function formatConversionAuditScore(score?: number | null): string {
  if (score == null) return '—'
  return score.toFixed(2)
}

function formatConversionAuditTime(operateTime?: string): string {
  if (!operateTime) return ''
  const parsed = dayjs(operateTime)
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm') : operateTime
}

/** 加载答卷换算审计时间线，供编辑弹窗核对历次改分 */
async function loadConversionAudit(responseId: string) {
  conversionAuditLoading.value = true
  conversionAuditLogs.value = []
  try {
    conversionAuditLogs.value = await indirectResponseApi.conversionAuditTimeline(responseId)
  } catch (error) {
    showUserError(error, '换算审计加载失败')
  } finally {
    conversionAuditLoading.value = false
  }
}

function selectedItemScaleOptions() {
  if (!props.selectedItem) {
    return []
  }
  if (props.selectedItem.scaleLabels?.length) {
    return props.selectedItem.scaleLabels
  }
  if (props.selectedItem.scaleMin == null || props.selectedItem.scaleMax == null) {
    return []
  }
  const labels = []
  for (let value = props.selectedItem.scaleMin; value <= props.selectedItem.scaleMax; value++) {
    labels.push({ scaleValue: value, label: `${value}分` })
  }
  return labels
}

function selectedItemChoiceOptions() {
  return props.selectedItem?.choiceOptions ?? []
}

function selectedItemTypeKnown(): boolean {
  const itemType = props.selectedItem?.itemType
  return itemType !== undefined && itemType !== null && isIndirectEvaluationItemType(itemType)
}

/** 校验应答人身份与题型答案后提交答卷 */
async function submitResponse() {
  const v = responseEditor.value
  if (!v.respondentType) {
    message.error('请选择应答人类型')
    return
  }
  if (
    (v.respondentType === RespondentTypeCode.STUDENT ||
      v.respondentType === RespondentTypeCode.TEACHER ||
      v.respondentType === RespondentTypeCode.EXPERT ||
      v.respondentType === RespondentTypeCode.SUPERVISOR) &&
    !v.respondentId?.trim()
  ) {
    message.error('请选择应答人')
    return
  }
  if (
    v.respondentType === RespondentTypeCode.GRADUATE ||
    v.respondentType === RespondentTypeCode.EMPLOYER
  ) {
    if (!responseIdentityName.value.trim()) {
      message.error('请填写应答人姓名')
      return
    }
    v.respondentId = undefined
    v.identityValues = [
      { fieldKey: 'NAME', fieldValue: responseIdentityName.value.trim() },
      { fieldKey: 'ORGANIZATION', fieldValue: responseIdentityOrganization.value.trim() },
      { fieldKey: 'CONTACT', fieldValue: responseIdentityContact.value.trim() },
    ].filter((item) => item.fieldValue)
  } else {
    v.identityValues = []
  }
  if (!props.selectedItem) {
    message.warning('请先选择题项')
    return
  }
  if (!selectedItemTypeKnown()) {
    message.error('当前题项题型无效，无法保存答卷')
    return
  }
  if (isScaleItemType(props.selectedItem.itemType) && v.scaleValue == null) {
    message.error('请填写量表分值')
    return
  }
  if (isSingleChoiceItemType(props.selectedItem.itemType) && !v.singleChoiceValue?.trim()) {
    message.error('请选择单选答案')
    return
  }
  const multiChoiceClearedOnEdit =
    isMultiChoiceItemType(props.selectedItem.itemType) &&
    responseEditorMode.value === 'edit' &&
    responseMultiChoiceValues.value.length === 0
  if (
    isMultiChoiceItemType(props.selectedItem.itemType) &&
    responseMultiChoiceValues.value.length === 0 &&
    responseEditorMode.value === 'create'
  ) {
    message.error('请至少选择一个多选答案')
    return
  }
  if (
    isOpenTextItemType(props.selectedItem.itemType) &&
    props.selectedItem.required &&
    !v.openText?.trim()
  ) {
    message.error('请填写开放回答')
    return
  }
  if (isScaleItemType(props.selectedItem.itemType)) {
    const scaleLabel = selectedItemScaleOptions().find(
      (option) => option.scaleValue === v.scaleValue,
    )?.label
    v.singleChoiceValue = undefined
    v.multipleChoiceValues = []
    v.openText = ''
    v.convertedScore = undefined
    v.answerSummary = scaleLabel ?? (v.scaleValue == null ? '' : `${v.scaleValue}分`)
  } else if (isSingleChoiceItemType(props.selectedItem.itemType)) {
    const selectedOption = selectedItemChoiceOptions().find(
      (option) => option.optionValue === v.singleChoiceValue,
    )
    v.scaleValue = undefined
    v.multipleChoiceValues = []
    v.openText = ''
    v.answerSummary = selectedOption?.optionLabel ?? v.singleChoiceValue ?? ''
  } else if (isMultiChoiceItemType(props.selectedItem.itemType)) {
    v.scaleValue = undefined
    v.singleChoiceValue = ''
    v.openText = ''
    v.multipleChoiceValues = selectedItemChoiceOptions()
      .filter((option) => responseMultiChoiceValues.value.includes(option.optionValue))
      .map((option) => ({
        optionValue: option.optionValue,
        optionLabel: option.optionLabel,
      }))
    v.answerSummary = v.multipleChoiceValues.map((option) => option.optionLabel).join(' | ')
  } else if (isOpenTextItemType(props.selectedItem.itemType)) {
    v.scaleValue = undefined
    v.singleChoiceValue = ''
    v.multipleChoiceValues = []
    v.answerSummary = ''
    v.openText = v.openText?.trim() ?? ''
  } else {
    message.error('当前题项题型无效，无法保存答卷')
    return
  }
  if (multiChoiceClearedOnEdit) {
    v.convertedScore = undefined
    clearConvertedScore.value = false
  }
  if (clearConvertedScore.value) {
    v.clearConvertedScore = true
    v.convertedScore = undefined
  } else {
    v.clearConvertedScore = undefined
  }
  if (responseEditorMode.value === 'edit' && v.validFlag === null) {
    v.pendingValidConfirm = true
  } else {
    v.pendingValidConfirm = undefined
  }
  if (responseEditorMode.value === 'create') await indirectResponseApi.create(v)
  else await indirectResponseApi.update(v)
  message.success('已保存')
  responseEditorVisible.value = false
  await loadResponses()
}

function responseChoiceValues(record: IndirectEvaluationResponseVO): string {
  if (!record.multipleChoiceValues?.length) {
    return '未作答'
  }
  return record.multipleChoiceValues.map((option) => option.optionLabel).join(' | ')
}

function responseScaleAnswerText(record: IndirectEvaluationResponseVO): string {
  if (record.answerSummary?.trim()) return record.answerSummary
  if (record.scaleValue != null) return `${record.scaleValue}分`
  return '未作答'
}

function responseSingleChoiceAnswerText(record: IndirectEvaluationResponseVO): string {
  if (record.answerSummary?.trim()) return record.answerSummary
  if (record.singleChoiceValue?.trim()) return record.singleChoiceValue
  return '未作答'
}

function responseOpenText(record: IndirectEvaluationResponseVO): string {
  const text = record.openText?.trim()
  if (text) return text
  return '未填写开放文本'
}

async function deleteResponse(record: IndirectEvaluationResponseVO) {
  if (!props.selectedForm || !isTeacherResponseWritable(props.selectedForm)) {
    message.error('问卷已关闭或已归档，不允许删除答卷')
    return
  }
  void confirmAsync({
    title: '删除该答卷？',
    type: 'error',
    onOk: async () => {
      await indirectResponseApi.delete(record.id)
      message.success('已删除')
      await loadResponses()
    },
  })
}

function buildIndirectResponseActions(
  _record: IndirectEvaluationResponseVO,
): UiTableRowActionItem[] {
  return [
    { key: 'edit', label: '编辑' },
    { key: 'delete', label: '删除', tone: 'danger' },
  ]
}

function handleIndirectResponseAction(key: string, record: IndirectEvaluationResponseVO): void {
  switch (key) {
    case 'edit':
      openResponseEdit(record)
      break
    case 'delete':
      void deleteResponse(record)
      break
  }
}

function openImportExcel() {
  if (!props.selectedForm) return
  if (!isTeacherResponseWritable(props.selectedForm)) {
    message.error('问卷已关闭或已归档，不允许导入答卷')
    return
  }
  importExcelVisible.value = true
}

async function handleImportExcelDone() {
  await loadResponses()
  emit('import-done')
}

async function handleAiDocParseDone() {
  await loadResponses()
  emit('import-done')
}

function openImportDocument() {
  if (!props.selectedForm) return
  if (!isTeacherResponseWritable(props.selectedForm)) {
    message.error('问卷已关闭或已归档，不允许导入答卷')
    return
  }
  importDocumentVisible.value = true
}

/** 人工重建题项答卷统计，修复 stats 与 response 聚合偏差 */
async function handleRebuildItemStats() {
  if (!props.selectedItem) return
  const confirmed = await confirmAsync({
    title: '重建答卷统计',
    content:
      '将按当前答卷事实重算该题项的待换算/已换算/无实质作答计数。仅在统计与列表不一致或系统巡检告警后使用。',
    okText: '重建',
  })
  if (!confirmed) return
  try {
    await indirectResponseApi.rebuildItemStats(props.selectedItem.id)
    message.success('题项答卷统计已重建')
    await loadResponses()
    emit('import-done')
  } catch (error) {
    showUserError(error, '重建答卷统计失败')
  }
}

defineExpose({
  responses,
  loadResponses,
  clearResponses,
})
</script>

<template>
  <UiEmpty v-if="!selectedItem" description="请选择" class="ie__empty" />

  <UiCard v-else class="detail-table-card ie__response-card">
    <template #title>
      「{{ selectedItem.itemCode }} · {{ selectedItem.itemText.substring(0, 24) }}…」答卷
    </template>
    <template #extra>
      <a-space>
        <a-segmented
          v-if="showConversionWorkflow"
          v-model:value="conversionFilter"
          :options="conversionFilterOptions"
        />
        <UiButton
          v-if="selectedForm && isTeacherResponseWritable(selectedForm)"
          variant="outline"
          size="sm"
          @click="openImportExcel"
        >
          Excel 导入
        </UiButton>
        <UiButton
          v-if="selectedForm && isTeacherResponseWritable(selectedForm)"
          variant="outline"
          size="sm"
          @click="openImportDocument"
        >
          文档导入
        </UiButton>
        <UiButton
          v-if="selectedForm && isTeacherResponseWritable(selectedForm)"
          variant="primary"
          size="sm"
          @click="openResponseCreate"
        >
          新增答卷
        </UiButton>
        <UiButton
          v-if="showConversionWorkflow"
          variant="outline"
          size="sm"
          @click="handleRebuildItemStats"
        >
          重建统计
        </UiButton>
      </a-space>
    </template>

    <a-alert
      v-if="showConversionWorkflow && pendingResponseCount > 0"
      type="warning"
      show-icon
      class="ie__pending-alert"
      :message="`有 ${pendingResponseCount} 份答卷待录入换算分，录入后才会纳入间接达成度均值`"
    />

    <UiDataTable
      pagination-mode="server"
      v-model:current="responsePageNum"
      v-model:page-size="responsePageSize"
      :columns="responseColumns"
      :data-source="responses"
      :loading="responsesLoading"
      row-key="id"
      size="middle"
      flat
      :total="responseTotal"
      @page-change="handleResponsePageChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'respondentType'">
          {{ respondentTypeLabel(record.respondentType) }}
        </template>
        <template v-else-if="column.key === 'answerSummary'">
          <span v-if="isScaleItemType(selectedItem?.itemType)">
            {{ responseScaleAnswerText(record) }}
          </span>
          <span v-else-if="isSingleChoiceItemType(selectedItem?.itemType)">
            {{ responseSingleChoiceAnswerText(record) }}
          </span>
          <span v-else-if="isMultiChoiceItemType(selectedItem?.itemType)">
            {{ responseChoiceValues(record) }}
          </span>
          <span v-else-if="isOpenTextItemType(selectedItem?.itemType)">
            {{ responseOpenText(record) }}
          </span>
          <span v-else class="ie__sub-desc ie__sub-desc--error"> 题项题型无效 </span>
        </template>
        <template v-else-if="column.key === 'convertedScore'">
          <span :class="record.conversionPending ? 'ie__sub-desc ie__sub-desc--warn' : ''">
            {{ record.convertedScore == null ? '-' : record.convertedScore.toFixed(2) }}
          </span>
        </template>
        <template v-else-if="column.key === 'conversionStatus'">
          <UiTag
            v-if="
              showConversionWorkflow &&
              record.validFlag &&
              isManualConversionStatus(record.manualConversionStatus)
            "
            :tone="manualConversionStatusTone(record.manualConversionStatus)"
          >
            {{ manualConversionStatusLabel(record.manualConversionStatus) }}
          </UiTag>
          <span
            v-else-if="showConversionWorkflow && record.validFlag"
            class="ie__sub-desc ie__sub-desc--error"
          >
            换算状态契约错误
          </span>
          <span v-else class="ie__sub-desc">—</span>
        </template>
        <template v-else-if="column.key === 'openText'">
          <span class="ie__sub-desc">{{ responseOpenText(record) }}</span>
        </template>
        <template v-else-if="column.key === 'validFlag'">
          <UiTag v-if="record.validFlag === null" tone="orange">待确认</UiTag>
          <UiTag v-else :tone="record.validFlag ? 'green' : 'red'">
            {{ record.validFlag ? '有效' : '无效' }}
          </UiTag>
        </template>
        <template v-else-if="column.key === 'actions'">
          <UiTableActions
            v-if="selectedForm && isTeacherResponseWritable(selectedForm)"
            :items="buildIndirectResponseActions(record)"
            split
            @action="(key) => handleIndirectResponseAction(key, record)"
          />
          <span v-else class="ie__sub-desc">已锁定</span>
        </template>
      </template>
    </UiDataTable>
  </UiCard>

  <a-modal
    v-model:open="responseEditorVisible"
    :title="responseEditorMode === 'create' ? '新增答卷' : '编辑答卷'"
    @ok="submitResponse"
  >
    <a-form layout="vertical" :model="responseEditor">
      <a-row :gutter="12">
        <a-col :span="12">
          <a-form-item label="应答人类型" required>
            <span
              v-if="
                isSystemCollectedRespondentType(responseEditor.respondentType) ||
                responseEditor.respondentType === RespondentTypeCode.AI_DRAFT
              "
              class="ie__sub-desc"
            >
              {{ respondentTypeLabel(responseEditor.respondentType) }}
            </span>
            <a-select
              v-else
              v-model:value="responseEditor.respondentType"
              :options="MANUAL_RESPONDENT_TYPE_OPTIONS"
              @change="handleResponseRespondentTypeChange"
            />
          </a-form-item>
        </a-col>
        <a-col v-if="responseEditor.respondentType === RespondentTypeCode.STUDENT" :span="12">
          <a-form-item label="班级" required>
            <ClassSelector
              :value="responseEditorClassId || null"
              placeholder="选择班级"
              @change="handleResponseClassChange"
            />
          </a-form-item>
        </a-col>
        <a-col
          v-else-if="
            responseEditor.respondentType === RespondentTypeCode.TEACHER ||
            responseEditor.respondentType === RespondentTypeCode.EXPERT ||
            responseEditor.respondentType === RespondentTypeCode.SUPERVISOR
          "
          :span="12"
        >
          <a-form-item label="应答人" required>
            <TeacherSelector
              :value="responseEditor.respondentId || null"
              placeholder="选择人员"
              @change="handleResponseRespondentChange"
            />
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item
        v-if="responseEditor.respondentType === RespondentTypeCode.STUDENT"
        label="应答学生"
        required
      >
        <StudentSelector
          :class-id="responseEditorClassId"
          :value="responseEditor.respondentId || null"
          placeholder="选择在校学生"
          @change="handleResponseRespondentChange"
        />
      </a-form-item>
      <a-row
        v-if="
          responseEditor.respondentType === RespondentTypeCode.GRADUATE ||
          responseEditor.respondentType === RespondentTypeCode.EMPLOYER
        "
        :gutter="12"
      >
        <a-col :span="8">
          <a-form-item label="姓名" required>
            <a-input v-model:value="responseIdentityName" placeholder="填写姓名" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="单位">
            <a-input v-model:value="responseIdentityOrganization" placeholder="填写单位名称" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="联系方式">
            <a-input v-model:value="responseIdentityContact" placeholder="填写联系方式" />
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="12">
        <a-col :span="12">
          <a-form-item label="答案" required>
            <a-radio-group
              v-if="isScaleItemType(selectedItem?.itemType)"
              v-model:value="responseEditor.scaleValue"
              class="ie__answer-group"
            >
              <a-radio
                v-for="option in selectedItemScaleOptions()"
                :key="option.scaleValue"
                :value="option.scaleValue"
              >
                {{ option.label }}
              </a-radio>
            </a-radio-group>
            <a-radio-group
              v-else-if="isSingleChoiceItemType(selectedItem?.itemType)"
              v-model:value="responseEditor.singleChoiceValue"
              class="ie__answer-group"
            >
              <a-radio
                v-for="option in selectedItemChoiceOptions()"
                :key="option.optionValue"
                :value="option.optionValue"
              >
                {{ option.optionLabel }}
              </a-radio>
            </a-radio-group>
            <a-checkbox-group
              v-else-if="isMultiChoiceItemType(selectedItem?.itemType)"
              v-model:value="responseMultiChoiceValues"
              class="ie__answer-group"
            >
              <a-row :gutter="[8, 8]">
                <a-col
                  v-for="option in selectedItemChoiceOptions()"
                  :key="option.optionValue"
                  :span="12"
                >
                  <a-checkbox :value="option.optionValue">
                    {{ option.optionLabel }}
                  </a-checkbox>
                </a-col>
              </a-row>
            </a-checkbox-group>
            <a-textarea
              v-else-if="isOpenTextItemType(selectedItem?.itemType)"
              v-model:value="responseEditor.openText"
              :rows="3"
              placeholder="填写开放回答"
            />
            <a-alert v-else type="error" message="题项题型无效，无法录入答卷" show-icon />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="换算分（0~1）">
            <a-input-number
              v-model:value="responseEditor.convertedScore"
              :min="0"
              :max="1"
              :step="0.01"
              :disabled="clearConvertedScore"
              style="width: 100%"
              placeholder="可暂留空，保存后进入待换算 Tab 再录入"
            />
            <a-checkbox
              v-if="
                showConversionWorkflow &&
                responseEditorMode === 'edit' &&
                responseEditor.convertedScore != null
              "
              v-model:checked="clearConvertedScore"
              class="ie__clear-score"
            >
              清除已录入换算分
            </a-checkbox>
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="12">
        <a-col :span="8">
          <a-form-item label="有效样本">
            <a-select
              v-model:value="responseEditorValidFlagChoice"
              :options="VALID_FLAG_EDITOR_OPTIONS"
            />
          </a-form-item>
        </a-col>
        <a-col :span="16">
          <a-form-item label="无效原因">
            <a-input
              v-model:value="responseEditor.invalidReason"
              :disabled="responseEditorValidFlagChoice !== 'invalid'"
            />
          </a-form-item>
        </a-col>
      </a-row>
      <a-collapse
        v-if="showConversionWorkflow && responseEditorMode === 'edit'"
        class="ie__audit-collapse"
      >
        <a-collapse-panel key="audit" header="换算审计记录">
          <a-spin :spinning="conversionAuditLoading">
            <a-timeline v-if="conversionAuditLogs.length">
              <a-timeline-item v-for="log in conversionAuditLogs" :key="log.id">
                <div class="ie__audit-entry">
                  <span class="ie__audit-action">
                    {{ formatConversionAuditAction(log.oldScore, log.newScore) }}
                  </span>
                  <span class="ie__audit-score">
                    {{ formatConversionAuditScore(log.oldScore) }}
                    →
                    {{ formatConversionAuditScore(log.newScore) }}
                  </span>
                </div>
                <div class="ie__audit-meta ie__sub-desc">
                  {{ formatConversionAuditOperator(log) }}
                  <template v-if="log.operateTime">
                    · {{ formatConversionAuditTime(log.operateTime) }}
                  </template>
                </div>
              </a-timeline-item>
            </a-timeline>
            <span v-else class="ie__sub-desc">暂无换算审计记录</span>
          </a-spin>
        </a-collapse-panel>
      </a-collapse>
    </a-form>
  </a-modal>

  <UiPlatformExcelImportModal
    v-model:open="importExcelVisible"
    :scene-key="ExcelImportSceneKey.QUALITY_INDIRECT_RESPONSE"
    entity-label="间接评价答卷"
    hide-template-download
    template-hint="Excel 模板请从问卷详情页导出后填写，本弹窗仅支持上传已填好的答卷文件。"
    :context="importExcelContext"
    @success="handleImportExcelDone"
  />

  <ImportResponseDocumentModal
    v-model:open="importDocumentVisible"
    :form-id="selectedForm?.id ?? null"
    @refresh="handleAiDocParseDone"
  />
</template>

<style scoped lang="scss">
.ie {
  &__empty {
    margin-top: 32px;
  }

  &__sub-desc {
    margin-left: 4px;
    font-size: 12px;
    color: var(--dp-text-muted);

    &--error {
      color: var(--dp-danger);
    }

    &--warn {
      color: var(--dp-warning);
      font-weight: 500;
    }
  }

  &__pending-alert {
    margin-bottom: 12px;
  }

  &__clear-score {
    margin-top: 8px;
    display: block;
  }

  &__audit-collapse {
    margin-top: 8px;
  }

  &__audit-entry {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 13px;
  }

  &__audit-action {
    font-weight: 500;
    color: var(--dp-text);
  }

  &__audit-score {
    color: var(--dp-text-muted);
  }

  &__audit-meta {
    margin-top: 2px;
  }

  &__answer-group {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 12px;
  }

  &__audit-list {
    margin: 0;
    padding-left: 16px;
    font-size: 12px;
    color: var(--dp-text-muted);
  }
}
</style>

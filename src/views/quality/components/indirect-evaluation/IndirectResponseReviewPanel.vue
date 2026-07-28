<script setup lang="ts">
import type { IndirectEvaluationFormVO } from '@/apis/quality/indirect-form'
import type { IndirectEvaluationItemVO } from '@/apis/quality/indirect-item'
import type {
  IndirectConversionAuditLogVO,
  IndirectEvaluationResponseSaveRequest,
  IndirectEvaluationResponseVO,
} from '@/apis/quality/indirect-response'
import type { UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import dayjs from 'dayjs'
import { computed, ref, watch } from 'vue'
import { ExcelImportSceneKey } from '@/apis/platform/scene-keys'
import {
  indirectResponseApi,
  IndirectResponseConversionFilterCode,
} from '@/apis/quality/indirect-response'
import TeacherSelector from '@/components/platform/TeacherSelector.vue'
import UiPlatformExcelImportModal from '@/components/platform/UiPlatformExcelImportModal.vue'
import { ClassSelector, StudentSelector } from '@/components/quality/selectors'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiCheckbox from '@/components/ui-guide/ui/UiCheckbox.vue'
import UiCheckboxGroup from '@/components/ui-guide/ui/UiCheckboxGroup.vue'
import UiCol from '@/components/ui-guide/ui/UiCol.vue'
import UiCollapse from '@/components/ui-guide/ui/UiCollapse.vue'
import UiCollapsePanel from '@/components/ui-guide/ui/UiCollapsePanel.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiRadio from '@/components/ui-guide/ui/UiRadio.vue'
import UiRadioGroup from '@/components/ui-guide/ui/UiRadioGroup.vue'
import UiRow from '@/components/ui-guide/ui/UiRow.vue'
import UiSegmented from '@/components/ui-guide/ui/UiSegmented.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTimeline from '@/components/ui-guide/ui/UiTimeline.vue'
import UiTimelineItem from '@/components/ui-guide/ui/UiTimelineItem.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { isIndirectEvaluationItemType } from '@/types/enums/indirect-evaluation-item-type-enum'
import {
  isManualConversionStatus,
  ManualConversionStatusCode,
} from '@/types/enums/manual-conversion-status-enum'
import {
  isSystemCollectedRespondentType,
  MANUAL_RESPONDENT_TYPE_OPTIONS,
  RespondentTypeCode,
} from '@/types/enums/respondent-type-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
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

const VALID_FLAG_EDITOR_OPTIONS: Array<{ value: ResponseValidFlagEditorValue, label: string }> = [
  { value: 'pending', label: '待确认' },
  { value: 'valid', label: '有效' },
  { value: 'invalid', label: '无效' },
]

const responses = ref<IndirectEvaluationResponseVO[]>([])
const responsesLoading = ref(false)
const responsePageNum = ref(1)
const responsePageSize = ref(10)
const responseTotal = ref(0)
type ResponseListFilter = 'all' | 'pendingConfirm' | 'pending' | 'scored' | 'noSubstantive'
const responseListFilter = ref<ResponseListFilter>('all')
const pendingConfirmResponseCount = ref(0)
const pendingResponseCount = ref(0)
const convertedResponseCount = ref(0)
const noSubstantiveResponseCount = ref(0)
const conversionAuditLogs = ref<IndirectConversionAuditLogVO[]>([])
const conversionAuditLoading = ref(false)

function resolveConversionFilter(): IndirectResponseConversionFilterCode | undefined {
  if (responseListFilter.value === 'pending') return IndirectResponseConversionFilterCode.PENDING
  if (responseListFilter.value === 'scored') return IndirectResponseConversionFilterCode.CONVERTED
  if (responseListFilter.value === 'noSubstantive')
    return IndirectResponseConversionFilterCode.NO_SUBSTANTIVE
  return undefined
}

function resolvePendingValidConfirm(): boolean | undefined {
  return responseListFilter.value === 'pendingConfirm' ? true : undefined
}

const showConversionWorkflow = computed(() =>
  requiresTeacherScoreConversion(props.selectedItem?.itemType),
)

const showPendingConfirmAlert = computed(() => pendingConfirmResponseCount.value > 0)

const pendingConfirmAlertTitle = computed(
  () => `当前题项有 ${pendingConfirmResponseCount.value} 份 AI/文档导入草稿待确认有效`,
)

const pendingConfirmAlertDescription
  = '待确认样本尚未纳入有效样本与换算统计；请在列表中打开编辑，确认「有效 / 无效 / 待确认」后再录入换算分。'

function focusPendingConfirmTab() {
  if (responseListFilter.value !== 'pendingConfirm') {
    responseListFilter.value = 'pendingConfirm'
  }
}

const showPendingConversionAlert = computed(
  () => showConversionWorkflow.value && pendingResponseCount.value > 0,
)

const pendingConversionAlertTitle = computed(
  () => `当前题项有 ${pendingResponseCount.value} 份有效答卷待录入换算分`,
)

const pendingConversionAlertDescription
  = '选择/开放题须教师录入 0~1 换算分后，才会纳入间接评价达成度加权均值；待换算答卷可在下方 Tab 筛选处理。'

function focusPendingConversionTab() {
  if (responseListFilter.value !== 'pending') {
    responseListFilter.value = 'pending'
  }
}

const responseListFilterOptions = computed(() => {
  const options: Array<{ label: string, value: ResponseListFilter }> = [
    { label: '全部', value: 'all' },
  ]
  if (!showConversionWorkflow.value) {
    const pendingConfirmLabel
      = pendingConfirmResponseCount.value > 0
        ? `待确认 (${pendingConfirmResponseCount.value})`
        : '待确认'
    options.push({ label: pendingConfirmLabel, value: 'pendingConfirm' })
    return options
  }
  const pendingLabel
    = pendingResponseCount.value > 0 ? `待换算 (${pendingResponseCount.value})` : '待换算'
  const noSubstantiveLabel
    = noSubstantiveResponseCount.value > 0
      ? `无实质作答 (${noSubstantiveResponseCount.value})`
      : '无实质作答'
  const pendingConfirmLabel
    = pendingConfirmResponseCount.value > 0
      ? `待确认 (${pendingConfirmResponseCount.value})`
      : '待确认'
  options.push(
    { label: pendingLabel, value: 'pending' },
    { label: '已换算', value: 'scored' },
    { label: noSubstantiveLabel, value: 'noSubstantive' },
    { label: pendingConfirmLabel, value: 'pendingConfirm' },
  )
  return options
})

const responseEditorVisible = ref(false)
const responseEditorMode = ref<'create' | 'edit'>('create')
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

function isScorePendingConversion(record: IndirectEvaluationResponseVO): boolean {
  return (
    record.validFlag === true
    && isManualConversionStatus(record.manualConversionStatus)
    && record.manualConversionStatus === ManualConversionStatusCode.PENDING
  )
}

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
    showFormValidationMessage('请单选应答人')
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
    pendingConfirmResponseCount.value = 0
    pendingResponseCount.value = 0
    convertedResponseCount.value = 0
    noSubstantiveResponseCount.value = 0
    return
  }
  responsesLoading.value = true
  try {
    const conversionFilterCode = resolveConversionFilter()
    const pendingValidConfirm = resolvePendingValidConfirm()
    const page = await indirectResponseApi.page({
      itemId: props.selectedItem.id,
      conversionFilter: conversionFilterCode,
      pendingValidConfirm,
      pageNum: responsePageNum.value,
      pageSize: responsePageSize.value,
    })
    responses.value = page.list
    responseTotal.value = page.total
  } catch (error) {
    responses.value = []
    responseTotal.value = 0
    pendingConfirmResponseCount.value = 0
    pendingResponseCount.value = 0
    convertedResponseCount.value = 0
    noSubstantiveResponseCount.value = 0
    showUserError(error, '间接评价答卷列表加载失败')
    return
  } finally {
    responsesLoading.value = false
  }
  // 附属信号失败不拖垮答卷列表
  try {
    const signal = await indirectResponseApi.itemSignalSummary(props.selectedItem.id)
    pendingConfirmResponseCount.value = signal.pendingConfirmCount ?? 0
    if (showConversionWorkflow.value) {
      pendingResponseCount.value = signal.pendingCount
      convertedResponseCount.value = signal.convertedCount
      noSubstantiveResponseCount.value = signal.noSubstantiveCount
    } else {
      pendingResponseCount.value = 0
      convertedResponseCount.value = 0
      noSubstantiveResponseCount.value = 0
    }
  } catch (error) {
    pendingConfirmResponseCount.value = 0
    pendingResponseCount.value = 0
    convertedResponseCount.value = 0
    noSubstantiveResponseCount.value = 0
    showUserError(error, '间接评价答卷信号加载失败')
  }
}

function handleResponsePageChange(page: { current: number, pageSize: number }) {
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

watch(responseListFilter, () => {
  responsePageNum.value = 1
  void loadResponses()
})

function openResponseCreate() {
  if (!props.selectedItem || !props.selectedForm) return
  if (!isTeacherResponseWritable(props.selectedForm)) {
    void message.error('问卷已关闭或已归档，不允许录入答卷')
    return
  }
  responseEditorMode.value = 'create'
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
    void message.error('问卷已关闭或已归档，不允许修改答卷')
    return
  }
  conversionAuditLogs.value = []
  responseEditorMode.value = 'edit'
  responseMultiChoiceValues.value
    = record.multipleChoiceValues?.map((option) => option.optionValue) ?? []
  responseEditorClassId.value = ''
  responseIdentityName.value
    = record.identityValues?.find((item) => item.fieldKey === 'NAME')?.fieldValue ?? ''
  responseIdentityOrganization.value
    = record.identityValues?.find((item) => item.fieldKey === 'ORGANIZATION')?.fieldValue ?? ''
  responseIdentityContact.value
    = record.identityValues?.find((item) => item.fieldKey === 'CONTACT')?.fieldValue ?? ''
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
    void message.error('请选择应答人类型')
    return
  }
  if (
    (v.respondentType === RespondentTypeCode.STUDENT
      || v.respondentType === RespondentTypeCode.TEACHER
      || v.respondentType === RespondentTypeCode.EXPERT
      || v.respondentType === RespondentTypeCode.SUPERVISOR)
    && !v.respondentId?.trim()
  ) {
    void message.error('请选择应答人')
    return
  }
  if (
    v.respondentType === RespondentTypeCode.GRADUATE
    || v.respondentType === RespondentTypeCode.EMPLOYER
  ) {
    if (!responseIdentityName.value.trim()) {
      void message.error('请填写应答人姓名')
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
    showFormValidationMessage('请先选择题项')
    return
  }
  if (!selectedItemTypeKnown()) {
    void message.error('当前题项题型无效，无法保存答卷')
    return
  }
  if (isScaleItemType(props.selectedItem.itemType) && v.scaleValue == null) {
    void message.error('请填写量表分值')
    return
  }
  if (isSingleChoiceItemType(props.selectedItem.itemType) && !v.singleChoiceValue?.trim()) {
    void message.error('请选择单选答案')
    return
  }
  const multiChoiceClearedOnEdit
    = isMultiChoiceItemType(props.selectedItem.itemType)
      && responseEditorMode.value === 'edit'
      && responseMultiChoiceValues.value.length === 0
  if (
    isMultiChoiceItemType(props.selectedItem.itemType)
    && responseMultiChoiceValues.value.length === 0
    && responseEditorMode.value === 'create'
  ) {
    void message.error('请至少选择一个多选答案')
    return
  }
  if (
    isOpenTextItemType(props.selectedItem.itemType)
    && props.selectedItem.required
    && !v.openText?.trim()
  ) {
    void message.error('请填写开放回答')
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
    void message.error('当前题项题型无效，无法保存答卷')
    return
  }
  if (multiChoiceClearedOnEdit) {
    v.convertedScore = undefined
  }
  if (responseEditorMode.value === 'edit' && v.validFlag === null) {
    v.pendingValidConfirm = true
  } else {
    v.pendingValidConfirm = undefined
  }
  if (responseEditorMode.value === 'create') await indirectResponseApi.create(v)
  else await indirectResponseApi.update(v)
  void message.success('已保存')
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
    void message.error('问卷已关闭或已归档，不允许删除答卷')
    return
  }
  void confirmAsync({
    title: '删除该答卷？',
    type: 'error',
    onOk: async () => {
      await indirectResponseApi.delete(record.id)
      void message.success('已删除')
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
    void message.error('问卷已关闭或已归档，不允许导入答卷')
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
    void message.error('问卷已关闭或已归档，不允许导入答卷')
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
    void message.success('题项答卷统计已重建')
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
  focusPendingConfirmTab,
  focusPendingConversionTab,
})
</script>

<template>
  <UiAlertStrip
    v-if="!selectedItem"
    tone="info"
    size="sm"
    dense
    inline
    :show-icon="false"
    class="ie__empty"
  >
    <template #default>
      <span style="display: inline-flex; align-items: center; gap: var(--dp-space-component-tight)">
        <UiTag tone="blue" size="sm">未选择条目</UiTag>
        <span>请在左侧选择问卷/评价条目后查看作答</span>
      </span>
    </template>
  </UiAlertStrip>

  <UiCard v-else class="detail-table-card ie__response-card">
    <template #title>
      「{{ selectedItem.itemCode }} · {{ selectedItem.itemText.substring(0, 24) }}…」答卷
    </template>
    <template #extra>
      <div class="dp-space dp-space--tight">
        <UiSegmented v-model="responseListFilter" :options="responseListFilterOptions" size="sm" />
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
      </div>
    </template>

    <UiAlertStrip
      v-if="showPendingConfirmAlert"
      tone="warning"
      :title="pendingConfirmAlertTitle"
      :description="pendingConfirmAlertDescription"
      :closable="false"
      dense
      class="ie__pending-strip"
    >
      <template #actions>
        <UiButton
          v-if="responseListFilter !== 'pendingConfirm'"
          variant="outline"
          size="sm"
          @click="focusPendingConfirmTab"
        >
          查看待确认
        </UiButton>
      </template>
    </UiAlertStrip>

    <UiAlertStrip
      v-if="showPendingConversionAlert"
      tone="warning"
      :title="pendingConversionAlertTitle"
      :description="pendingConversionAlertDescription"
      :closable="false"
      dense
      class="ie__pending-strip"
    >
      <template #actions>
        <UiButton
          v-if="responseListFilter !== 'pending'"
          variant="outline"
          size="sm"
          @click="focusPendingConversionTab"
        >
          查看待换算
        </UiButton>
      </template>
    </UiAlertStrip>

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
          <span :class="isScorePendingConversion(record) ? 'ie__sub-desc ie__sub-desc--warn' : ''">
            {{ record.convertedScore == null ? '-' : record.convertedScore.toFixed(6) }}
          </span>
        </template>
        <template v-else-if="column.key === 'conversionStatus'">
          <UiTag
            v-if="
              showConversionWorkflow
                && record.validFlag
                && isManualConversionStatus(record.manualConversionStatus)
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

  <UiDialog
    v-model:open="responseEditorVisible"
    :title="responseEditorMode === 'create' ? '新增答卷' : '编辑答卷'"
    @ok="submitResponse"
  >
    <UiForm layout="vertical" :model="responseEditor">
      <UiRow :gutter="12">
        <UiCol :span="12">
          <UiFormItem label="应答人类型" required>
            <span
              v-if="
                isSystemCollectedRespondentType(responseEditor.respondentType)
                  || responseEditor.respondentType === RespondentTypeCode.AI_DRAFT
              "
              class="ie__sub-desc"
            >
              {{ respondentTypeLabel(responseEditor.respondentType) }}
            </span>
            <UiSelect
              size="sm"
              v-else
              v-model="responseEditor.respondentType"
              :options="MANUAL_RESPONDENT_TYPE_OPTIONS"
              @change="handleResponseRespondentTypeChange"
            />
          </UiFormItem>
        </UiCol>
        <UiCol v-if="responseEditor.respondentType === RespondentTypeCode.STUDENT" :span="12">
          <UiFormItem label="班级" required>
            <ClassSelector
              :value="responseEditorClassId || null"
              placeholder="选择班级"
              @change="handleResponseClassChange"
            />
          </UiFormItem>
        </UiCol>
        <UiCol
          v-else-if="
            responseEditor.respondentType === RespondentTypeCode.TEACHER
              || responseEditor.respondentType === RespondentTypeCode.EXPERT
              || responseEditor.respondentType === RespondentTypeCode.SUPERVISOR
          "
          :span="12"
        >
          <UiFormItem label="应答人" required>
            <TeacherSelector
              :value="responseEditor.respondentId || null"
              placeholder="选择人员"
              @change="handleResponseRespondentChange"
            />
          </UiFormItem>
        </UiCol>
      </UiRow>
      <UiFormItem
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
      </UiFormItem>
      <UiRow
        v-if="
          responseEditor.respondentType === RespondentTypeCode.GRADUATE
            || responseEditor.respondentType === RespondentTypeCode.EMPLOYER
        "
        :gutter="12"
      >
        <UiCol :span="8">
          <UiFormItem label="姓名" required>
            <UiInput size="sm" v-model="responseIdentityName" placeholder="填写姓名" />
          </UiFormItem>
        </UiCol>
        <UiCol :span="8">
          <UiFormItem label="单位">
            <UiInput size="sm" v-model="responseIdentityOrganization" placeholder="填写单位名称" />
          </UiFormItem>
        </UiCol>
        <UiCol :span="8">
          <UiFormItem label="联系方式">
            <UiInput size="sm" v-model="responseIdentityContact" placeholder="填写联系方式" />
          </UiFormItem>
        </UiCol>
      </UiRow>
      <UiRow :gutter="12">
        <UiCol :span="12">
          <UiFormItem label="答案" required>
            <UiRadioGroup
              v-if="isScaleItemType(selectedItem?.itemType)"
              v-model="responseEditor.scaleValue"
              class="ie__answer-group"
              size="sm"
              block
            >
              <UiRadio
                v-for="option in selectedItemScaleOptions()"
                :key="option.scaleValue"
                :value="option.scaleValue"
              >
                {{ option.label }}
              </UiRadio>
            </UiRadioGroup>
            <UiRadioGroup
              v-else-if="isSingleChoiceItemType(selectedItem?.itemType)"
              v-model="responseEditor.singleChoiceValue"
              class="ie__answer-group"
              size="sm"
              block
            >
              <UiRadio
                v-for="option in selectedItemChoiceOptions()"
                :key="option.optionValue"
                :value="option.optionValue"
              >
                {{ option.optionLabel }}
              </UiRadio>
            </UiRadioGroup>
            <UiCheckboxGroup
              v-else-if="isMultiChoiceItemType(selectedItem?.itemType)"
              v-model="responseMultiChoiceValues"
              class="ie__answer-group"
            >
              <UiRow :gutter="[8, 8]">
                <UiCol
                  v-for="option in selectedItemChoiceOptions()"
                  :key="option.optionValue"
                  :span="12"
                >
                  <UiCheckbox :value="option.optionValue">
                    {{ option.optionLabel }}
                  </UiCheckbox>
                </UiCol>
              </UiRow>
            </UiCheckboxGroup>
            <UiTextarea
              size="sm"
              v-else-if="isOpenTextItemType(selectedItem?.itemType)"
              v-model="responseEditor.openText"
              :rows="3"
              placeholder="填写开放回答"
            />
            <UiAlertStrip
              v-else
              tone="error"
              title="题项题型无效，无法录入答卷"
              :closable="false"
              dense
            />
          </UiFormItem>
        </UiCol>
        <UiCol :span="12">
          <UiFormItem label="换算分（0~1）">
            <UiInputNumber
              size="sm"
              v-model="responseEditor.convertedScore"
              :min="0"
              :max="1"
              :step="0.01"
              :precision="6"
              style="width: 100%"
              placeholder="可暂留空，保存后进入待换算 Tab 再录入"
            />
            <p
              v-if="
                showConversionWorkflow
                  && responseEditorMode === 'edit'
                  && responseEditor.convertedScore != null
              "
              class="ie__sub-desc ie__score-hint"
            >
              已换算答卷仅支持修正换算分，不支持清除；修正将写入审计记录。
            </p>
          </UiFormItem>
        </UiCol>
      </UiRow>
      <UiRow :gutter="12">
        <UiCol :span="8">
          <UiFormItem label="有效样本">
            <UiSelect
              size="sm"
              v-model="responseEditorValidFlagChoice"
              :options="VALID_FLAG_EDITOR_OPTIONS"
            />
          </UiFormItem>
        </UiCol>
        <UiCol :span="16">
          <UiFormItem label="无效原因">
            <UiInput
              size="sm"
              v-model="responseEditor.invalidReason"
              :disabled="responseEditorValidFlagChoice !== 'invalid'"
            />
          </UiFormItem>
        </UiCol>
      </UiRow>
      <UiCollapse
        v-if="showConversionWorkflow && responseEditorMode === 'edit'"
        class="ie__audit-collapse"
      >
        <UiCollapsePanel key="audit" header="换算审计记录">
          <UiSpin :spinning="conversionAuditLoading">
            <UiTimeline v-if="conversionAuditLogs.length">
              <UiTimelineItem v-for="log in conversionAuditLogs" :key="log.id">
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
              </UiTimelineItem>
            </UiTimeline>
            <span v-else class="ie__sub-desc">暂无换算审计记录</span>
          </UiSpin>
        </UiCollapsePanel>
      </UiCollapse>
    </UiForm>
  </UiDialog>

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
    margin-top: var(--dp-space-component);
  }

  &__sub-desc {
    margin-left: var(--dp-space-component-xs);
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-muted);

    &--error {
      color: var(--dp-danger);
    }

    &--warn {
      color: var(--dp-warning);
      font-weight: 500;
    }
  }

  &__pending-strip {
    margin-bottom: var(--dp-space-component);
  }

  &__score-hint {
    margin-top: var(--dp-space-component-tight);
  }

  &__audit-collapse {
    margin-top: var(--dp-space-component-tight);
  }

  &__audit-entry {
    display: flex;
    flex-wrap: wrap;
    gap: var(--dp-space-component-tight);
    font-size: var(--dp-font-size-sm);
  }

  &__audit-action {
    font-weight: 500;
    color: var(--dp-text-primary);
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
    gap: var(--dp-space-component-tight) var(--dp-space-component);
  }

  &__audit-list {
    margin: 0;
    padding-left: var(--dp-space-block);
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-muted);
  }
}
</style>

<script setup lang="ts">
import type { IndirectEvaluationFormVO } from '@/apis/quality/indirect-form'
import type { IndirectEvaluationItemVO } from '@/apis/quality/indirect-item'
import type {
  IndirectEvaluationResponseSaveRequest,
  IndirectEvaluationResponseVO,
} from '@/apis/quality/indirect-response'
import { message } from 'ant-design-vue'
import { computed, ref } from 'vue'
import { ExcelImportSceneKey } from '@/apis/platform/scene-keys'
import { indirectResponseApi } from '@/apis/quality/indirect-response'
import UiPlatformExcelImportModal from '@/components/platform/UiPlatformExcelImportModal.vue'
import { ClassSelector, StudentSelector, TeacherSelector } from '@/components/quality/selectors'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { isIndirectEvaluationItemType } from '@/types/enums/indirect-evaluation-item-type-enum'
import { isSystemCollectedRespondentType, RespondentType } from '@/types/enums/respondent-type-enum'
import ImportResponseDocumentModal from '../ImportResponseDocumentModal.vue'
import {
  isMultiChoiceItemType,
  isOpenTextItemType,
  isScaleItemType,
  isSingleChoiceItemType,
  isTeacherResponseWritable,
  requiresTeacherScoreConversion,
  respondentTypeLabel,
  respondentTypeOptions,
  responseColumns,
} from './indirect-evaluation-shared'

const props = defineProps<{
  selectedForm: IndirectEvaluationFormVO | null
  selectedItem: IndirectEvaluationItemVO | null
}>()

const emit = defineEmits<{
  'import-done': []
}>()

const responses = ref<IndirectEvaluationResponseVO[]>([])
const responsesLoading = ref(false)
const conversionFilter = ref<'all' | 'pending' | 'scored'>('all')

const pendingResponseCount = computed(
  () => responses.value.filter((record) => record.conversionPending).length,
)

const filteredResponses = computed(() => {
  if (conversionFilter.value === 'pending') {
    return responses.value.filter((record) => record.conversionPending === true)
  }
  if (conversionFilter.value === 'scored') {
    return responses.value.filter((record) => isScoredResponse(record))
  }
  return responses.value
})

/** 已换算：有效且（量表有分/换算分，或选择开放题已录换算分） */
function isScoredResponse(record: IndirectEvaluationResponseVO): boolean {
  if (!record.validFlag) return false
  if (record.conversionPending) return false
  if (requiresTeacherScoreConversion(props.selectedItem?.itemType)) {
    return record.convertedScore != null
  }
  return record.convertedScore != null || record.scaleValue != null
}

const showConversionWorkflow = computed(() =>
  requiresTeacherScoreConversion(props.selectedItem?.itemType),
)

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
  respondentType: RespondentType.STUDENT,
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

/** 表单开关只接受 boolean；API 契约 validFlag 可为 null（待确认） */
const responseEditorValidFlag = computed({
  get(): boolean {
    return responseEditor.value.validFlag === true
  },
  set(value: boolean) {
    responseEditor.value.validFlag = value
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

/** 按当前选中题项加载答卷列表 */
async function loadResponses() {
  if (!props.selectedItem) {
    responses.value = []
    return
  }
  responsesLoading.value = true
  try {
    responses.value = await indirectResponseApi.listByItem(props.selectedItem.id)
  } finally {
    responsesLoading.value = false
  }
}

function clearResponses() {
  responses.value = []
}

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
    respondentType: RespondentType.STUDENT,
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
}

function openResponseEdit(record: IndirectEvaluationResponseVO) {
  if (!props.selectedForm || !isTeacherResponseWritable(props.selectedForm)) {
    message.error('问卷已关闭或已归档，不允许修改答卷')
    return
  }
  responseEditorMode.value = 'edit'
  clearConvertedScore.value = false
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
    ...record,
    multipleChoiceValues: record.multipleChoiceValues?.map((option) => ({ ...option })) ?? [],
    identityValues: record.identityValues?.map((identity) => ({ ...identity })) ?? [],
  }
  responseEditorVisible.value = true
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
    (v.respondentType === RespondentType.STUDENT
      || v.respondentType === RespondentType.TEACHER
      || v.respondentType === RespondentType.EXPERT
      || v.respondentType === RespondentType.SUPERVISOR)
    && !v.respondentId?.trim()
  ) {
    message.error('请选择应答人')
    return
  }
  if (
    v.respondentType === RespondentType.GRADUATE
    || v.respondentType === RespondentType.EMPLOYER
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
  if (
    isMultiChoiceItemType(props.selectedItem.itemType)
    && responseMultiChoiceValues.value.length === 0
  ) {
    message.error('请至少选择一个多选答案')
    return
  }
  if (
    isOpenTextItemType(props.selectedItem.itemType)
    && props.selectedItem.required
    && !v.openText?.trim()
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
    v.multipleChoiceValues = selectedItemChoiceOptions().filter((option) =>
      responseMultiChoiceValues.value.includes(option.optionValue),
    )
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
  if (
    showConversionWorkflow.value
    && responseEditor.value.validFlag
    && responseEditor.value.convertedScore == null
    && !clearConvertedScore.value
  ) {
    message.error('选择/开放题有效答卷须录入换算分')
    return
  }
  if (clearConvertedScore.value) {
    v.clearConvertedScore = true
    v.convertedScore = undefined
  } else {
    v.clearConvertedScore = undefined
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
          :options="[
            { label: '全部', value: 'all' },
            { label: '待换算', value: 'pending' },
            { label: '已换算', value: 'scored' },
          ]"
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
      pagination-mode="client"
      class="student-detail-table__data-table"
      :columns="responseColumns"
      :data-source="filteredResponses"
      :loading="responsesLoading"
      row-key="id"
      size="middle"
      :page-size="10"
      :total="filteredResponses.length"
      flat
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
          <UiTag v-if="record.conversionPending" tone="orange">待换算</UiTag>
          <UiTag v-else-if="showConversionWorkflow && record.validFlag" tone="green">已换算</UiTag>
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
          <div
            v-if="selectedForm && isTeacherResponseWritable(selectedForm)"
            class="operations-cell"
            @click.stop
          >
            <UiTextAction @click="openResponseEdit(record)">编辑</UiTextAction>
            <UiTextAction tone="danger" @click="deleteResponse(record)">删除</UiTextAction>
          </div>
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
                isSystemCollectedRespondentType(responseEditor.respondentType)
                  || responseEditor.respondentType === RespondentType.AI_DRAFT
              "
              class="ie__sub-desc"
            >
              {{ respondentTypeLabel(responseEditor.respondentType) }}
            </span>
            <a-select
              v-else
              v-model:value="responseEditor.respondentType"
              :options="respondentTypeOptions"
              @change="handleResponseRespondentTypeChange"
            />
          </a-form-item>
        </a-col>
        <a-col v-if="responseEditor.respondentType === RespondentType.STUDENT" :span="12">
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
            responseEditor.respondentType === RespondentType.TEACHER
              || responseEditor.respondentType === RespondentType.EXPERT
              || responseEditor.respondentType === RespondentType.SUPERVISOR
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
        v-if="responseEditor.respondentType === RespondentType.STUDENT"
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
          responseEditor.respondentType === RespondentType.GRADUATE
            || responseEditor.respondentType === RespondentType.EMPLOYER
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
          <a-form-item
            label="换算分（0~1）"
            :required="showConversionWorkflow && responseEditorValidFlag && !clearConvertedScore"
          >
            <a-input-number
              v-model:value="responseEditor.convertedScore"
              :min="0"
              :max="1"
              :step="0.01"
              :disabled="clearConvertedScore"
              style="width: 100%"
              placeholder="选择/开放题须录入后才纳入达成度"
            />
            <a-checkbox
              v-if="
                responseEditorMode === 'edit'
                  && showConversionWorkflow
                  && responseEditor.convertedScore != null
              "
              v-model:checked="clearConvertedScore"
              class="ie__clear-score"
            >
              清空换算分（改回待换算）
            </a-checkbox>
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="12">
        <a-col :span="8">
          <a-form-item label="有效">
            <a-switch v-model:checked="responseEditorValidFlag" />
          </a-form-item>
        </a-col>
        <a-col :span="16">
          <a-form-item label="无效原因">
            <a-input
              v-model:value="responseEditor.invalidReason"
              :disabled="responseEditorValidFlag"
            />
          </a-form-item>
        </a-col>
      </a-row>
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
  }

  &__answer-group {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 12px;
  }
}
</style>

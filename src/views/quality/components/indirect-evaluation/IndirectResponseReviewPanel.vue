<script setup lang="ts">
import type { IndirectEvaluationFormVO } from '@/apis/quality/indirect-form'
import type { IndirectEvaluationItemVO } from '@/apis/quality/indirect-item'
import type {
  IndirectEvaluationResponseSaveRequest,
  IndirectEvaluationResponseVO,
} from '@/apis/quality/indirect-response'
import { message } from 'ant-design-vue'
import { ref } from 'vue'
import { indirectResponseApi } from '@/apis/quality/indirect-response'
import {
  ClassSelector,
  StudentSelector,
  TeacherSelector,
} from '@/components/quality/selectors'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import ImportResponseDocumentModal from '../ImportResponseDocumentModal.vue'
import ImportResponseExcelModal from '../ImportResponseExcelModal.vue'
import {
  isTeacherResponseWritable,
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
  respondentType: 'STUDENT',
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

const importExcelVisible = ref(false)
const importDocumentVisible = ref(false)

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
  responseMultiChoiceValues.value = []
  responseEditorClassId.value = ''
  responseIdentityName.value = ''
  responseIdentityOrganization.value = ''
  responseIdentityContact.value = ''
  responseEditor.value = {
    formId: props.selectedForm.id,
    itemId: props.selectedItem.id,
    respondentType: 'STUDENT',
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

/** 校验应答人身份与题型答案后提交答卷 */
async function submitResponse() {
  const v = responseEditor.value
  if (!v.respondentType) {
    message.error('请选择应答人类型')
    return
  }
  if (
    (v.respondentType === 'STUDENT'
      || v.respondentType === 'TEACHER'
      || v.respondentType === 'EXPERT'
      || v.respondentType === 'SUPERVISOR')
    && !v.respondentId?.trim()
  ) {
    message.error('请选择应答人')
    return
  }
  if (v.respondentType === 'GRADUATE' || v.respondentType === 'EMPLOYER') {
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
  if (props.selectedItem.itemType === 'SCALE' && v.scaleValue == null) {
    message.error('请填写量表分值')
    return
  }
  if (props.selectedItem.itemType === 'SINGLE_CHOICE' && !v.singleChoiceValue?.trim()) {
    message.error('请选择单选答案')
    return
  }
  if (
    props.selectedItem.itemType === 'MULTI_CHOICE'
    && responseMultiChoiceValues.value.length === 0
  ) {
    message.error('请至少选择一个多选答案')
    return
  }
  if (
    props.selectedItem.itemType === 'OPEN_TEXT'
    && props.selectedItem.required
    && !v.openText?.trim()
  ) {
    message.error('请填写开放回答')
    return
  }
  if (props.selectedItem.itemType === 'SCALE') {
    const scaleLabel = selectedItemScaleOptions().find(
      (option) => option.scaleValue === v.scaleValue,
    )?.label
    v.singleChoiceValue = undefined
    v.multipleChoiceValues = []
    v.openText = ''
    v.answerSummary = scaleLabel ?? (v.scaleValue == null ? '' : `${v.scaleValue}分`)
  } else if (props.selectedItem.itemType === 'SINGLE_CHOICE') {
    const selectedOption = selectedItemChoiceOptions().find(
      (option) => option.optionValue === v.singleChoiceValue,
    )
    v.scaleValue = undefined
    v.multipleChoiceValues = []
    v.openText = ''
    v.answerSummary = selectedOption?.optionLabel ?? v.singleChoiceValue ?? ''
  } else if (props.selectedItem.itemType === 'MULTI_CHOICE') {
    v.scaleValue = undefined
    v.singleChoiceValue = ''
    v.openText = ''
    v.multipleChoiceValues = selectedItemChoiceOptions().filter((option) =>
      responseMultiChoiceValues.value.includes(option.optionValue),
    )
    v.answerSummary = v.multipleChoiceValues.map((option) => option.optionLabel).join(' | ')
  } else {
    v.scaleValue = undefined
    v.singleChoiceValue = ''
    v.multipleChoiceValues = []
    v.answerSummary = ''
    v.openText = v.openText?.trim() ?? ''
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
          PDF / Word / 图片
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

    <UiDataTable
      pagination-mode="client"
      class="student-detail-table__data-table"
      :columns="responseColumns"
      :data-source="responses"
      :loading="responsesLoading"
      row-key="id"
      size="middle"
      :page-size="10"
      :total="responses.length"
      flat
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'respondentType'">
          {{ respondentTypeLabel(record.respondentType) }}
        </template>
        <template v-else-if="column.key === 'answerSummary'">
          <span v-if="selectedItem?.itemType === 'SCALE'">
            {{ responseScaleAnswerText(record) }}
          </span>
          <span v-else-if="selectedItem?.itemType === 'SINGLE_CHOICE'">
            {{ responseSingleChoiceAnswerText(record) }}
          </span>
          <span v-else-if="selectedItem?.itemType === 'MULTI_CHOICE'">
            {{ responseChoiceValues(record) }}
          </span>
          <span v-else class="ie__sub-desc">
            {{ responseOpenText(record) }}
          </span>
        </template>
        <template v-else-if="column.key === 'convertedScore'">
          {{ record.convertedScore == null ? '-' : record.convertedScore.toFixed(2) }}
        </template>
        <template v-else-if="column.key === 'openText'">
          <span class="ie__sub-desc">{{ responseOpenText(record) }}</span>
        </template>
        <template v-else-if="column.key === 'validFlag'">
          <UiTag :tone="record.validFlag ? 'green' : 'red'">
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
            <a-select
              v-model:value="responseEditor.respondentType"
              :options="respondentTypeOptions"
              @change="handleResponseRespondentTypeChange"
            />
          </a-form-item>
        </a-col>
        <a-col v-if="responseEditor.respondentType === 'STUDENT'" :span="12">
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
            responseEditor.respondentType === 'TEACHER'
              || responseEditor.respondentType === 'EXPERT'
              || responseEditor.respondentType === 'SUPERVISOR'
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
      <a-form-item v-if="responseEditor.respondentType === 'STUDENT'" label="应答学生" required>
        <StudentSelector
          :class-id="responseEditorClassId"
          :value="responseEditor.respondentId || null"
          placeholder="选择在校学生"
          @change="handleResponseRespondentChange"
        />
      </a-form-item>
      <a-row
        v-if="
          responseEditor.respondentType === 'GRADUATE'
            || responseEditor.respondentType === 'EMPLOYER'
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
              v-if="selectedItem?.itemType === 'SCALE'"
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
              v-else-if="selectedItem?.itemType === 'SINGLE_CHOICE'"
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
              v-else-if="selectedItem?.itemType === 'MULTI_CHOICE'"
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
              v-else
              v-model:value="responseEditor.openText"
              :rows="3"
              placeholder="填写开放回答"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="换算分（0~1）">
            <a-input-number
              v-model:value="responseEditor.convertedScore"
              :min="0"
              :max="1"
              :step="0.01"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="12">
        <a-col :span="8">
          <a-form-item label="有效">
            <a-switch v-model:checked="responseEditor.validFlag" />
          </a-form-item>
        </a-col>
        <a-col :span="16">
          <a-form-item label="无效原因">
            <a-input
              v-model:value="responseEditor.invalidReason"
              :disabled="responseEditor.validFlag"
            />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>
  </a-modal>

  <ImportResponseExcelModal
    v-model:open="importExcelVisible"
    :form-id="selectedForm?.id ?? null"
    @imported="handleImportExcelDone"
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
    color: var(--dp-text-muted, #64748b);
  }

  &__answer-group {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 12px;
  }
}
</style>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
/**
 * 间接评价管理 - 问卷 + 题项 + 答卷
 *
 * 后端：
 * - /api/quality/indirect-forms       问卷 CRUD
 * - /api/quality/indirect-items       题项 CRUD
 * - /api/quality/indirect-responses   答卷 CRUD + 批量
 *
 * 设计：先选问卷 → 显示题项 → 选题项查看答卷
 */
import type {
  AchievementTargetType,
  IndirectEvaluationFormQueryPayload,
  IndirectEvaluationFormSavePayload,
  IndirectEvaluationFormVO,
  IndirectEvaluationItemSavePayload,
  IndirectEvaluationItemType,
  IndirectEvaluationItemVO,
  IndirectEvaluationResponseSavePayload,
  IndirectEvaluationResponseVO,
  RespondentType,
  ScaleConversionRuleVO,
} from '@/apis/quality'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  ACHIEVEMENT_TARGET_TYPE_LABEL,
  indirectFormApi,
  indirectItemApi,
  indirectResponseApi,
  isAchievementTargetType,
  isRespondentType,
  RESPONDENT_TYPE_LABEL,
  scaleConversionRuleApi,
} from '@/apis/quality'
import {
  CourseGoalSelector,
  GraduationRequirementSelector,
  ProgramSelector,
  RequirementIndicatorSelector,
  StudentSelector,
  TeacherSelector,
} from '@/components/quality/selectors'
import { UiButton, UiDataTable, UiEmpty } from '@/components/ui-guide/ui'
import { SignalBand, StageWorkbenchShell } from '@/components/workbench'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { formatOptionalNumber, formatRequiredNumber } from './_helpers'
import ImportResponseDocumentModal from './components/ImportResponseDocumentModal.vue'
import ImportResponseExcelModal from './components/ImportResponseExcelModal.vue'

const formColumns: ColumnsType = [
  { title: '编码', dataIndex: 'formCode', key: 'formCode', width: 120 },
  { title: '名称', dataIndex: 'formName', key: 'formName' },
  { title: '问卷类型', dataIndex: 'formType', key: 'formType', width: 140 },
  { title: '目标', dataIndex: 'targetType', key: 'targetType', width: 200 },
  { title: '期望样本', dataIndex: 'expectedSample', key: 'expectedSample', width: 100 },
  { title: '操作', key: 'actions', width: 180, fixed: 'right' },
]

const itemColumns: ColumnsType = [
  { title: '编码', dataIndex: 'itemCode', key: 'itemCode', width: 100 },
  { title: '题面', dataIndex: 'itemText', key: 'itemText' },
  { title: '权重', dataIndex: 'weight', key: 'weight', width: 70 },
  { title: '有效样本', key: 'validCount', width: 100 },
  { title: '操作', key: 'actions', width: 160, fixed: 'right' },
]

const responseColumns: ColumnsType = [
  { title: '应答人', dataIndex: 'respondentType', key: 'respondentType', width: 100 },
  { title: '原始值', dataIndex: 'rawValue', key: 'rawValue', width: 80 },
  { title: '换算分', dataIndex: 'convertedScore', key: 'convertedScore', width: 80 },
  { title: '开放回答', dataIndex: 'openText', key: 'openText' },
  { title: '有效', dataIndex: 'validFlag', key: 'validFlag', width: 70 },
  { title: '操作', key: 'actions', width: 160, fixed: 'right' },
]

function targetTypeLabel(value: unknown): string {
  if (isAchievementTargetType(value)) return ACHIEVEMENT_TARGET_TYPE_LABEL[value]
  throw new Error('达成度目标类型不符合前后端契约')
}

function respondentTypeLabel(value: unknown): string {
  if (isRespondentType(value)) return RESPONDENT_TYPE_LABEL[value]
  throw new Error('应答人类型不符合前后端契约')
}

const formTypeOptions = [
  { value: 'STUDENT_SELF', label: '学生自评' },
  { value: 'PEER_EVALUATION', label: '同伴互评' },
  { value: 'TEACHER_EVALUATION', label: '教师评价' },
  { value: 'EMPLOYER_FEEDBACK', label: '用人单位反馈' },
  { value: 'GRADUATE_TRACING', label: '毕业生跟踪' },
  { value: 'EXPERT_REVIEW', label: '专家评审' },
  { value: 'INTERNSHIP_SUPERVISOR', label: '实习导师' },
]

const targetTypeOptions: { value: AchievementTargetType, label: string }[] = [
  { value: 'COURSE_GOAL', label: ACHIEVEMENT_TARGET_TYPE_LABEL.COURSE_GOAL },
  { value: 'REQUIREMENT_INDICATOR', label: ACHIEVEMENT_TARGET_TYPE_LABEL.REQUIREMENT_INDICATOR },
  { value: 'GRADUATION_REQUIREMENT', label: ACHIEVEMENT_TARGET_TYPE_LABEL.GRADUATION_REQUIREMENT },
  { value: 'TRAINING_OBJECTIVE', label: ACHIEVEMENT_TARGET_TYPE_LABEL.TRAINING_OBJECTIVE },
  { value: 'PROGRAM_SUMMARY', label: ACHIEVEMENT_TARGET_TYPE_LABEL.PROGRAM_SUMMARY },
  { value: 'CIVIC_GOAL_AGGREGATE', label: ACHIEVEMENT_TARGET_TYPE_LABEL.CIVIC_GOAL_AGGREGATE },
  {
    value: 'COMPLEX_ENGINEERING_AGGREGATE',
    label: ACHIEVEMENT_TARGET_TYPE_LABEL.COMPLEX_ENGINEERING_AGGREGATE,
  },
]
const respondentTypeOptions: { value: RespondentType, label: string }[] = [
  { value: 'STUDENT', label: RESPONDENT_TYPE_LABEL.STUDENT },
  { value: 'GRADUATE', label: RESPONDENT_TYPE_LABEL.GRADUATE },
  { value: 'EMPLOYER', label: RESPONDENT_TYPE_LABEL.EMPLOYER },
  { value: 'TEACHER', label: RESPONDENT_TYPE_LABEL.TEACHER },
  { value: 'EXPERT', label: RESPONDENT_TYPE_LABEL.EXPERT },
  { value: 'SUPERVISOR', label: RESPONDENT_TYPE_LABEL.SUPERVISOR },
]
const itemTypeOptions: { value: IndirectEvaluationItemType, label: string }[] = [
  { value: 'SCALE', label: '量表题' },
  { value: 'SINGLE_CHOICE', label: '单选题' },
  { value: 'MULTI_CHOICE', label: '多选题' },
  { value: 'OPEN_TEXT', label: '开放文本' },
]

function formTypeLabel(value: unknown): string {
  const option = formTypeOptions.find((item) => item.value === value)
  if (!option) throw new Error('问卷类型不符合前后端契约')
  return option.label
}

function isIndirectEvaluationItemType(value: unknown): value is IndirectEvaluationItemType {
  return itemTypeOptions.some((item) => item.value === value)
}

/* ========== 问卷分页 ========== */

const forms = ref<IndirectEvaluationFormVO[]>([])
const formsTotal = ref(0)
const formsLoading = ref(false)
const formQuery = reactive<IndirectEvaluationFormQueryPayload>({
  pageNum: 1,
  pageSize: 10,
  formType: undefined,
  targetType: undefined,
  enabled: undefined,
})
const selectedForm = ref<IndirectEvaluationFormVO | null>(null)

function selectedId(value: string | null | undefined): string {
  return value ?? ''
}

function handleFormTargetChange(value: string | null | undefined) {
  formEditor.targetId = selectedId(value)
}

function handleFormProgramChange(value: string | null | undefined) {
  formEditor.programId = selectedId(value)
}

function handleItemTargetChange(value: string | null | undefined) {
  itemEditor.value.targetId = selectedId(value)
}

function handleResponseRespondentChange(value: string | null | undefined) {
  responseEditor.value.respondentId = selectedId(value)
}

async function loadForms() {
  formsLoading.value = true
  try {
    const page = await indirectFormApi.page({ ...formQuery })
    forms.value = page.list
    formsTotal.value = page.total
  } finally {
    formsLoading.value = false
  }
}

const formEditorVisible = ref(false)
const formEditorMode = ref<'create' | 'edit'>('create')
const formEditor = reactive<IndirectEvaluationFormSavePayload>({
  formCode: '',
  formName: '',
  formType: 'STUDENT_SELF',
  targetType: 'COURSE_GOAL',
  targetId: '',
  programId: '',
  description: '',
  expectedSample: 30,
  enabled: true,
})

function openFormCreate() {
  formEditorMode.value = 'create'
  Object.assign(formEditor, {
    id: undefined,
    formCode: '',
    formName: '',
    formType: 'STUDENT_SELF',
    targetType: 'COURSE_GOAL',
    targetId: '',
    programId: '',
    description: '',
    expectedSample: 30,
    enabled: true,
  })
  formEditorVisible.value = true
}

function openFormEdit(record: IndirectEvaluationFormVO) {
  formEditorMode.value = 'edit'
  Object.assign(formEditor, record)
  formEditorVisible.value = true
}

async function submitForm() {
  if (!formEditor.formCode.trim() || !formEditor.formName.trim() || !formEditor.targetId.trim()) {
    message.error('请填写编码、名称、目标 ID')
    return
  }
  if (formEditorMode.value === 'create') await indirectFormApi.create(formEditor)
  else await indirectFormApi.update(formEditor)
  message.success('已保存')
  formEditorVisible.value = false
  await loadForms()
}

async function handleFormDelete(record: IndirectEvaluationFormVO) {
  void confirmAsync({
    title: `删除问卷 ${record.formCode}？`,
    type: 'error',
    onOk: async () => {
      await indirectFormApi.delete(record.id)
      message.success('已删除')
      if (selectedForm.value?.id === record.id) selectedForm.value = null
      await loadForms()
    },
  })
}

function handleFormPageChange(payload: { current: number, pageSize: number }) {
  formQuery.pageNum = payload.current
  formQuery.pageSize = payload.pageSize
  loadForms()
}

/* ========== 题项 ========== */

const items = ref<IndirectEvaluationItemVO[]>([])
const itemsLoading = ref(false)
const selectedItem = ref<IndirectEvaluationItemVO | null>(null)
const scaleRules = ref<ScaleConversionRuleVO[]>([])

async function loadItems() {
  if (!selectedForm.value) {
    items.value = []
    return
  }
  itemsLoading.value = true
  try {
    items.value = await indirectItemApi.listByForm(selectedForm.value.id)
  } finally {
    itemsLoading.value = false
  }
}

async function loadScaleRules() {
  const page = await scaleConversionRuleApi.page({ pageNum: 1, pageSize: 200, enabled: true })
  scaleRules.value = page.list
}

const itemEditorVisible = ref(false)
const itemEditorMode = ref<'create' | 'edit'>('create')
const itemEditor = ref<IndirectEvaluationItemSavePayload>({
  formId: '',
  itemCode: '',
  itemText: '',
  targetType: 'COURSE_GOAL',
  targetId: '',
  scaleRuleId: undefined,
  weight: 1,
  sortOrder: 0,
  itemType: 'SCALE',
  scaleMin: 1,
  scaleMax: 5,
  scaleLabels: [
    { scaleValue: 1, label: '1分' },
    { scaleValue: 2, label: '2分' },
    { scaleValue: 3, label: '3分' },
    { scaleValue: 4, label: '4分' },
    { scaleValue: 5, label: '5分' },
  ],
  choiceOptions: [],
  required: true,
})

function defaultScaleLabels(min: number, max: number) {
  const labels = []
  for (let value = min; value <= max; value++) {
    labels.push({ scaleValue: value, label: `${value}分` })
  }
  return labels
}

function assertScaleLabelsComplete(record: IndirectEvaluationItemVO) {
  if (record.scaleMin == null || record.scaleMax == null || record.scaleMin >= record.scaleMax) {
    throw new Error(`量表题 ${record.itemCode} 缺少有效的量表范围`)
  }
  const labels = record.scaleLabels
  if (!labels?.length) throw new Error(`量表题 ${record.itemCode} 缺少档位标签`)
  const values = new Set(labels.map((label) => label.scaleValue))
  for (let value = record.scaleMin; value <= record.scaleMax; value++) {
    if (!values.has(value)) throw new Error(`量表题 ${record.itemCode} 的档位标签不完整`)
  }
}

function assertChoiceOptionsComplete(record: IndirectEvaluationItemVO) {
  const options = record.choiceOptions
  if (!options || options.length < 2) {
    throw new Error(`选择题 ${record.itemCode} 至少需要 2 个选项`)
  }
  const values = new Set<string>()
  for (const option of options) {
    if (!option.optionValue.trim() || !option.optionLabel.trim()) {
      throw new Error(`选择题 ${record.itemCode} 存在不完整选项`)
    }
    if (values.has(option.optionValue.trim())) {
      throw new Error(`选择题 ${record.itemCode} 存在重复选项值`)
    }
    values.add(option.optionValue.trim())
  }
}

function assertEditableItemContract(record: IndirectEvaluationItemVO) {
  if (!isIndirectEvaluationItemType(record.itemType)) {
    throw new Error(`题项 ${record.itemCode} 的题型不符合前后端契约`)
  }
  if (record.required == null) {
    throw new Error(`题项 ${record.itemCode} 缺少是否必填标记`)
  }
  if (record.itemType === 'SCALE') {
    assertScaleLabelsComplete(record)
    return
  }
  if (record.itemType === 'SINGLE_CHOICE' || record.itemType === 'MULTI_CHOICE') {
    assertChoiceOptionsComplete(record)
  }
}

function openItemCreate() {
  if (!selectedForm.value) return
  itemEditorMode.value = 'create'
  itemEditor.value = {
    formId: selectedForm.value.id,
    itemCode: '',
    itemText: '',
    targetType: selectedForm.value.targetType,
    targetId: selectedForm.value.targetId,
    scaleRuleId: undefined,
    weight: 1,
    sortOrder: (items.value.length + 1) * 10,
    itemType: 'SCALE',
    scaleMin: 1,
    scaleMax: 5,
    scaleLabels: defaultScaleLabels(1, 5),
    choiceOptions: [],
    required: true,
  }
  itemEditorVisible.value = true
}

function openItemEdit(record: IndirectEvaluationItemVO) {
  assertEditableItemContract(record)
  itemEditorMode.value = 'edit'
  itemEditor.value = {
    ...record,
    itemType: record.itemType,
    scaleLabels: record.scaleLabels?.map((label) => ({ ...label })),
    choiceOptions: record.choiceOptions?.map((option) => ({ ...option })),
    required: record.required,
  }
  itemEditorVisible.value = true
}

function syncScaleLabels() {
  const v = itemEditor.value
  if (v.scaleMin == null || v.scaleMax == null || v.scaleMin >= v.scaleMax) {
    v.scaleLabels = []
    return
  }
  const min = v.scaleMin
  const max = v.scaleMax
  v.scaleLabels = defaultScaleLabels(min, max).map((label) => {
    const existing = v.scaleLabels?.find((item) => item.scaleValue === label.scaleValue)
    return { scaleValue: label.scaleValue, label: existing?.label ?? label.label }
  })
}

function addChoiceOption() {
  const options = itemEditor.value.choiceOptions ?? []
  const index = options.length + 1
  itemEditor.value.choiceOptions = [
    ...options,
    { optionValue: `option_${index}`, optionLabel: `选项${index}` },
  ]
}

function removeChoiceOption(index: number) {
  itemEditor.value.choiceOptions = (itemEditor.value.choiceOptions ?? []).filter(
    (_, i) => i !== index,
  )
}

async function submitItem() {
  const v = itemEditor.value
  if (!v.itemCode.trim() || !v.itemText.trim()) {
    message.error('请填写编码和题面')
    return
  }
  if (v.itemType === 'SCALE') {
    if (v.scaleMin == null || v.scaleMax == null || v.scaleMin >= v.scaleMax) {
      message.error('量表最大值必须大于最小值')
      return
    }
    syncScaleLabels()
    v.choiceOptions = []
  } else if (v.itemType === 'SINGLE_CHOICE' || v.itemType === 'MULTI_CHOICE') {
    const options = v.choiceOptions ?? []
    if (
      options.length < 2
      || options.some((option) => !option.optionValue.trim() || !option.optionLabel.trim())
    ) {
      message.error('选择题至少配置 2 个完整选项')
      return
    }
    const optionValues = new Set(options.map((option) => option.optionValue.trim()))
    if (optionValues.size !== options.length) {
      message.error('选项值不能重复')
      return
    }
    v.scaleMin = undefined
    v.scaleMax = undefined
    v.scaleLabels = []
  } else if (v.itemType === 'OPEN_TEXT') {
    v.scaleMin = undefined
    v.scaleMax = undefined
    v.scaleLabels = []
    v.choiceOptions = []
  }
  if (itemEditorMode.value === 'create') await indirectItemApi.create(v)
  else await indirectItemApi.update(v)
  message.success('已保存')
  itemEditorVisible.value = false
  await loadItems()
}

async function deleteItem(record: IndirectEvaluationItemVO) {
  void confirmAsync({
    title: `删除题项 ${record.itemCode}？`,
    type: 'error',
    onOk: async () => {
      await indirectItemApi.delete(record.id)
      message.success('已删除')
      if (selectedItem.value?.id === record.id) selectedItem.value = null
      await loadItems()
    },
  })
}

/* ========== 答卷 ========== */

const responses = ref<IndirectEvaluationResponseVO[]>([])
const responsesLoading = ref(false)

async function loadResponses() {
  if (!selectedItem.value) {
    responses.value = []
    return
  }
  responsesLoading.value = true
  try {
    responses.value = await indirectResponseApi.listByItem(selectedItem.value.id)
  } finally {
    responsesLoading.value = false
  }
}

const responseEditorVisible = ref(false)
const responseEditorMode = ref<'create' | 'edit'>('create')
const responseEditor = ref<IndirectEvaluationResponseSavePayload>({
  formId: '',
  itemId: '',
  respondentType: 'STUDENT',
  respondentId: '',
  rawValue: '',
  convertedScore: undefined,
  openText: '',
  validFlag: true,
  invalidReason: '',
})

function openResponseCreate() {
  if (!selectedItem.value || !selectedForm.value) return
  responseEditorMode.value = 'create'
  responseEditor.value = {
    formId: selectedForm.value.id,
    itemId: selectedItem.value.id,
    respondentType: 'STUDENT',
    respondentId: '',
    rawValue: '',
    convertedScore: undefined,
    openText: '',
    validFlag: true,
    invalidReason: '',
  }
  responseEditorVisible.value = true
}

function openResponseEdit(record: IndirectEvaluationResponseVO) {
  responseEditorMode.value = 'edit'
  responseEditor.value = { ...record }
  responseEditorVisible.value = true
}

async function submitResponse() {
  const v = responseEditor.value
  if (!v.respondentType) {
    message.error('请选择应答人类型')
    return
  }
  if (responseEditorMode.value === 'create') await indirectResponseApi.create(v)
  else await indirectResponseApi.update(v)
  message.success('已保存')
  responseEditorVisible.value = false
  await loadResponses()
}

async function deleteResponse(record: IndirectEvaluationResponseVO) {
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

/* ========== Excel 导入答卷（弹窗封装在 ImportResponseExcelModal） ========== */

const importExcelVisible = ref(false)

function openImportExcel() {
  if (!selectedForm.value) return
  importExcelVisible.value = true
}

async function handleImportExcelDone() {
  await loadResponses()
  await refreshValidCounts()
}

/* ========== PDF / DOCX / 图片 AI 异步导入（弹窗封装在 ImportResponseDocumentModal） ========== */

const importDocumentVisible = ref(false)

async function handleAiDocParseDone() {
  await loadResponses()
  await refreshValidCounts()
}

function openImportDocument() {
  if (!selectedForm.value) return
  importDocumentVisible.value = true
}

/* ========== 题项有效样本统计 ========== */

const validCountMap = ref<Map<string, string>>(new Map())
const validCountLoading = ref(false)

function countTextToNumber(value: string): number {
  const count = Number(value)
  if (!Number.isFinite(count)) {
    throw new TypeError('题项有效样本数不符合前后端契约')
  }
  return count
}

function validCountText(itemId: string): string {
  const count = validCountMap.value.get(itemId)
  if (count === undefined) {
    if (validCountLoading.value) return '加载中'
    throw new Error('题项有效样本数缺失')
  }
  return count
}

async function refreshValidCounts() {
  if (!items.value.length) return
  validCountLoading.value = true
  try {
    const results = await Promise.all(
      items.value.map((item) =>
        indirectResponseApi
          .countValidByItem(item.id)
          .then((count): [string, string] => [item.id, count]),
      ),
    )
    validCountMap.value = new Map(results)
  } finally {
    validCountLoading.value = false
  }
}

/* ========== 信号指标：问卷 + 题项 + 答卷健康度 ========== */

const signals = computed<SignalMetric[]>(() => {
  const enabledForms = forms.value.filter((f) => f.enabled).length
  const totalItems = items.value.length
  const totalValid = Array.from(validCountMap.value.values()).reduce(
    (sum, n) => sum + countTextToNumber(n),
    0,
  )
  const expectedSampleSum = forms.value.reduce((sum, f) => sum + (f.expectedSample ?? 0), 0)
  const validResponses = responses.value.filter((r) => r.validFlag).length
  const invalidResponses = responses.value.filter((r) => !r.validFlag).length
  const sampleRatio
    = expectedSampleSum > 0 ? Number((totalValid / expectedSampleSum).toFixed(2)) : 0

  return [
    { key: 'forms-total', label: '问卷总数', value: forms.value.length, tone: 'blue' },
    {
      key: 'forms-enabled',
      label: '启用问卷',
      value: enabledForms,
      tone: enabledForms > 0 ? 'green' : 'gray',
    },
    { key: 'items-total', label: '题项总数', value: totalItems, tone: 'blue' },
    {
      key: 'valid-total',
      label: '有效样本',
      value: totalValid,
      tone: totalValid > 0 ? 'green' : 'gray',
    },
    {
      key: 'sample-ratio',
      label: '样本达成率',
      value: sampleRatio,
      tone: sampleRatio >= 1 ? 'green' : sampleRatio > 0 ? 'orange' : 'gray',
    },
    {
      key: 'responses-valid',
      label: '当前题项有效',
      value: validResponses,
      tone: validResponses > 0 ? 'green' : 'gray',
    },
    {
      key: 'responses-invalid',
      label: '当前题项无效',
      value: invalidResponses,
      tone: invalidResponses > 0 ? 'red' : 'gray',
    },
  ]
})

/* ========== 联动 ========== */

watch(selectedForm, async () => {
  selectedItem.value = null
  responses.value = []
  await loadItems()
  await refreshValidCounts()
})

watch(selectedItem, () => loadResponses())

onMounted(async () => {
  await Promise.all([loadForms(), loadScaleRules()])
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="ie__context">
        <div class="ie__context-info">
          <h2 class="ie__title">间接评价管理</h2>
        </div>
        <div class="ie__context-actions">
          <a-select
            v-model:value="formQuery.formType"
            placeholder="问卷类型"
            allow-clear
            class="ie__filter"
            :options="formTypeOptions"
          />
          <a-select
            v-model:value="formQuery.targetType"
            placeholder="目标类型"
            allow-clear
            class="ie__filter ie__filter--md"
            :options="targetTypeOptions"
          />
          <UiButton variant="outline" size="sm" :loading="formsLoading" @click="loadForms">
            查询
          </UiButton>
          <UiButton variant="primary" size="sm" @click="openFormCreate"> 新建问卷 </UiButton>
        </div>
      </div>
    </template>

    <SignalBand :metrics="signals" compact class="ie__signals" />

    <section class="ie__panel">
      <header class="ie__panel-header">
        <h3 class="ie__panel-title">间接评价问卷台账</h3>
      </header>
      <UiDataTable
        v-model:current="formQuery.pageNum"
        v-model:page-size="formQuery.pageSize"
        :columns="formColumns"
        :data-source="forms"
        :loading="formsLoading"
        row-key="id"
        size="middle"
        :total="formsTotal"
        flat
        @page-change="handleFormPageChange"
        :row-class-name="
          (r: IndirectEvaluationFormVO) => (selectedForm?.id === r.id ? 'ie__row-selected' : '')
        "
        :custom-row="
          (record: IndirectEvaluationFormVO) => ({
            onClick: () => (selectedForm = record),
            style: 'cursor: pointer',
          })
        "
      >
        <template #bodyCell="{ column, record, text }">
          <template v-if="column.key === 'formType'">
            {{ formTypeLabel(text) }}
          </template>
          <template v-else-if="column.key === 'targetType'">
            {{ targetTypeLabel(record.targetType) }}
            <span class="ie__sub-desc">({{ record.targetId }})</span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <UiButton variant="ghost" size="sm" @click.stop="openFormEdit(record)">
                编辑
              </UiButton>
              <UiButton
                variant="ghost"
                status="danger"
                size="sm"
                @click.stop="handleFormDelete(record)"
              >
                删除
              </UiButton>
            </a-space>
          </template>
        </template>
      </UiDataTable>
    </section>

    <a-row v-if="selectedForm" :gutter="12" class="ie__split">
      <a-col :span="12">
        <section class="ie__panel">
          <header class="ie__panel-header">
            <h3 class="ie__panel-title">题项</h3>
            <UiButton variant="primary" size="sm" @click="openItemCreate"> 新建题项 </UiButton>
          </header>

          <UiDataTable
            :columns="itemColumns"
            :data-source="items"
            :loading="itemsLoading"
            row-key="id"
            size="middle"
            :show-pagination="false"
            flat
            :total="items.length"
            :row-class-name="
              (r: IndirectEvaluationItemVO) => (selectedItem?.id === r.id ? 'ie__row-selected' : '')
            "
            :custom-row="
              (record: IndirectEvaluationItemVO) => ({
                onClick: () => (selectedItem = record),
                style: 'cursor: pointer',
              })
            "
          >
            <template #bodyCell="{ column, record, text }">
              <template v-if="column.key === 'weight'">
                {{ formatRequiredNumber(text, '间接评价题项权重', 2) }}
              </template>
              <template v-else-if="column.key === 'validCount'">
                <span
                  :class="
                    countTextToNumber(validCountText(record.id)) > 0
                      ? 'ie__count-strong'
                      : 'ie__count-muted'
                  "
                >
                  {{ validCountText(record.id) }}
                </span>
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-space>
                  <UiButton variant="ghost" size="sm" @click.stop="openItemEdit(record)">
                    编辑
                  </UiButton>
                  <UiButton
                    variant="ghost"
                    status="danger"
                    size="sm"
                    @click.stop="deleteItem(record)"
                  >
                    删除
                  </UiButton>
                </a-space>
              </template>
            </template>
          </UiDataTable>
        </section>
      </a-col>

      <a-col :span="12">
        <UiEmpty v-if="!selectedItem" description="请在左侧选择题项查看答卷" class="ie__empty" />

        <section v-else class="ie__panel">
          <header class="ie__panel-header">
            <h3 class="ie__panel-title">
              「{{ selectedItem.itemCode }} · {{ selectedItem.itemText.substring(0, 24) }}…」答卷
            </h3>
            <div class="ie__panel-actions">
              <UiButton variant="outline" size="sm" @click="openImportExcel"> Excel 导入 </UiButton>
              <UiButton variant="outline" size="sm" @click="openImportDocument">
                PDF / Word / 图片
              </UiButton>
              <UiButton variant="primary" size="sm" @click="openResponseCreate">
                新增答卷
              </UiButton>
            </div>
          </header>

          <UiDataTable
            :columns="responseColumns"
            :data-source="responses"
            :loading="responsesLoading"
            row-key="id"
            size="middle"
            :page-size="10"
            :total="responses.length"
            flat
          >
            <template #bodyCell="{ column, record, text }">
              <template v-if="column.key === 'respondentType'">
                {{ respondentTypeLabel(text) }}
              </template>
              <template v-else-if="column.key === 'convertedScore'">
                {{ formatOptionalNumber(text, '间接评价换算分', 2) }}
              </template>
              <template v-else-if="column.key === 'openText'">
                <span class="ie__sub-desc">{{ text ?? '-' }}</span>
              </template>
              <template v-else-if="column.key === 'validFlag'">
                <a-tag :color="text ? 'green' : 'red'">{{ text ? '有效' : '无效' }}</a-tag>
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-space>
                  <UiButton variant="ghost" size="sm" @click="openResponseEdit(record)">
                    编辑
                  </UiButton>
                  <UiButton
                    variant="ghost"
                    status="danger"
                    size="sm"
                    @click="deleteResponse(record)"
                  >
                    删除
                  </UiButton>
                </a-space>
              </template>
            </template>
          </UiDataTable>
        </section>
      </a-col>
    </a-row>

    <!-- 问卷编辑 -->
    <a-modal
      v-model:open="formEditorVisible"
      :title="formEditorMode === 'create' ? '新建问卷' : '编辑问卷'"
      width="720px"
      @ok="submitForm"
    >
      <a-form layout="vertical" :model="formEditor">
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="编码" required>
              <a-input v-model:value="formEditor.formCode" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="问卷类型" required>
              <a-select v-model:value="formEditor.formType" :options="formTypeOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="期望样本">
              <a-input-number
                v-model:value="formEditor.expectedSample"
                :min="0"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="名称" required>
          <a-input v-model:value="formEditor.formName" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="目标类型" required>
              <a-select
                v-model:value="formEditor.targetType"
                :options="targetTypeOptions"
                @change="formEditor.targetId = ''"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="目标对象" required>
              <CourseGoalSelector
                v-if="formEditor.targetType === 'COURSE_GOAL'"
                :value="formEditor.targetId || null"
                placeholder="选择课程目标"
                @change="handleFormTargetChange"
              />
              <RequirementIndicatorSelector
                v-else-if="formEditor.targetType === 'REQUIREMENT_INDICATOR'"
                :value="formEditor.targetId || null"
                placeholder="选择观测点"
                @change="handleFormTargetChange"
              />
              <GraduationRequirementSelector
                v-else-if="formEditor.targetType === 'GRADUATION_REQUIREMENT'"
                :value="formEditor.targetId || null"
                placeholder="选择毕业要求"
                @change="handleFormTargetChange"
              />
              <a-input
                v-else
                v-model:value="formEditor.targetId"
                placeholder="该目标类型暂无下拉，请填业务对象 ID"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="所属专业">
              <ProgramSelector
                :value="formEditor.programId || null"
                @change="handleFormProgramChange"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="说明">
          <a-textarea v-model:value="formEditor.description" :rows="3" />
        </a-form-item>
        <a-checkbox v-model:checked="formEditor.enabled">启用</a-checkbox>
      </a-form>
    </a-modal>

    <!-- 题项编辑 -->
    <a-modal
      v-model:open="itemEditorVisible"
      :title="itemEditorMode === 'create' ? '新建题项' : '编辑题项'"
      width="640px"
      @ok="submitItem"
    >
      <a-form layout="vertical" :model="itemEditor">
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="编码" required>
              <a-input v-model:value="itemEditor.itemCode" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="权重">
              <a-input-number
                v-model:value="itemEditor.weight"
                :min="0"
                :step="0.1"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="排序">
              <a-input-number v-model:value="itemEditor.sortOrder" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="题型" required>
              <a-select v-model:value="itemEditor.itemType" :options="itemTypeOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="必填">
              <a-switch v-model:checked="itemEditor.required" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="题面" required>
          <a-textarea v-model:value="itemEditor.itemText" :rows="3" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="目标类型" required>
              <a-select
                v-model:value="itemEditor.targetType"
                :options="targetTypeOptions"
                @change="itemEditor.targetId = ''"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="目标对象" required>
              <CourseGoalSelector
                v-if="itemEditor.targetType === 'COURSE_GOAL'"
                :value="itemEditor.targetId || null"
                placeholder="选择课程目标"
                @change="handleItemTargetChange"
              />
              <RequirementIndicatorSelector
                v-else-if="itemEditor.targetType === 'REQUIREMENT_INDICATOR'"
                :value="itemEditor.targetId || null"
                placeholder="选择观测点"
                @change="handleItemTargetChange"
              />
              <GraduationRequirementSelector
                v-else-if="itemEditor.targetType === 'GRADUATION_REQUIREMENT'"
                :value="itemEditor.targetId || null"
                placeholder="选择毕业要求"
                @change="handleItemTargetChange"
              />
              <a-input
                v-else
                v-model:value="itemEditor.targetId"
                placeholder="该目标类型暂无下拉，请填业务对象 ID"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="量表换算规则">
          <a-select
            v-model:value="itemEditor.scaleRuleId"
            allow-clear
            show-search
            option-filter-prop="label"
          >
            <a-select-option
              v-for="r in scaleRules"
              :key="r.id"
              :value="r.id"
              :label="`${r.ruleCode} · ${r.ruleName}`"
            >
              {{ r.ruleCode }} · {{ r.ruleName }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <template v-if="itemEditor.itemType === 'SCALE'">
          <a-row :gutter="12">
            <a-col :span="12">
              <a-form-item label="量表最小值" required>
                <a-input-number
                  v-model:value="itemEditor.scaleMin"
                  :min="0"
                  style="width: 100%"
                  @change="syncScaleLabels"
                />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="量表最大值" required>
                <a-input-number
                  v-model:value="itemEditor.scaleMax"
                  :min="1"
                  style="width: 100%"
                  @change="syncScaleLabels"
                />
              </a-form-item>
            </a-col>
          </a-row>
          <a-form-item label="量表标签">
            <div class="ie__config-list">
              <div
                v-for="label in itemEditor.scaleLabels"
                :key="label.scaleValue"
                class="ie__config-row"
              >
                <a-input-number :value="label.scaleValue" disabled class="ie__config-value" />
                <a-input v-model:value="label.label" placeholder="标签" />
              </div>
            </div>
          </a-form-item>
        </template>
        <a-form-item
          v-if="itemEditor.itemType === 'SINGLE_CHOICE' || itemEditor.itemType === 'MULTI_CHOICE'"
          label="选项配置"
          required
        >
          <div class="ie__config-list">
            <div
              v-for="(option, optionIndex) in itemEditor.choiceOptions"
              :key="optionIndex"
              class="ie__config-row"
            >
              <a-input v-model:value="option.optionValue" placeholder="选项值" />
              <a-input v-model:value="option.optionLabel" placeholder="选项文案" />
              <UiButton
                variant="ghost"
                status="danger"
                size="sm"
                @click="removeChoiceOption(optionIndex)"
              >
                删除
              </UiButton>
            </div>
            <UiButton variant="outline" size="sm" @click="addChoiceOption">新增选项</UiButton>
          </div>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 答卷新增 / 编辑 -->
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
                @change="responseEditor.respondentId = ''"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="应答人">
              <StudentSelector
                v-if="responseEditor.respondentType === 'STUDENT'"
                :value="responseEditor.respondentId || null"
                placeholder="选择在校学生"
                @change="handleResponseRespondentChange"
              />
              <TeacherSelector
                v-else-if="responseEditor.respondentType === 'TEACHER'"
                :value="responseEditor.respondentId || null"
                placeholder="选择教师"
                @change="handleResponseRespondentChange"
              />
              <a-input
                v-else
                v-model:value="responseEditor.respondentId"
                placeholder="填写应答人业务 ID（毕业生 / 用人单位 / 专家 / 导师）"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="原始值">
              <a-input v-model:value="responseEditor.rawValue" placeholder="如 4" />
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
        <a-form-item label="开放回答">
          <a-textarea v-model:value="responseEditor.openText" :rows="3" />
        </a-form-item>
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

    <!-- Excel 批量导入答卷 -->
    <ImportResponseExcelModal
      v-model:open="importExcelVisible"
      :form-id="selectedForm?.id ?? null"
      @imported="handleImportExcelDone"
    />

    <!-- PDF / DOCX / 图片 文档抽取 -->
    <ImportResponseDocumentModal
      v-model:open="importDocumentVisible"
      :form-id="selectedForm?.id ?? null"
      @refresh="handleAiDocParseDone"
    />
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.ie {
  &__context {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  &__context-info {
    flex: 1;
    min-width: 240px;
  }

  &__title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__context-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__filter {
    width: 140px;

    &--md {
      width: 180px;
    }
  }

  &__signals {
    margin-bottom: 16px;
    padding: 16px 20px;
    background: var(--dp-surface-elevated, #f8fafc);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
  }

  &__panel {
    background: var(--dp-surface, #fff);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 12px;
  }

  &__panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }

  &__panel-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__panel-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__split {
    margin-top: 0;
  }

  &__empty {
    margin-top: 32px;
  }

  &__sub-desc {
    margin-left: 4px;
    font-size: 12px;
    color: var(--dp-text-muted, #64748b);
  }

  &__count-strong {
    color: var(--dp-success, #16a34a);
    font-weight: 500;
  }

  &__count-muted {
    color: var(--dp-text-muted, #94a3b8);
  }

  &__config-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__config-row {
    display: grid;
    grid-template-columns: minmax(96px, 1fr) minmax(160px, 2fr) auto;
    gap: 8px;
    align-items: center;

    &:has(.ie__config-value) {
      grid-template-columns: 96px 1fr;
    }
  }

  &__config-value {
    width: 100%;
  }
}

:deep(.ie__row-selected) td {
  background-color: var(--ant-color-primary-bg) !important;
}
</style>

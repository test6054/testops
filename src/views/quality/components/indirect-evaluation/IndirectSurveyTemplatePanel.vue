<script setup lang="ts">
import type {
  IndirectEvaluationFormQueryRequest,
  IndirectEvaluationFormSaveRequest,
  IndirectEvaluationFormVO,
} from '@/apis/quality/indirect-form'
import type {
  IndirectEvaluationItemSaveRequest,
  IndirectEvaluationItemVO,
} from '@/apis/quality/indirect-item'
import type { ScaleConversionRuleVO } from '@/apis/quality/scale-conversion-rule'
import type { AchievementTargetType, IndirectFormType } from '@/apis/quality/types'
import type { FilterField } from '@/components/ui-guide/ui/types'
import { message } from 'ant-design-vue'
import { computed, reactive, ref } from 'vue'
import { indirectFormApi } from '@/apis/quality/indirect-form'
import { indirectItemApi } from '@/apis/quality/indirect-item'
import { indirectResponseApi } from '@/apis/quality/indirect-response'
import { scaleConversionRuleApi } from '@/apis/quality/scale-conversion-rule'
import {
  CourseGoalSelector,
  CourseSelector,
  GraduationRequirementSelector,
  ProgramSelector,
  RequirementIndicatorSelector,
  TrainingObjectiveSelector,
  TrainingPlanSelector,
} from '@/components/quality/selectors'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useQualityStore } from '@/stores/modules/quality'
import { throwUserFacing } from '@/utils/contract-guard'
import { showUserError } from '@/utils/error-handler'
import { readAllPages, readPageList, readPageTotal } from '@/utils/page-result'
import {
  canCloseForm,
  canPublishForm,
  canShowWorkflowInsights,
  formColumns,
  formStatusLabel,
  formStatusTone,
  formTypeLabel,
  formTypeOptions,
  isFormStructureMutable,
  ITEM_CONFIG_ERROR,
  itemColumns,
  itemTypeOptions,
  SCALE_CONVERSION_RULE_OPTION_PAGE_SIZE,
  targetTypeLabel,
  targetTypeOptions,
} from './indirect-evaluation-shared'

const selectedForm = defineModel<IndirectEvaluationFormVO | null>('selectedForm', { default: null })
const selectedItem = defineModel<IndirectEvaluationItemVO | null>('selectedItem', { default: null })

const emit = defineEmits<{
  "publish": [record: IndirectEvaluationFormVO]
  "close": [record: IndirectEvaluationFormVO]
  "progress": [record: IndirectEvaluationFormVO]
  "statistics": [record: IndirectEvaluationFormVO]
  'copy-link': [record: IndirectEvaluationFormVO]
  'form-deleted': [formId: string]
}>()

const qualityStore = useQualityStore()

const forms = ref<IndirectEvaluationFormVO[]>([])
const formsTotal = ref(0)
const formsLoading = ref(false)
const formQuery = reactive<IndirectEvaluationFormQueryRequest>({
  pageNum: 1,
  pageSize: 10,
  formType: undefined,
  targetType: undefined,
  enabled: undefined,
})

interface IndirectFormFilterModel {
  formType?: IndirectFormType
  targetType?: AchievementTargetType
}

const formFilterForm = reactive<IndirectFormFilterModel>({
  formType: undefined,
  targetType: undefined,
})

const formFilterModel = computed<Record<string, unknown>>({
  get: () => formFilterForm as Record<string, unknown>,
  set: (value) => {
    Object.assign(formFilterForm, value)
  },
})

const formFilterFields = computed<FilterField[]>(() => [
  {
    key: 'formType',
    type: 'select',
    placeholder: '问卷类型',
    allowClear: true,
    width: 140,
    options: formTypeOptions,
  },
  {
    key: 'targetType',
    type: 'select',
    placeholder: '目标类型',
    allowClear: true,
    width: 160,
    options: targetTypeOptions,
  },
])

const formEditorQualityCourseId = ref('')
const formEditorTrainingPlanId = ref('')
const formEditorGraduationRequirementId = ref('')
const itemEditorQualityCourseId = ref('')
const itemEditorTrainingPlanId = ref('')
const itemEditorGraduationRequirementId = ref('')

const items = ref<IndirectEvaluationItemVO[]>([])
const itemsLoading = ref(false)
const scaleRules = ref<ScaleConversionRuleVO[]>([])

const validCountMap = ref<Map<string, number>>(new Map())
const validCountLoading = ref(false)

const formEditorVisible = ref(false)
const formEditorMode = ref<'create' | 'edit'>('create')
const formEditor = reactive<IndirectEvaluationFormSaveRequest>({
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

const itemEditorVisible = ref(false)
const itemEditorMode = ref<'create' | 'edit'>('create')
const itemEditor = ref<IndirectEvaluationItemSaveRequest>({
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

function handleFormTargetChange(value: string | null | undefined) {
  formEditor.targetId = value ?? ''
}

function handleFormTargetTypeChange() {
  formEditor.targetId = ''
  formEditorQualityCourseId.value = ''
  formEditorTrainingPlanId.value = ''
  formEditorGraduationRequirementId.value = ''
  if (
    formEditor.targetType === 'PROGRAM_SUMMARY'
    || formEditor.targetType === 'CIVIC_GOAL_AGGREGATE'
    || formEditor.targetType === 'COMPLEX_ENGINEERING_AGGREGATE'
  ) {
    formEditor.targetId = formEditor.programId || ''
  }
}

function handleFormCourseChange(value: string | null | undefined) {
  formEditorQualityCourseId.value = value ?? ''
  formEditor.targetId = ''
}

function handleFormTrainingPlanChange(value: string | null | undefined) {
  formEditorTrainingPlanId.value = value ?? ''
  formEditor.targetId = ''
  formEditorGraduationRequirementId.value = ''
}

function handleFormGraduationRequirementChange(value: string | null | undefined) {
  formEditorGraduationRequirementId.value = value ?? ''
  if (formEditor.targetType === 'GRADUATION_REQUIREMENT') {
    formEditor.targetId = value ?? ''
  } else {
    formEditor.targetId = ''
  }
}

function handleFormProgramChange(value: string | null | undefined) {
  const id = value ?? ''
  formEditor.programId = id
  formEditorTrainingPlanId.value = ''
  formEditorGraduationRequirementId.value = ''
  if (
    formEditor.targetType === 'PROGRAM_SUMMARY'
    || formEditor.targetType === 'CIVIC_GOAL_AGGREGATE'
    || formEditor.targetType === 'COMPLEX_ENGINEERING_AGGREGATE'
  ) {
    formEditor.targetId = id
  } else if (formEditor.targetType !== 'COURSE_GOAL') {
    formEditor.targetId = ''
  }
}

function handleItemTargetTypeChange() {
  itemEditor.value.targetId = ''
  itemEditorQualityCourseId.value = ''
  itemEditorTrainingPlanId.value = ''
  itemEditorGraduationRequirementId.value = ''
  if (
    itemEditor.value.targetType === 'PROGRAM_SUMMARY'
    || itemEditor.value.targetType === 'CIVIC_GOAL_AGGREGATE'
    || itemEditor.value.targetType === 'COMPLEX_ENGINEERING_AGGREGATE'
  ) {
    itemEditor.value.targetId = formEditor.programId || qualityStore.currentProgramId
  }
}

function handleItemCourseChange(value: string | null | undefined) {
  itemEditorQualityCourseId.value = value ?? ''
  itemEditor.value.targetId = ''
}

function handleItemTrainingPlanChange(value: string | null | undefined) {
  itemEditorTrainingPlanId.value = value ?? ''
  itemEditor.value.targetId = ''
  itemEditorGraduationRequirementId.value = ''
}

function handleItemGraduationRequirementChange(value: string | null | undefined) {
  itemEditorGraduationRequirementId.value = value ?? ''
  if (itemEditor.value.targetType === 'GRADUATION_REQUIREMENT') {
    itemEditor.value.targetId = value ?? ''
  } else {
    itemEditor.value.targetId = ''
  }
}

function handleItemTargetChange(value: string | null | undefined) {
  itemEditor.value.targetId = value ?? ''
}

function handleItemProgramChange(value: string | null | undefined) {
  itemEditorTrainingPlanId.value = ''
  itemEditorGraduationRequirementId.value = ''
  if (
    itemEditor.value.targetType === 'PROGRAM_SUMMARY'
    || itemEditor.value.targetType === 'CIVIC_GOAL_AGGREGATE'
    || itemEditor.value.targetType === 'COMPLEX_ENGINEERING_AGGREGATE'
  ) {
    itemEditor.value.targetId = value ?? ''
  } else if (itemEditor.value.targetType !== 'COURSE_GOAL') {
    itemEditor.value.targetId = ''
  }
}

/** 分页加载间接评价问卷台账 */
async function loadForms() {
  formsLoading.value = true
  try {
    const page = await indirectFormApi.page({ ...formQuery })
    forms.value = readPageList(page, '间接评价问卷加载失败，请稍后重试')
    formQuery.pageNum = page.pageNum
    formQuery.pageSize = page.pageSize
    formsTotal.value = readPageTotal(page, '间接评价问卷加载失败，请稍后重试')
    if (forms.value.length === 0 && formsTotal.value > 0 && formQuery.pageNum > 1) {
      formQuery.pageNum -= 1
      await loadForms()
    }
  } catch (error) {
    showUserError(error, '间接评价问卷加载失败')
  } finally {
    formsLoading.value = false
  }
}

/** 发布或关闭后同步选中问卷快照 */
function syncSelectedForm(formId?: string) {
  if (!formId || !selectedForm.value || selectedForm.value.id !== formId) return
  selectedForm.value = forms.value.find((item) => item.id === formId) ?? null
}

function syncFormFilterToQuery() {
  formQuery.formType = formFilterForm.formType
  formQuery.targetType = formFilterForm.targetType
}

function handleFormSearch() {
  formQuery.pageNum = 1
  syncFormFilterToQuery()
  void loadForms()
}

function handleFormReset() {
  Object.assign(formFilterForm, { formType: undefined, targetType: undefined })
  formQuery.pageNum = 1
  syncFormFilterToQuery()
  void loadForms()
}

function openFormCreate() {
  formEditorMode.value = 'create'
  formEditorQualityCourseId.value = qualityStore.currentQualityCourseId
  formEditorTrainingPlanId.value = qualityStore.currentTrainingPlanId
  formEditorGraduationRequirementId.value = ''
  Object.assign(formEditor, {
    id: undefined,
    formCode: '',
    formName: '',
    formType: 'STUDENT_SELF',
    targetType: 'COURSE_GOAL',
    targetId: '',
    programId: qualityStore.currentProgramId,
    description: '',
    expectedSample: 30,
    enabled: true,
  })
  formEditorVisible.value = true
}

function openFormEdit(record: IndirectEvaluationFormVO) {
  if (!isFormStructureMutable(record)) {
    message.error('已发布或已归档的问卷不允许编辑')
    return
  }
  formEditorMode.value = 'edit'
  formEditorQualityCourseId.value = qualityStore.currentQualityCourseId
  formEditorTrainingPlanId.value = qualityStore.currentTrainingPlanId
  formEditorGraduationRequirementId.value = ''
  Object.assign(formEditor, record)
  formEditorVisible.value = true
}

async function submitForm() {
  if (!formEditor.formCode.trim() || !formEditor.formName.trim() || !formEditor.targetId.trim()) {
    message.error('请填写问卷编码、名称，并选择评价对象')
    return
  }
  if (formEditorMode.value === 'create') await indirectFormApi.create(formEditor)
  else await indirectFormApi.update(formEditor)
  message.success('已保存')
  formEditorVisible.value = false
  await loadForms()
}

async function handleFormDelete(record: IndirectEvaluationFormVO) {
  if (!isFormStructureMutable(record)) {
    message.error('已发布或已归档的问卷不允许删除')
    return
  }
  void confirmAsync({
    title: `删除问卷 ${record.formCode}？`,
    type: 'error',
    onOk: async () => {
      await indirectFormApi.delete(record.id)
      message.success('已删除')
      if (selectedForm.value?.id === record.id) {
        selectedForm.value = null
        emit('form-deleted', record.id)
      }
      await loadForms()
    },
  })
}

function handleFormPageChange(page: { current: number, pageSize: number }) {
  formQuery.pageNum = page.current
  formQuery.pageSize = page.pageSize
  loadForms()
}

/** 按当前选中问卷加载题项列表 */
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
  scaleRules.value = await readAllPages(
    (pageNum) => scaleConversionRuleApi.page({
      pageNum,
      pageSize: SCALE_CONVERSION_RULE_OPTION_PAGE_SIZE,
      enabled: true,
    }),
    '量表换算规则列表加载失败，请稍后重试',
  )
}

function defaultScaleLabels(min: number, max: number) {
  const labels = []
  for (let value = min; value <= max; value++) {
    labels.push({ scaleValue: value, label: `${value}分` })
  }
  return labels
}

function assertScaleLabelsComplete(record: IndirectEvaluationItemVO) {
  if (record.scaleMin == null || record.scaleMax == null || record.scaleMin >= record.scaleMax) {
    throwUserFacing(ITEM_CONFIG_ERROR)
  }
  const labels = record.scaleLabels
  if (!labels?.length) throwUserFacing(ITEM_CONFIG_ERROR)
  const values = new Set(labels.map((label) => label.scaleValue))
  for (let value = record.scaleMin; value <= record.scaleMax; value++) {
    if (!values.has(value)) throwUserFacing(ITEM_CONFIG_ERROR)
  }
}

function assertChoiceOptionsComplete(record: IndirectEvaluationItemVO) {
  const options = record.choiceOptions
  if (!options || options.length < 2) {
    throwUserFacing(ITEM_CONFIG_ERROR)
  }
  const values = new Set<string>()
  for (const option of options) {
    if (!option.optionValue.trim() || !option.optionLabel.trim()) {
      throwUserFacing(ITEM_CONFIG_ERROR)
    }
    if (values.has(option.optionValue.trim())) {
      throwUserFacing(ITEM_CONFIG_ERROR)
    }
    values.add(option.optionValue.trim())
  }
}

function assertEditableItemContract(record: IndirectEvaluationItemVO) {
  if (record.required == null) {
    throwUserFacing(ITEM_CONFIG_ERROR)
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
  if (!selectedForm.value || !isFormStructureMutable(selectedForm.value)) {
    message.error('当前问卷已发布，请先关闭后再维护题项')
    return
  }
  itemEditorMode.value = 'create'
  itemEditorQualityCourseId.value
    = formEditorQualityCourseId.value || qualityStore.currentQualityCourseId
  itemEditorTrainingPlanId.value
    = formEditorTrainingPlanId.value || qualityStore.currentTrainingPlanId
  itemEditorGraduationRequirementId.value = formEditorGraduationRequirementId.value
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
  if (!selectedForm.value || !isFormStructureMutable(selectedForm.value)) {
    message.error('当前问卷已发布，请先关闭后再维护题项')
    return
  }
  assertEditableItemContract(record)
  itemEditorMode.value = 'edit'
  itemEditorQualityCourseId.value
    = formEditorQualityCourseId.value || qualityStore.currentQualityCourseId
  itemEditorTrainingPlanId.value
    = formEditorTrainingPlanId.value || qualityStore.currentTrainingPlanId
  itemEditorGraduationRequirementId.value = ''
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
  if (!selectedForm.value || !isFormStructureMutable(selectedForm.value)) {
    message.error('当前问卷已发布，请先关闭后再维护题项')
    return
  }
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

function validCountText(itemId: string): string {
  const count = validCountMap.value.get(itemId)
  if (count === undefined) {
    if (validCountLoading.value) return '加载中'
    return '—'
  }
  return String(count)
}

/** 并行统计各题项有效答卷数 */
async function refreshValidCounts() {
  if (!items.value.length) return
  validCountLoading.value = true
  try {
    const results = await Promise.all(
      items.value.map((item) =>
        indirectResponseApi
          .countValidByItem(item.id)
          .then((count): [string, number] => [item.id, count]),
      ),
    )
    validCountMap.value = new Map(results)
  } finally {
    validCountLoading.value = false
  }
}

async function reloadFormsAndSync(formId?: string) {
  await loadForms()
  syncSelectedForm(formId)
}

defineExpose({
  forms,
  items,
  validCountMap,
  formsLoading,
  loadForms,
  loadItems,
  loadScaleRules,
  refreshValidCounts,
  reloadFormsAndSync,
})
</script>

<template>
  <UiCard class="detail-table-card ie__form-card">
    <template #title>间接评价问卷台账</template>
    <template #extra>
      <UiButton size="sm" @click="openFormCreate">新建问卷</UiButton>
    </template>

    <UiFilterBar
      variant="plain"
      v-model="formFilterModel"
      :fields="formFilterFields"
      @search="handleFormSearch"
      @reset="handleFormReset"
    />

    <UiDataTable
      class="student-detail-table__data-table"
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
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <UiTag :tone="formStatusTone(record.status)" size="sm">
            {{ formStatusLabel(record.status) }}
          </UiTag>
        </template>
        <template v-else-if="column.key === 'formType'">
          {{ formTypeLabel(record.formType) }}
        </template>
        <template v-else-if="column.key === 'targetType'">
          {{ targetTypeLabel(record.targetType) }}
        </template>
        <template v-else-if="column.key === 'actions'">
          <div class="operations-cell" @click.stop>
            <UiTextAction v-if="canPublishForm(record)" @click.stop="emit('publish', record)">
              发布
            </UiTextAction>
            <UiTextAction v-if="canCloseForm(record)" @click.stop="emit('close', record)">
              关闭
            </UiTextAction>
            <UiTextAction
              v-if="canShowWorkflowInsights(record)"
              @click.stop="emit('progress', record)"
            >
              进度
            </UiTextAction>
            <UiTextAction
              v-if="canShowWorkflowInsights(record)"
              @click.stop="emit('statistics', record)"
            >
              统计
            </UiTextAction>
            <UiTextAction
              v-if="record.status === 'PUBLISHED' && record.accessToken"
              @click.stop="emit('copy-link', record)"
            >
              复制链接
            </UiTextAction>
            <UiTextAction v-if="isFormStructureMutable(record)" @click.stop="openFormEdit(record)">
              编辑
            </UiTextAction>
            <UiTextAction
              v-if="isFormStructureMutable(record)"
              tone="danger"
              @click.stop="handleFormDelete(record)"
            >
              删除
            </UiTextAction>
          </div>
        </template>
      </template>
    </UiDataTable>
  </UiCard>

  <slot name="after-forms" />

  <a-row v-if="selectedForm" :gutter="12" class="ie__split">
    <a-col :span="12">
      <UiCard class="detail-table-card ie__item-card">
        <template #title>题项</template>
        <template #extra>
          <UiButton
            v-if="isFormStructureMutable(selectedForm)"
            variant="primary"
            size="sm"
            @click="openItemCreate"
          >
            新建题项
          </UiButton>
        </template>

        <UiDataTable
          pagination-mode="none"
          class="student-detail-table__data-table"
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
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'weight'">
              {{ record.weight.toFixed(2) }}
            </template>
            <template v-else-if="column.key === 'validCount'">
              <span
                :class="
                  (validCountMap.get(record.id) ?? 0) > 0
                    ? 'ie__count-strong'
                    : 'ie__count-muted'
                "
              >
                {{ validCountText(record.id) }}
              </span>
            </template>
            <template v-else-if="column.key === 'actions'">
              <div v-if="isFormStructureMutable(selectedForm)" class="operations-cell" @click.stop>
                <UiTextAction @click.stop="openItemEdit(record)">编辑</UiTextAction>
                <UiTextAction tone="danger" @click.stop="deleteItem(record)">删除</UiTextAction>
              </div>
            </template>
          </template>
        </UiDataTable>
      </UiCard>
    </a-col>
    <a-col :span="12">
      <slot name="response" />
    </a-col>
  </a-row>

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
              @change="handleFormTargetTypeChange"
            />
          </a-form-item>
        </a-col>
        <a-col
          v-if="
            formEditor.targetType === 'COURSE_GOAL'
              || formEditor.targetType === 'GRADUATION_REQUIREMENT'
              || formEditor.targetType === 'REQUIREMENT_INDICATOR'
              || formEditor.targetType === 'TRAINING_OBJECTIVE'
          "
          :span="8"
        >
          <a-form-item
            :label="formEditor.targetType === 'COURSE_GOAL' ? '评价课程' : '培养方案'"
            required
          >
            <CourseSelector
              v-if="formEditor.targetType === 'COURSE_GOAL'"
              :value="formEditorQualityCourseId || null"
              :program-id="formEditor.programId || null"
              placeholder="选择评价课程"
              @change="handleFormCourseChange"
            />
            <TrainingPlanSelector
              v-else
              :value="formEditorTrainingPlanId || null"
              :program-id="formEditor.programId || null"
              placeholder="选择培养方案"
              @change="handleFormTrainingPlanChange"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item
            :label="
              formEditor.targetType === 'PROGRAM_SUMMARY'
                || formEditor.targetType === 'CIVIC_GOAL_AGGREGATE'
                || formEditor.targetType === 'COMPLEX_ENGINEERING_AGGREGATE'
                ? '所属专业'
                : '目标对象'
            "
            required
          >
            <CourseGoalSelector
              v-if="formEditor.targetType === 'COURSE_GOAL'"
              :quality-course-id="formEditorQualityCourseId"
              :value="formEditor.targetId || null"
              placeholder="选择课程目标"
              @change="handleFormTargetChange"
            />
            <GraduationRequirementSelector
              v-else-if="formEditor.targetType === 'GRADUATION_REQUIREMENT'"
              :training-plan-id="formEditorTrainingPlanId"
              :value="formEditor.targetId || null"
              placeholder="选择毕业要求"
              @change="handleFormGraduationRequirementChange"
            />
            <template v-else-if="formEditor.targetType === 'REQUIREMENT_INDICATOR'">
              <GraduationRequirementSelector
                :training-plan-id="formEditorTrainingPlanId"
                :value="formEditorGraduationRequirementId || null"
                placeholder="选择毕业要求"
                @change="handleFormGraduationRequirementChange"
              />
              <RequirementIndicatorSelector
                :requirement-id="formEditorGraduationRequirementId"
                :value="formEditor.targetId || null"
                placeholder="选择观测点"
                class="ie__selector-stack"
                @change="handleFormTargetChange"
              />
            </template>
            <TrainingObjectiveSelector
              v-else-if="formEditor.targetType === 'TRAINING_OBJECTIVE'"
              :training-plan-id="formEditorTrainingPlanId"
              :value="formEditor.targetId || null"
              placeholder="选择培养目标"
              @change="handleFormTargetChange"
            />
            <ProgramSelector
              v-else
              :value="formEditor.programId || null"
              placeholder="选择专业"
              @change="handleFormProgramChange"
            />
          </a-form-item>
        </a-col>
        <a-col
          v-if="
            formEditor.targetType !== 'PROGRAM_SUMMARY'
              && formEditor.targetType !== 'CIVIC_GOAL_AGGREGATE'
              && formEditor.targetType !== 'COMPLEX_ENGINEERING_AGGREGATE'
          "
          :span="8"
        >
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
              @change="handleItemTargetTypeChange"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item
            :label="itemEditor.targetType === 'COURSE_GOAL' ? '评价课程' : '培养方案'"
            required
          >
            <CourseSelector
              v-if="itemEditor.targetType === 'COURSE_GOAL'"
              :value="itemEditorQualityCourseId || null"
              :program-id="formEditor.programId || null"
              placeholder="选择评价课程"
              @change="handleItemCourseChange"
            />
            <ProgramSelector
              v-else-if="
                itemEditor.targetType === 'PROGRAM_SUMMARY'
                  || itemEditor.targetType === 'CIVIC_GOAL_AGGREGATE'
                  || itemEditor.targetType === 'COMPLEX_ENGINEERING_AGGREGATE'
              "
              :value="itemEditor.targetId || null"
              placeholder="选择专业"
              @change="handleItemProgramChange"
            />
            <TrainingPlanSelector
              v-else
              :value="itemEditorTrainingPlanId || null"
              :program-id="formEditor.programId || null"
              placeholder="选择培养方案"
              @change="handleItemTrainingPlanChange"
            />
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item
        v-if="
          itemEditor.targetType === 'COURSE_GOAL'
            || itemEditor.targetType === 'GRADUATION_REQUIREMENT'
            || itemEditor.targetType === 'REQUIREMENT_INDICATOR'
            || itemEditor.targetType === 'TRAINING_OBJECTIVE'
        "
        label="目标对象"
        required
      >
        <div class="ie__target-picker">
          <CourseGoalSelector
            v-if="itemEditor.targetType === 'COURSE_GOAL'"
            :quality-course-id="itemEditorQualityCourseId"
            :value="itemEditor.targetId || null"
            placeholder="选择课程目标"
            @change="handleItemTargetChange"
          />
          <GraduationRequirementSelector
            v-else-if="itemEditor.targetType === 'GRADUATION_REQUIREMENT'"
            :training-plan-id="itemEditorTrainingPlanId"
            :value="itemEditor.targetId || null"
            placeholder="选择毕业要求"
            @change="handleItemGraduationRequirementChange"
          />
          <template v-else-if="itemEditor.targetType === 'REQUIREMENT_INDICATOR'">
            <GraduationRequirementSelector
              :training-plan-id="itemEditorTrainingPlanId"
              :value="itemEditorGraduationRequirementId || null"
              placeholder="选择毕业要求"
              @change="handleItemGraduationRequirementChange"
            />
            <RequirementIndicatorSelector
              :requirement-id="itemEditorGraduationRequirementId"
              :value="itemEditor.targetId || null"
              placeholder="选择观测点"
              @change="handleItemTargetChange"
            />
          </template>
          <TrainingObjectiveSelector
            v-else
            :training-plan-id="itemEditorTrainingPlanId"
            :value="itemEditor.targetId || null"
            placeholder="选择培养目标"
            @change="handleItemTargetChange"
          />
        </div>
      </a-form-item>
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
            <UiTextAction tone="danger" @click="removeChoiceOption(optionIndex)">删除</UiTextAction>
          </div>
          <UiButton variant="outline" size="sm" @click="addChoiceOption">新增选项</UiButton>
        </div>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<style scoped lang="scss">
.ie {
  &__split {
    margin-top: 0;
  }

  &__count-strong {
    color: var(--ant-color-success);
    font-weight: 500;
  }

  &__count-muted {
    color: var(--dp-text-muted);
  }

  &__config-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__target-picker,
  &__selector-stack {
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

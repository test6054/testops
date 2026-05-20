<script setup lang="ts">
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
  IndirectEvaluationFormQueryPayload,
  IndirectEvaluationFormSavePayload,
  IndirectEvaluationFormVO,
  IndirectEvaluationItemSavePayload,
  IndirectEvaluationItemVO,
  IndirectEvaluationResponseSavePayload,
  IndirectEvaluationResponseVO,
  ScaleConversionRuleVO,
} from '@/apis/quality'
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
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  CourseGoalSelector,
  GraduationRequirementSelector,
  ProgramSelector,
  RequirementIndicatorSelector,
  StudentSelector,
  TeacherSelector,
} from '@/components/quality/selectors'
import type { ColumnsType } from 'ant-design-vue/es/table'
import { UiButton, UiDataTable, UiEmpty } from '@/components/ui-guide/ui'
import { SignalBand, StageWorkbenchShell } from '@/components/workbench'

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

/* ========== 状态守卫 helper（禁用 as 类型断言） ========== */

function targetTypeLabel(value: unknown): string {
  if (isAchievementTargetType(value)) return ACHIEVEMENT_TARGET_TYPE_LABEL[value]
  return typeof value === 'string' && value ? value : '-'
}

function respondentTypeLabel(value: unknown): string {
  if (isRespondentType(value)) return RESPONDENT_TYPE_LABEL[value]
  return typeof value === 'string' && value ? value : '-'
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

const targetTypeOptions = Object.entries(ACHIEVEMENT_TARGET_TYPE_LABEL).map(([value, label]) => ({
  value,
  label,
}))
const respondentTypeOptions = Object.entries(RESPONDENT_TYPE_LABEL).map(([value, label]) => ({
  value,
  label,
}))

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

async function loadForms() {
  formsLoading.value = true
  try {
    const page = await indirectFormApi.page({ ...formQuery })
    forms.value = page.list || []
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

function handleFormPageChange(payload: { current: number; pageSize: number }) {
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
    items.value = (await indirectItemApi.listByForm(selectedForm.value.id)) || []
  } finally {
    itemsLoading.value = false
  }
}

async function loadScaleRules() {
  const page = await scaleConversionRuleApi.page({ pageNum: 1, pageSize: 200, enabled: true })
  scaleRules.value = page.list || []
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
})

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
  }
  itemEditorVisible.value = true
}

function openItemEdit(record: IndirectEvaluationItemVO) {
  itemEditorMode.value = 'edit'
  itemEditor.value = { ...record }
  itemEditorVisible.value = true
}

async function submitItem() {
  const v = itemEditor.value
  if (!v.itemCode.trim() || !v.itemText.trim()) {
    message.error('请填写编码和题面')
    return
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
    responses.value = (await indirectResponseApi.listByItem(selectedItem.value.id)) || []
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

/* ========== 按问卷批量录入答卷 ========== */

const batchResponseVisible = ref(false)
const batchResponseSubmitting = ref(false)
const batchResponseText = ref('')
const BATCH_RESPONSE_PLACEHOLDER = `[
  {
    "itemId": "1",
    "respondentType": "STUDENT",
    "respondentId": "1001",
    "rawValue": "4",
    "convertedScore": 0.75,
    "validFlag": true
  },
  {
    "itemId": "2",
    "respondentType": "STUDENT",
    "respondentId": "1001",
    "rawValue": "5",
    "convertedScore": 1.0
  }
]`

function openBatchResponse() {
  if (!selectedForm.value) return
  batchResponseText.value = ''
  batchResponseVisible.value = true
}

async function submitBatchResponse() {
  if (!selectedForm.value) return
  const text = batchResponseText.value.trim()
  if (!text) {
    message.error('请粘贴答卷 JSON 数组')
    return
  }
  let parsed: IndirectEvaluationResponseSavePayload[]
  try {
    const raw = JSON.parse(text)
    if (!Array.isArray(raw)) throw new Error('根节点必须是数组')
    parsed = raw.map((item, idx) => {
      if (!item.itemId) throw new Error(`第 ${idx + 1} 行缺少 itemId`)
      if (!item.respondentType) throw new Error(`第 ${idx + 1} 行缺少 respondentType`)
      return {
        formId: selectedForm.value!.id,
        ...item,
      } as IndirectEvaluationResponseSavePayload
    })
  } catch (err) {
    message.error(`JSON 解析失败：${(err as Error).message}`)
    return
  }
  batchResponseSubmitting.value = true
  try {
    await indirectResponseApi.batchCreate(selectedForm.value.id, parsed)
    message.success(`已批量录入 ${parsed.length} 条答卷`)
    batchResponseVisible.value = false
    await loadResponses()
  } finally {
    batchResponseSubmitting.value = false
  }
}

/* ========== 题项有效样本统计 ========== */

const validCountMap = ref<Map<string, number>>(new Map())
const validCountLoading = ref(false)

async function refreshValidCounts() {
  if (!items.value.length) return
  validCountLoading.value = true
  try {
    const results = await Promise.all(
      items.value.map((item) =>
        indirectResponseApi
          .countValidByItem(item.id)
          .then((count) => [item.id, count] as const)
          .catch(() => [item.id, 0] as const),
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
  const totalValid = Array.from(validCountMap.value.values()).reduce((sum, n) => sum + n, 0)
  const expectedSampleSum = forms.value.reduce((sum, f) => sum + (f.expectedSample || 0), 0)
  const validResponses = responses.value.filter((r) => r.validFlag).length
  const invalidResponses = responses.value.filter((r) => !r.validFlag).length
  const sampleRatio =
    expectedSampleSum > 0 ? Number((totalValid / expectedSampleSum).toFixed(2)) : 0

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
            {{ formTypeOptions.find((o) => o.value === text)?.label || text }}
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
              <UiButton variant="danger-ghost" size="sm" @click.stop="handleFormDelete(record)">
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
                {{ text == null ? '-' : Number(text).toFixed(2) }}
              </template>
              <template v-else-if="column.key === 'validCount'">
                <span
                  :class="validCountMap.get(record.id) ? 'ie__count-strong' : 'ie__count-muted'"
                >
                  {{ validCountMap.get(record.id) ?? 0 }}
                </span>
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-space>
                  <UiButton variant="ghost" size="sm" @click.stop="openItemEdit(record)">
                    编辑
                  </UiButton>
                  <UiButton variant="danger-ghost" size="sm" @click.stop="deleteItem(record)">
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
              <UiButton variant="outline" size="sm" @click="openBatchResponse"> 批量录入 </UiButton>
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
                {{ text == null ? '-' : Number(text).toFixed(2) }}
              </template>
              <template v-else-if="column.key === 'openText'">
                <span class="ie__sub-desc">{{ text || '-' }}</span>
              </template>
              <template v-else-if="column.key === 'validFlag'">
                <a-tag :color="text ? 'green' : 'red'">{{ text ? '有效' : '无效' }}</a-tag>
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-space>
                  <UiButton variant="ghost" size="sm" @click="openResponseEdit(record)">
                    编辑
                  </UiButton>
                  <UiButton variant="danger-ghost" size="sm" @click="deleteResponse(record)">
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
                @change="(v) => (formEditor.targetId = v ?? '')"
              />
              <RequirementIndicatorSelector
                v-else-if="formEditor.targetType === 'REQUIREMENT_INDICATOR'"
                :value="formEditor.targetId || null"
                placeholder="选择观测点"
                @change="(v) => (formEditor.targetId = v ?? '')"
              />
              <GraduationRequirementSelector
                v-else-if="formEditor.targetType === 'GRADUATION_REQUIREMENT'"
                :value="formEditor.targetId || null"
                placeholder="选择毕业要求"
                @change="(v) => (formEditor.targetId = v ?? '')"
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
                @change="(v) => (formEditor.programId = v ?? '')"
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
                @change="(v) => (itemEditor.targetId = v ?? '')"
              />
              <RequirementIndicatorSelector
                v-else-if="itemEditor.targetType === 'REQUIREMENT_INDICATOR'"
                :value="itemEditor.targetId || null"
                placeholder="选择观测点"
                @change="(v) => (itemEditor.targetId = v ?? '')"
              />
              <GraduationRequirementSelector
                v-else-if="itemEditor.targetType === 'GRADUATION_REQUIREMENT'"
                :value="itemEditor.targetId || null"
                placeholder="选择毕业要求"
                @change="(v) => (itemEditor.targetId = v ?? '')"
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
                @change="(v) => (responseEditor.respondentId = v ?? '')"
              />
              <TeacherSelector
                v-else-if="responseEditor.respondentType === 'TEACHER'"
                :value="responseEditor.respondentId || null"
                placeholder="选择教师"
                @change="(v) => (responseEditor.respondentId = v ?? '')"
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

    <!-- 批量录入答卷 -->
    <a-modal
      v-model:open="batchResponseVisible"
      :title="`批量录入答卷（${selectedForm?.formName || ''}）`"
      :confirm-loading="batchResponseSubmitting"
      width="780px"
      ok-text="提交批量录入"
      @ok="submitBatchResponse"
    >
      <a-alert
        type="info"
        show-icon
        message="粘贴 JSON 数组，每条为一个答卷"
        description="必填：itemId、respondentType；可选：respondentId、rawValue、convertedScore、openText、validFlag、invalidReason。formId 由页面自动填入。"
        class="ie__alert"
      />
      <a-textarea
        v-model:value="batchResponseText"
        :rows="14"
        :placeholder="BATCH_RESPONSE_PLACEHOLDER"
        class="ie__monospace"
      />
    </a-modal>
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

  &__alert {
    margin-bottom: 12px;
  }

  &__monospace {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }
}

:deep(.ie__row-selected) td {
  background-color: var(--ant-color-primary-bg) !important;
}
</style>

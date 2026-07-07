<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ColumnsType } from 'ant-design-vue/es/table'
/**
 * 专业算法实例
 *
 * 后端：/api/quality/profession-algorithm-profiles
 * 状态流转：DRAFT → SUBMITTED → CONFIRMED；CONFIRMED 可退回为 RETURNED。
 * 只有 CONFIRMED + enabled 的实例进入达成度计算。
 */
import type { AccreditationStandardVO } from '@/apis/quality/accreditation-standard'
import { accreditationStandardApi } from '@/apis/quality/accreditation-standard'
import type {
  ProfessionAlgorithmProfileQueryRequest,
  ProfessionAlgorithmProfileSaveRequest,
  ProfessionAlgorithmProfileVO,
} from '@/apis/quality/profession-algorithm-profile'
import { professionAlgorithmProfileApi } from '@/apis/quality/profession-algorithm-profile'
import type { ProfessionAlgorithmTemplateVO } from '@/apis/quality/profession-algorithm-template'
import { professionAlgorithmTemplateApi } from '@/apis/quality/profession-algorithm-template'
import type { BadgeTone, FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onActivated, onMounted, reactive, ref } from 'vue'
import {
  AccreditationTypeCode,
  AccreditationTypeDescription,
  AggregationFunctionCode,
  AggregationFunctionDescription,
  ALL_ACCREDITATION_TYPE_CODES,
  ALL_AGGREGATION_FUNCTION_CODES,
  ALL_CONFIRMATION_STATUS_CODES,
  CONFIRMATION_STATUS_COLOR,
  ConfirmationStatusCode,
  ConfirmationStatusDescription,
} from '@/apis/quality/types'
import { ProgramSelector } from '@/components/quality/selectors'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useQualityScopedLoader } from '@/composables/useQualityPageScope'
import { readAllPages } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const PROFESSION_ALGORITHM_TEMPLATE_OPTION_PAGE_SIZE = 100
const ACCREDITATION_STANDARD_OPTION_PAGE_SIZE = 100

const columns: ColumnsType = [
  { title: '编码', dataIndex: 'profileCode', key: 'profileCode', width: 140 },
  { title: '名称', dataIndex: 'profileName', key: 'profileName' },
  { title: '专业大类', key: 'programRef', width: 160 },
  { title: '认证类型', dataIndex: 'accreditationType', key: 'accreditationType', width: 180 },
  { title: '级别', dataIndex: 'accreditationLevel', key: 'accreditationLevel', width: 100 },
  { title: '状态', dataIndex: 'confirmationStatus', key: 'confirmationStatus', width: 100 },
  { title: '启用', dataIndex: 'enabled', key: 'enabled', width: 80 },
  { title: '操作', key: 'actions', width: 260, fixed: 'right' },
]

function accreditationTypeLabel(value: AccreditationTypeCode): string {
  return strictEnumLabel(AccreditationTypeDescription, value, '认证类型')
}

function confirmationStatusLabel(value: ConfirmationStatusCode): string {
  return strictEnumLabel(ConfirmationStatusDescription, value, '确认状态')
}

function confirmationStatusColor(value: ConfirmationStatusCode): BadgeTone {
  return strictEnumTone(CONFIRMATION_STATUS_COLOR, value, '确认状态')
}

const list = ref<ProfessionAlgorithmProfileVO[]>([])
const total = ref(0)
const loading = ref(false)
const templates = ref<ProfessionAlgorithmTemplateVO[]>([])
const standards = ref<AccreditationStandardVO[]>([])

const query = reactive<ProfessionAlgorithmProfileQueryRequest>({
  pageNum: 1,
  pageSize: 10,
  programId: undefined,
  accreditationType: undefined,
  confirmationStatus: undefined,
  enabled: undefined,
  keyword: '',
})

interface ProfessionAlgorithmProfileFilterModel {
  [key: string]: unknown
  programId?: string
  accreditationType?: AccreditationTypeCode
  confirmationStatus?: ConfirmationStatusCode
  keyword: string
}

const filterForm = reactive<ProfessionAlgorithmProfileFilterModel>({
  programId: undefined,
  accreditationType: undefined,
  confirmationStatus: undefined,
  keyword: '',
})

const filterModel = computed<Record<string, unknown>>({
  get: () => filterForm,
  set: (value) => {
    Object.assign(filterForm, value)
  },
})

const filterFields = computed<FilterField[]>(() => [
  { key: 'programId', type: 'custom' },
  {
    key: 'accreditationType',
    type: 'select',
    placeholder: '认证类型',
    allowClear: true,
    width: 160,
    options: accreditationOptions,
  },
  {
    key: 'confirmationStatus',
    type: 'select',
    placeholder: '状态',
    allowClear: true,
    width: 120,
    options: ALL_CONFIRMATION_STATUS_CODES.map((value) => ({
      value,
      label: confirmationStatusLabel(value),
    })),
  },
  {
    key: 'keyword',
    type: 'input',
    placeholder: '编码/名称',
    allowClear: true,
    width: 160,
  },
])

const accreditationOptions = ALL_ACCREDITATION_TYPE_CODES.map((value) => ({
  value,
  label: accreditationTypeLabel(value),
}))
const aggregationOptions = ALL_AGGREGATION_FUNCTION_CODES.map((value) => ({
  value,
  label: AggregationFunctionDescription[value],
}))
const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editor = reactive<ProfessionAlgorithmProfileSaveRequest>({
  profileCode: '',
  profileName: '',
  templateId: '',
  programId: '',
  accreditationType: AccreditationTypeCode.ENGINEERING_ACCREDITATION,
  standardId: undefined,
  accreditationLevel: '',
  standardYear: '',
  courseGoalAggregation: AggregationFunctionCode.WEIGHTED_SUM,
  indicatorAggregation: AggregationFunctionCode.WEIGHTED_SUM,
  requirementAggregation: AggregationFunctionCode.WEIGHTED_SUM,
  directWeight: 0.7,
  indirectWeight: 0.3,
  indirectMinValidSampleCount: 30,
  indirectCoverageThreshold: 0.5,
  courseGoalThreshold: 0.7,
  indicatorThreshold: 0.7,
  requirementThreshold: 0.7,
  inheritAggregationStrategy: true,
  inheritWeightStrategy: true,
  inheritThresholdStrategy: true,
  overrideAggregationStrategy: false,
  overrideWeightStrategy: false,
  overrideThresholdStrategy: false,
  overrideReason: '',
  enabled: true,
})
const submitting = ref(false)

function handleEditorProgramChange(value: string | null): void {
  editor.programId = value ?? ''
}

async function loadList() {
  loading.value = true
  try {
    const page = await professionAlgorithmProfileApi.page({
      ...query,
      keyword: query.keyword?.trim() || undefined,
    })
    list.value = page.list
    query.pageNum = page.pageNum
    query.pageSize = page.pageSize
    total.value = Number(page.total)
    if (list.value.length === 0 && total.value > 0 && query.pageNum > 1) {
      query.pageNum -= 1
      await loadList()
    }
  } finally {
    loading.value = false
  }
}

async function loadDicts() {
  const [tpl, std] = await Promise.all([
    readAllPages(
      (pageNum) =>
        professionAlgorithmTemplateApi.page({
          pageNum,
          pageSize: PROFESSION_ALGORITHM_TEMPLATE_OPTION_PAGE_SIZE,
          enabled: true,
        }),
      '专业算法模板列表加载失败，请稍后重试',
    ),
    readAllPages(
      (pageNum) =>
        accreditationStandardApi.page({
          pageNum,
          pageSize: ACCREDITATION_STANDARD_OPTION_PAGE_SIZE,
          enabled: true,
        }),
      '认证标准列表加载失败，请稍后重试',
    ),
  ])
  templates.value = tpl
  standards.value = std
}

// a-select v-model:value 是 SelectValue（string|number|undefined|array），
// 这里业务模板 ID 是字符串，select 清空时为 undefined，handler 内显式 narrow 后委托给应用函数。
function onTemplateSelectChange(value: SelectValue) {
  if (typeof value !== 'string') return
  applyTemplateDefaults(value)
}

function applyTemplateDefaults(templateId: string) {
  const tpl = templates.value.find((t) => t.id === templateId)
  if (!tpl) return
  editor.accreditationType = tpl.accreditationType
  editor.standardId = tpl.standardId
  editor.standardYear = tpl.standardYear || ''
  editor.courseGoalAggregation = tpl.courseGoalAggregation
  editor.indicatorAggregation = tpl.indicatorAggregation
  editor.requirementAggregation = tpl.requirementAggregation
  editor.directWeight = tpl.directWeightDefault
  editor.indirectWeight = tpl.indirectWeightDefault
  editor.indirectMinValidSampleCount = tpl.indirectMinValidSampleCount
  editor.indirectCoverageThreshold = tpl.indirectCoverageThreshold
  editor.courseGoalThreshold = tpl.courseGoalThresholdDefault
  editor.indicatorThreshold = tpl.indicatorThresholdDefault
  editor.requirementThreshold = tpl.requirementThresholdDefault
  editor.inheritAggregationStrategy = true
  editor.inheritWeightStrategy = true
  editor.inheritThresholdStrategy = true
  editor.overrideAggregationStrategy = false
  editor.overrideWeightStrategy = false
  editor.overrideThresholdStrategy = false
  editor.overrideReason = ''
}

function openCreate() {
  editorMode.value = 'create'
  Object.assign(editor, {
    id: undefined,
    profileCode: '',
    profileName: '',
    templateId: '',
    programId: '',
    accreditationType: 'ENGINEERING_ACCREDITATION',
    standardId: undefined,
    accreditationLevel: '',
    standardYear: '',
    courseGoalAggregation: 'WEIGHTED_SUM',
    indicatorAggregation: 'WEIGHTED_SUM',
    requirementAggregation: 'WEIGHTED_SUM',
    directWeight: 0.7,
    indirectWeight: 0.3,
    indirectMinValidSampleCount: 30,
    indirectCoverageThreshold: 0.5,
    courseGoalThreshold: 0.7,
    indicatorThreshold: 0.7,
    requirementThreshold: 0.7,
    inheritAggregationStrategy: true,
    inheritWeightStrategy: true,
    inheritThresholdStrategy: true,
    overrideAggregationStrategy: false,
    overrideWeightStrategy: false,
    overrideThresholdStrategy: false,
    overrideReason: '',
    enabled: true,
  })
  editorVisible.value = true
}

function canEditProfile(record: ProfessionAlgorithmProfileVO): boolean {
  return record.confirmationStatus !== ConfirmationStatusCode.CONFIRMED
}

function openEdit(record: ProfessionAlgorithmProfileVO) {
  if (!canEditProfile(record)) {
    message.error('已确认实例禁止直接修改，请先退回')
    return
  }
  editorMode.value = 'edit'
  Object.assign(editor, {
    id: record.id,
    profileCode: record.profileCode,
    profileName: record.profileName,
    templateId: record.templateId,
    programId: record.programId,
    standardId: record.standardId,
    accreditationType: record.accreditationType,
    accreditationLevel: record.accreditationLevel,
    standardYear: record.standardYear,
    courseGoalAggregation: record.courseGoalAggregation,
    indicatorAggregation: record.indicatorAggregation,
    requirementAggregation: record.requirementAggregation,
    directWeight: record.directWeight,
    indirectWeight: record.indirectWeight,
    indirectMinValidSampleCount: record.indirectMinValidSampleCount,
    indirectCoverageThreshold: record.indirectCoverageThreshold,
    courseGoalThreshold: record.courseGoalThreshold,
    indicatorThreshold: record.indicatorThreshold,
    requirementThreshold: record.requirementThreshold,
    inheritAggregationStrategy: record.inheritAggregationStrategy,
    inheritWeightStrategy: record.inheritWeightStrategy,
    inheritThresholdStrategy: record.inheritThresholdStrategy,
    overrideAggregationStrategy: record.overrideAggregationStrategy,
    overrideWeightStrategy: record.overrideWeightStrategy,
    overrideThresholdStrategy: record.overrideThresholdStrategy,
    overrideReason: record.overrideReason,
    enabled: record.enabled,
  })
  editorVisible.value = true
}

async function submitEditor() {
  if (
    !editor.profileCode.trim() ||
    !editor.profileName.trim() ||
    !editor.templateId ||
    !editor.programId
  ) {
    message.error('请填写编码、名称、模板、专业')
    return
  }
  const hasOverride =
    editor.overrideAggregationStrategy ||
    editor.overrideWeightStrategy ||
    editor.overrideThresholdStrategy
  if (hasOverride && !editor.overrideReason?.trim()) {
    message.error('存在模板策略调整时必须填写覆盖原因')
    return
  }
  submitting.value = true
  try {
    const request: ProfessionAlgorithmProfileSaveRequest = {
      id: editor.id,
      profileCode: editor.profileCode.trim(),
      profileName: editor.profileName.trim(),
      templateId: editor.templateId,
      programId: editor.programId,
      standardId: editor.standardId || undefined,
      accreditationType: editor.accreditationType,
      accreditationLevel: editor.accreditationLevel?.trim() || undefined,
      standardYear: editor.standardYear?.trim() || undefined,
      courseGoalAggregation: editor.courseGoalAggregation,
      indicatorAggregation: editor.indicatorAggregation,
      requirementAggregation: editor.requirementAggregation,
      directWeight: editor.directWeight,
      indirectWeight: editor.indirectWeight,
      indirectMinValidSampleCount: editor.indirectMinValidSampleCount,
      indirectCoverageThreshold: editor.indirectCoverageThreshold,
      courseGoalThreshold: editor.courseGoalThreshold,
      indicatorThreshold: editor.indicatorThreshold,
      requirementThreshold: editor.requirementThreshold,
      inheritAggregationStrategy: editor.inheritAggregationStrategy,
      inheritWeightStrategy: editor.inheritWeightStrategy,
      inheritThresholdStrategy: editor.inheritThresholdStrategy,
      overrideAggregationStrategy: editor.overrideAggregationStrategy,
      overrideWeightStrategy: editor.overrideWeightStrategy,
      overrideThresholdStrategy: editor.overrideThresholdStrategy,
      overrideReason: editor.overrideReason?.trim() || undefined,
      enabled: editor.enabled,
    }
    if (editorMode.value === 'create') await professionAlgorithmProfileApi.create(request)
    else await professionAlgorithmProfileApi.update(request)
    message.success('已保存')
    editorVisible.value = false
    await loadList()
  } finally {
    submitting.value = false
  }
}

async function handleConfirm(record: ProfessionAlgorithmProfileVO) {
  void confirmAsync({
    title: `确认实例 ${record.profileCode}？`,
    content: '确认后实例将进入「已确认」状态，可被达成度计算引用。',
    type: 'info',
    onOk: async () => {
      await professionAlgorithmProfileApi.confirm(record.id)
      message.success('已确认')
      await loadList()
    },
  })
}

async function handleRevoke(record: ProfessionAlgorithmProfileVO) {
  void confirmAsync({
    title: `退回实例 ${record.profileCode}？`,
    content: '退回后实例不再参与达成度计算，可重新编辑后再次确认。',
    type: 'warning',
    onOk: async () => {
      await professionAlgorithmProfileApi.revoke(record.id)
      message.success('已退回')
      await loadList()
    },
  })
}

function buildAlgorithmProfileActions(
  record: ProfessionAlgorithmProfileVO,
): UiTableRowActionItem[] {
  const actions: UiTableRowActionItem[] = []
  if (canEditProfile(record)) {
    actions.push({ key: 'edit', label: '编辑' })
  }
  if (
    record.confirmationStatus === ConfirmationStatusCode.DRAFT ||
    record.confirmationStatus === ConfirmationStatusCode.RETURNED
  ) {
    actions.push({ key: 'confirm', label: '确认', tone: 'primary' })
  }
  if (record.confirmationStatus === ConfirmationStatusCode.CONFIRMED) {
    actions.push({ key: 'revoke', label: '退回', tone: 'danger' })
  }
  if (canEditProfile(record)) {
    actions.push({ key: 'delete', label: '删除', tone: 'danger' })
  }
  return actions
}

function handleAlgorithmProfileAction(key: string, record: ProfessionAlgorithmProfileVO): void {
  switch (key) {
    case 'edit':
      openEdit(record)
      break
    case 'confirm':
      void handleConfirm(record)
      break
    case 'revoke':
      void handleRevoke(record)
      break
    case 'delete':
      void handleDelete(record)
      break
  }
}

async function handleDelete(record: ProfessionAlgorithmProfileVO) {
  if (!canEditProfile(record)) {
    message.error('已确认实例禁止删除')
    return
  }
  void confirmAsync({
    title: `删除实例 ${record.profileCode}？`,
    type: 'error',
    onOk: async () => {
      await professionAlgorithmProfileApi.delete(record.id)
      message.success('已删除')
      await loadList()
    },
  })
}

function handlePageChange(page: { current: number; pageSize: number }) {
  query.pageNum = page.current
  query.pageSize = page.pageSize
  loadList()
}

function syncFilterToQuery() {
  query.programId = filterForm.programId || undefined
  query.accreditationType = filterForm.accreditationType
  query.confirmationStatus = filterForm.confirmationStatus
  query.keyword = filterForm.keyword
}

function handleSearch() {
  query.pageNum = 1
  syncFilterToQuery()
  void loadList()
}

function handleReset() {
  Object.assign(filterForm, {
    programId: undefined,
    accreditationType: undefined,
    confirmationStatus: undefined,
    keyword: '',
  })
  query.pageNum = 1
  syncFilterToQuery()
  void loadList()
}

/* ========== 信号指标：专业算法实例健康度 ========== */

const signals = computed<SignalMetric[]>(() => {
  const buckets: Record<ConfirmationStatusCode, number> = {
    [ConfirmationStatusCode.DRAFT]: 0,
    [ConfirmationStatusCode.SUBMITTED]: 0,
    [ConfirmationStatusCode.CONFIRMED]: 0,
    [ConfirmationStatusCode.RETURNED]: 0,
  }
  for (const p of list.value) {
    buckets[p.confirmationStatus] += 1
  }
  const enabled = list.value.filter((p) => p.enabled).length
  const disabled = list.value.filter((p) => !p.enabled).length
  const usable = list.value.filter(
    (p) => p.enabled && p.confirmationStatus === ConfirmationStatusCode.CONFIRMED,
  ).length

  return [
    { key: 'page', label: '当前页记录', value: list.value.length, tone: 'blue' },
    { key: 'all-total', label: '实例总数', value: total.value, tone: 'blue' },
    { key: 'usable', label: '可用实例', value: usable, tone: usable > 0 ? 'green' : 'gray' },
    {
      key: 'draft',
      label: '起草',
      value: buckets.DRAFT,
      tone: buckets.DRAFT > 0 ? 'orange' : 'gray',
    },
    {
      key: 'submitted',
      label: '已提交',
      value: buckets.SUBMITTED,
      tone: buckets.SUBMITTED > 0 ? 'orange' : 'gray',
    },
    {
      key: 'confirmed',
      label: '已确认',
      value: buckets.CONFIRMED,
      tone: buckets.CONFIRMED > 0 ? 'green' : 'gray',
    },
    {
      key: 'returned',
      label: '已退回',
      value: buckets.RETURNED,
      tone: buckets.RETURNED > 0 ? 'red' : 'gray',
    },
    { key: 'enabled', label: '启用', value: enabled, tone: enabled > 0 ? 'green' : 'gray' },
    { key: 'disabled', label: '停用', value: disabled, tone: disabled > 0 ? 'orange' : 'gray' },
  ]
})

useQualityScopedLoader(
  () => {
    void loadList()
  },
  { watchScope: true, immediate: false, reloadOnActivated: false },
)

onMounted(async () => {
  await Promise.all([loadList(), loadDicts()])
})

onActivated(() => {
  void Promise.all([loadList(), loadDicts()])
})
</script>

<template>
  <StageWorkbenchShell>
    <SignalBand :metrics="signals" compact class="pap__signals" />

    <UiCard class="detail-table-card pap__table-card">
      <template #title>实例台账</template>
      <template #extra>
        <UiButton variant="primary" size="sm" @click="openCreate">新建实例</UiButton>
      </template>

      <UiFilterBar
        variant="plain"
        v-model="filterModel"
        :fields="filterFields"
        @search="handleSearch"
        @reset="handleReset"
      >
        <template #field-programId>
          <ProgramSelector
            :value="filterForm.programId ?? null"
            placeholder="专业大类"
            :width="200"
            @change="
              (value: string | null) => {
                filterForm.programId = value ?? undefined
              }
            "
          />
        </template>
      </UiFilterBar>

      <UiEmpty v-if="!loading && total === 0" description="无算法实例" />
      <UiDataTable
        v-else
        class="student-detail-table__data-table"
        v-model:current="query.pageNum"
        v-model:page-size="query.pageSize"
        :columns="columns"
        :data-source="list"
        :loading="loading"
        row-key="id"
        size="middle"
        :total="total"
        flat
        @page-change="handlePageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'programRef'">
            {{ record.programName }}
          </template>
          <template v-else-if="column.key === 'accreditationType'">
            {{ accreditationTypeLabel(record.accreditationType) }}
          </template>
          <template v-else-if="column.key === 'confirmationStatus'">
            <UiTag :tone="confirmationStatusColor(record.confirmationStatus)">
              {{ confirmationStatusLabel(record.confirmationStatus) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'enabled'">
            <UiTag :tone="record.enabled ? 'green' : 'gray'">
              {{ record.enabled ? '启用' : '停用' }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              :items="buildAlgorithmProfileActions(record)"
              split
              @action="(key) => handleAlgorithmProfileAction(key, record)"
            />
          </template>
        </template>
      </UiDataTable>
    </UiCard>

    <a-modal
      v-model:open="editorVisible"
      :title="editorMode === 'create' ? '新建专业算法实例' : '编辑专业算法实例'"
      :confirm-loading="submitting"
      width="900px"
      @ok="submitEditor"
    >
      <a-form layout="vertical" :model="editor">
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="编码" required>
              <a-input v-model:value="editor.profileCode" />
            </a-form-item>
          </a-col>
          <a-col :span="16">
            <a-form-item label="名称" required>
              <a-input v-model:value="editor.profileName" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="算法模板" required>
              <a-select
                v-model:value="editor.templateId"
                placeholder="选择模板会自动继承默认值"
                show-search
                option-filter-prop="label"
                :disabled="editorMode === 'edit'"
                @change="onTemplateSelectChange"
              >
                <a-select-option
                  v-for="t in templates"
                  :key="t.id"
                  :value="t.id"
                  :label="`${t.templateCode} · ${t.templateName}`"
                >
                  {{ t.templateCode }} · {{ t.templateName }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="专业" required>
              <ProgramSelector
                :value="editor.programId || null"
                placeholder="选择本租户专业"
                :disabled="editorMode === 'edit'"
                @change="handleEditorProgramChange"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="认证类型" required>
              <a-select v-model:value="editor.accreditationType" :options="accreditationOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="认证级别">
              <a-input v-model:value="editor.accreditationLevel" placeholder="如 二级 / 三级" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="标准年份">
              <a-input v-model:value="editor.standardYear" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="关联认证标准">
          <a-select
            v-model:value="editor.standardId"
            allow-clear
            show-search
            option-filter-prop="label"
          >
            <a-select-option
              v-for="s in standards"
              :key="s.id"
              :value="s.id"
              :label="`${s.standardCode} · ${s.standardName}`"
            >
              {{ s.standardCode }} · {{ s.standardName }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-divider orientation="left">聚合策略</a-divider>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="课程目标">
              <a-select
                v-model:value="editor.courseGoalAggregation"
                :options="aggregationOptions"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="观测点">
              <a-select v-model:value="editor.indicatorAggregation" :options="aggregationOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="毕业要求">
              <a-select
                v-model:value="editor.requirementAggregation"
                :options="aggregationOptions"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-divider orientation="left">权重 / 样本 / 阈值</a-divider>
        <a-row :gutter="12">
          <a-col :span="6">
            <a-form-item label="直接评价权重" required>
              <a-input-number
                v-model:value="editor.directWeight"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="间接评价权重" required>
              <a-input-number
                v-model:value="editor.indirectWeight"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="间接最低样本">
              <a-input-number
                v-model:value="editor.indirectMinValidSampleCount"
                :min="0"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="间接覆盖率阈值">
              <a-input-number
                v-model:value="editor.indirectCoverageThreshold"
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
            <a-form-item label="课程目标阈值">
              <a-input-number
                v-model:value="editor.courseGoalThreshold"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="观测点阈值">
              <a-input-number
                v-model:value="editor.indicatorThreshold"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="毕业要求阈值">
              <a-input-number
                v-model:value="editor.requirementThreshold"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-divider orientation="left">模板继承与调整</a-divider>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="继承模板策略">
              <a-space direction="vertical" size="small">
                <a-checkbox v-model:checked="editor.inheritAggregationStrategy">
                  聚合策略
                </a-checkbox>
                <a-checkbox v-model:checked="editor.inheritWeightStrategy"> 权重策略 </a-checkbox>
                <a-checkbox v-model:checked="editor.inheritThresholdStrategy">
                  阈值策略
                </a-checkbox>
              </a-space>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="本专业调整项">
              <a-space direction="vertical" size="small">
                <a-checkbox v-model:checked="editor.overrideAggregationStrategy">
                  调整聚合策略
                </a-checkbox>
                <a-checkbox v-model:checked="editor.overrideWeightStrategy">
                  调整权重策略
                </a-checkbox>
                <a-checkbox v-model:checked="editor.overrideThresholdStrategy">
                  调整阈值策略
                </a-checkbox>
              </a-space>
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="覆盖原因">
          <a-input
            v-model:value="editor.overrideReason"
            placeholder="存在调整项时填写专业负责人确认理由"
          />
        </a-form-item>

        <a-checkbox v-model:checked="editor.enabled">启用</a-checkbox>
      </a-form>
    </a-modal>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.pap {
  &__signals {
    margin-bottom: 12px;
  }

  &__panel {
    background: var(--dp-surface);
    border: 1px solid var(--dp-border);
    border-radius: 8px;
    padding: 16px;
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
    color: var(--dp-text-primary);
  }

  &__panel-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
}
</style>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
/**
 * 专业算法模板配置
 *
 * 后端：/api/quality/profession-algorithm-templates
 * 含义：认证标准 → 专业算法模板（艺术设计、财经、法学、农学等）→ 专业实例 三层结构中的第 2 层；
 *      平台维护，专业负责人在创建实例时基于模板继承字段。
 */
import type { AccreditationStandardVO } from '@/apis/quality/accreditation-standard'
import type {
  ProfessionAlgorithmTemplateQueryRequest,
  ProfessionAlgorithmTemplateSaveRequest,
  ProfessionAlgorithmTemplateSignalSummaryVO,
  ProfessionAlgorithmTemplateVO,
} from '@/apis/quality/profession-algorithm-template'
import type { FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, onActivated, onMounted, reactive, ref } from 'vue'
import { accreditationStandardApi } from '@/apis/quality/accreditation-standard'
import { professionAlgorithmTemplateApi } from '@/apis/quality/profession-algorithm-template'
import {
  AccreditationTypeCode,
  AccreditationTypeDescription,
  AggregationFunctionCode,
  AggregationFunctionDescription,
  ALL_ACCREDITATION_TYPE_CODES,
  ALL_AGGREGATION_FUNCTION_CODES,
} from '@/apis/quality/types'
import {
  QUALITY_SELECTOR_PAGE_SIZE,
  QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS,
} from '@/components/quality/selectors/page-contract'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiCheckbox from '@/components/ui-guide/ui/UiCheckbox.vue'
import UiCol from '@/components/ui-guide/ui/UiCol.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDescriptions from '@/components/ui-guide/ui/UiDescriptions.vue'
import UiDescriptionsItem from '@/components/ui-guide/ui/UiDescriptionsItem.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiDivider from '@/components/ui-guide/ui/UiDivider.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiRow from '@/components/ui-guide/ui/UiRow.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchContextGateStrip from '@/components/workbench/WorkbenchContextGateStrip.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const columns: ColumnsType = [
  { title: '编码', dataIndex: 'templateCode', key: 'templateCode', width: 120, fixed: 'left' },
  { title: '名称', dataIndex: 'templateName', key: 'templateName' },
  { title: '来源', key: 'source', width: 110 },
  { title: '认证类型', dataIndex: 'accreditationType', key: 'accreditationType', width: 180 },
  { title: '学科', dataIndex: 'disciplineCategory', key: 'disciplineCategory', width: 120 },
  { title: '直接/间接默认权重', key: 'weights', width: 160 },
  { title: '状态', dataIndex: 'enabled', key: 'enabled', width: 100 },
  { title: '操作', key: 'actions', width: 280 },
]

function accreditationTypeLabel(value: AccreditationTypeCode): string {
  return strictEnumLabel(AccreditationTypeDescription, value, '认证类型')
}

function aggregationFunctionLabel(value: AggregationFunctionCode): string {
  return strictEnumLabel(AggregationFunctionDescription, value, '聚合函数')
}

const list = ref<ProfessionAlgorithmTemplateVO[]>([])
const total = ref(0)
const loading = ref(false)
const standards = ref<AccreditationStandardVO[]>([])
const query = reactive<ProfessionAlgorithmTemplateQueryRequest>({
  pageNum: 1,
  pageSize: 10,
  accreditationType: undefined,
  enabled: undefined,
  keyword: '',
})

interface ProfessionAlgorithmTemplateFilterModel {
  [key: string]: unknown
  accreditationType?: AccreditationTypeCode
  keyword: string
}

const filterForm = reactive<ProfessionAlgorithmTemplateFilterModel>({
  accreditationType: undefined,
  keyword: '',
})

const filterModel = computed<Record<string, unknown>>({
  get: () => filterForm,
  set: (value) => {
    Object.assign(filterForm, value)
  },
})

const filterFields = computed<FilterField[]>(() => [
  {
    key: 'accreditationType',
    type: 'select',
    placeholder: '认证类型',
    allowClear: true,
    width: 180,
    options: accreditationOptions,
  },
  {
    key: 'keyword',
    type: 'input',
    placeholder: '编码/名称',
    allowClear: true,
    width: 160,
  },
])

const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editor = reactive<ProfessionAlgorithmTemplateSaveRequest>({
  templateCode: '',
  templateName: '',
  accreditationType: AccreditationTypeCode.ENGINEERING_ACCREDITATION,
  disciplineCategory: '',
  standardId: undefined,
  standardYear: '',
  description: '',
  courseGoalAggregation: AggregationFunctionCode.WEIGHTED_SUM,
  indicatorAggregation: AggregationFunctionCode.WEIGHTED_SUM,
  requirementAggregation: AggregationFunctionCode.WEIGHTED_SUM,
  directWeightDefault: 0.7,
  indirectWeightDefault: 0.3,
  indirectMinValidSampleCount: 30,
  indirectCoverageThreshold: 0.5,
  courseGoalThresholdDefault: 0.7,
  indicatorThresholdDefault: 0.7,
  requirementThresholdDefault: 0.7,
  aiLiteracySupported: false,
  civicDimensionsSupported: false,
  enabled: true,
})
const submitting = ref(false)
const copyingTemplateId = ref('')

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailRecord = ref<ProfessionAlgorithmTemplateVO | null>(null)

const accreditationOptions = ALL_ACCREDITATION_TYPE_CODES.map((value) => ({
  value,
  label: accreditationTypeLabel(value),
}))
const aggregationOptions = ALL_AGGREGATION_FUNCTION_CODES.map((value) => ({
  value,
  label: aggregationFunctionLabel(value),
}))

function isSharedTemplate(record: ProfessionAlgorithmTemplateVO) {
  return String(record.tenantId) === '0'
}

/* ========== 信号指标：专业算法模板库健康度 ========== */

function buildTemplateListQuery(): ProfessionAlgorithmTemplateQueryRequest {
  return {
    ...query,
    keyword: query.keyword?.trim() || undefined,
  }
}

const signalSummary = ref<ProfessionAlgorithmTemplateSignalSummaryVO | null>(null)

const signals = computed<SignalMetric[]>(() => {
  const summary = signalSummary.value
  if (!summary) {
    return []
  }
  const shared = summary.sharedCount ?? 0
  const tenant = summary.tenantCount ?? 0
  const enabled = summary.enabledCount ?? 0
  const disabled = summary.disabledCount ?? 0
  const aiSupport = summary.aiLiteracySupportedCount ?? 0
  const civic = summary.civicDimensionsSupportedCount ?? 0
  return [
    { key: 'all-total', label: '模板总数', value: summary.totalCount ?? 0, tone: 'blue' },
    { key: 'shared', label: '平台共享', value: shared, tone: shared > 0 ? 'blue' : 'gray' },
    { key: 'tenant', label: '租户自定义', value: tenant, tone: tenant > 0 ? 'green' : 'gray' },
    { key: 'enabled', label: '启用', value: enabled, tone: enabled > 0 ? 'green' : 'gray' },
    { key: 'disabled', label: '停用', value: disabled, tone: disabled > 0 ? 'orange' : 'gray' },
    { key: 'ai-support', label: '支持 AI 素养', value: aiSupport, tone: 'blue' },
    { key: 'civic', label: '支持五育维度', value: civic, tone: 'blue' },
  ]
})

function assignEditor(
  record: ProfessionAlgorithmTemplateVO,
  id: string | undefined,
  templateCode: string,
  templateName: string,
) {
  Object.assign(editor, {
    id,
    templateCode,
    templateName,
    accreditationType: record.accreditationType,
    disciplineCategory: record.disciplineCategory,
    standardId: record.standardId,
    standardYear: record.standardYear,
    description: record.description,
    courseGoalAggregation: record.courseGoalAggregation,
    indicatorAggregation: record.indicatorAggregation,
    requirementAggregation: record.requirementAggregation,
    directWeightDefault: record.directWeightDefault,
    indirectWeightDefault: record.indirectWeightDefault,
    indirectMinValidSampleCount: record.indirectMinValidSampleCount,
    indirectCoverageThreshold: record.indirectCoverageThreshold,
    courseGoalThresholdDefault: record.courseGoalThresholdDefault,
    indicatorThresholdDefault: record.indicatorThresholdDefault,
    requirementThresholdDefault: record.requirementThresholdDefault,
    aiLiteracySupported: record.aiLiteracySupported,
    civicDimensionsSupported: record.civicDimensionsSupported,
    enabled: record.enabled,
  })
}

async function loadStandards(keyword?: string) {
  try {
    const page = await accreditationStandardApi.page({
      pageNum: 1,
      pageSize: QUALITY_SELECTOR_PAGE_SIZE,
      enabled: true,
      keyword: keyword?.trim() || undefined,
    })
    standards.value = page.list
  } catch (error) {
    standards.value = []
    showUserError(error, '认证标准字典加载失败')
  }
}

let standardDictSearchTimer: ReturnType<typeof setTimeout> | null = null
function handleStandardDictSearch(keyword: string) {
  if (standardDictSearchTimer) clearTimeout(standardDictSearchTimer)
  standardDictSearchTimer = setTimeout(
    () => void loadStandards(keyword),
    QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS,
  )
}

async function loadList() {
  loading.value = true
  try {
    const listQuery = buildTemplateListQuery()
    const page = await professionAlgorithmTemplateApi.page(listQuery)
    list.value = page.list
    query.pageNum = page.pageNum
    query.pageSize = page.pageSize
    total.value = page.total
    try {
      signalSummary.value = await professionAlgorithmTemplateApi.signalSummary(listQuery)
    } catch (error) {
      signalSummary.value = null
      showUserError(error, '模板状态统计加载失败')
    }
    if (list.value.length === 0 && total.value > 0 && query.pageNum > 1) {
      query.pageNum -= 1
      await loadList()
    }
  } catch (error) {
    signalSummary.value = null
    showUserError(error, '专业算法模板加载失败')
  } finally {
    loading.value = false
  }
}

function handlePageChange(page: { current: number, pageSize: number }) {
  query.pageNum = page.current
  query.pageSize = page.pageSize
  loadList()
}

function syncFilterToQuery() {
  query.accreditationType = filterForm.accreditationType
  query.keyword = filterForm.keyword
}

function handleSearch() {
  query.pageNum = 1
  syncFilterToQuery()
  void loadList()
}

function handleReset() {
  Object.assign(filterForm, { accreditationType: undefined, keyword: '' })
  query.pageNum = 1
  syncFilterToQuery()
  void loadList()
}

function openCreate() {
  editorMode.value = 'create'
  Object.assign(editor, {
    id: undefined,
    templateCode: '',
    templateName: '',
    accreditationType: 'ENGINEERING_ACCREDITATION',
    disciplineCategory: '',
    standardId: undefined,
    standardYear: '',
    description: '',
    courseGoalAggregation: 'WEIGHTED_SUM',
    indicatorAggregation: 'WEIGHTED_SUM',
    requirementAggregation: 'WEIGHTED_SUM',
    directWeightDefault: 0.7,
    indirectWeightDefault: 0.3,
    indirectMinValidSampleCount: 30,
    indirectCoverageThreshold: 0.5,
    courseGoalThresholdDefault: 0.7,
    indicatorThresholdDefault: 0.7,
    requirementThresholdDefault: 0.7,
    aiLiteracySupported: false,
    civicDimensionsSupported: false,
    enabled: true,
  })
  editorVisible.value = true
}

function openEdit(record: ProfessionAlgorithmTemplateVO) {
  if (isSharedTemplate(record)) {
    void message.info('平台共享模板仅可查看和继承，不能在租户侧编辑')
    return
  }
  editorMode.value = 'edit'
  assignEditor(record, record.id, record.templateCode, record.templateName)
  editorVisible.value = true
}

async function openDetail(record: ProfessionAlgorithmTemplateVO) {
  detailVisible.value = true
  detailLoading.value = true
  try {
    detailRecord.value = await professionAlgorithmTemplateApi.detail(record.id)
  } finally {
    detailLoading.value = false
  }
}

async function copyAsTenantTemplate(record: ProfessionAlgorithmTemplateVO) {
  if (!isSharedTemplate(record)) {
    void message.info('租户自定义模板可直接编辑，无需复制')
    return
  }
  copyingTemplateId.value = record.id
  try {
    const newId = await professionAlgorithmTemplateApi.copyToTenant(record.id)
    void message.success('已复制为当前租户模板')
    await loadList()
    const copied = await professionAlgorithmTemplateApi.detail(newId)
    detailVisible.value = false
    openEdit(copied)
  } finally {
    copyingTemplateId.value = ''
  }
}

async function submitEditor() {
  if (!editor.templateCode.trim() || !editor.templateName.trim()) {
    void message.error('请填写编码与名称')
    return
  }
  submitting.value = true
  try {
    const request: ProfessionAlgorithmTemplateSaveRequest = {
      id: editor.id,
      templateCode: editor.templateCode.trim(),
      templateName: editor.templateName.trim(),
      accreditationType: editor.accreditationType,
      disciplineCategory: editor.disciplineCategory?.trim() || undefined,
      standardId: editor.standardId,
      standardYear: editor.standardYear?.trim() || undefined,
      description: editor.description?.trim() || undefined,
      courseGoalAggregation: editor.courseGoalAggregation,
      indicatorAggregation: editor.indicatorAggregation,
      requirementAggregation: editor.requirementAggregation,
      directWeightDefault: editor.directWeightDefault,
      indirectWeightDefault: editor.indirectWeightDefault,
      indirectMinValidSampleCount: editor.indirectMinValidSampleCount,
      indirectCoverageThreshold: editor.indirectCoverageThreshold,
      courseGoalThresholdDefault: editor.courseGoalThresholdDefault,
      indicatorThresholdDefault: editor.indicatorThresholdDefault,
      requirementThresholdDefault: editor.requirementThresholdDefault,
      aiLiteracySupported: editor.aiLiteracySupported,
      civicDimensionsSupported: editor.civicDimensionsSupported,
      enabled: editor.enabled,
    }
    if (editorMode.value === 'create') await professionAlgorithmTemplateApi.create(request)
    else await professionAlgorithmTemplateApi.update(request)
    void message.success('已保存')
    editorVisible.value = false
    await loadList()
  } finally {
    submitting.value = false
  }
}

function buildAlgorithmTemplateActions(
  record: ProfessionAlgorithmTemplateVO,
): UiTableRowActionItem[] {
  const actions: UiTableRowActionItem[] = [{ key: 'detail', label: '详情' }]
  if (isSharedTemplate(record)) {
    actions.push({
      key: 'copy',
      label: '复制为租户模板',
      tone: 'primary',
      disabled: copyingTemplateId.value === record.id,
    })
  }
  if (!isSharedTemplate(record)) {
    actions.push({ key: 'edit', label: '编辑' })
    actions.push({ key: 'delete', label: '删除', tone: 'danger' })
  }
  return actions
}

function handleAlgorithmTemplateAction(key: string, record: ProfessionAlgorithmTemplateVO): void {
  switch (key) {
    case 'detail':
      openDetail(record)
      break
    case 'copy':
      void copyAsTenantTemplate(record)
      break
    case 'edit':
      openEdit(record)
      break
    case 'delete':
      void handleDelete(record)
      break
  }
}

async function handleDelete(record: ProfessionAlgorithmTemplateVO) {
  if (isSharedTemplate(record)) {
    void message.info('平台共享模板不能在租户侧删除')
    return
  }
  void confirmAsync({
    title: `删除模板 ${record.templateCode}？`,
    type: 'error',
    onOk: async () => {
      await professionAlgorithmTemplateApi.delete(record.id)
      void message.success('已删除')
      await loadList()
    },
  })
}

onMounted(async () => {
  await Promise.all([loadList(), loadStandards()])
})

onActivated(() => {
  void Promise.all([loadList(), loadStandards()])
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="专业算法模板" />
    </template>

    <SignalBand :metrics="signals" variant="panel" compact class="pat__signals" />

    <UiCard class="detail-table-card pat__table-card">
      <template #title>模板台账</template>
      <template #extra>
        <UiButton variant="primary" size="sm" @click="openCreate">新建模板</UiButton>
      </template>

      <UiFilterBar
        variant="plain"
        v-model="filterModel"
        :fields="filterFields"
        @search="handleSearch"
        @reset="handleReset"
      />

      <WorkbenchContextGateStrip
        v-if="!loading && total === 0"
        tag="未配置"
        body="暂无算法模板"
        cta-label="新建模板"
        @cta="openCreate"
      />
      <UiDataTable
        v-else
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
          <template v-if="column.key === 'source'">
            <UiTag :tone="isSharedTemplate(record) ? 'blue' : 'green'">
              {{ isSharedTemplate(record) ? '平台共享' : '租户自定义' }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'accreditationType'">
            {{ accreditationTypeLabel(record.accreditationType) }}
          </template>
          <template v-else-if="column.key === 'weights'">
            {{ record.directWeightDefault }} / {{ record.indirectWeightDefault }}
          </template>
          <template v-else-if="column.key === 'enabled'">
            <UiTag :tone="record.enabled ? 'green' : 'gray'">
              {{ record.enabled ? '启用' : '停用' }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              :items="buildAlgorithmTemplateActions(record)"
              split
              @action="(key) => handleAlgorithmTemplateAction(key, record)"
            />
          </template>
        </template>
      </UiDataTable>
    </UiCard>

    <UiDialog
      v-model:open="editorVisible"
      :title="editorMode === 'create' ? '新建模板' : '编辑模板'"
      :confirm-loading="submitting"
      width="860px"
      @ok="submitEditor"
    >
      <UiForm layout="vertical" :model="editor">
        <UiRow :gutter="12">
          <UiCol :span="8">
            <UiFormItem label="编码" required>
              <UiInput size="sm" v-model="editor.templateCode" :disabled="editorMode === 'edit'" />
            </UiFormItem>
          </UiCol>
          <UiCol :span="16">
            <UiFormItem label="名称" required>
              <UiInput size="sm" v-model="editor.templateName" />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiRow :gutter="12">
          <UiCol :span="8">
            <UiFormItem label="认证类型" required>
              <UiSelect
                size="sm"
                v-model="editor.accreditationType"
                :options="accreditationOptions"
                :disabled="editorMode === 'edit'"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="学科分类">
              <UiInput size="sm" v-model="editor.disciplineCategory" />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="标准年份">
              <UiInput size="sm" v-model="editor.standardYear" />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiFormItem label="关联认证标准">
          <UiSelect
            v-model="editor.standardId"
            allow-clear
            allow-search
            :filter-option="false"
            placeholder="可选"
            @search="handleStandardDictSearch"
            size="sm"
            :options="
              standards.map((s) => ({
                value: s.id,
                label: `${s.standardCode} · ${s.standardName}`,
              }))
            "
          />
        </UiFormItem>
        <UiFormItem label="描述">
          <UiTextarea size="sm" v-model="editor.description" :rows="3" />
        </UiFormItem>

        <UiDivider orientation="left">默认聚合策略</UiDivider>
        <UiRow :gutter="12">
          <UiCol :span="8">
            <UiFormItem label="课程目标聚合">
              <UiSelect
                size="sm"
                v-model="editor.courseGoalAggregation"
                :options="aggregationOptions"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="观测点聚合">
              <UiSelect
                size="sm"
                v-model="editor.indicatorAggregation"
                :options="aggregationOptions"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="毕业要求聚合">
              <UiSelect
                size="sm"
                v-model="editor.requirementAggregation"
                :options="aggregationOptions"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>

        <UiDivider orientation="left">默认权重 / 样本 / 阈值</UiDivider>
        <UiRow :gutter="12">
          <UiCol :span="6">
            <UiFormItem label="直接评价权重">
              <UiInputNumber
                size="sm"
                v-model="editor.directWeightDefault"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="6">
            <UiFormItem label="间接评价权重">
              <UiInputNumber
                size="sm"
                v-model="editor.indirectWeightDefault"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="6">
            <UiFormItem label="间接最低样本">
              <UiInputNumber
                size="sm"
                v-model="editor.indirectMinValidSampleCount"
                :min="0"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="6">
            <UiFormItem label="间接覆盖率阈值">
              <UiInputNumber
                size="sm"
                v-model="editor.indirectCoverageThreshold"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiRow :gutter="12">
          <UiCol :span="8">
            <UiFormItem label="课程目标默认阈值">
              <UiInputNumber
                size="sm"
                v-model="editor.courseGoalThresholdDefault"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="观测点默认阈值">
              <UiInputNumber
                size="sm"
                v-model="editor.indicatorThresholdDefault"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="毕业要求默认阈值">
              <UiInputNumber
                size="sm"
                v-model="editor.requirementThresholdDefault"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>

        <div class="dp-space" style="--dp-space-gap: 8px">
          <UiCheckbox v-model="editor.aiLiteracySupported">支持 AI 素养</UiCheckbox>
          <UiCheckbox v-model="editor.civicDimensionsSupported">支持五育维度</UiCheckbox>
          <UiCheckbox v-model="editor.enabled">启用</UiCheckbox>
        </div>
      </UiForm>
    </UiDialog>

    <UiDrawer
      v-model:open="detailVisible"
      title="专业算法模板详情"
      width="760"
      :loading="detailLoading"
    >
      <template v-if="detailRecord">
        <UiDescriptions :column="2" size="small" bordered>
          <UiDescriptionsItem label="模板编码">
            {{ detailRecord.templateCode }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="模板名称">
            {{ detailRecord.templateName }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="来源">
            <UiTag :tone="isSharedTemplate(detailRecord) ? 'blue' : 'green'">
              {{ isSharedTemplate(detailRecord) ? '平台共享' : '租户自定义' }}
            </UiTag>
          </UiDescriptionsItem>
          <UiDescriptionsItem label="状态">
            <UiTag :tone="detailRecord.enabled ? 'green' : 'gray'">
              {{ detailRecord.enabled ? '启用' : '停用' }}
            </UiTag>
          </UiDescriptionsItem>
          <UiDescriptionsItem label="认证类型">
            {{ accreditationTypeLabel(detailRecord.accreditationType) }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="学科分类">
            {{ detailRecord.disciplineCategory }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="标准年份">
            {{ detailRecord.standardYear }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="关联认证标准">
            {{ detailRecord.standardId }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="课程目标聚合">
            {{ aggregationFunctionLabel(detailRecord.courseGoalAggregation) }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="观测点聚合">
            {{ aggregationFunctionLabel(detailRecord.indicatorAggregation) }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="毕业要求聚合">
            {{ aggregationFunctionLabel(detailRecord.requirementAggregation) }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="直接 / 间接权重">
            {{ detailRecord.directWeightDefault }} /
            {{ detailRecord.indirectWeightDefault }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="间接最低样本">
            {{ detailRecord.indirectMinValidSampleCount }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="间接覆盖率阈值">
            {{ detailRecord.indirectCoverageThreshold }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="课程目标 / 观测点 / 毕业要求阈值" :span="2">
            {{ detailRecord.courseGoalThresholdDefault }} /
            {{ detailRecord.indicatorThresholdDefault }} /
            {{ detailRecord.requirementThresholdDefault }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="能力维度" :span="2">
            <div class="dp-space" style="--dp-space-gap: 8px">
              <UiTag :tone="detailRecord.aiLiteracySupported ? 'blue' : 'gray'">
                {{ detailRecord.aiLiteracySupported ? '支持 AI 素养' : '不支持 AI 素养' }}
              </UiTag>
              <UiTag :tone="detailRecord.civicDimensionsSupported ? 'purple' : 'gray'">
                {{ detailRecord.civicDimensionsSupported ? '支持五育维度' : '不支持五育维度' }}
              </UiTag>
            </div>
          </UiDescriptionsItem>
          <UiDescriptionsItem label="描述" :span="2">
            {{ detailRecord.description }}
          </UiDescriptionsItem>
        </UiDescriptions>

        <UiDivider v-if="isSharedTemplate(detailRecord)">租户继承</UiDivider>
        <div class="dp-space" v-if="isSharedTemplate(detailRecord)" style="--dp-space-gap: 8px">
          <UiButton
            variant="primary"
            size="sm"
            :loading="copyingTemplateId === detailRecord.id"
            @click="copyAsTenantTemplate(detailRecord)"
          >
            复制为租户模板
          </UiButton>
        </div>
      </template>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.pat {
  &__signals {
    margin-bottom: 12px;
  }

  &__panel {
    background: var(--dp-surface);
    border: 1px solid var(--dp-border);
    border-radius: var(--dp-radius-panel);
    padding: var(--dp-space-3, 12px);
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
    font-size: var(--dp-font-size-lg);
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

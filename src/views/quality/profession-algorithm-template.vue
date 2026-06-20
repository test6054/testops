<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
/**
 * 专业算法模板配置
 *
 * 后端：/api/quality/profession-algorithm-templates
 * 含义：认证标准 → 专业算法模板（艺术设计、财经、法学、农学等）→ 专业实例 三层结构中的第 2 层；
 *      平台维护，专业负责人在创建实例时基于模板继承字段。
 */
import type {
  AccreditationStandardVO,
  AccreditationType,
  AggregationFunction,
  ProfessionAlgorithmTemplateQueryRequest,
  ProfessionAlgorithmTemplateSaveRequest,
  ProfessionAlgorithmTemplateVO,
} from '@/apis/quality'
import type { FilterField } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import {
  ACCREDITATION_TYPE_LABEL,
  accreditationStandardApi,
  AGGREGATION_FUNCTION_LABEL,
  professionAlgorithmTemplateApi,
} from '@/apis/quality'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import { SignalBand, StageWorkbenchShell } from '@/components/workbench'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { readAllPages, readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel } from '@/utils/strict-enum'

const ACCREDITATION_STANDARD_OPTION_PAGE_SIZE = 100

const columns: ColumnsType = [
  { title: '编码', dataIndex: 'templateCode', key: 'templateCode', width: 120 },
  { title: '名称', dataIndex: 'templateName', key: 'templateName' },
  { title: '来源', key: 'source', width: 110 },
  { title: '认证类型', dataIndex: 'accreditationType', key: 'accreditationType', width: 180 },
  { title: '学科', dataIndex: 'disciplineCategory', key: 'disciplineCategory', width: 120 },
  { title: '直接/间接默认权重', key: 'weights', width: 160 },
  { title: '状态', dataIndex: 'enabled', key: 'enabled', width: 100 },
  { title: '操作', key: 'actions', width: 280, fixed: 'right' },
]

function accreditationTypeLabel(value: AccreditationType): string {
  return strictEnumLabel(ACCREDITATION_TYPE_LABEL, value, '认证类型')
}

function aggregationFunctionLabel(value: AggregationFunction): string {
  return strictEnumLabel(AGGREGATION_FUNCTION_LABEL, value, '聚合函数')
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
  accreditationType?: AccreditationType
  keyword: string
}

const filterForm = reactive<ProfessionAlgorithmTemplateFilterModel>({
  accreditationType: undefined,
  keyword: '',
})

const filterModel = computed<Record<string, unknown>>({
  get: () => filterForm as Record<string, unknown>,
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
const submitting = ref(false)
const copyingTemplateId = ref('')

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailRecord = ref<ProfessionAlgorithmTemplateVO | null>(null)

const accreditationTypes: AccreditationType[] = [
  'ENGINEERING_ACCREDITATION',
  'TEACHER_ACCREDITATION',
  'MEDICAL_HEALTH_ACCREDITATION',
  'ART_DESIGN_QUALITY_EVALUATION',
  'ECONOMICS_FINANCE_QUALITY_EVALUATION',
  'LAW_QUALITY_EVALUATION',
  'AGRICULTURE_ACCREDITATION',
  'GENERAL_QUALITY_EVALUATION',
]

const accreditationOptions = accreditationTypes.map((value) => ({
  value,
  label: accreditationTypeLabel(value),
}))
const aggregationOptions = [
  { value: 'WEIGHTED_SUM', label: '加权平均' },
  { value: 'MINIMUM', label: '取最小值' },
  { value: 'DIRECT_INDIRECT_WEIGHTED', label: '直接间接加权' },
]

function isSharedTemplate(record: ProfessionAlgorithmTemplateVO) {
  return String(record.tenantId) === '0'
}

/* ========== 信号指标：专业算法模板库健康度 ========== */

const signals = computed<SignalMetric[]>(() => {
  const shared = list.value.filter((t) => isSharedTemplate(t)).length
  const tenant = list.value.filter((t) => !isSharedTemplate(t)).length
  const enabled = list.value.filter((t) => t.enabled).length
  const disabled = list.value.filter((t) => !t.enabled).length
  const aiSupport = list.value.filter((t) => t.aiLiteracySupported).length
  const civic = list.value.filter((t) => t.civicDimensionsSupported).length
  return [
    { key: 'page', label: '当前页记录', value: list.value.length, tone: 'blue' },
    { key: 'all-total', label: '模板总数', value: total.value, tone: 'blue' },
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

async function loadStandards() {
  standards.value = await readAllPages(
    (pageNum) => accreditationStandardApi.page({
      pageNum,
      pageSize: ACCREDITATION_STANDARD_OPTION_PAGE_SIZE,
      enabled: true,
    }),
    '认证标准列表加载失败，请稍后重试',
  )
}

async function loadList() {
  loading.value = true
  try {
    const page = await professionAlgorithmTemplateApi.page({
      ...query,
      keyword: query.keyword?.trim() || undefined,
    })
    list.value = readPageList(page, '专业算法模板加载失败，请稍后重试')
    total.value = readPageTotal(page, '专业算法模板加载失败，请稍后重试')
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
    message.info('平台共享模板仅可查看和继承，不能在租户侧编辑')
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
    message.info('租户自定义模板可直接编辑，无需复制')
    return
  }
  copyingTemplateId.value = record.id
  try {
    const newId = await professionAlgorithmTemplateApi.copyToTenant(record.id)
    message.success('已复制为当前租户模板')
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
    message.error('请填写编码与名称')
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
    message.success('已保存')
    editorVisible.value = false
    await loadList()
  } finally {
    submitting.value = false
  }
}

async function handleDelete(record: ProfessionAlgorithmTemplateVO) {
  if (isSharedTemplate(record)) {
    message.info('平台共享模板不能在租户侧删除')
    return
  }
  void confirmAsync({
    title: `删除模板 ${record.templateCode}？`,
    type: 'error',
    onOk: async () => {
      await professionAlgorithmTemplateApi.delete(record.id)
      message.success('已删除')
      await loadList()
    },
  })
}

onMounted(async () => {
  await Promise.all([loadList(), loadStandards()])
})
</script>

<template>
  <StageWorkbenchShell>
    <SignalBand :metrics="signals" compact class="pat__signals" />

    <UiCard class="detail-table-card pat__table-card">
      <template #title>模板台账</template>
      <template #extra>
        <UiButton variant="primary" size="sm" @click="openCreate">新建模板</UiButton>
      </template>

      <UiFilterBar
        v-model="filterModel"
        :fields="filterFields"
        @search="handleSearch"
        @reset="handleReset"
      />

      <UiDataTable
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
            <div class="operations-cell" @click.stop>
              <UiTextAction @click="openDetail(record)">详情</UiTextAction>
              <UiTextAction
                v-if="isSharedTemplate(record)"
                tone="primary"
                :disabled="copyingTemplateId === record.id"
                @click="copyAsTenantTemplate(record)"
              >
                复制为租户模板
              </UiTextAction>
              <UiTextAction v-if="!isSharedTemplate(record)" @click="openEdit(record)">
                编辑
              </UiTextAction>
              <UiTextAction v-if="!isSharedTemplate(record)" tone="danger" @click="handleDelete(record)">
                删除
              </UiTextAction>
            </div>
          </template>
        </template>
      </UiDataTable>
    </UiCard>

    <a-modal
      v-model:open="editorVisible"
      :title="editorMode === 'create' ? '新建模板' : '编辑模板'"
      :confirm-loading="submitting"
      width="860px"
      @ok="submitEditor"
    >
      <a-form layout="vertical" :model="editor">
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="编码" required>
              <a-input v-model:value="editor.templateCode" />
            </a-form-item>
          </a-col>
          <a-col :span="16">
            <a-form-item label="名称" required>
              <a-input v-model:value="editor.templateName" />
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
            <a-form-item label="学科分类">
              <a-input v-model:value="editor.disciplineCategory" />
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
            placeholder="可选"
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
        <a-form-item label="描述">
          <a-textarea v-model:value="editor.description" :rows="3" />
        </a-form-item>

        <a-divider orientation="left">默认聚合策略</a-divider>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="课程目标聚合">
              <a-select
                v-model:value="editor.courseGoalAggregation"
                :options="aggregationOptions"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="观测点聚合">
              <a-select v-model:value="editor.indicatorAggregation" :options="aggregationOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="毕业要求聚合">
              <a-select
                v-model:value="editor.requirementAggregation"
                :options="aggregationOptions"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-divider orientation="left">默认权重 / 样本 / 阈值</a-divider>
        <a-row :gutter="12">
          <a-col :span="6">
            <a-form-item label="直接评价权重">
              <a-input-number
                v-model:value="editor.directWeightDefault"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="间接评价权重">
              <a-input-number
                v-model:value="editor.indirectWeightDefault"
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
            <a-form-item label="课程目标默认阈值">
              <a-input-number
                v-model:value="editor.courseGoalThresholdDefault"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="观测点默认阈值">
              <a-input-number
                v-model:value="editor.indicatorThresholdDefault"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="毕业要求默认阈值">
              <a-input-number
                v-model:value="editor.requirementThresholdDefault"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-space>
          <a-checkbox v-model:checked="editor.aiLiteracySupported">支持 AI 素养</a-checkbox>
          <a-checkbox v-model:checked="editor.civicDimensionsSupported">支持五育维度</a-checkbox>
          <a-checkbox v-model:checked="editor.enabled">启用</a-checkbox>
        </a-space>
      </a-form>
    </a-modal>

    <a-drawer
      v-model:open="detailVisible"
      title="专业算法模板详情"
      width="760"
      :loading="detailLoading"
    >
      <template v-if="detailRecord">
        <a-descriptions :column="2" size="small" bordered>
          <a-descriptions-item label="模板编码">
            {{ detailRecord.templateCode }}
          </a-descriptions-item>
          <a-descriptions-item label="模板名称">
            {{ detailRecord.templateName }}
          </a-descriptions-item>
          <a-descriptions-item label="来源">
            <UiTag :tone="isSharedTemplate(detailRecord) ? 'blue' : 'green'">
              {{ isSharedTemplate(detailRecord) ? '平台共享' : '租户自定义' }}
            </UiTag>
          </a-descriptions-item>
          <a-descriptions-item label="状态">
            <UiTag :tone="detailRecord.enabled ? 'green' : 'gray'">
              {{ detailRecord.enabled ? '启用' : '停用' }}
            </UiTag>
          </a-descriptions-item>
          <a-descriptions-item label="认证类型">
            {{ accreditationTypeLabel(detailRecord.accreditationType) }}
          </a-descriptions-item>
          <a-descriptions-item label="学科分类">
            {{ detailRecord.disciplineCategory || '未限定学科门类' }}
          </a-descriptions-item>
          <a-descriptions-item label="标准年份">
            {{ detailRecord.standardYear || '未配置标准年份' }}
          </a-descriptions-item>
          <a-descriptions-item label="关联认证标准">
            {{ detailRecord.standardId ? '已关联认证标准' : '未关联认证标准' }}
          </a-descriptions-item>
          <a-descriptions-item label="课程目标聚合">
            {{ aggregationFunctionLabel(detailRecord.courseGoalAggregation) }}
          </a-descriptions-item>
          <a-descriptions-item label="观测点聚合">
            {{ aggregationFunctionLabel(detailRecord.indicatorAggregation) }}
          </a-descriptions-item>
          <a-descriptions-item label="毕业要求聚合">
            {{ aggregationFunctionLabel(detailRecord.requirementAggregation) }}
          </a-descriptions-item>
          <a-descriptions-item label="直接 / 间接权重">
            {{ detailRecord.directWeightDefault }} /
            {{ detailRecord.indirectWeightDefault }}
          </a-descriptions-item>
          <a-descriptions-item label="间接最低样本">
            {{ detailRecord.indirectMinValidSampleCount }}
          </a-descriptions-item>
          <a-descriptions-item label="间接覆盖率阈值">
            {{ detailRecord.indirectCoverageThreshold }}
          </a-descriptions-item>
          <a-descriptions-item label="课程目标 / 观测点 / 毕业要求阈值" :span="2">
            {{ detailRecord.courseGoalThresholdDefault }} /
            {{ detailRecord.indicatorThresholdDefault }} /
            {{ detailRecord.requirementThresholdDefault }}
          </a-descriptions-item>
          <a-descriptions-item label="能力维度" :span="2">
            <a-space>
              <UiTag :tone="detailRecord.aiLiteracySupported ? 'blue' : 'gray'">
                {{ detailRecord.aiLiteracySupported ? '支持 AI 素养' : '不支持 AI 素养' }}
              </UiTag>
              <UiTag :tone="detailRecord.civicDimensionsSupported ? 'purple' : 'gray'">
                {{ detailRecord.civicDimensionsSupported ? '支持五育维度' : '不支持五育维度' }}
              </UiTag>
            </a-space>
          </a-descriptions-item>
          <a-descriptions-item label="描述" :span="2">
            {{ detailRecord.description || '未填写模板说明' }}
          </a-descriptions-item>
        </a-descriptions>

        <a-divider v-if="isSharedTemplate(detailRecord)">租户继承</a-divider>
        <a-space v-if="isSharedTemplate(detailRecord)">
          <UiButton
            variant="primary"
            size="sm"
            :loading="copyingTemplateId === detailRecord.id"
            @click="copyAsTenantTemplate(detailRecord)"
          >
            复制为租户模板
          </UiButton>
        </a-space>
      </template>
    </a-drawer>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.pat {
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
}
</style>

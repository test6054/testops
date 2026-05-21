<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ColumnsType } from 'ant-design-vue/es/table'
/**
 * 专业算法实例
 *
 * 后端：/api/quality/profession-algorithm-profiles
 * 状态流转：DRAFT → CONFIRMED ⇄ REVOKED；只有 CONFIRMED + enabled 的实例进入达成度计算。
 */
import type {
  AccreditationStandardVO,
  AccreditationType,
  ConfirmationStatus,
  ProfessionAlgorithmProfileQueryPayload,
  ProfessionAlgorithmProfileSavePayload,
  ProfessionAlgorithmProfileVO,
  ProfessionAlgorithmTemplateVO,
} from '@/apis/quality'
import type { MajorCategoryVO } from '@/apis/quality/user-catalog'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import {
  ACCREDITATION_TYPE_LABEL,
  accreditationStandardApi,
  CONFIRMATION_STATUS_COLOR,
  CONFIRMATION_STATUS_LABEL,
  isAccreditationType,
  isConfirmationStatus,
  professionAlgorithmProfileApi,
  professionAlgorithmTemplateApi,
} from '@/apis/quality'
import { majorCategoryCatalogApi } from '@/apis/quality/user-catalog'
import { ProgramSelector } from '@/components/quality/selectors'
import { UiButton, UiDataTable } from '@/components/ui-guide/ui'
import { SignalBand, StageWorkbenchShell } from '@/components/workbench'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { promptModal } from './_helpers'

const columns: ColumnsType = [
  { title: '编码', dataIndex: 'profileCode', key: 'profileCode', width: 140 },
  { title: '名称', dataIndex: 'profileName', key: 'profileName' },
  { title: '专业大类', dataIndex: 'programId', key: 'programId', width: 160 },
  { title: '认证类型', dataIndex: 'accreditationType', key: 'accreditationType', width: 180 },
  { title: '级别', dataIndex: 'accreditationLevel', key: 'accreditationLevel', width: 100 },
  { title: '状态', dataIndex: 'confirmationStatus', key: 'confirmationStatus', width: 100 },
  { title: '启用', dataIndex: 'enabled', key: 'enabled', width: 80 },
  { title: '操作', key: 'actions', width: 260, fixed: 'right' },
]

/* ========== 状态守卫 helper（避免 as 断言） ========== */

function accreditationTypeLabel(value: unknown): string {
  if (value == null || value === '') return '-'
  if (isAccreditationType(value)) return ACCREDITATION_TYPE_LABEL[value]
  throw new Error('专业算法实例认证类型不符合前后端契约')
}

function confirmationStatusLabel(value: unknown): string {
  if (isConfirmationStatus(value)) return CONFIRMATION_STATUS_LABEL[value]
  return typeof value === 'string' && value ? value : '-'
}

function confirmationStatusColor(value: unknown): string {
  if (isConfirmationStatus(value)) return CONFIRMATION_STATUS_COLOR[value]
  return 'default'
}

const list = ref<ProfessionAlgorithmProfileVO[]>([])
const total = ref(0)
const loading = ref(false)
const templates = ref<ProfessionAlgorithmTemplateVO[]>([])
const standards = ref<AccreditationStandardVO[]>([])
const programs = ref<MajorCategoryVO[]>([])

const query = reactive<ProfessionAlgorithmProfileQueryPayload>({
  pageNum: 1,
  pageSize: 10,
  programId: undefined,
  accreditationType: undefined,
  confirmationStatus: undefined,
  enabled: undefined,
  keyword: '',
})

function handleQueryProgramChange(value: string | null): void {
  query.programId = value ?? undefined
  void loadList()
}

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
  label: ACCREDITATION_TYPE_LABEL[value],
}))
const aggregationOptions = [
  { value: 'WEIGHTED_SUM', label: '加权平均' },
  { value: 'MINIMUM', label: '取最小值' },
  { value: 'WEIGHTED_MINIMUM_MIXED', label: '加权与最小值混合' },
  { value: 'DIRECT_INDIRECT_WEIGHTED', label: '直接间接加权' },
]
const statusOptions: ConfirmationStatus[] = ['DRAFT', 'SUBMITTED', 'CONFIRMED', 'RETURNED']

const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editor = reactive<ProfessionAlgorithmProfileSavePayload>({
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
  inheritedFields: '',
  overriddenFields: '',
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
    total.value = page.total
  } finally {
    loading.value = false
  }
}

async function loadDicts() {
  const [tpl, std, majors] = await Promise.all([
    professionAlgorithmTemplateApi.page({ pageNum: 1, pageSize: 500, enabled: true }),
    accreditationStandardApi.page({ pageNum: 1, pageSize: 500, enabled: true }),
    majorCategoryCatalogApi.listAll(),
  ])
  templates.value = tpl.list || []
  standards.value = std.list || []
  programs.value = majors || []
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
  editor.courseGoalAggregation = tpl.courseGoalAggregation || 'WEIGHTED_SUM'
  editor.indicatorAggregation = tpl.indicatorAggregation || 'WEIGHTED_SUM'
  editor.requirementAggregation = tpl.requirementAggregation || 'WEIGHTED_SUM'
  editor.directWeight = tpl.directWeightDefault ?? 0.7
  editor.indirectWeight = tpl.indirectWeightDefault ?? 0.3
  editor.indirectMinValidSampleCount = tpl.indirectMinValidSampleCount ?? 30
  editor.indirectCoverageThreshold = tpl.indirectCoverageThreshold ?? 0.5
  editor.courseGoalThreshold = tpl.courseGoalThresholdDefault ?? 0.7
  editor.indicatorThreshold = tpl.indicatorThresholdDefault ?? 0.7
  editor.requirementThreshold = tpl.requirementThresholdDefault ?? 0.7
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
    inheritedFields: '',
    overriddenFields: '',
    overrideReason: '',
    enabled: true,
  })
  editorVisible.value = true
}

function openEdit(record: ProfessionAlgorithmProfileVO) {
  editorMode.value = 'edit'
  Object.assign(editor, record)
  editorVisible.value = true
}

async function submitEditor() {
  if (
    !editor.profileCode.trim()
    || !editor.profileName.trim()
    || !editor.templateId
    || !editor.programId
  ) {
    message.error('请填写编码、名称、模板、专业')
    return
  }
  submitting.value = true
  try {
    if (editorMode.value === 'create') await professionAlgorithmProfileApi.create(editor)
    else await professionAlgorithmProfileApi.update(editor)
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
  const reason = await promptModal({
    title: `撤销实例 ${record.profileCode}`,
    placeholder: '请填写撤销原因（必填）',
    required: true,
    okType: 'danger',
    emptyErrorMessage: '撤销原因不能为空',
  })
  if (!reason) return
  await professionAlgorithmProfileApi.revoke(record.id, reason)
  message.success('已撤销')
  await loadList()
}

async function handleDelete(record: ProfessionAlgorithmProfileVO) {
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

function handlePageChange(payload: { current: number, pageSize: number }) {
  query.pageNum = payload.current
  query.pageSize = payload.pageSize
  loadList()
}

function resetQuery() {
  query.pageNum = 1
  query.programId = undefined
  query.accreditationType = undefined
  query.confirmationStatus = undefined
  query.enabled = undefined
  query.keyword = ''
  loadList()
}

/* ========== 信号指标：专业算法实例健康度 ========== */

const signals = computed<SignalMetric[]>(() => {
  const buckets: Record<ConfirmationStatus, number> = {
    DRAFT: 0,
    SUBMITTED: 0,
    CONFIRMED: 0,
    RETURNED: 0,
  }
  for (const p of list.value) {
    if (isConfirmationStatus(p.confirmationStatus)) buckets[p.confirmationStatus] += 1
  }
  const enabled = list.value.filter((p) => p.enabled).length
  const disabled = list.value.filter((p) => !p.enabled).length
  const usable = list.value.filter((p) => p.enabled && p.confirmationStatus === 'CONFIRMED').length

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

onMounted(async () => {
  await Promise.all([loadList(), loadDicts()])
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="pap__context">
        <div class="pap__context-info">
          <h2 class="pap__title">专业算法实例</h2>
        </div>
      </div>
    </template>

    <SignalBand :metrics="signals" compact class="pap__signals" />

    <section class="pap__panel">
      <header class="pap__panel-header">
        <h3 class="pap__panel-title">实例台账</h3>
        <div class="pap__panel-actions">
          <ProgramSelector
            :value="query.programId || null"
            placeholder="专业大类"
            :width="200"
            @change="handleQueryProgramChange"
          />
          <a-select
            v-model:value="query.accreditationType"
            placeholder="认证类型"
            allow-clear
            class="pap__filter pap__filter--md"
            :options="accreditationOptions"
          />
          <a-select
            v-model:value="query.confirmationStatus"
            placeholder="状态"
            allow-clear
            class="pap__filter"
          >
            <a-select-option v-for="s in statusOptions" :key="s" :value="s">
              {{ confirmationStatusLabel(s) }}
            </a-select-option>
          </a-select>
          <a-input
            v-model:value="query.keyword"
            placeholder="编码/名称"
            class="pap__filter pap__filter--md"
            @press-enter="loadList"
          />
          <UiButton variant="ghost" size="sm" @click="resetQuery"> 重置 </UiButton>
          <UiButton variant="outline" size="sm" :loading="loading" @click="loadList">
            查询
          </UiButton>
          <UiButton variant="primary" size="sm" @click="openCreate"> 新建实例 </UiButton>
        </div>
      </header>

      <UiDataTable
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
        <template #bodyCell="{ column, record, text }">
          <template v-if="column.key === 'programId'">
            {{ programs.find((p) => p.id === text)?.majorCategoryName || text }}
          </template>
          <template v-else-if="column.key === 'accreditationType'">
            {{ accreditationTypeLabel(text) }}
          </template>
          <template v-else-if="column.key === 'confirmationStatus'">
            <a-tag :color="confirmationStatusColor(text)">
              {{ confirmationStatusLabel(text) }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'enabled'">
            <a-tag :color="text ? 'green' : 'default'">
              {{ text ? '启用' : '停用' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space wrap>
              <UiButton variant="ghost" size="sm" @click="openEdit(record)"> 编辑 </UiButton>
              <UiButton
                v-if="record.confirmationStatus === 'DRAFT'"
                variant="outline"
                size="sm"
                @click="handleConfirm(record)"
              >
                确认
              </UiButton>
              <UiButton
                v-if="record.confirmationStatus === 'CONFIRMED'"
                variant="outline"
                size="sm"
                @click="handleRevoke(record)"
              >
                撤销
              </UiButton>
              <UiButton variant="ghost" status="danger" size="sm" @click="handleDelete(record)">
                删除
              </UiButton>
            </a-space>
          </template>
        </template>
      </UiDataTable>
    </section>

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
              <a-input
                v-model:value="editor.accreditationLevel"
                placeholder="如 LEVEL_2 / LEVEL_3"
              />
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

        <a-form-item label="继承字段（备注）">
          <a-textarea v-model:value="editor.inheritedFields" :rows="2" />
        </a-form-item>
        <a-form-item label="覆盖字段（备注）">
          <a-textarea v-model:value="editor.overriddenFields" :rows="2" />
        </a-form-item>
        <a-form-item label="覆盖原因">
          <a-textarea v-model:value="editor.overrideReason" :rows="2" />
        </a-form-item>

        <a-checkbox v-model:checked="editor.enabled">启用</a-checkbox>
      </a-form>
    </a-modal>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.pap {
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

  &__filter {
    width: 130px;

    &--md {
      width: 180px;
    }
  }
}
</style>

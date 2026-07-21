<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
/**
 * 质量评价 - 专业评价口径配置
 *
 * 后端：/api/quality/program-evaluation-profiles
 * 配置某专业采用的认证标准、评价方法、评价周期、样本范围、责任链与归档策略。
 */
import type { AccreditationStandardVO } from '@/apis/quality/accreditation-standard'
import type {
  ProgramEvaluationProfileQueryRequest,
  ProgramEvaluationProfileSaveRequest,
  ProgramEvaluationProfileSignalSummaryVO,
  ProgramEvaluationProfileVO,
} from '@/apis/quality/program-evaluation-profile'
import type { FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, onActivated, onMounted, reactive, ref } from 'vue'
import { accreditationStandardApi } from '@/apis/quality/accreditation-standard'
import { programEvaluationProfileApi } from '@/apis/quality/program-evaluation-profile'
import {
  AccreditationTypeCode,
  AccreditationTypeDescription,
  ALL_ACCREDITATION_TYPE_CODES,
  ALL_EVALUATION_CYCLE_CODES,
  ALL_EVALUATION_METHOD_CODES,
  EvaluationCycleCode,
  EvaluationCycleDescription,
  EvaluationMethodCode,
  EvaluationMethodDescription,
} from '@/apis/quality/types'
import QualityPageContextBar from '@/components/quality/QualityPageContextBar.vue'
import { ProgramSelector } from '@/components/quality/selectors'
import {
  QUALITY_SELECTOR_PAGE_SIZE,
  QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS,
} from '@/components/quality/selectors/page-contract'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiCheckbox from '@/components/ui-guide/ui/UiCheckbox.vue'
import UiCol from '@/components/ui-guide/ui/UiCol.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDivider from '@/components/ui-guide/ui/UiDivider.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiRow from '@/components/ui-guide/ui/UiRow.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchContextGateStrip from '@/components/workbench/WorkbenchContextGateStrip.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useQualityScopedLoader } from '@/composables/useQualityPageScope'
import { showUserError } from '@/utils/error-handler'

import { strictEnumLabel } from '@/utils/strict-enum'

const columns: ColumnsType = [
  { title: '专业', dataIndex: 'programName', key: 'programName', fixed: 'left' },
  { title: '认证类型', dataIndex: 'accreditationType', key: 'accreditationType', width: 200 },
  { title: '级别', dataIndex: 'accreditationLevel', key: 'accreditationLevel', width: 100 },
  { title: '评价方法', dataIndex: 'evaluationMethod', key: 'evaluationMethod', width: 180 },
  { title: '评价周期', dataIndex: 'evaluationCycle', key: 'evaluationCycle', width: 120 },
  { title: '启用', dataIndex: 'enabled', key: 'enabled', width: 80 },
  { title: '操作', key: 'actions', width: 160 },
]

const list = ref<ProgramEvaluationProfileVO[]>([])
const total = ref(0)
const loading = ref(false)
const standards = ref<AccreditationStandardVO[]>([])

const query = reactive<ProgramEvaluationProfileQueryRequest>({
  pageNum: 1,
  pageSize: 10,
  accreditationType: undefined,
  enabled: undefined,
  keyword: '',
})

interface ProgramProfileFilterModel {
  accreditationType?: AccreditationTypeCode
  keyword: string
}

const listFilterForm = reactive<ProgramProfileFilterModel>({
  accreditationType: undefined,
  keyword: '',
})

const accreditationOptions = ALL_ACCREDITATION_TYPE_CODES.map((value) => ({
  value,
  label: strictEnumLabel(AccreditationTypeDescription, value, '认证类型'),
}))

const evaluationMethodOptions = ALL_EVALUATION_METHOD_CODES.map((value) => ({
  value,
  label: strictEnumLabel(EvaluationMethodDescription, value, '评价方法'),
}))

const filterFields: FilterField[] = [
  {
    key: 'accreditationType',
    type: 'select',
    label: '认证类型',
    placeholder: '认证类型',
    allowClear: true,
    width: 160,
    options: accreditationOptions,
  },
  {
    key: 'keyword',
    type: 'input',
    label: '专业名称',
    placeholder: '专业名称',
    allowClear: true,
    width: 160,
    triggerSearchOnChange: false,
  },
]

const evaluationCycleOptions: Array<{ value: EvaluationCycleCode, label: string }>
  = ALL_EVALUATION_CYCLE_CODES.map((value) => ({
    value,
    label: strictEnumLabel(EvaluationCycleDescription, value, '评价周期'),
  }))

const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editor = reactive<ProgramEvaluationProfileSaveRequest>({
  programId: '',
  schoolId: '',
  departmentId: '',
  accreditationType: AccreditationTypeCode.ENGINEERING_ACCREDITATION,
  standardId: undefined,
  standardYear: '',
  accreditationLevel: '',
  evaluationMethod: EvaluationMethodCode.DIRECT_INDIRECT_WEIGHTED,
  evaluationCycle: EvaluationCycleCode.YEAR,
  includeGraduateSamples: true,
  includeEmployerSamples: true,
  includeAlumniSamples: true,
  includeCurrentStudentSamples: false,
  sampleScopeRemark: '',
  collegeReviewOwner: '',
  departmentReviewOwner: '',
  programReviewOwner: '',
  reviewChainRemark: '',
  archiveRetentionYears: 5,
  archiveLocation: '',
  archiveResponsibleUnit: '',
  archivePolicyRemark: '',
  enabled: true,
})
const submitting = ref(false)

function buildProgramProfileListQuery(): ProgramEvaluationProfileQueryRequest {
  return {
    ...query,
    keyword: query.keyword?.trim() || undefined,
  }
}

const signalSummary = ref<ProgramEvaluationProfileSignalSummaryVO | null>(null)

async function loadList() {
  loading.value = true
  try {
    const listQuery = buildProgramProfileListQuery()
    const page = await programEvaluationProfileApi.page(listQuery)
    list.value = page.list
    query.pageNum = page.pageNum
    query.pageSize = page.pageSize
    total.value = page.total
    try {
      signalSummary.value = await programEvaluationProfileApi.signalSummary(listQuery)
    } catch (error) {
      signalSummary.value = null
      showUserError(error, '专业评价口径状态统计加载失败')
    }
    if (list.value.length === 0 && total.value > 0 && query.pageNum > 1) {
      query.pageNum -= 1
      await loadList()
    }
  } catch (error) {
    signalSummary.value = null
    showUserError(error, '专业评价口径加载失败')
  } finally {
    loading.value = false
  }
}

function accreditationLabel(value: AccreditationTypeCode): string {
  return strictEnumLabel(AccreditationTypeDescription, value, '认证类型')
}

function evaluationMethodLabel(value: EvaluationMethodCode): string {
  return strictEnumLabel(EvaluationMethodDescription, value, '评价方法')
}

function evaluationCycleLabel(value: EvaluationCycleCode): string {
  return strictEnumLabel(EvaluationCycleDescription, value, '评价周期')
}

const signals = computed<SignalMetric[]>(() => {
  const summary = signalSummary.value
  if (!summary) {
    return []
  }
  const enabledCount = summary.enabledCount ?? 0
  const disabledCount = summary.disabledCount ?? 0
  const engineering = summary.engineeringAccreditationCount ?? 0
  return [
    { key: 'overall', label: '总口径', value: summary.totalCount ?? 0, tone: 'gray' },
    {
      key: 'enabled',
      label: '启用',
      value: enabledCount,
      tone: enabledCount > 0 ? 'green' : 'gray',
    },
    {
      key: 'disabled',
      label: '停用',
      value: disabledCount,
      tone: disabledCount > 0 ? 'orange' : 'gray',
    },
    {
      key: 'engineering',
      label: '工程认证',
      value: engineering,
      tone: engineering > 0 ? 'blue' : 'gray',
    },
  ]
})

async function loadDicts(keyword?: string) {
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
    () => void loadDicts(keyword),
    QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS,
  )
}

function handlePageChange(page: { current: number, pageSize: number }) {
  query.pageNum = page.current
  query.pageSize = page.pageSize
  loadList()
}

function syncListFilterToQuery() {
  query.accreditationType = listFilterForm.accreditationType
  query.keyword = listFilterForm.keyword
}

function handleSearch() {
  query.pageNum = 1
  syncListFilterToQuery()
  loadList()
}

function resetQuery() {
  query.pageNum = 1
  syncListFilterToQuery()
  loadList()
}

function openCreate() {
  editorMode.value = 'create'
  Object.assign(editor, {
    id: undefined,
    programId: '',
    schoolId: '',
    departmentId: '',
    accreditationType: AccreditationTypeCode.ENGINEERING_ACCREDITATION,
    standardId: undefined,
    standardYear: '',
    accreditationLevel: '',
    evaluationMethod: EvaluationMethodCode.DIRECT_INDIRECT_WEIGHTED,
    evaluationCycle: EvaluationCycleCode.YEAR,
    includeGraduateSamples: true,
    includeEmployerSamples: true,
    includeAlumniSamples: true,
    includeCurrentStudentSamples: false,
    sampleScopeRemark: '',
    collegeReviewOwner: '',
    departmentReviewOwner: '',
    programReviewOwner: '',
    reviewChainRemark: '',
    archiveRetentionYears: 5,
    archiveLocation: '',
    archiveResponsibleUnit: '',
    archivePolicyRemark: '',
    enabled: true,
  })
  editorVisible.value = true
}

function openEdit(record: ProgramEvaluationProfileVO) {
  editorMode.value = 'edit'
  Object.assign(editor, {
    id: record.id,
    programId: record.programId,
    schoolId: record.schoolId,
    departmentId: record.departmentId,
    accreditationType: record.accreditationType,
    standardId: record.standardId,
    standardYear: record.standardYear,
    accreditationLevel: record.accreditationLevel,
    evaluationMethod: record.evaluationMethod,
    evaluationCycle: record.evaluationCycle,
    includeGraduateSamples: record.includeGraduateSamples,
    includeEmployerSamples: record.includeEmployerSamples,
    includeAlumniSamples: record.includeAlumniSamples,
    includeCurrentStudentSamples: record.includeCurrentStudentSamples,
    sampleScopeRemark: record.sampleScopeRemark,
    collegeReviewOwner: record.collegeReviewOwner,
    departmentReviewOwner: record.departmentReviewOwner,
    programReviewOwner: record.programReviewOwner,
    reviewChainRemark: record.reviewChainRemark,
    archiveRetentionYears: record.archiveRetentionYears,
    archiveLocation: record.archiveLocation,
    archiveResponsibleUnit: record.archiveResponsibleUnit,
    archivePolicyRemark: record.archivePolicyRemark,
    enabled: record.enabled,
  })
  editorVisible.value = true
}

function handleProgramChange(value: string | null) {
  editor.programId = value ?? ''
}

async function submitEditor() {
  if (!editor.programId || !editor.accreditationType) {
    void message.error('请选择专业和认证类型')
    return
  }
  submitting.value = true
  try {
    const request: ProgramEvaluationProfileSaveRequest = {
      id: editor.id,
      programId: editor.programId,
      schoolId: editor.schoolId || undefined,
      departmentId: editor.departmentId || undefined,
      accreditationType: editor.accreditationType,
      standardId: editor.standardId || undefined,
      standardYear: editor.standardYear?.trim() || undefined,
      accreditationLevel: editor.accreditationLevel?.trim() || undefined,
      evaluationMethod: editor.evaluationMethod,
      evaluationCycle: editor.evaluationCycle,
      includeGraduateSamples: editor.includeGraduateSamples,
      includeEmployerSamples: editor.includeEmployerSamples,
      includeAlumniSamples: editor.includeAlumniSamples,
      includeCurrentStudentSamples: editor.includeCurrentStudentSamples,
      sampleScopeRemark: editor.sampleScopeRemark?.trim() || undefined,
      collegeReviewOwner: editor.collegeReviewOwner?.trim() || undefined,
      departmentReviewOwner: editor.departmentReviewOwner?.trim() || undefined,
      programReviewOwner: editor.programReviewOwner?.trim() || undefined,
      reviewChainRemark: editor.reviewChainRemark?.trim() || undefined,
      archiveRetentionYears: editor.archiveRetentionYears,
      archiveLocation: editor.archiveLocation?.trim() || undefined,
      archiveResponsibleUnit: editor.archiveResponsibleUnit?.trim() || undefined,
      archivePolicyRemark: editor.archivePolicyRemark?.trim() || undefined,
      enabled: editor.enabled,
    }
    if (editorMode.value === 'create') await programEvaluationProfileApi.create(request)
    else await programEvaluationProfileApi.update(request)
    void message.success('已保存')
    editorVisible.value = false
    await loadList()
  } finally {
    submitting.value = false
  }
}

function buildProgramEvaluationProfileActions(
  _record: ProgramEvaluationProfileVO,
): UiTableRowActionItem[] {
  return [
    { key: 'edit', label: '编辑' },
    { key: 'delete', label: '删除', tone: 'danger' },
  ]
}

function handleProgramEvaluationProfileAction(
  key: string,
  record: ProgramEvaluationProfileVO,
): void {
  switch (key) {
    case 'edit':
      openEdit(record)
      break
    case 'delete':
      void handleDelete(record)
      break
  }
}

async function handleDelete(record: ProgramEvaluationProfileVO) {
  void confirmAsync({
    title: `删除专业 ${record.programName} 的评价口径？`,
    type: 'error',
    onOk: async () => {
      await programEvaluationProfileApi.delete(record.id)
      void message.success('已删除')
      await loadList()
    },
  })
}

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
    <template #context>
      <QualityPageContextBar show-title title="专业评价口径" />
    </template>

    <SignalBand :metrics="signals" variant="panel" compact class="program-profile__signals" />

    <UiCard class="detail-table-card program-profile__table-card">
      <template #title>口径列表</template>
      <template #extra>
        <UiButton size="sm" variant="primary" @click="openCreate">新建评价口径</UiButton>
      </template>

      <UiFilterBar
        variant="plain"
        v-model="listFilterForm"
        :fields="filterFields"
        show-labels
        search-text="查询"
        @search="handleSearch"
        @reset="resetQuery"
      />

      <WorkbenchContextGateStrip
        v-if="!loading && total === 0"
        tag="未配置"
        body="未配置专业评价口径"
        cta-label="新建评价口径"
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
          <template v-if="column.key === 'accreditationType'">
            {{ accreditationLabel(record.accreditationType) }}
          </template>
          <template v-else-if="column.key === 'programName'">
            {{ record.programName }}
          </template>
          <template v-else-if="column.key === 'accreditationLevel'">
            {{ record.accreditationLevel || '未配置认证级别' }}
          </template>
          <template v-else-if="column.key === 'evaluationMethod'">
            {{ evaluationMethodLabel(record.evaluationMethod) }}
          </template>
          <template v-else-if="column.key === 'evaluationCycle'">
            {{ evaluationCycleLabel(record.evaluationCycle) }}
          </template>
          <template v-else-if="column.key === 'enabled'">
            <UiTag :tone="record.enabled ? 'green' : 'gray'">
              {{ record.enabled ? '启用' : '停用' }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              :items="buildProgramEvaluationProfileActions(record)"
              split
              @action="(key) => handleProgramEvaluationProfileAction(key, record)"
            />
          </template>
        </template>
      </UiDataTable>
    </UiCard>

    <UiDrawer
      v-model:open="editorVisible"
      :title="editorMode === 'create' ? '新建专业评价口径' : '编辑专业评价口径'"
      :width="640"
      :confirm-loading="submitting"
      :hide-footer="false"
      ok-text="保存"
      @ok="submitEditor"
    >
      <UiForm layout="vertical" :model="editor">
        <UiRow :gutter="12">
          <UiCol :span="24">
            <UiFormItem label="专业" required>
              <ProgramSelector
                :value="editor.programId || null"
                :disabled="editorMode === 'edit'"
                @change="handleProgramChange"
              />
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
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="认证级别">
              <UiInput size="sm" v-model="editor.accreditationLevel" placeholder="如 二级 / 三级" />
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
            :allow-clear="editorMode === 'create'"
            allow-search
            :filter-option="false"
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
        <UiRow :gutter="12">
          <UiCol :span="12">
            <UiFormItem label="评价方法" required>
              <UiSelect
                size="sm"
                v-model="editor.evaluationMethod"
                :options="evaluationMethodOptions"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem label="评价周期" required>
              <UiSelect
                size="sm"
                v-model="editor.evaluationCycle"
                :options="evaluationCycleOptions"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiDivider orientation="left">样本范围</UiDivider>
        <UiFormItem>
          <div class="dp-space dp-space--wrap" style="--dp-space-gap: 8px">
            <UiCheckbox v-model="editor.includeGraduateSamples">毕业生</UiCheckbox>
            <UiCheckbox v-model="editor.includeEmployerSamples">用人单位</UiCheckbox>
            <UiCheckbox v-model="editor.includeAlumniSamples">校友</UiCheckbox>
            <UiCheckbox v-model="editor.includeCurrentStudentSamples">在校生</UiCheckbox>
          </div>
        </UiFormItem>
        <UiFormItem label="样本范围补充说明">
          <UiInput
            size="sm"
            v-model="editor.sampleScopeRemark"
            placeholder="如覆盖年级、抽样口径或排除条件"
          />
        </UiFormItem>

        <UiDivider orientation="left">责任链</UiDivider>
        <UiRow :gutter="12">
          <UiCol :span="8">
            <UiFormItem label="校级责任">
              <UiInput
                size="sm"
                v-model="editor.collegeReviewOwner"
                placeholder="责任单位或负责人"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="院系责任">
              <UiInput
                size="sm"
                v-model="editor.departmentReviewOwner"
                placeholder="责任单位或负责人"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="专业责任">
              <UiInput
                size="sm"
                v-model="editor.programReviewOwner"
                placeholder="责任单位或负责人"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiFormItem label="责任链补充说明">
          <UiInput
            size="sm"
            v-model="editor.reviewChainRemark"
            placeholder="如复核顺序、签字节点或归口要求"
          />
        </UiFormItem>

        <UiDivider orientation="left">归档策略</UiDivider>
        <UiRow :gutter="12">
          <UiCol :span="8">
            <UiFormItem label="保存年限">
              <UiInputNumber
                size="sm"
                v-model="editor.archiveRetentionYears"
                :min="0"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="归档位置">
              <UiInput size="sm" v-model="editor.archiveLocation" />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="责任单位">
              <UiInput size="sm" v-model="editor.archiveResponsibleUnit" />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiFormItem label="归档策略补充说明">
          <UiInput
            size="sm"
            v-model="editor.archivePolicyRemark"
            placeholder="如电子/纸质材料同步要求"
          />
        </UiFormItem>
        <UiCheckbox v-model="editor.enabled"> 启用 </UiCheckbox>
      </UiForm>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.program-profile {
  &__filter {
    width: 200px;
  }

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
    margin-bottom: 12px;
  }

  &__panel-title {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--dp-text-primary);
  }
}
</style>

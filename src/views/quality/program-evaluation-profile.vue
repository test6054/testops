<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ColumnsType } from 'ant-design-vue/es/table'
/**
 * 质量评价 - 专业评价口径配置
 *
 * 后端：/api/quality/program-evaluation-profiles
 * 配置某专业采用的认证标准、评价方法、评价周期、样本范围、责任链与归档策略。
 */
import type {
  AccreditationStandardVO,
  AccreditationType,
  EvaluationMethod,
  ProgramEvaluationProfileQueryPayload,
  ProgramEvaluationProfileSavePayload,
  ProgramEvaluationProfileVO,
} from '@/apis/quality'
import {
  ACCREDITATION_TYPE_LABEL,
  accreditationStandardApi,
  EVALUATION_METHOD_LABEL,
  isAccreditationType,
  isEvaluationMethod,
  programEvaluationProfileApi,
} from '@/apis/quality'
import type { MajorCategoryVO } from '@/apis/quality/user-catalog'
import { majorCategoryCatalogApi } from '@/apis/quality/user-catalog'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { UiButton, UiDataTable, UiDrawer } from '@/components/ui-guide/ui'
import { SignalBand, StageWorkbenchShell } from '@/components/workbench'
import { confirmAsync } from '@/composables/useConfirmDialog'

const columns: ColumnsType = [
  { title: '专业', dataIndex: 'programName', key: 'programName' },
  { title: '认证类型', dataIndex: 'accreditationType', key: 'accreditationType', width: 200 },
  { title: '级别', dataIndex: 'accreditationLevel', key: 'accreditationLevel', width: 100 },
  { title: '评价方法', dataIndex: 'evaluationMethod', key: 'evaluationMethod', width: 180 },
  { title: '评价周期', dataIndex: 'evaluationCycle', key: 'evaluationCycle', width: 120 },
  { title: '启用', dataIndex: 'enabled', key: 'enabled', width: 80 },
  { title: '操作', key: 'actions', width: 160, fixed: 'right' },
]

const list = ref<ProgramEvaluationProfileVO[]>([])
const total = ref(0)
const loading = ref(false)
const standards = ref<AccreditationStandardVO[]>([])
const programs = ref<MajorCategoryVO[]>([])

const query = reactive<ProgramEvaluationProfileQueryPayload>({
  pageNum: 1,
  pageSize: 10,
  accreditationType: undefined,
  enabled: undefined,
  keyword: '',
})

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

const evaluationMethods: EvaluationMethod[] = [
  'DIRECT_ONLY',
  'DIRECT_INDIRECT_WEIGHTED',
  'MANUAL_REVIEW_CONFIRMED',
]

const accreditationOptions = accreditationTypes.map((value) => ({
  value,
  label: ACCREDITATION_TYPE_LABEL[value],
}))
const evaluationMethodOptions = evaluationMethods.map((value) => ({
  value,
  label: EVALUATION_METHOD_LABEL[value],
}))
const evaluationCycleOptions = [
  { value: 'SEMESTER', label: '按学期' },
  { value: 'YEAR', label: '按学年' },
  { value: 'BIENNIAL', label: '每两年' },
  { value: 'TRIENNIAL', label: '每三年' },
  { value: 'PROGRAM_CYCLE', label: '按培养周期' },
]

const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editor = reactive<ProgramEvaluationProfileSavePayload>({
  programId: '',
  programName: '',
  schoolId: '',
  departmentId: '',
  accreditationType: 'ENGINEERING_ACCREDITATION',
  standardId: undefined,
  standardYear: '',
  accreditationLevel: '',
  evaluationMethod: 'DIRECT_INDIRECT_WEIGHTED',
  evaluationCycle: 'YEAR',
  sampleScope: '',
  reviewChain: '',
  archivePolicy: '',
  enabled: true,
})
const submitting = ref(false)

async function loadList() {
  loading.value = true
  try {
    const page = await programEvaluationProfileApi.page({
      ...query,
      keyword: query.keyword?.trim() || undefined,
    })
    list.value = page.list
    total.value = page.total
  } finally {
    loading.value = false
  }
}

// 枚举守卫 helper：禁止 as 类型断言
function accreditationLabel(value: unknown): string {
  if (value == null || value === '') return '-'
  if (isAccreditationType(value)) return ACCREDITATION_TYPE_LABEL[value]
  throw new Error('专业评价口径认证类型不符合前后端契约')
}

function evaluationMethodLabel(value: unknown): string {
  if (value == null || value === '') return '-'
  if (isEvaluationMethod(value)) return EVALUATION_METHOD_LABEL[value]
  throw new Error('专业评价口径评价方法不符合前后端契约')
}

function evaluationCycleLabel(value: unknown): string {
  if (typeof value !== 'string') return '-'
  const found = evaluationCycleOptions.find((option) => option.value === value)
  return found ? found.label : value || '-'
}

const enabledCount = computed(() => list.value.filter((item) => item.enabled).length)
const disabledCount = computed(() => list.value.filter((item) => !item.enabled).length)

const signals = computed<SignalMetric[]>(() => {
  const engineering = list.value.filter(
    (item) =>
      isAccreditationType(item.accreditationType) &&
      item.accreditationType === 'ENGINEERING_ACCREDITATION',
  ).length
  return [
    { key: 'overall', label: '总口径', value: total.value, tone: 'gray' },
    { key: 'page', label: '本页', value: list.value.length, tone: 'blue' },
    {
      key: 'enabled',
      label: '启用',
      value: enabledCount.value,
      tone: enabledCount.value > 0 ? 'green' : 'gray',
    },
    {
      key: 'disabled',
      label: '停用',
      value: disabledCount.value,
      tone: disabledCount.value > 0 ? 'orange' : 'gray',
    },
    {
      key: 'engineering',
      label: '工程认证',
      value: engineering,
      tone: engineering > 0 ? 'blue' : 'gray',
    },
  ]
})

async function loadDicts() {
  const [std, majors] = await Promise.all([
    accreditationStandardApi.page({ pageNum: 1, pageSize: 500, enabled: true }),
    majorCategoryCatalogApi.listAll(),
  ])
  standards.value = std.list
  programs.value = majors
}

function handlePageChange(payload: { current: number; pageSize: number }) {
  query.pageNum = payload.current
  query.pageSize = payload.pageSize
  loadList()
}

function resetQuery() {
  query.pageNum = 1
  query.accreditationType = undefined
  query.enabled = undefined
  query.keyword = ''
  loadList()
}

function openCreate() {
  editorMode.value = 'create'
  Object.assign(editor, {
    id: undefined,
    programId: '',
    programName: '',
    schoolId: '',
    departmentId: '',
    accreditationType: 'ENGINEERING_ACCREDITATION',
    standardId: undefined,
    standardYear: '',
    accreditationLevel: '',
    evaluationMethod: 'DIRECT_INDIRECT_WEIGHTED',
    evaluationCycle: 'YEAR',
    sampleScope: '',
    reviewChain: '',
    archivePolicy: '',
    enabled: true,
  })
  editorVisible.value = true
}

function openEdit(record: ProgramEvaluationProfileVO) {
  editorMode.value = 'edit'
  Object.assign(editor, record)
  editorVisible.value = true
}

// a-select v-model:value 是 SelectValue（string|number|undefined|array），
// 这里业务模板 ID 是字符串，select 清空时为 undefined，需要在 handler 中显式 narrow。
function onProgramChange(value: SelectValue) {
  if (typeof value !== 'string') return
  const major = programs.value.find((p) => p.id === value)
  if (major) editor.programName = major.majorCategoryName
}

async function submitEditor() {
  if (!editor.programId || !editor.programName.trim() || !editor.accreditationType) {
    message.error('请选择专业并填写认证类型')
    return
  }
  submitting.value = true
  try {
    if (editorMode.value === 'create') await programEvaluationProfileApi.create(editor)
    else await programEvaluationProfileApi.update(editor)
    message.success('已保存')
    editorVisible.value = false
    await loadList()
  } finally {
    submitting.value = false
  }
}

async function handleDelete(record: ProgramEvaluationProfileVO) {
  void confirmAsync({
    title: `删除专业 ${record.programName} 的评价口径？`,
    type: 'error',
    onOk: async () => {
      await programEvaluationProfileApi.delete(record.id)
      message.success('已删除')
      await loadList()
    },
  })
}

onMounted(async () => {
  await Promise.all([loadList(), loadDicts()])
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="program-profile__context">
        <div class="program-profile__context-info">
          <h2 class="program-profile__title">质量评价 - 专业评价口径配置</h2>
        </div>
        <div class="program-profile__context-actions">
          <a-select
            v-model:value="query.accreditationType"
            placeholder="认证类型"
            allow-clear
            class="program-profile__filter"
            :options="accreditationOptions"
          />
          <a-input
            v-model:value="query.keyword"
            placeholder="专业名称"
            class="program-profile__filter"
            @press-enter="loadList"
          />
          <UiButton variant="ghost" size="sm" @click="resetQuery"> 重置 </UiButton>
          <UiButton variant="outline" size="sm" :loading="loading" @click="loadList">
            查询
          </UiButton>
          <UiButton variant="primary" size="sm" @click="openCreate"> 新建评价口径 </UiButton>
        </div>
      </div>
    </template>

    <SignalBand :metrics="signals" compact class="program-profile__signals" />

    <section class="program-profile__panel">
      <header class="program-profile__panel-header">
        <h3 class="program-profile__panel-title">口径列表</h3>
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
          <template v-if="column.key === 'accreditationType'">
            {{ accreditationLabel(text) }}
          </template>
          <template v-else-if="column.key === 'accreditationLevel'">
            {{ text || '-' }}
          </template>
          <template v-else-if="column.key === 'evaluationMethod'">
            {{ evaluationMethodLabel(text) }}
          </template>
          <template v-else-if="column.key === 'evaluationCycle'">
            {{ evaluationCycleLabel(text) }}
          </template>
          <template v-else-if="column.key === 'enabled'">
            <a-tag :color="text ? 'green' : 'default'">
              {{ text ? '启用' : '停用' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <UiButton variant="ghost" size="sm" @click="openEdit(record)"> 编辑 </UiButton>
              <UiButton variant="ghost" status="danger" size="sm" @click="handleDelete(record)">
                删除
              </UiButton>
            </a-space>
          </template>
        </template>
      </UiDataTable>
    </section>

    <UiDrawer
      v-model:open="editorVisible"
      :title="editorMode === 'create' ? '新建专业评价口径' : '编辑专业评价口径'"
      :width="640"
      :confirm-loading="submitting"
      :hide-footer="false"
      ok-text="保存"
      @ok="submitEditor"
    >
      <a-form layout="vertical" :model="editor">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="专业" required>
              <a-select
                v-model:value="editor.programId"
                placeholder="选择专业"
                show-search
                option-filter-prop="label"
                @change="onProgramChange"
              >
                <a-select-option
                  v-for="p in programs"
                  :key="p.id"
                  :value="p.id"
                  :label="p.majorCategoryName"
                >
                  {{ p.majorCategoryName }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="专业名称（用于归档）" required>
              <a-input v-model:value="editor.programName" />
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
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="评价方法" required>
              <a-select
                v-model:value="editor.evaluationMethod"
                :options="evaluationMethodOptions"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="评价周期" required>
              <a-select v-model:value="editor.evaluationCycle" :options="evaluationCycleOptions" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="样本范围">
          <a-textarea
            v-model:value="editor.sampleScope"
            :rows="2"
            placeholder="如：全体毕业生 + 用人单位 + 校友"
          />
        </a-form-item>
        <a-form-item label="责任链">
          <a-textarea
            v-model:value="editor.reviewChain"
            :rows="2"
            placeholder="校院两级审核责任链描述"
          />
        </a-form-item>
        <a-form-item label="归档策略">
          <a-textarea v-model:value="editor.archivePolicy" :rows="2" />
        </a-form-item>
        <a-checkbox v-model:checked="editor.enabled"> 启用 </a-checkbox>
      </a-form>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.program-profile {
  &__context {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  &__context-info {
    flex: 1;
    min-width: 320px;
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
    width: 200px;
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
    margin-bottom: 12px;
  }

  &__panel-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }
}
</style>

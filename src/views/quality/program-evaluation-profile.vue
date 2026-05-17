<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
/**
 * 专业评价口径配置
 *
 * 后端：/api/quality/program-evaluation-profiles
 * 含义：配置某专业采用的认证标准、评价方法、评价周期、样本范围、责任链与归档策略。
 */
import type {
  AccreditationStandardVO,
  EvaluationMethod,
  ProgramEvaluationProfileQueryPayload,
  ProgramEvaluationProfileSavePayload,
  ProgramEvaluationProfileVO,
} from '@/apis/quality'
import type { MajorVO } from '@/apis/quality/user-catalog'
import { message, Modal } from 'ant-design-vue'
import { onMounted, reactive, ref } from 'vue'
import {
  ACCREDITATION_TYPE_LABEL,
  accreditationStandardApi,
  EVALUATION_METHOD_LABEL,
  programEvaluationProfileApi,
} from '@/apis/quality'
import { majorCatalogApi } from '@/apis/quality/user-catalog'

const list = ref<ProgramEvaluationProfileVO[]>([])
const total = ref(0)
const loading = ref(false)
const standards = ref<AccreditationStandardVO[]>([])
const programs = ref<MajorVO[]>([])

const query = reactive<ProgramEvaluationProfileQueryPayload>({
  pageNum: 1,
  pageSize: 10,
  accreditationType: undefined,
  enabled: undefined,
  keyword: '',
})

const accreditationOptions = Object.entries(ACCREDITATION_TYPE_LABEL).map(([value, label]) => ({
  value,
  label,
}))
const evaluationMethodOptions = Object.entries(EVALUATION_METHOD_LABEL).map(([value, label]) => ({
  value,
  label,
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

async function loadDicts() {
  const [std, majors] = await Promise.all([
    accreditationStandardApi.page({ pageNum: 1, pageSize: 500, enabled: true }),
    majorCatalogApi.listAll(),
  ])
  standards.value = std.list || []
  programs.value = majors || []
}

function handlePageChange(p: number, ps: number) {
  query.pageNum = p
  query.pageSize = ps
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
  if (major) editor.programName = major.majorName
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
  Modal.confirm({
    title: `删除专业 ${record.programName} 的评价口径？`,
    okType: 'danger',
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
  <div class="page">
    <a-card title="专业评价口径" :bordered="false">
      <template #extra>
        <a-space wrap>
          <a-select
            v-model:value="query.accreditationType"
            placeholder="认证类型"
            allow-clear
            style="width: 200px"
            :options="accreditationOptions"
          />
          <a-input
            v-model:value="query.keyword"
            placeholder="专业名称"
            style="width: 200px"
            @press-enter="loadList"
          />
          <a-button type="primary" @click="loadList">查询</a-button>
          <a-button @click="resetQuery">重置</a-button>
          <a-button type="primary" @click="openCreate">新建评价口径</a-button>
        </a-space>
      </template>

      <a-table
        :data-source="list"
        :loading="loading"
        row-key="id"
        size="middle"
        :pagination="{
          current: query.pageNum,
          pageSize: query.pageSize,
          total,
          showSizeChanger: true,
          showTotal: (n: number) => `共 ${n} 条`,
          onChange: handlePageChange,
        }"
      >
        <a-table-column title="专业" data-index="programName" />
        <a-table-column title="认证类型" data-index="accreditationType" width="180">
          <template #default="{ text }">
            {{ ACCREDITATION_TYPE_LABEL[text as keyof typeof ACCREDITATION_TYPE_LABEL] || text }}
          </template>
        </a-table-column>
        <a-table-column title="级别" data-index="accreditationLevel" width="100" />
        <a-table-column title="评价方法" data-index="evaluationMethod" width="160">
          <template #default="{ text }">
            {{ EVALUATION_METHOD_LABEL[text as EvaluationMethod] || text }}
          </template>
        </a-table-column>
        <a-table-column title="评价周期" data-index="evaluationCycle" width="120">
          <template #default="{ text }">
            {{ evaluationCycleOptions.find((o) => o.value === text)?.label || text }}
          </template>
        </a-table-column>
        <a-table-column title="启用" data-index="enabled" width="80">
          <template #default="{ text }">
            <a-tag :color="text ? 'green' : 'default'">
              {{ text ? '启用' : '停用' }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column title="操作" width="160" fixed="right">
          <template #default="{ record }">
            <a-space>
              <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
              <a-button type="link" size="small" danger @click="handleDelete(record)">删除</a-button>
            </a-space>
          </template>
        </a-table-column>
      </a-table>
    </a-card>

    <a-modal
      v-model:open="editorVisible"
      :title="editorMode === 'create' ? '新建专业评价口径' : '编辑专业评价口径'"
      :confirm-loading="submitting"
      width="820px"
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
                  :label="p.majorName"
                >
                  {{ p.majorName }}
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
        <a-checkbox v-model:checked="editor.enabled">启用</a-checkbox>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
.page {
  padding: 16px;
}
</style>

<script setup lang="ts">
/**
 * 督导复查 / 现场检查记录
 *
 * 后端：/api/quality/audit-evaluation/supervisions
 * 类型：日常督导 / 专项检查 / 认证预审 / 现场检查
 */
import type {
  AuditSupervisionQueryPayload,
  AuditSupervisionSavePayload,
  AuditSupervisionType,
  AuditSupervisionVO,
} from '@/apis/quality'
import { message, Modal } from 'ant-design-vue'
import { onMounted, reactive, ref } from 'vue'
import {
  AUDIT_SUPERVISION_TYPE_LABEL,
  auditSupervisionApi,
} from '@/apis/quality'
import TeacherSelector from '@/components/quality/selectors/TeacherSelector.vue'

const list = ref<AuditSupervisionVO[]>([])
const total = ref(0)
const loading = ref(false)

const supervisionTypeOptions = Object.entries(AUDIT_SUPERVISION_TYPE_LABEL).map(([value, label]) => ({ value, label }))
const scopeOptions = [
  { value: 'COURSE', label: '课程' },
  { value: 'PROGRAM', label: '专业' },
  { value: 'TRAINING_PLAN', label: '培养方案' },
  { value: 'COMPREHENSIVE', label: '综合' },
]
const conclusionOptions = [
  { value: 'PASS', label: '通过', color: 'green' },
  { value: 'NEEDS_IMPROVEMENT', label: '需改进', color: 'orange' },
  { value: 'FAIL', label: '不通过', color: 'red' },
]

const query = reactive<AuditSupervisionQueryPayload>({
  pageNum: 1,
  pageSize: 10,
  programId: undefined,
  supervisionType: undefined,
  conclusion: undefined,
  keyword: '',
})

const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editor = reactive<AuditSupervisionSavePayload>({
  auditIssueId: '',
  rectificationId: '',
  programId: '',
  trainingPlanId: '',
  qualityCourseId: '',
  supervisionCode: '',
  supervisionTitle: '',
  supervisionType: 'DAILY',
  supervisionScope: 'COURSE',
  supervisorUserId: '',
  supervisedAt: '',
  summary: '',
  findings: '',
  conclusion: '',
  archiveId: '',
  evidenceAnchors: '',
})
const submitting = ref(false)

async function loadList() {
  loading.value = true
  try {
    const page = await auditSupervisionApi.page({
      ...query,
      keyword: query.keyword?.trim() || undefined,
    })
    list.value = page.list || []
    total.value = page.total
  } finally {
    loading.value = false
  }
}

function handlePageChange(p: number, ps: number) {
  query.pageNum = p
  query.pageSize = ps
  loadList()
}

function resetQuery() {
  query.pageNum = 1
  query.programId = undefined
  query.supervisionType = undefined
  query.conclusion = undefined
  query.keyword = ''
  loadList()
}

function openCreate() {
  editorMode.value = 'create'
  Object.assign(editor, {
    id: undefined,
    auditIssueId: '',
    rectificationId: '',
    programId: '',
    trainingPlanId: '',
    qualityCourseId: '',
    supervisionCode: '',
    supervisionTitle: '',
    supervisionType: 'DAILY',
    supervisionScope: 'COURSE',
    supervisorUserId: '',
    supervisedAt: '',
    summary: '',
    findings: '',
    conclusion: '',
    archiveId: '',
    evidenceAnchors: '',
  })
  editorVisible.value = true
}

function openEdit(record: AuditSupervisionVO) {
  editorMode.value = 'edit'
  Object.assign(editor, record)
  editorVisible.value = true
}

async function submitEditor() {
  if (!editor.supervisionCode.trim() || !editor.supervisionTitle.trim() || !editor.supervisionType) {
    message.error('请填写编码、标题、类型')
    return
  }
  submitting.value = true
  try {
    if (editorMode.value === 'create') await auditSupervisionApi.create(editor)
    else await auditSupervisionApi.update(editor)
    message.success('已保存')
    editorVisible.value = false
    await loadList()
  } finally {
    submitting.value = false
  }
}

async function handleDelete(record: AuditSupervisionVO) {
  Modal.confirm({
    title: `删除督导记录 ${record.supervisionCode}？`,
    okType: 'danger',
    onOk: async () => {
      await auditSupervisionApi.delete(record.id)
      message.success('已删除')
      await loadList()
    },
  })
}

onMounted(() => loadList())
</script>

<template>
  <div class="page">
    <a-card title="督导复查 / 现场检查" :bordered="false">
      <template #extra>
        <a-space wrap>
          <a-select v-model:value="query.supervisionType" placeholder="类型" allow-clear style="width: 140px" :options="supervisionTypeOptions" />
          <a-select v-model:value="query.conclusion" placeholder="结论" allow-clear style="width: 140px">
            <a-select-option v-for="c in conclusionOptions" :key="c.value" :value="c.value">
              {{ c.label }}
            </a-select-option>
          </a-select>
          <a-input v-model:value="query.keyword" placeholder="编码/标题" style="width: 200px" @press-enter="loadList" />
          <a-button type="primary" @click="loadList">查询</a-button>
          <a-button @click="resetQuery">重置</a-button>
          <a-button type="primary" @click="openCreate">新建督导记录</a-button>
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
        <a-table-column title="编码" data-index="supervisionCode" width="140" />
        <a-table-column title="标题">
          <template #default="{ record }">
            <div>{{ record.supervisionTitle }}</div>
            <div v-if="record.summary" class="text-xs text-gray-500" style="margin-top: 4px">
              {{ record.summary.substring(0, 80) }}{{ record.summary.length > 80 ? '…' : '' }}
            </div>
          </template>
        </a-table-column>
        <a-table-column title="类型" data-index="supervisionType" width="120">
          <template #default="{ text }">
            <a-tag>{{ AUDIT_SUPERVISION_TYPE_LABEL[text as AuditSupervisionType] || text }}</a-tag>
          </template>
        </a-table-column>
        <a-table-column title="范围" data-index="supervisionScope" width="100">
          <template #default="{ text }">
            {{ scopeOptions.find(o => o.value === text)?.label || text || '-' }}
          </template>
        </a-table-column>
        <a-table-column title="督导时间" data-index="supervisedAt" width="160" />
        <a-table-column title="结论" data-index="conclusion" width="120">
          <template #default="{ text }">
            <a-tag v-if="text" :color="conclusionOptions.find(o => o.value === text)?.color || 'default'">
              {{ conclusionOptions.find(o => o.value === text)?.label || text }}
            </a-tag>
            <span v-else class="text-gray-400">-</span>
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
      :title="editorMode === 'create' ? '新建督导记录' : '编辑督导记录'"
      :confirm-loading="submitting"
      width="800px"
      @ok="submitEditor"
    >
      <a-form layout="vertical" :model="editor">
        <a-row :gutter="12">
          <a-col :span="6">
            <a-form-item label="编码" required>
              <a-input v-model:value="editor.supervisionCode" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="督导类型" required>
              <a-select v-model:value="editor.supervisionType" :options="supervisionTypeOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="范围">
              <a-select v-model:value="editor.supervisionScope" :options="scopeOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="督导时间">
              <a-input v-model:value="editor.supervisedAt" placeholder="yyyy-MM-dd HH:mm:ss" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="标题" required>
          <a-input v-model:value="editor.supervisionTitle" />
        </a-form-item>
        <a-form-item label="督导人">
          <TeacherSelector v-model:value="editor.supervisorUserId" width="100%" />
        </a-form-item>
        <a-form-item label="督导摘要">
          <a-textarea v-model:value="editor.summary" :rows="3" />
        </a-form-item>
        <a-form-item label="发现的问题">
          <a-textarea v-model:value="editor.findings" :rows="4" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="结论">
              <a-select v-model:value="editor.conclusion" allow-clear>
                <a-select-option v-for="c in conclusionOptions" :key="c.value" :value="c.value">
                  {{ c.label }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="归档 ID">
              <a-input v-model:value="editor.archiveId" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-divider orientation="left">关联业务对象（可选）</a-divider>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="问题 ID">
              <a-input v-model:value="editor.auditIssueId" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="整改任务 ID">
              <a-input v-model:value="editor.rectificationId" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="专业 ID">
              <a-input v-model:value="editor.programId" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="培养方案 ID">
              <a-input v-model:value="editor.trainingPlanId" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="质量评价课程 ID">
              <a-input v-model:value="editor.qualityCourseId" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="证据锚点">
          <a-textarea
            v-model:value="editor.evidenceAnchors"
            :rows="3"
            placeholder="JSON 数组，引用证据文件 / 业务对象等"
            :style="{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
.page { padding: 16px; }
.text-xs { font-size: 12px; }
.text-gray-500 { color: rgba(0, 0, 0, 0.45); }
.text-gray-400 { color: rgba(0, 0, 0, 0.35); }
</style>

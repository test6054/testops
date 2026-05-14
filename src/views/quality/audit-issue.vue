<script setup lang="ts">
/**
 * 审核评估问题清单
 *
 * 后端：/api/quality/audit-evaluation/issues
 * 问题来源：SELF_AUDIT / EXPERT_AUDIT / ACCREDITATION_AUDIT / EXTERNAL_INSPECTION
 * 状态流转：OPEN → IN_RECTIFICATION → RECTIFIED → VERIFIED → CLOSED
 */
import type {
  AuditIssueQueryPayload,
  AuditIssueSavePayload,
  AuditIssueStatus,
  AuditIssueVO,
} from '@/apis/quality'
import { message, Modal } from 'ant-design-vue'
import { onMounted, reactive, ref } from 'vue'
import {
  AUDIT_ISSUE_STATUS_COLOR,
  AUDIT_ISSUE_STATUS_LABEL,
  auditIssueApi,
} from '@/apis/quality'

const list = ref<AuditIssueVO[]>([])
const total = ref(0)
const loading = ref(false)
const query = reactive<AuditIssueQueryPayload>({
  pageNum: 1,
  pageSize: 10,
  programId: undefined,
  issueSource: undefined,
  severity: undefined,
  status: undefined,
  auditYear: undefined,
  keyword: '',
})

const issueSourceOptions = [
  { value: 'SELF_AUDIT', label: '自评自查' },
  { value: 'EXPERT_AUDIT', label: '专家审核' },
  { value: 'ACCREDITATION_AUDIT', label: '认证审核' },
  { value: 'EXTERNAL_INSPECTION', label: '外部检查' },
]
const severityOptions = [
  { value: 'MINOR', label: '轻微' },
  { value: 'MAJOR', label: '严重' },
  { value: 'CRITICAL', label: '重大' },
]
const statusOptions: AuditIssueStatus[] = ['OPEN', 'IN_RECTIFICATION', 'RECTIFIED', 'VERIFIED', 'CLOSED']

const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editor = reactive<AuditIssueSavePayload>({
  programId: '',
  trainingPlanId: '',
  qualityCourseId: '',
  requirementIndicatorId: '',
  courseGoalId: '',
  achievementResultId: '',
  issueCode: '',
  issueTitle: '',
  issueDescription: '',
  issueSource: 'SELF_AUDIT',
  severity: 'MINOR',
  auditRound: '',
  auditYear: '',
  raisedBy: '',
  raisedAt: '',
})
const submitting = ref(false)

async function loadList() {
  loading.value = true
  try {
    const page = await auditIssueApi.page({
      ...query,
      keyword: query.keyword?.trim() || undefined,
    })
    list.value = page.list
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
  query.issueSource = undefined
  query.severity = undefined
  query.status = undefined
  query.auditYear = undefined
  query.keyword = ''
  loadList()
}

function openCreate() {
  editorMode.value = 'create'
  Object.assign(editor, {
    id: undefined,
    programId: '',
    trainingPlanId: '',
    qualityCourseId: '',
    requirementIndicatorId: '',
    courseGoalId: '',
    achievementResultId: '',
    issueCode: '',
    issueTitle: '',
    issueDescription: '',
    issueSource: 'SELF_AUDIT',
    severity: 'MINOR',
    auditRound: '',
    auditYear: new Date().getFullYear().toString(),
    raisedBy: '',
    raisedAt: '',
  })
  editorVisible.value = true
}

function openEdit(record: AuditIssueVO) {
  editorMode.value = 'edit'
  Object.assign(editor, record)
  editorVisible.value = true
}

async function submitEditor() {
  if (!editor.issueCode.trim() || !editor.issueTitle.trim() || !editor.issueSource || !editor.severity) {
    message.error('请填写编码、标题、来源、严重程度')
    return
  }
  submitting.value = true
  try {
    if (editorMode.value === 'create') await auditIssueApi.create(editor)
    else await auditIssueApi.update(editor)
    message.success('已保存')
    editorVisible.value = false
    await loadList()
  } finally {
    submitting.value = false
  }
}

async function handleDelete(record: AuditIssueVO) {
  Modal.confirm({
    title: `删除问题 ${record.issueCode}？`,
    okType: 'danger',
    onOk: async () => {
      await auditIssueApi.delete(record.id)
      message.success('已删除')
      await loadList()
    },
  })
}

async function changeStatus(record: AuditIssueVO, target: AuditIssueStatus) {
  await auditIssueApi.transitStatus(record.id, target)
  message.success(`已切换到「${AUDIT_ISSUE_STATUS_LABEL[target]}」`)
  await loadList()
}

onMounted(() => loadList())
</script>

<template>
  <div class="page">
    <a-card title="审核评估问题清单" :bordered="false">
      <template #extra>
        <a-space wrap>
          <a-select v-model:value="query.issueSource" placeholder="问题来源" allow-clear style="width: 160px" :options="issueSourceOptions" />
          <a-select v-model:value="query.severity" placeholder="严重程度" allow-clear style="width: 120px" :options="severityOptions" />
          <a-select v-model:value="query.status" placeholder="状态" allow-clear style="width: 120px">
            <a-select-option v-for="s in statusOptions" :key="s" :value="s">
              {{ AUDIT_ISSUE_STATUS_LABEL[s] }}
            </a-select-option>
          </a-select>
          <a-input v-model:value="query.auditYear" placeholder="审核年度" style="width: 120px" />
          <a-input v-model:value="query.keyword" placeholder="编码/标题" style="width: 180px" @press-enter="loadList" />
          <a-button type="primary" @click="loadList">查询</a-button>
          <a-button @click="resetQuery">重置</a-button>
          <a-button type="primary" @click="openCreate">登记问题</a-button>
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
        <a-table-column title="编码" data-index="issueCode" width="140" />
        <a-table-column title="标题">
          <template #default="{ record }">
            <div>{{ record.issueTitle }}</div>
            <div v-if="record.issueDescription" class="text-xs text-gray-500" style="margin-top: 4px">
              {{ record.issueDescription.substring(0, 80) }}{{ record.issueDescription.length > 80 ? '…' : '' }}
            </div>
          </template>
        </a-table-column>
        <a-table-column title="来源" data-index="issueSource" width="120">
          <template #default="{ text }">
            {{ issueSourceOptions.find(o => o.value === text)?.label || text }}
          </template>
        </a-table-column>
        <a-table-column title="严重" data-index="severity" width="80">
          <template #default="{ text }">
            <a-tag :color="text === 'CRITICAL' ? 'red' : text === 'MAJOR' ? 'orange' : 'default'">
              {{ severityOptions.find(o => o.value === text)?.label || text }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column title="状态" data-index="status" width="100">
          <template #default="{ text }">
            <a-tag :color="AUDIT_ISSUE_STATUS_COLOR[text as AuditIssueStatus]">
              {{ AUDIT_ISSUE_STATUS_LABEL[text as AuditIssueStatus] || text }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column title="年度" data-index="auditYear" width="80" />
        <a-table-column title="操作" width="240" fixed="right">
          <template #default="{ record }">
            <a-space wrap>
              <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
              <a-dropdown>
                <a-button type="link" size="small">状态</a-button>
                <template #overlay>
                  <a-menu @click="(e: any) => changeStatus(record, e.key as AuditIssueStatus)">
                    <a-menu-item v-for="s in statusOptions" :key="s">
                      {{ AUDIT_ISSUE_STATUS_LABEL[s] }}
                    </a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
              <a-button type="link" size="small" danger @click="handleDelete(record)">删除</a-button>
            </a-space>
          </template>
        </a-table-column>
      </a-table>
    </a-card>

    <a-modal
      v-model:open="editorVisible"
      :title="editorMode === 'create' ? '登记审核评估问题' : '编辑审核评估问题'"
      :confirm-loading="submitting"
      width="780px"
      @ok="submitEditor"
    >
      <a-form layout="vertical" :model="editor">
        <a-row :gutter="12">
          <a-col :span="6">
            <a-form-item label="编码" required>
              <a-input v-model:value="editor.issueCode" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="问题来源" required>
              <a-select v-model:value="editor.issueSource" :options="issueSourceOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="严重程度" required>
              <a-select v-model:value="editor.severity" :options="severityOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="审核年度">
              <a-input v-model:value="editor.auditYear" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="标题" required>
          <a-input v-model:value="editor.issueTitle" />
        </a-form-item>
        <a-form-item label="详细描述">
          <a-textarea v-model:value="editor.issueDescription" :rows="5" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="6">
            <a-form-item label="审核轮次">
              <a-input v-model:value="editor.auditRound" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="提出人">
              <a-input v-model:value="editor.raisedBy" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="提出时间">
              <a-input v-model:value="editor.raisedAt" placeholder="yyyy-MM-dd HH:mm:ss" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-divider orientation="left">关联业务对象（可选）</a-divider>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="专业 ID">
              <a-input v-model:value="editor.programId" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="培养方案 ID">
              <a-input v-model:value="editor.trainingPlanId" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="质量评价课程 ID">
              <a-input v-model:value="editor.qualityCourseId" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="观测点 ID">
              <a-input v-model:value="editor.requirementIndicatorId" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="课程目标 ID">
              <a-input v-model:value="editor.courseGoalId" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="达成度结果 ID">
              <a-input v-model:value="editor.achievementResultId" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
.page { padding: 16px; }
.text-xs { font-size: 12px; }
.text-gray-500 { color: rgba(0, 0, 0, 0.45); }
</style>

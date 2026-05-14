<script setup lang="ts">
/**
 * 审核评估整改任务台账
 *
 * 后端：/api/quality/audit-evaluation/rectifications
 * 状态流转：PLANNED → IN_PROGRESS → SUBMITTED → VERIFIED → CLOSED；
 *           复核 REJECTED 时退回 RETURNED → IN_PROGRESS。
 *
 * 操作：
 * - update-progress: PLANNED → IN_PROGRESS 或 IN_PROGRESS → SUBMITTED
 * - verify: APPROVED → VERIFIED / REJECTED → RETURNED
 * - close: VERIFIED → CLOSED
 */
import type {
  AuditIssueVO,
  AuditRectificationQueryPayload,
  AuditRectificationSavePayload,
  AuditRectificationStatus,
  AuditRectificationVO,
} from '@/apis/quality'
import { message, Modal } from 'ant-design-vue'
import { onMounted, reactive, ref } from 'vue'
import {
  AUDIT_RECTIFICATION_STATUS_COLOR,
  AUDIT_RECTIFICATION_STATUS_LABEL,
  auditIssueApi,
  auditRectificationApi,
} from '@/apis/quality'
import TeacherSelector from '@/components/quality/selectors/TeacherSelector.vue'
import { promptModal } from './_helpers'

const list = ref<AuditRectificationVO[]>([])
const total = ref(0)
const loading = ref(false)
const issuesCache = ref<Map<string, AuditIssueVO>>(new Map())
const query = reactive<AuditRectificationQueryPayload>({
  pageNum: 1,
  pageSize: 10,
  auditIssueId: undefined,
  ownerUserId: undefined,
  status: undefined,
  keyword: '',
})

const statusOptions: AuditRectificationStatus[] = ['PLANNED', 'IN_PROGRESS', 'SUBMITTED', 'VERIFIED', 'RETURNED', 'CLOSED']

const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editor = reactive<AuditRectificationSavePayload>({
  auditIssueId: '',
  rectificationCode: '',
  rectificationTitle: '',
  rectificationAction: '',
  ownerUserId: '',
  ownerRole: '',
  dueDate: '',
})
const submitting = ref(false)

async function loadList() {
  loading.value = true
  try {
    const page = await auditRectificationApi.page({
      ...query,
      keyword: query.keyword?.trim() || undefined,
    })
    list.value = page.list || []
    total.value = page.total
    // 预热问题信息（精简：每条记录单独查询；可优化为批量）
    const issueIds = Array.from(new Set(list.value.map(r => r.auditIssueId).filter(Boolean)))
    for (const id of issueIds) {
      if (issuesCache.value.has(id)) continue
      try {
        const issue = await auditIssueApi.detail(id)
        issuesCache.value.set(id, issue)
      } catch { /* ignore */ }
    }
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
  query.auditIssueId = undefined
  query.ownerUserId = undefined
  query.status = undefined
  query.keyword = ''
  loadList()
}

function openCreate() {
  editorMode.value = 'create'
  Object.assign(editor, {
    id: undefined,
    auditIssueId: '',
    rectificationCode: '',
    rectificationTitle: '',
    rectificationAction: '',
    ownerUserId: '',
    ownerRole: '',
    dueDate: '',
  })
  editorVisible.value = true
}

function openEdit(record: AuditRectificationVO) {
  editorMode.value = 'edit'
  Object.assign(editor, record)
  editorVisible.value = true
}

async function submitEditor() {
  if (!editor.auditIssueId || !editor.rectificationCode.trim() || !editor.rectificationTitle.trim() || !editor.ownerUserId || !editor.dueDate) {
    message.error('请填写关联问题、编码、标题、责任人、截止日期')
    return
  }
  submitting.value = true
  try {
    if (editorMode.value === 'create') await auditRectificationApi.create(editor)
    else await auditRectificationApi.update(editor)
    message.success('已保存')
    editorVisible.value = false
    await loadList()
  } finally {
    submitting.value = false
  }
}

async function handleDelete(record: AuditRectificationVO) {
  Modal.confirm({
    title: `删除整改任务 ${record.rectificationCode}？`,
    okType: 'danger',
    onOk: async () => {
      await auditRectificationApi.delete(record.id)
      message.success('已删除')
      await loadList()
    },
  })
}

async function advanceProgress(record: AuditRectificationVO, target: 'IN_PROGRESS' | 'SUBMITTED') {
  const remark = await promptModal({
    title: target === 'IN_PROGRESS' ? '开始实施' : '提交复核',
    placeholder: '请填写进展说明',
    required: target === 'SUBMITTED',
    emptyErrorMessage: '请填写提交说明',
  })
  if (target === 'SUBMITTED' && !remark) return
  await auditRectificationApi.updateProgress(record.id, target, remark ?? undefined)
  message.success('已更新')
  await loadList()
}

async function verifyRectification(record: AuditRectificationVO, decision: 'APPROVED' | 'REJECTED') {
  const remark = await promptModal({
    title: decision === 'APPROVED' ? '复核通过' : '复核退回',
    placeholder: '请填写复核说明',
    required: decision === 'REJECTED',
    emptyErrorMessage: '退回必须填写原因',
    okType: decision === 'REJECTED' ? 'danger' : 'primary',
  })
  if (decision === 'REJECTED' && !remark) return
  await auditRectificationApi.verify(record.id, decision, remark ?? undefined)
  message.success('已复核')
  await loadList()
}

async function closeRectification(record: AuditRectificationVO) {
  Modal.confirm({
    title: `闭环整改任务 ${record.rectificationCode}？`,
    content: '闭环后该任务不可再修改。',
    onOk: async () => {
      await auditRectificationApi.close(record.id)
      message.success('已闭环')
      await loadList()
    },
  })
}

onMounted(() => loadList())
</script>

<template>
  <div class="page">
    <a-card title="审核评估整改台账" :bordered="false">
      <template #extra>
        <a-space wrap>
          <a-select v-model:value="query.status" placeholder="状态" allow-clear style="width: 140px">
            <a-select-option v-for="s in statusOptions" :key="s" :value="s">
              {{ AUDIT_RECTIFICATION_STATUS_LABEL[s] }}
            </a-select-option>
          </a-select>
          <a-input v-model:value="query.auditIssueId" placeholder="问题 ID" style="width: 160px" />
          <a-input v-model:value="query.keyword" placeholder="编码/标题" style="width: 200px" @press-enter="loadList" />
          <a-button type="primary" @click="loadList">查询</a-button>
          <a-button @click="resetQuery">重置</a-button>
          <a-button type="primary" @click="openCreate">新建整改任务</a-button>
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
        <a-table-column title="编码" data-index="rectificationCode" width="140" />
        <a-table-column title="标题">
          <template #default="{ record }">
            <div>{{ record.rectificationTitle }}</div>
            <div v-if="record.auditIssueId" class="text-xs text-gray-500">
              关联问题：{{ issuesCache.get(record.auditIssueId)?.issueCode || record.auditIssueId }}
            </div>
          </template>
        </a-table-column>
        <a-table-column title="责任人" data-index="ownerUserId" width="140" />
        <a-table-column title="截止日期" data-index="dueDate" width="120" />
        <a-table-column title="状态" data-index="status" width="120">
          <template #default="{ text }">
            <a-tag :color="AUDIT_RECTIFICATION_STATUS_COLOR[text as AuditRectificationStatus]">
              {{ AUDIT_RECTIFICATION_STATUS_LABEL[text as AuditRectificationStatus] || text }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column title="操作" width="320" fixed="right">
          <template #default="{ record }">
            <a-space wrap>
              <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
              <a-button
                v-if="record.status === 'PLANNED'"
                type="link"
                size="small"
                @click="advanceProgress(record, 'IN_PROGRESS')"
              >
                开始
              </a-button>
              <a-button
                v-if="record.status === 'IN_PROGRESS'"
                type="link"
                size="small"
                @click="advanceProgress(record, 'SUBMITTED')"
              >
                提交复核
              </a-button>
              <a-button
                v-if="record.status === 'RETURNED'"
                type="link"
                size="small"
                @click="advanceProgress(record, 'IN_PROGRESS')"
              >
                重新整改
              </a-button>
              <a-button
                v-if="record.status === 'SUBMITTED'"
                type="link"
                size="small"
                @click="verifyRectification(record, 'APPROVED')"
              >
                通过
              </a-button>
              <a-button
                v-if="record.status === 'SUBMITTED'"
                type="link"
                size="small"
                danger
                @click="verifyRectification(record, 'REJECTED')"
              >
                退回
              </a-button>
              <a-button
                v-if="record.status === 'VERIFIED'"
                type="link"
                size="small"
                @click="closeRectification(record)"
              >
                闭环
              </a-button>
              <a-button type="link" size="small" danger @click="handleDelete(record)">删除</a-button>
            </a-space>
          </template>
        </a-table-column>
      </a-table>
    </a-card>

    <a-modal
      v-model:open="editorVisible"
      :title="editorMode === 'create' ? '新建整改任务' : '编辑整改任务'"
      :confirm-loading="submitting"
      width="720px"
      @ok="submitEditor"
    >
      <a-form layout="vertical" :model="editor">
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="编码" required>
              <a-input v-model:value="editor.rectificationCode" />
            </a-form-item>
          </a-col>
          <a-col :span="16">
            <a-form-item label="关联问题 ID" required>
              <a-input v-model:value="editor.auditIssueId" placeholder="对应审核评估问题清单中的问题 ID" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="标题" required>
          <a-input v-model:value="editor.rectificationTitle" />
        </a-form-item>
        <a-form-item label="整改措施" required>
          <a-textarea v-model:value="editor.rectificationAction" :rows="4" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="责任人" required>
              <TeacherSelector v-model:value="editor.ownerUserId" width="100%" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="角色">
              <a-input v-model:value="editor.ownerRole" placeholder="如 专业负责人" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="截止日期" required>
              <a-input v-model:value="editor.dueDate" placeholder="yyyy-MM-dd" />
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

<script setup lang="ts">
/**
 * 认证标准配置
 *
 * 后端：/api/quality/accreditation-standards
 * 权限：通常由系统管理员或平台运维维护；该页面只做 CRUD。
 */
import type {
  AccreditationStandardQueryPayload,
  AccreditationStandardSavePayload,
  AccreditationStandardVO,
} from '@/apis/quality'
import { message, Modal } from 'ant-design-vue'
import { onMounted, reactive, ref } from 'vue'
import {
  ACCREDITATION_TYPE_LABEL,
  accreditationStandardApi,
} from '@/apis/quality'

const list = ref<AccreditationStandardVO[]>([])
const total = ref(0)
const loading = ref(false)
const query = reactive<AccreditationStandardQueryPayload>({
  pageNum: 1,
  pageSize: 10,
  accreditationType: undefined,
  enabled: undefined,
  keyword: '',
})

const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editor = reactive<AccreditationStandardSavePayload>({
  standardCode: '',
  standardName: '',
  accreditationType: 'ENGINEERING_ACCREDITATION',
  standardYear: '',
  issuingAuthority: '',
  documentNumber: '',
  sourceUrl: '',
  summary: '',
  enabled: true,
  isPilotOnly: false,
})
const submitting = ref(false)

const accreditationOptions = Object.entries(ACCREDITATION_TYPE_LABEL).map(([value, label]) => ({
  value,
  label,
}))

/**
 * 启用状态筛选本地中间值：ant-design-vue 的 SelectValue 不接受 boolean，
 * 这里用字符串枚举选项，通过 syncEnabledFilter 写回真实 DTO query.enabled（boolean | undefined）。
 */
type EnabledFilterChoice = 'enabled' | 'disabled' | undefined
const enabledFilter = ref<EnabledFilterChoice>(undefined)
const enabledFilterOptions = [
  { value: 'enabled', label: '启用' },
  { value: 'disabled', label: '停用' },
]
function syncEnabledFilter() {
  query.enabled
    = enabledFilter.value === 'enabled'
      ? true
      : enabledFilter.value === 'disabled'
        ? false
        : undefined
}

/**
 * 表格认证类型列的标签渲染。
 * 真实 VO.accreditationType 是 string，ACCREDITATION_TYPE_LABEL 是 Record<AccreditationType, string>。
 * 通过类型注解将字典宽化为 Record<string, string> 安全读取，未匹配返回原值，
 * 不使用 as / 反射 / 泛型推断。
 */
function accreditationTypeLabel(value: string): string {
  const dict: Record<string, string> = ACCREDITATION_TYPE_LABEL
  return dict[value] || value
}

async function loadList() {
  loading.value = true
  try {
    const page = await accreditationStandardApi.page({
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
  query.accreditationType = undefined
  query.enabled = undefined
  enabledFilter.value = undefined
  query.keyword = ''
  loadList()
}

function openCreate() {
  editorMode.value = 'create'
  Object.assign(editor, {
    id: undefined,
    standardCode: '',
    standardName: '',
    accreditationType: 'ENGINEERING_ACCREDITATION',
    standardYear: '',
    issuingAuthority: '',
    documentNumber: '',
    sourceUrl: '',
    summary: '',
    enabled: true,
    isPilotOnly: false,
  })
  editorVisible.value = true
}

function openEdit(record: AccreditationStandardVO) {
  editorMode.value = 'edit'
  Object.assign(editor, record)
  editorVisible.value = true
}

async function submitEditor() {
  if (!editor.standardCode.trim() || !editor.standardName.trim() || !editor.accreditationType) {
    message.error('请填写编码、名称、认证类型')
    return
  }
  submitting.value = true
  try {
    if (editorMode.value === 'create') await accreditationStandardApi.create(editor)
    else await accreditationStandardApi.update(editor)
    message.success('已保存')
    editorVisible.value = false
    await loadList()
  } finally {
    submitting.value = false
  }
}

async function handleDelete(record: AccreditationStandardVO) {
  Modal.confirm({
    title: `删除认证标准 ${record.standardCode}？`,
    content: '若已被任一专业实例或观测点引用，删除会失败。',
    okType: 'danger',
    onOk: async () => {
      await accreditationStandardApi.delete(record.id)
      message.success('已删除')
      await loadList()
    },
  })
}

onMounted(() => loadList())
</script>

<template>
  <div class="page">
    <a-card title="认证标准配置" :bordered="false">
      <template #extra>
        <a-space wrap>
          <a-select
            v-model:value="query.accreditationType"
            placeholder="认证类型"
            allow-clear
            style="width: 200px"
            :options="accreditationOptions"
          />
          <a-select
            v-model:value="enabledFilter"
            placeholder="状态"
            allow-clear
            style="width: 120px"
            :options="enabledFilterOptions"
            @change="syncEnabledFilter"
          />
          <a-input v-model:value="query.keyword" placeholder="编码/名称" style="width: 200px" @press-enter="loadList" />
          <a-button type="primary" @click="loadList">查询</a-button>
          <a-button @click="resetQuery">重置</a-button>
          <a-button type="primary" @click="openCreate">新建认证标准</a-button>
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
        <a-table-column title="编码" data-index="standardCode" width="140" />
        <a-table-column title="名称" data-index="standardName" />
        <a-table-column title="认证类型" data-index="accreditationType" width="180">
          <template #default="{ text }">
            {{ accreditationTypeLabel(text) }}
          </template>
        </a-table-column>
        <a-table-column title="标准年份" data-index="standardYear" width="100" />
        <a-table-column title="文号" data-index="documentNumber" width="160" />
        <a-table-column title="状态" data-index="enabled" width="100">
          <template #default="{ record }">
            <a-tag :color="record.enabled ? 'green' : 'default'">
              {{ record.enabled ? '启用' : '停用' }}
            </a-tag>
            <a-tag v-if="record.isPilotOnly" color="orange">试点</a-tag>
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
      :title="editorMode === 'create' ? '新建认证标准' : '编辑认证标准'"
      :confirm-loading="submitting"
      width="720px"
      @ok="submitEditor"
    >
      <a-form layout="vertical" :model="editor">
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="编码" required>
              <a-input v-model:value="editor.standardCode" />
            </a-form-item>
          </a-col>
          <a-col :span="16">
            <a-form-item label="名称" required>
              <a-input v-model:value="editor.standardName" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="认证类型" required>
              <a-select v-model:value="editor.accreditationType" :options="accreditationOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="标准年份">
              <a-input v-model:value="editor.standardYear" placeholder="如 2024" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="级别 / 文号">
              <a-input v-model:value="editor.documentNumber" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="颁发机构">
          <a-input v-model:value="editor.issuingAuthority" />
        </a-form-item>
        <a-form-item label="来源链接">
          <a-input v-model:value="editor.sourceUrl" />
        </a-form-item>
        <a-form-item label="摘要">
          <a-textarea v-model:value="editor.summary" :rows="4" />
        </a-form-item>
        <a-space>
          <a-checkbox v-model:checked="editor.enabled">启用</a-checkbox>
          <a-checkbox v-model:checked="editor.isPilotOnly">仅试点适用</a-checkbox>
        </a-space>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
.page { padding: 16px; }
</style>

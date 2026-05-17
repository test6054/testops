<script setup lang="ts">
/**
 * 校院两级评价工作组管理
 *
 * 后端：/api/quality/evaluation-workgroups
 * 工作组层级（对应后端 WorkgroupLevelEnum）：
 *   UNIVERSITY（学校级）/ COLLEGE（学院级）/ PROGRAM（专业级）/ INDUSTRY（行业企业专家组）。
 */
import type {
  EvaluationWorkgroupQueryPayload,
  EvaluationWorkgroupSavePayload,
  EvaluationWorkgroupVO,
} from '@/apis/quality'
import type { MajorCategoryVO, TeacherUserInfoDto } from '@/apis/quality/user-catalog'
import { message, Modal } from 'ant-design-vue'
import { onMounted, reactive, ref } from 'vue'
import { evaluationWorkgroupApi, WORKGROUP_LEVEL_LABEL } from '@/apis/quality'
import { majorCategoryCatalogApi, teacherCatalogApi } from '@/apis/quality/user-catalog'
import TeacherSelector from '@/components/quality/selectors/TeacherSelector.vue'

/**
 * 把后端返回的 levelCode（String）渲染成中文标签。
 * - 严格对齐后端 WorkgroupLevelEnum：UNIVERSITY / COLLEGE / PROGRAM / INDUSTRY
 * - 通过字面值比较让 TS 自动缩窄类型，避免使用 as 断言
 * - 若后端落库了枚举之外的非法值，原样回显
 */
function workgroupLevelLabel(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }
  if (
    value === 'UNIVERSITY'
    || value === 'COLLEGE'
    || value === 'PROGRAM'
    || value === 'INDUSTRY'
  ) {
    return WORKGROUP_LEVEL_LABEL[value]
  }
  return value
}

const list = ref<EvaluationWorkgroupVO[]>([])
const total = ref(0)
const loading = ref(false)
const programs = ref<MajorCategoryVO[]>([])
const teacherCache = ref<Map<string, TeacherUserInfoDto>>(new Map())

const query = reactive<EvaluationWorkgroupQueryPayload>({
  pageNum: 1,
  pageSize: 10,
  programId: undefined,
  levelCode: undefined,
  enabled: undefined,
})

const levelOptions = Object.entries(WORKGROUP_LEVEL_LABEL).map(([value, label]) => ({
  value,
  label,
}))

const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editor = reactive<EvaluationWorkgroupSavePayload>({
  programId: '',
  workgroupCode: '',
  workgroupName: '',
  levelCode: 'PROGRAM',
  convenerUserId: '',
  members: '',
  responsibility: '',
  enabled: true,
})
const submitting = ref(false)

async function loadList() {
  loading.value = true
  try {
    const page = await evaluationWorkgroupApi.page({ ...query })
    list.value = page.list
    total.value = page.total
    // 预热召集人姓名
    const ids = Array.from(new Set(list.value.map((w) => w.convenerUserId).filter(Boolean)))
    for (const uid of ids) {
      if (teacherCache.value.has(uid)) continue
      try {
        const res = await teacherCatalogApi.userList({
          pageNum: 1,
          pageSize: 1,
          searchText: uid,
        })
        const t = res.list?.find((x) => String(x.id) === uid)
        if (t) teacherCache.value.set(uid, t)
      } catch {
        /* ignore */
      }
    }
  } finally {
    loading.value = false
  }
}

async function loadDicts() {
  programs.value = (await majorCategoryCatalogApi.listAll()) || []
}

function handlePageChange(p: number, ps: number) {
  query.pageNum = p
  query.pageSize = ps
  loadList()
}

function resetQuery() {
  query.pageNum = 1
  query.programId = undefined
  query.levelCode = undefined
  query.enabled = undefined
  loadList()
}

function openCreate() {
  editorMode.value = 'create'
  Object.assign(editor, {
    id: undefined,
    programId: '',
    workgroupCode: '',
    workgroupName: '',
    levelCode: 'PROGRAM',
    convenerUserId: '',
    members: '',
    responsibility: '',
    enabled: true,
  })
  editorVisible.value = true
}

function openEdit(record: EvaluationWorkgroupVO) {
  editorMode.value = 'edit'
  Object.assign(editor, record)
  editorVisible.value = true
}

async function submitEditor() {
  if (
    !editor.programId
    || !editor.workgroupCode.trim()
    || !editor.workgroupName.trim()
    || !editor.convenerUserId
  ) {
    message.error('请填写专业、编码、名称、召集人')
    return
  }
  submitting.value = true
  try {
    if (editorMode.value === 'create') await evaluationWorkgroupApi.create(editor)
    else await evaluationWorkgroupApi.update(editor)
    message.success('已保存')
    editorVisible.value = false
    await loadList()
  } finally {
    submitting.value = false
  }
}

async function handleDelete(record: EvaluationWorkgroupVO) {
  Modal.confirm({
    title: `删除工作组 ${record.workgroupCode}？`,
    okType: 'danger',
    onOk: async () => {
      await evaluationWorkgroupApi.delete(record.id)
      message.success('已删除')
      await loadList()
    },
  })
}

function convenerDisplay(uid: string) {
  const t = teacherCache.value.get(uid)
  return t ? t.nickName || t.userName : uid
}

onMounted(async () => {
  await Promise.all([loadList(), loadDicts()])
})
</script>

<template>
  <div class="page">
    <a-card title="校院两级评价工作组" :bordered="false">
      <template #extra>
        <a-space wrap>
          <a-select
            v-model:value="query.programId"
            placeholder="专业"
            allow-clear
            style="width: 200px"
            show-search
            option-filter-prop="label"
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
          <a-select
            v-model:value="query.levelCode"
            placeholder="层级"
            allow-clear
            style="width: 140px"
            :options="levelOptions"
          />
          <a-button type="primary" @click="loadList">查询</a-button>
          <a-button @click="resetQuery">重置</a-button>
          <a-button type="primary" @click="openCreate">新建工作组</a-button>
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
        <a-table-column title="编码" data-index="workgroupCode" width="140" />
        <a-table-column title="名称" data-index="workgroupName" />
        <a-table-column title="专业大类" data-index="programId" width="160">
          <template #default="{ text }">
            {{ programs.find((p) => p.id === text)?.majorCategoryName || text }}
          </template>
        </a-table-column>
        <a-table-column title="层级" data-index="levelCode" width="100">
          <template #default="{ text }">
            <a-tag>{{ workgroupLevelLabel(text) }}</a-tag>
          </template>
        </a-table-column>
        <a-table-column title="召集人" data-index="convenerUserId" width="120">
          <template #default="{ text }">
            {{ convenerDisplay(text) }}
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
              <a-button type="link" size="small" danger @click="handleDelete(record)">
                删除
              </a-button>
            </a-space>
          </template>
        </a-table-column>
      </a-table>
    </a-card>

    <a-modal
      v-model:open="editorVisible"
      :title="editorMode === 'create' ? '新建工作组' : '编辑工作组'"
      :confirm-loading="submitting"
      width="720px"
      @ok="submitEditor"
    >
      <a-form layout="vertical" :model="editor">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="编码" required>
              <a-input v-model:value="editor.workgroupCode" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="层级" required>
              <a-select v-model:value="editor.levelCode" :options="levelOptions" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="名称" required>
          <a-input v-model:value="editor.workgroupName" />
        </a-form-item>
        <a-form-item label="专业大类" required>
          <a-select v-model:value="editor.programId" show-search option-filter-prop="label">
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
        <a-form-item label="召集人" required>
          <TeacherSelector v-model:value="editor.convenerUserId" width="100%" />
        </a-form-item>
        <a-form-item label="成员（JSON 数组或自由文本）">
          <a-textarea
            v-model:value="editor.members"
            :rows="3"
            placeholder="例如 [&quot;张三&quot;, &quot;李四&quot;, &quot;王五&quot;]"
          />
        </a-form-item>
        <a-form-item label="职责">
          <a-textarea v-model:value="editor.responsibility" :rows="3" />
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

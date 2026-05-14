<script setup lang="ts">
/**
 * 量表换算规则
 *
 * 后端：/api/quality/scale-conversion-rules
 * 用于间接评价跨量表归一：原始量表值 → 0~1 分值。
 * conversionMap 字段为 JSON 字符串：{ 原始值: 换算分值 }
 */
import type {
  ScaleConversionRuleQueryPayload,
  ScaleConversionRuleSavePayload,
  ScaleConversionRuleVO,
  ScaleType,
} from '@/apis/quality'
import { message, Modal } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { SCALE_TYPE_LABEL, scaleConversionRuleApi } from '@/apis/quality'

const list = ref<ScaleConversionRuleVO[]>([])
const total = ref(0)
const loading = ref(false)
const query = reactive<ScaleConversionRuleQueryPayload>({
  pageNum: 1,
  pageSize: 10,
  scaleType: undefined,
  enabled: undefined,
})

const scaleTypeOptions: { value: ScaleType, label: string }[] = (Object.keys(SCALE_TYPE_LABEL) as ScaleType[]).map(value => ({
  value,
  label: SCALE_TYPE_LABEL[value],
}))

const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editor = reactive<ScaleConversionRuleSavePayload>({
  ruleCode: '',
  ruleName: '',
  scaleType: 'LIKERT_5',
  conversionMap: '',
  description: '',
  enabled: true,
})
const editorJsonValid = computed(() => {
  if (!editor.conversionMap.trim()) return false
  try {
    JSON.parse(editor.conversionMap)
    return true
  } catch {
    return false
  }
})
const submitting = ref(false)

async function loadList() {
  loading.value = true
  try {
    const page = await scaleConversionRuleApi.page({ ...query })
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
  query.scaleType = undefined
  query.enabled = undefined
  loadList()
}

function openCreate() {
  editorMode.value = 'create'
  Object.assign(editor, {
    id: undefined,
    ruleCode: '',
    ruleName: '',
    scaleType: 'LIKERT_5',
    conversionMap: JSON.stringify({ 1: 0, 2: 0.25, 3: 0.5, 4: 0.75, 5: 1 }, null, 2),
    description: '',
    enabled: true,
  })
  editorVisible.value = true
}

function openEdit(record: ScaleConversionRuleVO) {
  editorMode.value = 'edit'
  Object.assign(editor, {
    ...record,
    conversionMap: prettyJson(record.conversionMap),
  })
  editorVisible.value = true
}

function prettyJson(s: string): string {
  if (!s) return ''
  try {
    return JSON.stringify(JSON.parse(s), null, 2)
  } catch {
    return s
  }
}

async function submitEditor() {
  if (!editor.ruleCode.trim() || !editor.ruleName.trim()) {
    message.error('请填写编码与名称')
    return
  }
  if (!editorJsonValid.value) {
    message.error('换算映射不是合法 JSON')
    return
  }
  submitting.value = true
  try {
    if (editorMode.value === 'create') await scaleConversionRuleApi.create(editor)
    else await scaleConversionRuleApi.update(editor)
    message.success('已保存')
    editorVisible.value = false
    await loadList()
  } finally {
    submitting.value = false
  }
}

async function handleDelete(record: ScaleConversionRuleVO) {
  Modal.confirm({
    title: `删除换算规则 ${record.ruleCode}？`,
    okType: 'danger',
    onOk: async () => {
      await scaleConversionRuleApi.delete(record.id)
      message.success('已删除')
      await loadList()
    },
  })
}

onMounted(() => loadList())
</script>

<template>
  <div class="page">
    <a-card title="量表换算规则" :bordered="false">
      <template #extra>
        <a-space wrap>
          <a-select v-model:value="query.scaleType" placeholder="量表类型" allow-clear style="width: 180px" :options="scaleTypeOptions" />
          <a-select v-model:value="query.enabled" placeholder="状态" allow-clear style="width: 120px">
            <a-select-option :value="true">启用</a-select-option>
            <a-select-option :value="false">停用</a-select-option>
          </a-select>
          <a-button type="primary" @click="loadList">查询</a-button>
          <a-button @click="resetQuery">重置</a-button>
          <a-button type="primary" @click="openCreate">新建换算规则</a-button>
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
        <a-table-column title="编码" data-index="ruleCode" width="140" />
        <a-table-column title="名称" data-index="ruleName" />
        <a-table-column title="量表类型" data-index="scaleType" width="140">
          <template #default="{ text }">
            {{ scaleTypeOptions.find(o => o.value === text)?.label || text }}
          </template>
        </a-table-column>
        <a-table-column title="说明" data-index="description" />
        <a-table-column title="状态" data-index="enabled" width="90">
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
      :title="editorMode === 'create' ? '新建量表换算规则' : '编辑量表换算规则'"
      :confirm-loading="submitting"
      width="640px"
      @ok="submitEditor"
    >
      <a-form layout="vertical" :model="editor">
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="编码" required>
              <a-input v-model:value="editor.ruleCode" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="量表类型" required>
              <a-select v-model:value="editor.scaleType" :options="scaleTypeOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="状态">
              <a-switch v-model:checked="editor.enabled" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="名称" required>
          <a-input v-model:value="editor.ruleName" />
        </a-form-item>
        <a-form-item label="换算映射（JSON）" required :validate-status="editorJsonValid ? 'success' : 'error'" :help="editorJsonValid ? '' : '请输入合法 JSON，键为原始量表值，值为 0~1 分值'">
          <a-textarea v-model:value="editor.conversionMap" :rows="8" :style="{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }" />
        </a-form-item>
        <a-form-item label="说明">
          <a-textarea v-model:value="editor.description" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
.page { padding: 16px; }
</style>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioTeachingPhilosophySaveRequest,
  PortfolioTeachingPhilosophyVO,
} from '@/apis/portfolio/teaching-philosophy'
import { Form, Input, message } from 'ant-design-vue'
import { computed, reactive, ref, watch } from 'vue'
import { portfolioTeachingPhilosophyApi } from '@/apis/portfolio/teaching-philosophy'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import {
  usePortfolioPageScope,
  usePortfolioScopedLoader,
} from '@/composables/usePortfolioPageScope'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'

const { targetTeacherId, canPickTeachers } = usePortfolioPageScope()

const loading = ref(false)
const saving = ref(false)
const loadFailed = ref(false)
const rows = ref<PortfolioTeachingPhilosophyVO[]>([])
const modalOpen = ref(false)
const editing = ref<PortfolioTeachingPhilosophyVO | null>(null)
const deletingId = ref('')
const requestToken = ref(0)

const form = reactive<PortfolioTeachingPhilosophySaveRequest>({
  academicYear: '',
  philosophyText: '',
})

const readonlyMode = computed(() => canPickTeachers.value && !!targetTeacherId.value)

const columns: ColumnsType = [
  { title: '学年', dataIndex: 'academicYear', key: 'academicYear', width: 120 },
  { title: '教学理念', dataIndex: 'philosophyText', key: 'philosophyText', ellipsis: true },
  { title: '更新时间', dataIndex: 'updateTime', key: 'updateTime', width: 168 },
  { title: '操作', key: 'actions', width: 120 },
]

function scopeTeacherId() {
  return targetTeacherId.value || undefined
}

/** 教师作用域切换或关闭弹窗时必须清空旧编辑上下文，避免把上一位教师内容保存到当前教师。 */
function resetEditorContext() {
  editing.value = null
  form.id = undefined
  form.academicYear = ''
  form.philosophyText = ''
}

async function loadList() {
  const currentToken = requestToken.value + 1
  requestToken.value = currentToken
  if (canPickTeachers.value && !targetTeacherId.value) {
    loading.value = false
    saving.value = false
    loadFailed.value = false
    rows.value = []
    return
  }
  loading.value = true
  loadFailed.value = false
  try {
    const nextRows = await portfolioTeachingPhilosophyApi.list({ teacherId: scopeTeacherId() })
    if (requestToken.value !== currentToken) {
      return
    }
    rows.value = nextRows
  } catch (error) {
    if (requestToken.value !== currentToken) {
      return
    }
    rows.value = []
    loadFailed.value = true
    showUserError(error, '加载教学理念失败')
  } finally {
    if (requestToken.value === currentToken) {
      loading.value = false
    }
  }
}

function openModal(row?: PortfolioTeachingPhilosophyVO) {
  if (readonlyMode.value) {
    showFormValidationMessage('管理员查看模式下不可编辑教学理念')
    return
  }
  editing.value = row || null
  form.id = row?.id
  form.academicYear = row?.academicYear || ''
  form.philosophyText = row?.philosophyText || ''
  modalOpen.value = true
}

async function save() {
  saving.value = true
  try {
    await portfolioTeachingPhilosophyApi.save({
      id: form.id,
      teacherId: scopeTeacherId(),
      academicYear: form.academicYear.trim(),
      philosophyText: form.philosophyText.trim(),
    })
    message.success('教学理念已保存')
    modalOpen.value = false
    await loadList()
  } catch (error) {
    showUserError(error, '保存教学理念失败')
  } finally {
    saving.value = false
  }
}

async function remove(row: PortfolioTeachingPhilosophyVO) {
  if (readonlyMode.value || deletingId.value) {
    return
  }
  const teacherId = scopeTeacherId()
  const operationToken = requestToken.value
  const confirmed = await confirmAsync({
    title: '删除教学理念',
    content: `确认删除 ${row.academicYear} 学年记录？`,
  })
  if (!confirmed || requestToken.value !== operationToken) {
    return
  }
  deletingId.value = row.id
  try {
    await portfolioTeachingPhilosophyApi.delete({ id: row.id, teacherId })
    if (requestToken.value !== operationToken) return
    message.success('已删除')
    await loadList()
  } catch (error) {
    if (requestToken.value !== operationToken) return
    showUserError(error, '删除教学理念失败')
  } finally {
    if (deletingId.value === row.id) deletingId.value = ''
  }
}

watch(
  () => targetTeacherId.value,
  () => {
    requestToken.value += 1
    loading.value = false
    saving.value = false
    deletingId.value = ''
    loadFailed.value = false
    rows.value = []
    modalOpen.value = false
    resetEditorContext()
  },
)
usePortfolioScopedLoader(loadList, () => targetTeacherId.value)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="教学理念" subtitle="按学年记录与修订" />
    </template>

    <UiCard v-if="loadFailed" title="加载失败">
      <UiEmpty description="教学理念加载失败">
        <UiButton @click="loadList">重试</UiButton>
      </UiEmpty>
    </UiCard>

    <UiCard v-else title="按年教学理念" :loading="loading">
      <template #extra>
        <UiButton v-if="!readonlyMode" @click="openModal()">新增学年</UiButton>
      </template>
      <UiDataTable :columns="columns" :data-source="rows" row-key="id" :pagination="false">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'actions'">
            <UiButton variant="ghost" @click="openModal(record)">
              {{ readonlyMode ? '查看' : '编辑' }}
            </UiButton>
            <UiButton
              v-if="!readonlyMode"
              variant="ghost"
              danger
              :loading="deletingId === record.id"
              :disabled="Boolean(deletingId)"
              @click="remove(record)"
            >
              删除
            </UiButton>
          </template>
        </template>
      </UiDataTable>
    </UiCard>
  </StageWorkbenchShell>

  <a-modal
    v-model:open="modalOpen"
    :title="editing ? '修订教学理念' : '新增学年教学理念'"
    :confirm-loading="saving"
    :ok-button-props="{ disabled: readonlyMode }"
    @ok="save"
    @cancel="resetEditorContext"
  >
    <Form layout="vertical">
      <Form.Item label="学年" required>
        <Input
          v-model:value="form.academicYear"
          :disabled="readonlyMode"
          placeholder="如 2025-2026"
        />
      </Form.Item>
      <Form.Item label="教学理念" required>
        <Input.TextArea
          v-model:value="form.philosophyText"
          :disabled="readonlyMode"
          :rows="8"
          placeholder="记录本学年教学理念、反思与成长轨迹"
        />
      </Form.Item>
    </Form>
  </a-modal>
</template>

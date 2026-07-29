<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioTeachingPhilosophySaveRequest,
  PortfolioTeachingPhilosophyVO,
} from '@/apis/portfolio/teaching-philosophy'
import type { UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { portfolioTeachingPhilosophyApi } from '@/apis/portfolio/teaching-philosophy'
import PortfolioArchiveWriteGuardStrip from '@/components/portfolio/PortfolioArchiveWriteGuardStrip.vue'
import PortfolioTeacherPickGate from '@/components/portfolio/PortfolioTeacherPickGate.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { usePortfolioArchiveWriteGuard } from '@/composables/usePortfolioArchiveWriteGuard'
import {
  usePortfolioPageScope,
  usePortfolioScopedLoader,
} from '@/composables/usePortfolioPageScope'
import { usePortfolioProxyWriteGuard } from '@/composables/usePortfolioProxyWriteGuard'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { applySpotlightEmphasis } from '@/utils/signal-spotlight'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

const { targetTeacherId, canPickTeachers } = usePortfolioPageScope()
const { confirmProxyWrite } = usePortfolioProxyWriteGuard()
const {
  archiveWriteForbidden,
  archiveWriteCapabilityUnknown,
  archiveWriteBlockMessage,
  assertArchiveWritable,
  loading: archiveWriteGuardLoading,
  reloadLifecycleState,
} = usePortfolioArchiveWriteGuard()

const loading = ref(false)
const saving = ref(false)
const loadFailed = ref(false)
const lastSuccessAt = ref<string | null>(null)
const refreshError = ref<string | null>(null)
const rows = ref<PortfolioTeachingPhilosophyVO[]>([])
const modalOpen = ref(false)
const editing = ref<PortfolioTeachingPhilosophyVO | null>(null)
const deletingId = ref('')
const requestToken = ref(0)

const form = reactive<PortfolioTeachingPhilosophySaveRequest>({
  academicYear: '',
  philosophyText: '',
})

const readonlyMode = computed(
  () => (canPickTeachers.value && !!targetTeacherId.value) || archiveWriteForbidden.value,
)

const columns: ColumnsType = [
  { title: '学年', dataIndex: 'academicYear', key: 'academicYear', width: 120 },
  { title: '教学理念', dataIndex: 'philosophyText', key: 'philosophyText', ellipsis: true },
  { title: '身份层', key: 'identityLayers', width: 180 },
  { title: '更新时间', dataIndex: 'updateTime', key: 'updateTime', width: 168 },
  { title: '主行动', key: 'actions', width: 120 },
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

function upsertRow(saved: PortfolioTeachingPhilosophyVO) {
  const next = rows.value.filter(item => item.id !== saved.id)
  next.unshift(saved)
  next.sort((left, right) => String(right.academicYear).localeCompare(String(left.academicYear)))
  rows.value = next
}

async function loadList() {
  const currentToken = requestToken.value + 1
  requestToken.value = currentToken
  if (canPickTeachers.value && !targetTeacherId.value) {
    loading.value = false
    saving.value = false
    loadFailed.value = false
    refreshError.value = null
    lastSuccessAt.value = null
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
    lastSuccessAt.value = new Date().toISOString()
    refreshError.value = null
  } catch (error) {
    if (requestToken.value !== currentToken) {
      return
    }
    loadFailed.value = true
    showUserError(error, '加载教学理念失败')
  } finally {
    if (requestToken.value === currentToken) {
      loading.value = false
    }
  }
}

/** 教学理念行：编辑/查看为主行动 */
function buildPhilosophyRowActions(record: PortfolioTeachingPhilosophyVO): UiTableRowActionItem[] {
  return [
    {
      key: 'edit',
      label: readonlyMode.value ? '查看' : '编辑',
      tone: 'primary',
    },
    {
      key: 'delete',
      label: '删除',
      tone: 'danger',
      hidden: readonlyMode.value,
      disabled: Boolean(deletingId.value),
    },
  ]
}

function handlePhilosophyRowAction(key: string, record: PortfolioTeachingPhilosophyVO): void {
  if (key === 'edit') {
    openModal(record)
    return
  }
  if (key === 'delete') {
    void remove(record)
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
  if (!assertArchiveWritable()) {
    return
  }
  if (!(await confirmProxyWrite('保存教学理念'))) {
    return
  }

  saving.value = true
  refreshError.value = null
  try {
    const saved = await portfolioTeachingPhilosophyApi.save({
      id: form.id,
      teacherId: scopeTeacherId(),
      academicYear: form.academicYear.trim(),
      philosophyText: form.philosophyText.trim(),
    })
    void message.success('教学理念已保存')
    modalOpen.value = false
    resetEditorContext()
    upsertRow(saved)
  } catch (error) {
    showUserError(error, '保存教学理念失败')
    return
  } finally {
    saving.value = false
  }
  try {
    await loadList()
    if (loadFailed.value) {
      refreshError.value = '教学理念已保存，但列表刷新失败；下方可能为陈旧数据。'
    }
  } catch (error) {
    refreshError.value = '教学理念已保存，但列表刷新失败；下方可能为陈旧数据。'
    showUserError(error, '刷新教学理念列表失败')
  }
}

async function remove(row: PortfolioTeachingPhilosophyVO) {
  if (readonlyMode.value || deletingId.value) {
    return
  }
  if (!assertArchiveWritable()) {
    return
  }
  if (!(await confirmProxyWrite('删除教学理念'))) {
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
  refreshError.value = null
  try {
    await portfolioTeachingPhilosophyApi.delete({ id: row.id, teacherId })
    if (requestToken.value !== operationToken) return
    void message.success('已删除')
    rows.value = rows.value.filter(item => item.id !== row.id)
  } catch (error) {
    if (requestToken.value !== operationToken) return
    showUserError(error, '删除教学理念失败')
    return
  } finally {
    if (deletingId.value === row.id) deletingId.value = ''
  }
  try {
    await loadList()
    if (loadFailed.value) {
      refreshError.value = '教学理念已删除，但列表刷新失败；下方可能为陈旧数据。'
    }
  } catch (error) {
    refreshError.value = '教学理念已删除，但列表刷新失败；下方可能为陈旧数据。'
    showUserError(error, '刷新教学理念列表失败')
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
    refreshError.value = null
    lastSuccessAt.value = null
    rows.value = []
    modalOpen.value = false
    resetEditorContext()
  },
)
usePortfolioScopedLoader(loadList, () => targetTeacherId.value)

const TeachingPhilosophySignalMetrics = computed<SignalMetric[]>(() => {
  if (loadFailed.value && rows.value.length === 0) {
    return []
  }
  return applySpotlightEmphasis([
    {
      key: 'total',
      label: '理念记录',
      value: rows.value.length,
      clickable: true,
      helper: '当前已加载',
    },
  ], { primaryKey: 'total', actionLabel: '刷新' })
})

const TeachingPhilosophyWorkbenchSubtitle = computed(() => {
  if (loadFailed.value) return '加载失败'
  return `${rows.value.length} 条`
})

function onTeachingPhilosophySignalClick(_key: string) {
  void loadList()
}
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="教学理念" :subtitle="TeachingPhilosophyWorkbenchSubtitle" />
    </template>
    <template v-if="TeachingPhilosophySignalMetrics.length > 0" #signal>
      <SignalBand
        layout="spotlight"
        variant="inline"
        compact
        :metrics="TeachingPhilosophySignalMetrics"
        @metric-click="onTeachingPhilosophySignalClick"
      />
    </template>
    <PortfolioArchiveWriteGuardStrip
      :blocked="archiveWriteForbidden"
      :capability-unknown="archiveWriteCapabilityUnknown"
      :message="archiveWriteBlockMessage"
      :loading="archiveWriteGuardLoading"
      @confirm="() => void reloadLifecycleState()"
    />

    <PortfolioTeacherPickGate v-if="canPickTeachers && !targetTeacherId" />

    <template v-else>
      <UiAlertStrip
        v-if="refreshError"
        tone="warning"
        :message="refreshError"
        class="dp-mb-component"
      />
      <UiAlertStrip
        v-if="loadFailed"
        tone="error"
        class="dp-mb-component"
        title="教学理念加载失败"
      />
      <UiCard v-if="loadFailed && rows.length === 0" title="加载失败">
        <UiEmpty
          size="sm"
          description="教学理念加载失败"
        />
      </UiCard>
      <UiCard v-else title="教学理念记录" :loading="loading">
        <template #extra>
          <UiButton size="sm" variant="primary" v-if="!readonlyMode" @click="openModal()">
            新增理念
          </UiButton>
        </template>
        <UiDataTable :columns="columns" :data-source="rows" row-key="id" :pagination="false">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'identityLayers'">
              <PortfolioOwnerIdentityLayersCell
                :layers="record.ownerIdentityLayers"
                :note="record.ownerMultiIdentityNote"
              />
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                :max-visible="2"
                :items="buildPhilosophyRowActions(record)"
                split
                @action="(key) => handlePhilosophyRowAction(key, record)"
              />
            </template>
          </template>
        </UiDataTable>
      </UiCard>
    </template>
  </StageWorkbenchShell>

  <UiDialog
    v-model:open="modalOpen"
    :title="editing ? '修订教学理念' : '新增教学理念'"
    :confirm-loading="saving"
    @ok="save"
    @cancel="resetEditorContext"
  >
    <UiForm layout="vertical">
      <UiFormItem label="学年" required compact>
        <UiInput
          v-model="form.academicYear"
          size="sm"
          :disabled="readonlyMode"
          placeholder="如 2025-2026"
        />
      </UiFormItem>
      <UiFormItem label="教学理念" required compact>
        <UiTextarea
          v-model="form.philosophyText"
          size="sm"
          :disabled="readonlyMode"
          :rows="8"
          placeholder="记录本学年教学理念、反思与成长轨迹"
        />
      </UiFormItem>
    </UiForm>
  </UiDialog>
</template>

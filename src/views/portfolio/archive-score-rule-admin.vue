<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioArchiveScoreRuleSaveRequest,
  PortfolioArchiveScoreRuleVO,
} from '@/apis/portfolio/teacher-platform'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref } from 'vue'
import {
  PORTFOLIO_ARCHIVE_SCORE_RULE_TYPE_OPTIONS,
  portfolioArchiveScoreApi,
  PortfolioArchiveScoreRuleTypeCode,
  PortfolioArchiveScoreRuleTypeDescription,
} from '@/apis/portfolio/teacher-platform'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchContextGateStrip from '@/components/workbench/WorkbenchContextGateStrip.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const loading = ref(false)
const loadError = ref('')
const requestToken = ref(0)
const operationKey = ref('')
const writing = computed(() => Boolean(operationKey.value))
const saving = computed(() => operationKey.value.startsWith('save:'))
const rows = ref<PortfolioArchiveScoreRuleVO[]>([])
const modalOpen = ref(false)
const editingId = ref<string>()
const form = reactive<PortfolioArchiveScoreRuleSaveRequest>({
  ruleType: PortfolioArchiveScoreRuleTypeCode.COMPLETENESS,
  ruleName: '',
  scorePoints: 0,
  officialOnly: 1,
})

const columns: ColumnsType = [
  { title: '规则名称', dataIndex: 'ruleName', key: 'ruleName' },
  { title: '类型', dataIndex: 'ruleType', key: 'ruleType', width: 120 },
  { title: '分类编号', dataIndex: 'categoryId', key: 'categoryId', width: 100 },
  { title: '分值', dataIndex: 'scorePoints', key: 'scorePoints', width: 80 },
  { title: '权重', dataIndex: 'weight', key: 'weight', width: 80 },
  { title: '仅正式档案', dataIndex: 'officialOnly', key: 'officialOnly', width: 100 },
  { title: '操作', key: 'actions', width: 120 },
]

function ruleTypeLabel(type: PortfolioArchiveScoreRuleTypeCode): string {
  return strictEnumLabel(PortfolioArchiveScoreRuleTypeDescription, type, '评分规则类型')
}

function resetForm() {
  editingId.value = undefined
  form.id = undefined
  form.categoryId = undefined
  form.ruleType = PortfolioArchiveScoreRuleTypeCode.COMPLETENESS
  form.ruleName = ''
  form.scorePoints = 0
  form.weight = undefined
  form.officialOnly = 1
}

/** 评分规则写操作必须串行，避免保存与删除交叉覆盖规则集。 */
function beginOperation(key: string): boolean {
  if (writing.value) return false
  operationKey.value = key
  return true
}

function endOperation(key: string) {
  if (operationKey.value === key) operationKey.value = ''
}

async function loadRules() {
  const currentToken = requestToken.value + 1
  requestToken.value = currentToken
  loading.value = true
  loadError.value = ''
  try {
    const result = await portfolioArchiveScoreApi.listRules()
    if (requestToken.value !== currentToken) return
    rows.value = result
  } catch (error) {
    if (requestToken.value !== currentToken) return
    rows.value = []
    loadError.value = '评分规则加载失败，请重试'
    showUserError(error, '加载评分规则失败')
  } finally {
    if (requestToken.value === currentToken) loading.value = false
  }
}

function openCreate() {
  if (writing.value) return
  resetForm()
  modalOpen.value = true
}

function handleArchiveScoreRuleAction(key: string, row: PortfolioArchiveScoreRuleVO): void {
  if (key === 'edit') {
    openEdit(row)
    return
  }
  if (key === 'delete') {
    void handleDelete(row.id)
  }
}

function openEdit(row: PortfolioArchiveScoreRuleVO) {
  if (writing.value) return
  editingId.value = row.id
  form.id = row.id
  form.categoryId = row.categoryId
  form.ruleType = row.ruleType
  form.ruleName = row.ruleName
  form.scorePoints = row.scorePoints
  form.weight = row.weight
  form.officialOnly = row.officialOnly ?? 1
  modalOpen.value = true
}

function handleRuleTypeChange() {
  if (form.ruleType !== PortfolioArchiveScoreRuleTypeCode.CATEGORY) {
    form.categoryId = undefined
  }
}

async function handleSave() {
  if (!form.ruleName.trim() || form.scorePoints === undefined) {
    showFormValidationMessage('请填写规则名称与分值')
    return
  }
  const categoryId = form.categoryId?.trim()
  if (form.ruleType === PortfolioArchiveScoreRuleTypeCode.CATEGORY && !categoryId) {
    showFormValidationMessage('分类归档计分规则必须填写分类编号')
    return
  }
  const operation = `save:${form.id || 'new'}`
  if (!beginOperation(operation)) return
  const request: PortfolioArchiveScoreRuleSaveRequest = {
    id: form.id,
    categoryId:
      form.ruleType === PortfolioArchiveScoreRuleTypeCode.CATEGORY ? categoryId : undefined,
    ruleType: form.ruleType,
    ruleName: form.ruleName.trim(),
    scorePoints: form.scorePoints,
    weight: form.weight,
    officialOnly: form.officialOnly,
  }
  try {
    await portfolioArchiveScoreApi.saveRule(request)
    void message.success('规则已保存')
    modalOpen.value = false
    await loadRules()
  } catch (error) {
    showUserError(error, '保存评分规则失败')
  } finally {
    endOperation(operation)
  }
}

async function handleDelete(id: string) {
  const operation = `delete:${id}`
  if (!beginOperation(operation)) return
  const target = rows.value.find((item) => item.id === id)
  const ok = await confirmAsync({
    title: '确认删除评分规则？',
    content: `删除「${target?.ruleName || id}」后，后续正式档案计分将不再应用该规则。`,
    type: 'error',
  })
  if (!ok) {
    endOperation(operation)
    return
  }
  try {
    await portfolioArchiveScoreApi.deleteRule(id)
    void message.success('已删除')
    await loadRules()
  } catch (error) {
    showUserError(error, '删除评分规则失败')
  } finally {
    endOperation(operation)
  }
}

onMounted(loadRules)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="档案评分规则" />
    </template>
    <UiCard>
      <div class="toolbar">
        <UiButton size="sm" :loading="loading" :disabled="writing" @click="loadRules">
          刷新
        </UiButton>
        <UiButton size="sm" variant="primary" :disabled="writing" @click="openCreate">
          新增规则
        </UiButton>
      </div>
      <WorkbenchContextGateStrip
        v-if="!loading && !loadError && rows.length === 0"
        tag="未配置"
        body="暂无档案计分规则，请先新增规则"
        cta-label="新增规则"
        @cta="openCreate"
      />
      <UiDataTable
        v-else
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :load-error="Boolean(loadError)"
        row-key="id"
        style="margin-top: 16px"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'ruleType'">
            {{ ruleTypeLabel(record.ruleType) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              :items="[
                { key: 'edit', label: '编辑', disabled: writing },
                { key: 'delete', label: '删除', tone: 'danger', disabled: writing },
              ]"
              split
              @action="(key) => handleArchiveScoreRuleAction(key, record)"
            />
          </template>
        </template>
      </UiDataTable>
    </UiCard>

    <UiDialog
      v-model:open="modalOpen"
      :title="editingId ? '编辑评分规则' : '新增评分规则'"
      :confirm-loading="saving"
      :closable="!writing"
      :mask-closable="!writing"
      ok-text="保存"
      cancel-text="取消"
      @ok="handleSave"
    >
      <UiForm layout="vertical">
        <UiFormItem label="规则类型" required>
          <UiSelect
            size="sm"
            v-model="form.ruleType"
            :options="PORTFOLIO_ARCHIVE_SCORE_RULE_TYPE_OPTIONS"
            :disabled="writing"
            @change="handleRuleTypeChange"
          />
        </UiFormItem>
        <UiFormItem label="规则名称" required>
          <UiInput size="sm" v-model="form.ruleName" :disabled="writing" />
        </UiFormItem>
        <UiFormItem
          v-if="form.ruleType === PortfolioArchiveScoreRuleTypeCode.CATEGORY"
          label="分类编号"
          required
        >
          <UiInput
            size="sm"
            v-model="form.categoryId"
            placeholder="档案分类编号"
            :disabled="writing"
          />
        </UiFormItem>
        <UiFormItem label="分值" required>
          <UiInputNumber
            size="sm"
            v-model="form.scorePoints"
            style="width: 100%"
            :disabled="writing"
          />
        </UiFormItem>
        <UiFormItem label="权重">
          <UiInputNumber size="sm" v-model="form.weight" style="width: 100%" :disabled="writing" />
        </UiFormItem>
        <UiFormItem label="仅正式档案计分">
          <UiSelect
            size="sm"
            v-model="form.officialOnly"
            :options="[
              { value: 1, label: '是' },
              { value: 0, label: '否' },
            ]"
            :disabled="writing"
          />
        </UiFormItem>
      </UiForm>
    </UiDialog>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.toolbar {
  display: flex;
  gap: var(--dp-space-2);
}
</style>

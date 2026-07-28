<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioArchiveScoreRuleSaveRequest,
  PortfolioArchiveScoreRuleVO,
} from '@/apis/portfolio/teacher-platform'
import type { PortfolioArchiveCategoryTreeNodeVO } from '@/apis/portfolio/types'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref } from 'vue'
import { portfolioArchiveTemplateApi } from '@/apis/portfolio/archive-template'
import {
  PORTFOLIO_ARCHIVE_SCORE_RULE_TYPE_OPTIONS,
  portfolioArchiveScoreApi,
  PortfolioArchiveScoreRuleTypeCode,
  PortfolioArchiveScoreRuleTypeDescription,
} from '@/apis/portfolio/teacher-platform'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
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

const SCORE_POINTS_MAX = 100
const WEIGHT_MAX = 10

const loading = ref(false)
const loadError = ref('')
const requestToken = ref(0)
const categoryOptionsToken = ref(0)
const categoryOptionsLoadFailed = ref(false)
const categoryOptions = ref<Array<{ value: string, label: string }>>([])
const operationKey = ref('')
const writing = computed(() => Boolean(operationKey.value))
const saving = computed(() => operationKey.value.startsWith('save:'))
const rows = ref<PortfolioArchiveScoreRuleVO[]>([])
const modalOpen = ref(false)
const editingId = ref<string>()
const editingUpdateTime = ref<string>()
const form = reactive<PortfolioArchiveScoreRuleSaveRequest>({
  ruleType: PortfolioArchiveScoreRuleTypeCode.COMPLETENESS,
  ruleName: '',
  scorePoints: 0,
  officialOnly: 1,
})

const formulaPreview = computed(() => {
  const points = Number(form.scorePoints ?? 0)
  const weight = form.weight == null ? 1 : Number(form.weight)
  if (!Number.isFinite(points) || !Number.isFinite(weight)) {
    return '—'
  }
  return `${points} 分 × 权重 ${weight} = ${(points * weight).toFixed(2)}`
})

const columns: ColumnsType = [
  { title: '规则名称', dataIndex: 'ruleName', key: 'ruleName' },
  { title: '类型', dataIndex: 'ruleType', key: 'ruleType', width: 120 },
  { title: '适用范围', key: 'scope', width: 180 },
  { title: '分值', dataIndex: 'scorePoints', key: 'scorePoints', width: 80 },
  { title: '权重', dataIndex: 'weight', key: 'weight', width: 80 },
  { title: '仅正式档案', dataIndex: 'officialOnly', key: 'officialOnly', width: 100 },
  { title: '操作', key: 'actions', width: 120 },
]

function ruleTypeLabel(type: PortfolioArchiveScoreRuleTypeCode): string {
  return strictEnumLabel(PortfolioArchiveScoreRuleTypeDescription, type, '评分规则类型')
}

function flattenCategoryOptions(
  nodes: PortfolioArchiveCategoryTreeNodeVO[],
  prefix = '',
): Array<{ value: string, label: string }> {
  const result: Array<{ value: string, label: string }> = []
  for (const node of nodes) {
    const label = prefix ? `${prefix} / ${node.categoryName}` : node.categoryName
    result.push({ value: node.id, label: `${label}（${node.categoryCode}）` })
    if (node.children?.length) {
      result.push(...flattenCategoryOptions(node.children, label))
    }
  }
  return result
}

function resetForm() {
  editingId.value = undefined
  editingUpdateTime.value = undefined
  form.id = undefined
  form.categoryId = undefined
  form.ruleType = PortfolioArchiveScoreRuleTypeCode.COMPLETENESS
  form.ruleName = ''
  form.scorePoints = 0
  form.weight = undefined
  form.officialOnly = 1
  form.expectedUpdateTime = undefined
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

async function loadCategoryOptions() {
  const currentToken = ++categoryOptionsToken.value
  try {
    const tree = await portfolioArchiveTemplateApi.listCategoryTree({})
    if (categoryOptionsToken.value !== currentToken) {
      return
    }
    categoryOptions.value = flattenCategoryOptions(tree ?? [])
    categoryOptionsLoadFailed.value = false
  } catch (error) {
    if (categoryOptionsToken.value !== currentToken) {
      return
    }
    categoryOptionsLoadFailed.value = true
    showUserError(error, '加载档案分类失败')
  }
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
    loadError.value = '评分规则加载失败；已保留上次成功列表（若有）'
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
    void handleDelete(row)
  }
}

function openEdit(row: PortfolioArchiveScoreRuleVO) {
  if (writing.value) return
  editingId.value = row.id
  editingUpdateTime.value = row.updateTime
  form.id = row.id
  form.categoryId = row.categoryId
  form.ruleType = row.ruleType
  form.ruleName = row.ruleName
  form.scorePoints = row.scorePoints
  form.weight = row.weight
  form.officialOnly = row.officialOnly ?? 1
  form.expectedUpdateTime = row.updateTime
  modalOpen.value = true
}

function handleRuleTypeChange() {
  if (form.ruleType !== PortfolioArchiveScoreRuleTypeCode.CATEGORY) {
    form.categoryId = undefined
  }
}

function scopeLabel(row: PortfolioArchiveScoreRuleVO): string {
  if (row.ruleType !== PortfolioArchiveScoreRuleTypeCode.CATEGORY) {
    return '全局'
  }
  if (row.categoryName) {
    return row.categoryName
  }
  return row.categoryId || '—'
}

async function handleSave() {
  if (!form.ruleName.trim() || form.scorePoints === undefined) {
    showFormValidationMessage('请填写规则名称与分值')
    return
  }
  const points = Number(form.scorePoints)
  if (!Number.isFinite(points) || points < 0 || points > SCORE_POINTS_MAX) {
    showFormValidationMessage(`分值须在 0～${SCORE_POINTS_MAX} 分`)
    return
  }
  if (form.weight != null) {
    const weight = Number(form.weight)
    if (!Number.isFinite(weight) || weight <= 0 || weight > WEIGHT_MAX) {
      showFormValidationMessage(`权重须在 0（不含）～${WEIGHT_MAX}`)
      return
    }
  }
  const categoryId = form.categoryId?.trim()
  if (form.ruleType === PortfolioArchiveScoreRuleTypeCode.CATEGORY && !categoryId) {
    showFormValidationMessage('分类归档计分规则必须选择档案分类')
    return
  }
  if (form.id && !editingUpdateTime.value) {
    showFormValidationMessage('缺少规则更新时间，请关闭后重新打开编辑')
    return
  }
  const confirmed = await confirmAsync({
    title: form.id ? '确认保存评分规则？' : '确认新增评分规则？',
    content:
      `规则「${form.ruleName.trim()}」· ${ruleTypeLabel(form.ruleType)}\n`
      + `计分预览：${formulaPreview.value}\n`
      + `${form.officialOnly === 1 ? '仅正式档案计分' : '草稿/正式均可计分'}。\n`
      + '保存后将立即影响后续正式档案年度计分；不自动重算历史年度结果。',
    type: 'warning',
    okText: '确认保存',
  })
  if (!confirmed) {
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
    expectedUpdateTime: form.id ? editingUpdateTime.value : undefined,
  }
  try {
    await portfolioArchiveScoreApi.saveRule(request)
    void message.success('规则已保存')
    modalOpen.value = false
  } catch (error) {
    showUserError(error, '保存评分规则失败')
    return
  } finally {
    endOperation(operation)
  }
  try {
    await loadRules()
  } catch (error) {
    showUserError(error, '规则已保存，列表刷新失败')
  }
}

async function handleDelete(row: PortfolioArchiveScoreRuleVO) {
  const operation = `delete:${row.id}`
  if (!beginOperation(operation)) return
  const ok = await confirmAsync({
    title: '确认删除评分规则？',
    content:
      `删除「${row.ruleName}」后，后续正式档案计分将不再应用该规则`
      + `（${ruleTypeLabel(row.ruleType)} · ${scopeLabel(row)}）。历史已落库年度结果不回溯删除。`,
    type: 'error',
  })
  if (!ok) {
    endOperation(operation)
    return
  }
  try {
    await portfolioArchiveScoreApi.deleteRule(row.id)
    void message.success('已删除')
  } catch (error) {
    showUserError(error, '删除评分规则失败')
    return
  } finally {
    endOperation(operation)
  }
  try {
    await loadRules()
  } catch (error) {
    showUserError(error, '规则已删除，列表刷新失败')
  }
}

onMounted(async () => {
  await Promise.all([loadRules(), loadCategoryOptions()])
})
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
      <UiAlertStrip
        v-if="loadError"
        tone="error"
        title="评分规则加载失败"
        :description="loadError"
        class="dp-mt-component"
      />
      <UiAlertStrip
        v-if="categoryOptionsLoadFailed"
        tone="error"
        title="档案分类选项加载失败"
        description="分类规则编辑将无法选择分类；刷新页面后将再次拉取。"
        class="dp-mt-component"
      />
      <WorkbenchContextGateStrip
        v-if="!loading && !loadError && rows.length === 0"
        tag="未配置"
        body="暂无档案计分规则，请先新增规则"
        cta-label="新增规则"
        @cta="openCreate"
      />
      <UiDataTable
        v-else-if="rows.length || loading"
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :load-error="Boolean(loadError)"
        row-key="id"
        style="margin-top: var(--dp-space-block)"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'ruleType'">
            {{ ruleTypeLabel(record.ruleType) }}
          </template>
          <template v-else-if="column.key === 'scope'">
            {{ scopeLabel(record) }}
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
          label="档案分类"
          required
        >
          <UiSelect
            size="sm"
            v-model="form.categoryId"
            show-search
            placeholder="选择已配置档案分类"
            :options="categoryOptions"
            :disabled="writing || categoryOptionsLoadFailed || categoryOptions.length === 0"
          />
        </UiFormItem>
        <UiFormItem label="分值（0～100 分）" required>
          <UiInputNumber
            size="sm"
            v-model="form.scorePoints"
            :min="0"
            :max="SCORE_POINTS_MAX"
            style="width: 100%"
            :disabled="writing"
          />
        </UiFormItem>
        <UiFormItem label="权重（0～10，缺省 1）">
          <UiInputNumber
            size="sm"
            v-model="form.weight"
            :min="0.01"
            :max="WEIGHT_MAX"
            :step="0.1"
            style="width: 100%"
            :disabled="writing"
          />
        </UiFormItem>
        <p class="formula-preview">计分预览：{{ formulaPreview }}</p>
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
  gap: var(--dp-space-component-tight);
}

.formula-preview {
  margin: 0 0 var(--dp-space-component);
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-sm);
  line-height: 1.45;
}
</style>

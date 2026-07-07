<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioArchiveScoreRuleSaveRequest,
  PortfolioArchiveScoreRuleVO,
} from '@/apis/portfolio/teacher-platform'
import { message } from 'ant-design-vue'
import { onMounted, reactive, ref } from 'vue'
import {
  PORTFOLIO_ARCHIVE_SCORE_RULE_TYPE_OPTIONS,
  portfolioArchiveScoreApi,
  PortfolioArchiveScoreRuleTypeCode,
  PortfolioArchiveScoreRuleTypeDescription,
} from '@/apis/portfolio/teacher-platform'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const loading = ref(false)
const saving = ref(false)
const rows = ref<PortfolioArchiveScoreRuleVO[]>([])
const modalOpen = ref(false)
const editingId = ref<string>()
const form = reactive<PortfolioArchiveScoreRuleSaveRequest>({
  ruleType: PortfolioArchiveScoreRuleTypeCode.COMPLETENESS,
  ruleName: '',
  scorePoints: 0,
  officialOnly: 1,
})

const ruleTypeOptions = PORTFOLIO_ARCHIVE_SCORE_RULE_TYPE_OPTIONS

const columns: ColumnsType = [
  { title: '规则名称', dataIndex: 'ruleName', key: 'ruleName' },
  { title: '类型', dataIndex: 'ruleType', key: 'ruleType', width: 120 },
  { title: '分类 ID', dataIndex: 'categoryId', key: 'categoryId', width: 100 },
  { title: '分值', dataIndex: 'scorePoints', key: 'scorePoints', width: 80 },
  { title: '权重', dataIndex: 'weight', key: 'weight', width: 80 },
  { title: '仅 OFFICIAL', dataIndex: 'officialOnly', key: 'officialOnly', width: 100 },
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

async function loadRules() {
  loading.value = true
  try {
    rows.value = await portfolioArchiveScoreApi.listRules()
  } catch (error) {
    showUserError(error)
  } finally {
    loading.value = false
  }
}

function openCreate() {
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

async function handleSave() {
  if (!form.ruleName.trim() || form.scorePoints === undefined) {
    message.warning('请填写规则名称与分值')
    return
  }
  saving.value = true
  try {
    await portfolioArchiveScoreApi.saveRule({
      id: form.id,
      categoryId: form.categoryId || undefined,
      ruleType: form.ruleType,
      ruleName: form.ruleName.trim(),
      scorePoints: form.scorePoints,
      weight: form.weight,
      officialOnly: form.officialOnly,
    })
    message.success('规则已保存')
    modalOpen.value = false
    await loadRules()
  } catch (error) {
    showUserError(error)
  } finally {
    saving.value = false
  }
}

async function handleDelete(id: string) {
  const ok = await confirmAsync({ title: '确认删除该评分规则？', type: 'error' })
  if (!ok) {
    return
  }
  try {
    await portfolioArchiveScoreApi.deleteRule(id)
    message.success('已删除')
    await loadRules()
  } catch (error) {
    showUserError(error)
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
        <UiButton @click="loadRules"> 刷新 </UiButton>
        <UiButton variant="primary" @click="openCreate"> 新增规则 </UiButton>
      </div>
      <UiEmpty v-if="!loading && rows.length === 0" description="当前筛选无档案计分规则" />
      <UiDataTable
        :columns="columns"
        :data-source="rows"
        :loading="loading"
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
                { key: 'edit', label: '编辑' },
                { key: 'delete', label: '删除', tone: 'danger' },
              ]"
              split
              @action="(key) => handleArchiveScoreRuleAction(key, record)"
            />
          </template>
        </template>
      </UiDataTable>
    </UiCard>

    <a-modal
      v-model:open="modalOpen"
      :title="editingId ? '编辑评分规则' : '新增评分规则'"
      :confirm-loading="saving"
      ok-text="保存"
      cancel-text="取消"
      @ok="handleSave"
    >
      <a-form layout="vertical">
        <a-form-item label="规则类型" required>
          <a-select v-model:value="form.ruleType" :options="ruleTypeOptions" />
        </a-form-item>
        <a-form-item label="规则名称" required>
          <a-input v-model:value="form.ruleName" />
        </a-form-item>
        <a-form-item label="分类 ID（CATEGORY 类型必填）">
          <a-input v-model:value="form.categoryId" placeholder="档案分类 ID" />
        </a-form-item>
        <a-form-item label="分值" required>
          <a-input-number v-model:value="form.scorePoints" style="width: 100%" />
        </a-form-item>
        <a-form-item label="权重">
          <a-input-number v-model:value="form.weight" style="width: 100%" />
        </a-form-item>
        <a-form-item label="仅 OFFICIAL 计分">
          <a-select
            v-model:value="form.officialOnly"
            :options="[
              { value: 1, label: '是' },
              { value: 0, label: '否' },
            ]"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.toolbar {
  display: flex;
  gap: var(--dp-space-2, 8px);
}
</style>

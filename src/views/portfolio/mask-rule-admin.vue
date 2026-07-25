<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioMaskRuleVO } from '@/apis/portfolio/governance'
import message from 'ant-design-vue/es/message'
import { onMounted, reactive, ref } from 'vue'
import { portfolioSecurityApi } from '@/apis/portfolio/governance'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiSwitch from '@/components/ui-guide/ui/Switch.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import {
  ALL_PORTFOLIO_MASK_EXPORT_SCOPE_CODES,
  PortfolioMaskExportScopeCode,
  PortfolioMaskExportScopeDescription,
} from '@/types/enums/portfolio-mask-export-scope-enum'
import {
  ALL_PORTFOLIO_MASK_FIELD_TYPE_CODES,
  PortfolioMaskFieldTypeCode,
  PortfolioMaskFieldTypeDescription,
} from '@/types/enums/portfolio-mask-field-type-enum'
import {
  ALL_PORTFOLIO_MASK_STRATEGY_CODES,
  PortfolioMaskStrategyCode,
  PortfolioMaskStrategyDescription,
} from '@/types/enums/portfolio-mask-strategy-enum'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const loading = ref(false)
const loadError = ref(false)
const requestToken = ref(0)
const saving = ref(false)
const rows = ref<PortfolioMaskRuleVO[]>([])
const total = ref(0)
const editorOpen = ref(false)
/** 编辑既有规则时携带，供 expectedUpdateTime CAS */
const editingRule = ref<PortfolioMaskRuleVO | null>(null)

const form = reactive({
  fieldType: PortfolioMaskFieldTypeCode.ID_CARD,
  exportScope: PortfolioMaskExportScopeCode.DEPARTMENT,
  maskStrategy: PortfolioMaskStrategyCode.LAST_FOUR,
  enabled: true,
})

const query = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE })

const columns: ColumnsType = [
  { title: '字段类型', key: 'fieldType', width: 140 },
  { title: '导出范围', key: 'exportScope', width: 120 },
  { title: '脱敏策略', key: 'maskStrategy', width: 120 },
  { title: '配置状态', key: 'enabled', width: 90 },
  { title: '消费者覆盖', key: 'consumerSupported', width: 110 },
  { title: '执行记录', key: 'consumerApplied', width: 100 },
  { title: '实际生效', key: 'effective', width: 110 },
  { title: '消费者说明', dataIndex: 'consumerDescription', key: 'consumerDescription', width: 260 },
  { title: '最近应用', dataIndex: 'lastAppliedTime', key: 'lastAppliedTime', width: 170 },
  { title: '更新时间', dataIndex: 'updateTime', key: 'updateTime', width: 170 },
  { title: '操作', key: 'actions', width: 88 },
]

const STRATEGY_PROTECTION_RANK: Record<PortfolioMaskStrategyCode, number> = {
  [PortfolioMaskStrategyCode.FULL]: 0,
  [PortfolioMaskStrategyCode.SUMMARY]: 1,
  [PortfolioMaskStrategyCode.LAST_FOUR]: 2,
  [PortfolioMaskStrategyCode.HIDDEN]: 3,
}

function fieldLabel(code: string) {
  return strictEnumLabel(
    PortfolioMaskFieldTypeDescription,
    code as PortfolioMaskFieldTypeCode,
    '字段类型',
  )
}

function scopeLabel(code: string) {
  return strictEnumLabel(
    PortfolioMaskExportScopeDescription,
    code as PortfolioMaskExportScopeCode,
    '导出范围',
  )
}

function strategyLabel(code: string) {
  return strictEnumLabel(
    PortfolioMaskStrategyDescription,
    code as PortfolioMaskStrategyCode,
    '脱敏策略',
  )
}

function isProtectionWeakened(
  previous: PortfolioMaskRuleVO | null,
  nextStrategy: PortfolioMaskStrategyCode,
  nextEnabled: boolean,
): boolean {
  if (!previous) {
    return false
  }
  if (previous.enabled && !nextEnabled) {
    return true
  }
  return STRATEGY_PROTECTION_RANK[nextStrategy] < STRATEGY_PROTECTION_RANK[previous.maskStrategy]
}

async function loadPage(options?: { errorMessage?: string }): Promise<boolean> {
  const currentToken = requestToken.value + 1
  requestToken.value = currentToken
  const request = { pageNum: query.pageNum, pageSize: query.pageSize }
  loading.value = true
  loadError.value = false
  try {
    const result = await portfolioSecurityApi.pageMaskRule(request)
    if (requestToken.value !== currentToken) return false
    rows.value = result.list ?? []
    total.value = result.total ?? 0
    return true
  } catch (error) {
    if (requestToken.value !== currentToken) return false
    loadError.value = true
    showUserError(error, options?.errorMessage ?? '加载脱敏规则失败')
    return false
  } finally {
    if (requestToken.value === currentToken) loading.value = false
  }
}

function openCreateModal() {
  if (saving.value) return
  editingRule.value = null
  form.fieldType = PortfolioMaskFieldTypeCode.ID_CARD
  form.exportScope = PortfolioMaskExportScopeCode.DEPARTMENT
  form.maskStrategy = PortfolioMaskStrategyCode.LAST_FOUR
  form.enabled = true
  editorOpen.value = true
}

function openEditModal(row: PortfolioMaskRuleVO) {
  if (saving.value) return
  editingRule.value = row
  form.fieldType = row.fieldType
  form.exportScope = row.exportScope
  form.maskStrategy = row.maskStrategy
  form.enabled = row.enabled
  editorOpen.value = true
}

async function saveRule() {
  if (saving.value) return
  const previous
    = editingRule.value
      ?? rows.value.find(
        (row) => row.fieldType === form.fieldType && row.exportScope === form.exportScope,
      )
      ?? null
  if (isProtectionWeakened(previous, form.maskStrategy, form.enabled)) {
    const confirmed = await confirmAsync({
      title: '确认降低脱敏保护？',
      content:
        '将停用规则或改为更弱策略，导出链路可能暴露更多字段。请确认已评估影响范围。',
      type: 'error',
    })
    if (!confirmed) return
  }
  saving.value = true
  const request = {
    fieldType: form.fieldType,
    exportScope: form.exportScope,
    maskStrategy: form.maskStrategy,
    enabled: form.enabled,
    ...(previous?.updateTime ? { expectedUpdateTime: previous.updateTime } : {}),
  }
  try {
    await portfolioSecurityApi.saveMaskRule(request)
    void message.success('脱敏规则已保存')
    editorOpen.value = false
    editingRule.value = null
  } catch (error) {
    showUserError(error, '保存脱敏规则失败')
    return
  } finally {
    saving.value = false
  }
  await loadPage({ errorMessage: '脱敏规则已保存，列表刷新失败' })
}

function onPageChange(page: { current: number, pageSize: number }) {
  query.pageNum = page.current
  query.pageSize = page.pageSize
  void loadPage()
}

onMounted(() => {
  void loadPage()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="脱敏规则"
        subtitle="§8.24 导出字段脱敏策略"
      >
        <template #actions>
          <UiButton size="sm" :disabled="loading || saving" @click="loadPage()">
            刷新
          </UiButton>
        </template>
      </ContextBar>
    </template>
    <UiCard>
      <UiButton
        size="sm"
        class="mask-rule-admin__add"
        :disabled="saving"
        @click="openCreateModal"
      >
        配置规则
      </UiButton>
      <UiDataTable
        v-model:current="query.pageNum"
        v-model:page-size="query.pageSize"
        row-key="id"
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :load-error="loadError"
        pagination-mode="server"
        :total="total"
        @page-change="onPageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'fieldType'">
            {{ fieldLabel(record.fieldType) }}
          </template>
          <template v-else-if="column.key === 'exportScope'">
            {{ scopeLabel(record.exportScope) }}
          </template>
          <template v-else-if="column.key === 'maskStrategy'">
            {{ strategyLabel(record.maskStrategy) }}
          </template>
          <template v-else-if="column.key === 'enabled'">
            <UiTag :tone="record.enabled ? 'blue' : 'gray'">
              {{ record.enabled ? '启用' : '停用' }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'consumerSupported'">
            <UiTag :tone="record.consumerSupported ? 'green' : 'red'">
              {{ record.consumerSupported ? '已覆盖' : '未覆盖' }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'consumerApplied'">
            <UiTag :tone="record.consumerApplied ? 'green' : 'orange'">
              {{ record.consumerApplied ? '已执行' : '未执行' }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'effective'">
            <UiTag
              :tone="
                record.effective
                  ? 'green'
                  : !record.enabled
                    ? 'gray'
                    : record.consumerSupported
                      ? 'orange'
                      : 'red'
              "
            >
              {{
                record.effective
                  ? '已实际生效'
                  : !record.enabled
                    ? '未启用'
                    : record.consumerSupported
                      ? '待执行验证'
                      : '无消费者'
              }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiButton size="sm" variant="ghost" :disabled="saving" @click="openEditModal(record)">
              编辑
            </UiButton>
          </template>
        </template>
      </UiDataTable>
    </UiCard>
    <UiDialog
      v-model:open="editorOpen"
      :title="editingRule ? '编辑脱敏规则' : '配置脱敏规则'"
      :confirm-loading="saving"
      :closable="!saving"
      :mask-closable="!saving"
      @ok="saveRule"
    >
      <UiSelect
        size="sm"
        v-model="form.fieldType"
        class="mask-rule-admin__field"
        :options="
          ALL_PORTFOLIO_MASK_FIELD_TYPE_CODES.map((c) => ({
            value: c,
            label: PortfolioMaskFieldTypeDescription[c],
          }))
        "
        :disabled="saving || !!editingRule"
      />
      <UiSelect
        size="sm"
        v-model="form.exportScope"
        class="mask-rule-admin__field"
        :options="
          ALL_PORTFOLIO_MASK_EXPORT_SCOPE_CODES.map((c) => ({
            value: c,
            label: PortfolioMaskExportScopeDescription[c],
          }))
        "
        :disabled="saving || !!editingRule"
      />
      <UiSelect
        size="sm"
        v-model="form.maskStrategy"
        class="mask-rule-admin__field"
        :options="
          ALL_PORTFOLIO_MASK_STRATEGY_CODES.map((c) => ({
            value: c,
            label: PortfolioMaskStrategyDescription[c],
          }))
        "
        :disabled="saving"
      />
      <UiSwitch
        size="sm"
        v-model="form.enabled"
        checked-children="启用"
        un-checked-children="停用"
        :disabled="saving"
      />
    </UiDialog>
  </StageWorkbenchShell>
</template>

<style scoped>
.mask-rule-admin__add {
  margin-bottom: var(--dp-space-component);
}
.mask-rule-admin__field {
  display: block;
  width: 100%;
  margin-bottom: var(--dp-space-component-tight);
}
</style>

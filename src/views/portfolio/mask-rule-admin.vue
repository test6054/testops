<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioMaskRuleVO } from '@/apis/portfolio/governance'
import { message } from 'ant-design-vue'
import { onMounted, reactive, ref } from 'vue'
import { portfolioSecurityApi } from '@/apis/portfolio/governance'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
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
  { title: '状态', key: 'enabled', width: 80 },
  { title: '更新时间', dataIndex: 'updateTime', key: 'updateTime', width: 170 },
]

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

async function loadPage() {
  const currentToken = requestToken.value + 1
  requestToken.value = currentToken
  const request = { pageNum: query.pageNum, pageSize: query.pageSize }
  loading.value = true
  loadError.value = false
  try {
    const result = await portfolioSecurityApi.pageMaskRule(request)
    if (requestToken.value !== currentToken) return
    rows.value = result.list ?? []
    total.value = result.total ?? 0
  } catch (error) {
    if (requestToken.value !== currentToken) return
    rows.value = []
    total.value = 0
    loadError.value = true
    showUserError(error, '加载脱敏规则失败')
  } finally {
    if (requestToken.value === currentToken) loading.value = false
  }
}

async function saveRule() {
  if (saving.value) return
  saving.value = true
  const request = {
    fieldType: form.fieldType,
    exportScope: form.exportScope,
    maskStrategy: form.maskStrategy,
    enabled: form.enabled,
  }
  try {
    await portfolioSecurityApi.saveMaskRule(request)
    message.success('脱敏规则已保存')
    editorOpen.value = false
    await loadPage()
  } catch (error) {
    showUserError(error, '保存脱敏规则失败')
  } finally {
    saving.value = false
  }
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
      />
    </template>
    <UiCard>
      <UiButton class="mask-rule-admin__add" :disabled="saving" @click="editorOpen = true">
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
            <UiTag :tone="record.enabled ? 'green' : 'gray'">
              {{ record.enabled ? '启用' : '停用' }}
            </UiTag>
          </template>
        </template>
      </UiDataTable>
    </UiCard>
    <a-modal
      v-model:open="editorOpen"
      title="配置脱敏规则"
      :confirm-loading="saving"
      :closable="!saving"
      :mask-closable="!saving"
      :keyboard="!saving"
      :cancel-button-props="{ disabled: saving }"
      @ok="saveRule"
    >
      <a-select
        v-model:value="form.fieldType"
        class="mask-rule-admin__field"
        :options="
          ALL_PORTFOLIO_MASK_FIELD_TYPE_CODES.map((c) => ({
            value: c,
            label: PortfolioMaskFieldTypeDescription[c],
          }))
        "
        :disabled="saving"
      />
      <a-select
        v-model:value="form.exportScope"
        class="mask-rule-admin__field"
        :options="
          ALL_PORTFOLIO_MASK_EXPORT_SCOPE_CODES.map((c) => ({
            value: c,
            label: PortfolioMaskExportScopeDescription[c],
          }))
        "
        :disabled="saving"
      />
      <a-select
        v-model:value="form.maskStrategy"
        class="mask-rule-admin__field"
        :options="
          ALL_PORTFOLIO_MASK_STRATEGY_CODES.map((c) => ({
            value: c,
            label: PortfolioMaskStrategyDescription[c],
          }))
        "
        :disabled="saving"
      />
      <a-switch
        v-model:checked="form.enabled"
        checked-children="启用"
        un-checked-children="停用"
        :disabled="saving"
      />
    </a-modal>
  </StageWorkbenchShell>
</template>

<style scoped>
.mask-rule-admin__add {
  margin-bottom: 12px;
}
.mask-rule-admin__field {
  display: block;
  width: 100%;
  margin-bottom: 8px;
}
</style>

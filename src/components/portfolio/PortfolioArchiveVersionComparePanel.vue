<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioArchiveRecordCompareVO,
  PortfolioArchiveRecordFieldDiffVO,
  PortfolioArchiveRecordVersionVO,
} from '@/apis/portfolio/types'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { computed, ref, watch } from 'vue'
import { portfolioArchiveApi } from '@/apis/portfolio/archive'
import { PortfolioArchiveRecordStatusDescription } from '@/apis/portfolio/enums'
import { PORTFOLIO_ARCHIVE_RECORD_STATUS_TONE } from '@/apis/portfolio/types'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiButton from '@/components/ui-guide/ui/UiButton.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import UiTag from '@/components/ui-guide/ui/UiTag.vue'
import {
  PORTFOLIO_ARCHIVE_FIELD_DIFF_CHANGE_TYPE_TONE,
  PortfolioArchiveFieldDiffChangeTypeCode,
  PortfolioArchiveFieldDiffChangeTypeDescription,
} from '@/types/enums/portfolio-archive-field-diff-change-type-enum'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  versions: PortfolioArchiveRecordVersionVO[]
  defaultLeftId?: string
  defaultRightId?: string
}>()

const loading = ref(false)
const leftId = ref('')
const rightId = ref('')
const compareResult = ref<PortfolioArchiveRecordCompareVO | null>(null)
const onlyChanged = ref(true)

const sortedVersions = computed(() =>
  [...props.versions].sort((a, b) => (b.documentVersionNo ?? 0) - (a.documentVersionNo ?? 0)),
)

const versionOptions = computed(() =>
  sortedVersions.value.map((item) => ({
    value: item.id,
    label: `v${item.documentVersionNo ?? 1} · ${strictEnumLabel(PortfolioArchiveRecordStatusDescription, item.recordStatus, '档案记录状态')} · ${item.updateTime ?? ''}`,
  })),
)

const displayDiffs = computed(() => {
  const rows = compareResult.value?.fieldDiffs ?? []
  if (!onlyChanged.value) {
    return rows
  }
  return rows.filter(
    (row: PortfolioArchiveRecordFieldDiffVO) =>
      row.changeType !== PortfolioArchiveFieldDiffChangeTypeCode.UNCHANGED,
  )
})

const columns: ColumnsType = [
  { title: '字段', dataIndex: 'fieldLabel', key: 'fieldLabel', width: 140 },
  { title: '变更', key: 'changeType', width: 88 },
  { title: '左侧值', dataIndex: 'leftValue', key: 'leftValue', ellipsis: true },
  { title: '右侧值', dataIndex: 'rightValue', key: 'rightValue', ellipsis: true },
]

watch(
  () => open.value,
  (visible) => {
    if (!visible) {
      return
    }
    const list = sortedVersions.value
    leftId.value = props.defaultLeftId || list[1]?.id || list[0]?.id || ''
    rightId.value = props.defaultRightId || list[0]?.id || ''
    compareResult.value = null
    if (leftId.value && rightId.value && leftId.value !== rightId.value) {
      void runCompare()
    }
  },
)

async function runCompare() {
  if (!leftId.value || !rightId.value || leftId.value === rightId.value) {
    return
  }
  loading.value = true
  try {
    compareResult.value = await portfolioArchiveApi.compareVersions(leftId.value, rightId.value)
  } catch (error) {
    showUserError(error, '对比档案版本失败')
    compareResult.value = null
  } finally {
    loading.value = false
  }
}

function changeTypeLabel(code: string) {
  return strictEnumLabel(
    PortfolioArchiveFieldDiffChangeTypeDescription,
    code as keyof typeof PortfolioArchiveFieldDiffChangeTypeDescription,
    '字段变更类型',
  )
}

function changeTypeTone(code: string): BadgeTone {
  return strictEnumTone(
    PORTFOLIO_ARCHIVE_FIELD_DIFF_CHANGE_TYPE_TONE,
    code as keyof typeof PORTFOLIO_ARCHIVE_FIELD_DIFF_CHANGE_TYPE_TONE,
    '字段变更类型',
  )
}
</script>

<template>
  <UiDrawer v-model:open="open" title="版本内容对比" width="880">
    <div class="version-compare__toolbar">
      <select v-model="leftId" class="version-compare__select">
        <option v-for="item in versionOptions" :key="`L-${item.value}`" :value="item.value">
          {{ item.label }}
        </option>
      </select>
      <span class="version-compare__arrow">→</span>
      <select v-model="rightId" class="version-compare__select">
        <option v-for="item in versionOptions" :key="`R-${item.value}`" :value="item.value">
          {{ item.label }}
        </option>
      </select>
      <UiButton size="sm" :loading="loading" @click="runCompare">对比</UiButton>
      <label class="version-compare__filter">
        <input v-model="onlyChanged" type="checkbox" />
        仅看差异
      </label>
    </div>
    <p v-if="compareResult" class="version-compare__summary">
      差异字段 {{ compareResult.changedFieldCount }} · 未变
      {{ compareResult.unchangedFieldCount }}
      <template v-if="compareResult.leftVersion">
        · 左 v{{ compareResult.leftVersion.documentVersionNo ?? 1 }}
        <UiTag
          :tone="
            strictEnumTone(
              PORTFOLIO_ARCHIVE_RECORD_STATUS_TONE,
              compareResult.leftVersion.recordStatus,
              '档案记录状态',
            )
          "
        >
          {{
            strictEnumLabel(
              PortfolioArchiveRecordStatusDescription,
              compareResult.leftVersion.recordStatus,
              '档案记录状态',
            )
          }}
        </UiTag>
      </template>
      <template v-if="compareResult.rightVersion">
        · 右 v{{ compareResult.rightVersion.documentVersionNo ?? 1 }}
        <UiTag
          :tone="
            strictEnumTone(
              PORTFOLIO_ARCHIVE_RECORD_STATUS_TONE,
              compareResult.rightVersion.recordStatus,
              '档案记录状态',
            )
          "
        >
          {{
            strictEnumLabel(
              PortfolioArchiveRecordStatusDescription,
              compareResult.rightVersion.recordStatus,
              '档案记录状态',
            )
          }}
        </UiTag>
      </template>
    </p>
    <UiSpin :spinning="loading">
      <UiDataTable
        v-if="displayDiffs.length"
        row-key="fieldCode"
        size="sm"
        pagination-mode="none"
        :columns="columns"
        :data-source="displayDiffs"
        :show-pagination="false"
        :sticky-header="false"
        flat
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'changeType'">
            <UiTag :tone="changeTypeTone(record.changeType)">
              {{ changeTypeLabel(record.changeType) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'leftValue'">
            <span>{{ record.leftValue || '—' }}</span>
            <span v-if="record.leftEvidenceRef" class="version-compare__evidence">
              证据：{{ record.leftEvidenceRef }}
            </span>
          </template>
          <template v-else-if="column.key === 'rightValue'">
            <span>{{ record.rightValue || '—' }}</span>
            <span v-if="record.rightEvidenceRef" class="version-compare__evidence">
              证据：{{ record.rightEvidenceRef }}
            </span>
          </template>
        </template>
      </UiDataTable>
      <UiEmpty size="sm" v-else-if="!loading && compareResult" title="暂无内容" />
      <UiEmpty size="sm" v-else-if="!loading" title="暂无内容" />
    </UiSpin>
  </UiDrawer>
</template>

<style scoped lang="scss">
.version-compare__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}

.version-compare__select {
  min-width: 220px;
  max-width: 320px;
  height: 32px;
  padding: 0 8px;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-xs);
  background: var(--dp-surface);
}

.version-compare__arrow {
  color: var(--dp-text-secondary);
}

.version-compare__filter {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}

.version-compare__summary {
  margin: 0 0 12px;
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}

.version-compare__evidence {
  display: block;
  margin-top: 4px;
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-tertiary);
}
</style>

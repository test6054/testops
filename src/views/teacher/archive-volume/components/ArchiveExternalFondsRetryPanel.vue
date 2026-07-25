<template>
  <WorkbenchSurfaceCard flush>
    <template #head>
      <span>外部全宗自动建卷重试</span>
    </template>
    <p class="archive-ext-fonds-retry__hint">
      科研 / 毕设 / 学籍自动建卷进入待重试或人工介入后，从队列定位并重新触发（须学院教务协调职责）。
    </p>
    <WorkbenchContextGateStrip
      v-if="!loading && !loadError && canManageExternalFondsRetry !== true"
      tag="无写权限"
      body="当前账号可查看队列，但重试须 COLLEGE_COORDINATOR 职责。请联系租户管理员在「职责授权」中配置教务协调后操作。"
      hide-cta
      tone="warning"
    />
    <div class="archive-ext-fonds-retry__filters">
      <UiSelect
        v-model="filters.provenance"
        :options="provenanceOptions"
        allow-clear
        placeholder="任务来源"
      />
      <UiSelect
        v-model="filters.pendingStatus"
        :options="statusFilterOptions"
        allow-clear
        placeholder="队列状态（默认待处理）"
      />
      <UiInput
        v-model="filters.externalBusinessNoKeyword"
        placeholder="外部业务编号"
        allow-clear
        @enter="reload"
      />
      <UiButton size="sm" :loading="loading === true" @click="reload">查询</UiButton>
    </div>
    <UiDataTable
      :columns="columns"
      :data-source="rows"
      :loading="loading === true"
      :load-error="loadError"
      row-key="pendingId"
      size="small"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'provenance'">
          {{ strictEnumLabel(ArchiveTaskProvenanceDescription, record.provenance, 'provenance') }}
        </template>
        <template v-else-if="column.key === 'pendingStatus'">
          {{
            strictEnumLabel(
              ArchiveVolumeAutoCreatePendingStatusDescription,
              record.pendingStatus,
              'pendingStatus',
            )
          }}
        </template>
        <template v-else-if="column.key === 'failureCategory'">
          {{
            record.failureCategory
              ? strictEnumLabel(
                ArchiveVolumeAutoCreateFailureCategoryDescription,
                record.failureCategory,
                'failureCategory',
              )
              : '—'
          }}
        </template>
        <template v-else-if="column.key === 'lastError'">
          <span class="archive-ext-fonds-retry__error">{{ record.lastError || '—' }}</span>
        </template>
        <template v-else-if="column.key === 'actions'">
          <UiButton
            v-if="
              canManageExternalFondsRetry === true
                && record.pendingStatus === ArchiveVolumeAutoCreatePendingStatusCode.MANUAL_REQUIRED
            "
            variant="primary"
            size="sm"
            :loading="retryingKey === rowRetryKey(record)"
            @click="retryRow(record)"
          >
            重新触发
          </UiButton>
          <span
            v-else-if="
              canManageExternalFondsRetry !== true
                && record.pendingStatus === ArchiveVolumeAutoCreatePendingStatusCode.MANUAL_REQUIRED
            "
            class="archive-ext-fonds-retry__muted"
          >仅教务协调可重试</span>
          <span v-else class="archive-ext-fonds-retry__muted">调度重试中</span>
        </template>
      </template>
    </UiDataTable>
    <UiPagination
      v-if="total > 0"
      v-model:current="pageNum"
      v-model:page-size="pageSize"
      class="archive-ext-fonds-retry__pager"
      :total="total"
      @change="onPageChange"
    />
    <UiForm v-if="canManageExternalFondsRetry === true" class="archive-ext-fonds-retry__form">
      <div class="archive-ext-fonds-retry__row">
        <label class="archive-ext-fonds-retry__label">手动补录外部键重试</label>
        <UiSelect
          v-model="manualForm.provenance"
          :options="provenanceOptions"
          :allow-clear="false"
          placeholder="选择全宗来源"
        />
      </div>
      <div class="archive-ext-fonds-retry__row">
        <label class="archive-ext-fonds-retry__label">外部来源系统</label>
        <UiInput v-model="manualForm.externalSourceSystem" placeholder="如 RESEARCH_SYS" />
      </div>
      <div class="archive-ext-fonds-retry__row">
        <label class="archive-ext-fonds-retry__label">外部业务编号</label>
        <UiInput v-model="manualForm.externalBusinessNo" placeholder="项目号 / 课题号 / 学号届次" />
      </div>
      <div class="archive-ext-fonds-retry__actions">
        <UiButton
          variant="primary"
          size="sm"
          :loading="manualSubmitting === true"
          @click="submitManualRetry"
        >
          按外部键重新触发
        </UiButton>
      </div>
    </UiForm>
  </WorkbenchSurfaceCard>
</template>

<script setup lang="ts">
// MVR-946：模板 canManage* 显隐/禁用仅认 === true
// MVR-943：can*/writeAllowed 控制流仅认 === true / !== true
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { ArchiveExternalFondsPendingResponse } from '@/apis/mark/archive-volume'
import { message } from 'ant-design-vue'
import { onMounted, reactive, ref } from 'vue'
import { pageExternalFondsPending, retryExternalFondsAutoCreate } from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiPagination from '@/components/ui-guide/ui/Pagination.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import WorkbenchContextGateStrip from '@/components/workbench/WorkbenchContextGateStrip.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { ArchiveVolumeAutoCreateFailureCategoryDescription } from '@/constants/archive-volume-auto-create-failure-category'
import {
  ArchiveTaskProvenanceCode,
  ArchiveTaskProvenanceDescription,
} from '@/types/enums/archive-task-provenance-enum'
import {
  ArchiveVolumeAutoCreatePendingStatusCode,
  ArchiveVolumeAutoCreatePendingStatusDescription,
} from '@/types/enums/archive-volume-auto-create-pending-status-enum'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const loading = ref(false)
const loadError = ref(false)
const rows = ref<ArchiveExternalFondsPendingResponse[]>([])
const pageNum = ref(1)
const pageSize = ref(10)
const total = ref(0)
const retryingKey = ref('')
const manualSubmitting = ref(false)
/** MVR-290：默认拒绝假可写；仅 BE 下发 canManageExternalFondsRetry=true 时开放重试 */
const canManageExternalFondsRetry = ref(false)

const filters = reactive({
  provenance: undefined as ArchiveTaskProvenanceCode | undefined,
  pendingStatus: undefined as ArchiveVolumeAutoCreatePendingStatusCode | undefined,
  externalBusinessNoKeyword: '',
})

const manualForm = reactive({
  provenance: ArchiveTaskProvenanceCode.RESEARCH_PROJECT_AUTO as ArchiveTaskProvenanceCode,
  externalSourceSystem: '',
  externalBusinessNo: '',
})

const provenanceOptions = [
  ArchiveTaskProvenanceCode.RESEARCH_PROJECT_AUTO,
  ArchiveTaskProvenanceCode.THESIS_AUTO,
  ArchiveTaskProvenanceCode.STUDENT_RECORD_AUTO,
].map((value) => ({
  value,
  label: ArchiveTaskProvenanceDescription[value],
}))

const statusFilterOptions = [
  {
    value: ArchiveVolumeAutoCreatePendingStatusCode.MANUAL_REQUIRED,
    label:
      ArchiveVolumeAutoCreatePendingStatusDescription[
        ArchiveVolumeAutoCreatePendingStatusCode.MANUAL_REQUIRED
      ],
  },
  {
    value: ArchiveVolumeAutoCreatePendingStatusCode.PENDING,
    label:
      ArchiveVolumeAutoCreatePendingStatusDescription[
        ArchiveVolumeAutoCreatePendingStatusCode.PENDING
      ],
  },
]

const columns: ColumnsType<ArchiveExternalFondsPendingResponse> = [
  { title: '任务来源', key: 'provenance', dataIndex: 'provenance', width: 140 },
  { title: '来源系统', key: 'externalSourceSystem', dataIndex: 'externalSourceSystem', width: 140 },
  { title: '业务编号', key: 'externalBusinessNo', dataIndex: 'externalBusinessNo', width: 160 },
  { title: '院系', key: 'departmentName', dataIndex: 'departmentName', width: 120 },
  { title: '状态', key: 'pendingStatus', dataIndex: 'pendingStatus', width: 110, align: 'center' },
  { title: '失败类别', key: 'failureCategory', dataIndex: 'failureCategory', width: 140 },
  { title: '失败原因', key: 'lastError', dataIndex: 'lastError' },
  { title: '更新时间', key: 'updateTime', dataIndex: 'updateTime', width: 170 },
  { title: '操作', key: 'actions', width: 120 },
]

function rowRetryKey(record: ArchiveExternalFondsPendingResponse): string {
  return `${record.provenance}|${record.externalSourceSystem}|${record.externalBusinessNo}`
}

async function reload(): Promise<void> {
  loading.value = true
  loadError.value = false
  try {
    const result = await pageExternalFondsPending({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      provenance: filters.provenance,
      pendingStatus: filters.pendingStatus,
      externalBusinessNoKeyword: filters.externalBusinessNoKeyword.trim() || undefined,
    })
    // MVR-290：页级能力位优先；空列表也可靠 page.canManageExternalFondsRetry
    canManageExternalFondsRetry.value = result.canManageExternalFondsRetry === true
    rows.value = result.list ?? []
    total.value = result.total ?? 0
  } catch (error) {
    loadError.value = true
    rows.value = []
    total.value = 0
    canManageExternalFondsRetry.value = false
    showUserError(error, '加载外部全宗待重试队列失败')
  } finally {
    loading.value = false
  }
}

function onPageChange(): void {
  void reload()
}

async function retryRow(record: ArchiveExternalFondsPendingResponse): Promise<void> {
  if (canManageExternalFondsRetry.value !== true) {
    void message.error('仅具备学院教务协调职责的用户可重试外部全宗自动建卷')
    return
  }
  // MVR-937：任一重试/手工提交进行中禁止并发触发
  if (Boolean(retryingKey.value) || manualSubmitting.value === true) {
    return
  }
  retryingKey.value = rowRetryKey(record)
  try {
    await retryExternalFondsAutoCreate({
      provenance: record.provenance,
      externalSourceSystem: record.externalSourceSystem,
      externalBusinessNo: record.externalBusinessNo,
    })
    void message.success('已重新触发外部全宗自动建卷')
    await reload()
  } catch (error) {
    showUserError(error, '重新触发外部全宗自动建卷失败')
  } finally {
    retryingKey.value = ''
  }
}

async function submitManualRetry(): Promise<void> {
  if (canManageExternalFondsRetry.value !== true) {
    void message.error('仅具备学院教务协调职责的用户可重试外部全宗自动建卷')
    return
  }
  // MVR-937：与行级重试互斥，禁止并发
  if (manualSubmitting.value === true || Boolean(retryingKey.value)) {
    return
  }
  const externalSourceSystem = manualForm.externalSourceSystem.trim()
  const externalBusinessNo = manualForm.externalBusinessNo.trim()
  if (!externalSourceSystem || !externalBusinessNo) {
    void message.error('请填写外部来源系统与业务编号')
    return
  }
  manualSubmitting.value = true
  try {
    await retryExternalFondsAutoCreate({
      provenance: manualForm.provenance,
      externalSourceSystem,
      externalBusinessNo,
    })
    void message.success('已重新触发外部全宗自动建卷')
    await reload()
  } catch (error) {
    showUserError(error, '重新触发外部全宗自动建卷失败')
  } finally {
    manualSubmitting.value = false
  }
}

onMounted(() => {
  void reload()
})
</script>

<style scoped lang="scss">
.archive-ext-fonds-retry__hint {
  margin: 0 0 16px;
  font-size: var(--dp-font-size-sm);
  line-height: 1.5;
  color: var(--dp-text-muted);
}

.archive-ext-fonds-retry__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
  max-width: 960px;
}

.archive-ext-fonds-retry__pager {
  margin: 12px 0 24px;
}

.archive-ext-fonds-retry__form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 480px;
  padding-top: 8px;
  border-top: 1px solid var(--dp-border-secondary);
}

.archive-ext-fonds-retry__row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.archive-ext-fonds-retry__label {
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}

.archive-ext-fonds-retry__actions {
  margin-top: 8px;
}

.archive-ext-fonds-retry__error {
  display: inline-block;
  max-width: 280px;
  color: var(--dp-text-secondary);
  word-break: break-all;
}

.archive-ext-fonds-retry__muted {
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-muted);
}
</style>

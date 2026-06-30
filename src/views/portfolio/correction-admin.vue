<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioCorrectionHandleAction,
  PortfolioCorrectionRequestStatus,
  PortfolioCorrectionSummaryVO,
} from '@/apis/portfolio/types'
import { Input, message } from 'ant-design-vue'
import { reactive, ref } from 'vue'
import { portfolioCorrectionApi } from '@/apis/portfolio/correction'
import {
  PORTFOLIO_CORRECTION_REQUEST_STATUS_LABEL,
  PORTFOLIO_CORRECTION_REQUEST_STATUS_TONE,
} from '@/apis/portfolio/types'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

function statusLabel(status: PortfolioCorrectionRequestStatus): string {
  return strictEnumLabel(PORTFOLIO_CORRECTION_REQUEST_STATUS_LABEL, status, '纠错工单状态')
}

function statusTone(status: PortfolioCorrectionRequestStatus) {
  return strictEnumTone(PORTFOLIO_CORRECTION_REQUEST_STATUS_TONE, status, '纠错工单状态')
}

const loading = ref(false)
const handlingId = ref('')
const rows = ref<PortfolioCorrectionSummaryVO[]>([])
const pageNum = ref(1)
const pageSize = ref(10)
const pageTotal = ref(0)
const rejectDrawerOpen = ref(false)
const rejectTarget = ref<PortfolioCorrectionSummaryVO | null>(null)
const rejectForm = reactive({ handleOpinion: '' })

const columns: ColumnsType<PortfolioCorrectionSummaryVO> = [
  { title: '教师', key: 'teacherName', width: 120 },
  { title: '分类', dataIndex: 'categoryName', key: 'categoryName', width: 120 },
  { title: '字段', dataIndex: 'fieldLabel', key: 'fieldLabel', width: 120 },
  { title: '状态', key: 'requestStatus', width: 110 },
  { title: '原因', dataIndex: 'reason', key: 'reason' },
  { title: '操作', key: 'actions', width: 220, fixed: 'right' },
]

async function loadPage() {
  loading.value = true
  try {
    const page = await portfolioCorrectionApi.pageCorrections({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
    })
    rows.value = readPageList(page, '加载纠错工单失败')
    pageTotal.value = readPageTotal(page)
  }
  catch (error) {
    showUserError(error, '加载纠错工单失败')
  }
  finally {
    loading.value = false
  }
}

async function handleRow(row: PortfolioCorrectionSummaryVO, action: PortfolioCorrectionHandleAction, handleOpinion?: string) {
  handlingId.value = row.id
  try {
    await portfolioCorrectionApi.handleCorrection({
      correctionRequestId: row.id,
      action,
      ...(handleOpinion ? { handleOpinion } : {}),
    })
    message.success('处理成功')
    rejectDrawerOpen.value = false
    rejectTarget.value = null
    rejectForm.handleOpinion = ''
    await loadPage()
  }
  catch (error) {
    showUserError(error, '处理纠错失败')
  }
  finally {
    handlingId.value = ''
  }
}

function openRejectDrawer(row: PortfolioCorrectionSummaryVO) {
  rejectTarget.value = row
  rejectForm.handleOpinion = ''
  rejectDrawerOpen.value = true
}

async function submitReject() {
  if (!rejectTarget.value) {
    return
  }
  const opinion = rejectForm.handleOpinion.trim()
  if (!opinion) {
    message.warning('请填写驳回意见')
    return
  }
  await handleRow(rejectTarget.value, 'REJECT', opinion)
}

void loadPage()
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar title="纠错处理" description="管理端受理与流转纠错工单">
      <template #actions>
        <UiButton :loading="loading" @click="() => void loadPage()">
          刷新
        </UiButton>
      </template>
    </ContextBar>

    <UiCard title="纠错工单">
      <UiDataTable
        v-if="rows.length || loading"
        v-model:current="pageNum"
        v-model:page-size="pageSize"
        pagination-mode="server"
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :total="pageTotal"
        row-key="id"
        @page-change="() => void loadPage()"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'teacherName'">
            {{ record.teacherName }}
          </template>
          <template v-else-if="column.key === 'requestStatus'">
            <UiTag :tone="statusTone(record.requestStatus)">
              {{ statusLabel(record.requestStatus) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <div class="operations-cell">
              <UiButton
                v-if="record.requestStatus === 'SUBMITTED'"
                variant="primary"
                size="sm"
                :loading="handlingId === record.id"
                @click="() => void handleRow(record, 'ACCEPT')"
              >
                受理
              </UiButton>
              <template v-if="record.requestStatus === 'ACCEPTING'">
                <button
                  type="button"
                  class="op-link op-link--danger"
                  :disabled="handlingId === record.id"
                  @click="openRejectDrawer(record)"
                >
                  驳回
                </button>
                <button
                  type="button"
                  class="op-link"
                  :disabled="handlingId === record.id"
                  @click="() => void handleRow(record, 'MARK_ARCHIVE_CORRECTING')"
                >
                  档案更正
                </button>
                <button
                  type="button"
                  class="op-link"
                  :disabled="handlingId === record.id"
                  @click="() => void handleRow(record, 'MARK_SOURCE_FIXING')"
                >
                  源系统整改
                </button>
              </template>
              <button
                v-if="record.requestStatus === 'SOURCE_FIXING'"
                type="button"
                class="op-link op-link--primary"
                :disabled="handlingId === record.id"
                @click="() => void handleRow(record, 'MARK_PENDING_VERIFY')"
              >
                标记待验证
              </button>
              <button
                v-if="record.requestStatus === 'PENDING_VERIFY' || record.requestStatus === 'ARCHIVE_CORRECTING'"
                type="button"
                class="op-link op-link--primary"
                :disabled="handlingId === record.id"
                @click="() => void handleRow(record, 'CLOSE')"
              >
                关闭
              </button>
            </div>
          </template>
        </template>
      </UiDataTable>
      <UiEmpty v-else description="暂无纠错工单" />
    </UiCard>

    <UiDrawer
      v-model:open="rejectDrawerOpen"
      title="驳回纠错"
      width="420"
    >
      <p v-if="rejectTarget" class="correction-admin__reject-meta">
        {{ rejectTarget.teacherName }} · {{ rejectTarget.fieldLabel ?? rejectTarget.fieldCode }}
      </p>
      <Input.TextArea
        v-model:value="rejectForm.handleOpinion"
        :rows="4"
        placeholder="请填写驳回意见"
      />
      <template #footer>
        <UiButton variant="ghost" @click="rejectDrawerOpen = false">
          取消
        </UiButton>
        <UiButton
          variant="primary"
          :loading="!!handlingId"
          @click="() => void submitReject()"
        >
          确认驳回
        </UiButton>
      </template>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.correction-admin__reject-meta {
  margin: 0 0 var(--dp-space-3, 12px);
  font-size: 14px;
  color: var(--dp-text-secondary);
}
</style>

<script setup lang="ts">
import type {
  PortfolioConflictTicketVO,
  PortfolioIntegrationMessageInboxVO,
  PortfolioNationalReportIssueVO,
} from '@/apis/portfolio/integration'
import type { UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import { inject } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import WorkbenchContextGateStrip from '@/components/workbench/WorkbenchContextGateStrip.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { PortfolioConflictTicketStatusEnum } from '@/types/enums/portfolio-conflict-ticket-status-enum'
import { PortfolioIdentityUnmatchedStatusEnum } from '@/types/enums/portfolio-identity-unmatched-status-enum'
import { PortfolioIntegrationHealthStatusEnum } from '@/types/enums/portfolio-integration-health-status-enum'
import {
  ALL_PORTFOLIO_NATIONAL_REPORT_ISSUE_STATUS_CODES,
  PortfolioNationalReportIssueStatusCode,
  PortfolioNationalReportIssueStatusDescription,
} from '@/types/enums/portfolio-national-report-issue-status-enum'
import { strictEnumLabel } from '@/utils/strict-enum'
import { INTEGRATION_WRITE_WORKBENCH_CTX } from '../integration-write-workbench-ctx'

defineOptions({ name: 'IntegrationWriteSecondaryPanels' })

const ctx = inject(INTEGRATION_WRITE_WORKBENCH_CTX)
if (!ctx) {
  throw new Error('IntegrationWriteSecondaryPanels 必须在 IntegrationWriteWorkbench 内使用')
}

const activeTab = ctx.activeTab
const writing = ctx.writing
const operationKey = ctx.operationKey
const loadState = ctx.loadState
const loadError = ctx.loadError
const unmatched = ctx.unmatched
const unmatchedQuery = ctx.unmatchedQuery
const unmatchedTotal = ctx.unmatchedTotal
const unmatchedColumns = ctx.unmatchedColumns
const conflicts = ctx.conflicts
const conflictQuery = ctx.conflictQuery
const conflictTotal = ctx.conflictTotal
const conflictColumns = ctx.conflictColumns
const nationalIssues = ctx.nationalIssues
const nationalIssueQuery = ctx.nationalIssueQuery
const nationalIssueTotal = ctx.nationalIssueTotal
const nationalIssueColumns = ctx.nationalIssueColumns
const failedMessages = ctx.failedMessages
const failedMessageQuery = ctx.failedMessageQuery
const failedMessageTotal = ctx.failedMessageTotal
const failedMessageColumns = ctx.failedMessageColumns
const failedMessageDatasourceId = ctx.failedMessageDatasourceId
const failedMessageDrawerOpen = ctx.failedMessageDrawerOpen
const selectedFailedMessage = ctx.selectedFailedMessage
const payloadFieldEdits = ctx.payloadFieldEdits
const requeueMessage = ctx.requeueMessage
const messageEnqueueForm = ctx.messageEnqueueForm
const requeueEnvelope = ctx.requeueEnvelope
const health = ctx.health
const datasourceOptions = ctx.datasourceOptions
const messageDatasourceOptions = ctx.messageDatasourceOptions
const teacherOptions = ctx.teacherOptions
const identityResolveRowId = ctx.identityResolveRowId
const identityResolveTeacherId = ctx.identityResolveTeacherId
const identityResolveTeacherNumber = ctx.identityResolveTeacherNumber
const onUnmatchedPageChange = ctx.onUnmatchedPageChange
const onConflictPageChange = ctx.onConflictPageChange
const onNationalIssuePageChange = ctx.onNationalIssuePageChange
const onFailedMessagePageChange = ctx.onFailedMessagePageChange
const searchNationalIssues = ctx.searchNationalIssues
const loadFailedMessages = ctx.loadFailedMessages
const changeFailedMessageDatasource = ctx.changeFailedMessageDatasource
const fixNationalReportIssue = ctx.fixNationalReportIssue
const exportNationalReportForIssue = ctx.exportNationalReportForIssue
const retransmitNationalReportIssues = ctx.retransmitNationalReportIssues
const openFailedMessageFix = ctx.openFailedMessageFix
const requeueFailedMessage = ctx.requeueFailedMessage
const enqueueInboundMessage = ctx.enqueueInboundMessage
const addRequeuePayloadField = ctx.addRequeuePayloadField
const removeRequeuePayloadField = ctx.removeRequeuePayloadField
const addEnqueuePayloadField = ctx.addEnqueuePayloadField
const removeEnqueuePayloadField = ctx.removeEnqueuePayloadField
const resolveIdentityUnmatched = ctx.resolveIdentityUnmatched
const resolveConflict = ctx.resolveConflict
function isCtxWriting(): boolean {
  return Boolean(writing?.value ?? writing)
}

function ctxOperationKey(): string {
  const key = operationKey?.value ?? operationKey
  return typeof key === 'string' ? key : ''
}

/** 全国上报问题：确认已修正为主行动 */
function buildNationalIssueRowActions(record: {
  id: string
  status?: string
  syncTaskId?: string
}): UiTableRowActionItem[] {
  const busy = isCtxWriting()
  return [
    {
      key: 'fix',
      label: '确认已修正',
      tone: 'primary',
      hidden: record.status !== PortfolioNationalReportIssueStatusCode.OPEN,
      disabled: busy || ctxOperationKey() === `national-issue:${record.id}`,
    },
    {
      key: 'export',
      label: '申请导出批次包',
      hidden: !record.syncTaskId,
      disabled: busy || ctxOperationKey() === `national-export:${record.syncTaskId}`,
    },
  ]
}

function handleNationalIssueRowAction(key: string, record: PortfolioNationalReportIssueVO): void {
  if (key === 'fix') {
    fixNationalReportIssue(record)
    return
  }
  if (key === 'export') {
    exportNationalReportForIssue(record)
  }
}

/** 冲突单：保留本地为主行动 */
function buildConflictRowActions(record: { id: string }): UiTableRowActionItem[] {
  const busy = isCtxWriting()
  const op = ctxOperationKey()
  return [
    {
      key: 'local',
      label: '保留本地',
      tone: 'primary',
      disabled:
        busy
        || op === `conflict:${record.id}:${PortfolioConflictTicketStatusEnum.RESOLVED_USE_LOCAL}`,
    },
    {
      key: 'external',
      label: '采用外部',
      disabled:
        busy
        || op === `conflict:${record.id}:${PortfolioConflictTicketStatusEnum.RESOLVED_USE_EXTERNAL}`,
    },
    {
      key: 'ignore',
      label: '忽略',
      disabled: busy || op === `conflict:${record.id}:${PortfolioConflictTicketStatusEnum.IGNORED}`,
    },
  ]
}

function handleConflictRowAction(key: string, record: PortfolioConflictTicketVO): void {
  if (key === 'local') {
    resolveConflict(record, PortfolioConflictTicketStatusEnum.RESOLVED_USE_LOCAL)
    return
  }
  if (key === 'external') {
    resolveConflict(record, PortfolioConflictTicketStatusEnum.RESOLVED_USE_EXTERNAL)
    return
  }
  if (key === 'ignore') {
    resolveConflict(record, PortfolioConflictTicketStatusEnum.IGNORED)
  }
}

/** 异常消息：修正重放/整包替换为主行动 */
function buildFailedMessageRowActions(record: {
  id: string
  payloadContractValid?: boolean
}): UiTableRowActionItem[] {
  const busy = isCtxWriting()
  return [
    {
      key: 'fix',
      label: record.payloadContractValid === false ? '整包替换' : '修正重放',
      tone: 'primary',
      disabled: busy,
    },
    {
      key: 'requeue',
      label: '原载荷重试',
      disabled: busy || record.payloadContractValid === false || ctxOperationKey() === `failed-message:${record.id}`,
    },
  ]
}

function handleFailedMessageRowAction(
  key: string,
  record: PortfolioIntegrationMessageInboxVO,
): void {
  if (key === 'fix') {
    openFailedMessageFix(record)
    return
  }
  if (key === 'requeue') {
    requeueFailedMessage(record)
  }
}

const loadTeachers = ctx.loadTeachers
const handleTeacherSearch = ctx.handleTeacherSearch
const needsTeacherNumber = ctx.needsTeacherNumber
</script>

<template>
  <WorkbenchSurfaceCard v-if="activeTab === 'queue'" class="integration-dashboard__panel">
    <template #head>
      <span class="integration-dashboard__panel-title">待匹配、冲突与全国上报</span>
    </template>
    <h4 class="integration-dashboard__sub-title">身份待匹配</h4>
    <UiDataTable
      v-model:current="unmatchedQuery.pageNum"
      v-model:page-size="unmatchedQuery.pageSize"
      row-key="id"
      :columns="unmatchedColumns"
      :data-source="unmatched"
      :loading="loadState.unmatched"
      :load-error="Boolean(loadError.unmatched)"
      pagination-mode="server"
      :total="unmatchedTotal"
      @page-change="onUnmatchedPageChange"
    >
      <template #bodyCell="{ column, record }">
        <template
          v-if="
            column.key === 'actions'
              && record.status === PortfolioIdentityUnmatchedStatusEnum.PENDING
          "
        >
          <template v-if="identityResolveRowId === record.id">
            <UiSelect
              size="sm"
              v-model="identityResolveTeacherId"
              class="integration-dashboard__teacher-select"
              placeholder="选择本地教师"
              :options="teacherOptions"
              allow-search
              :filter-option="false"
              option-label-prop="label"
              :disabled="writing"
              @focus="() => loadTeachers()"
              @search="handleTeacherSearch"
            />
            <input
              v-if="needsTeacherNumber(record)"
              v-model="identityResolveTeacherNumber"
              class="integration-dashboard__input"
              placeholder="补录工号"
              :disabled="writing"
            />
          </template>
          <UiButton
            v-if="identityResolveRowId !== record.id"
            variant="primary"
            size="sm"
            :disabled="writing"
            @click="
              () => {
                identityResolveRowId = record.id
                identityResolveTeacherId = ''
                identityResolveTeacherNumber = ''
              }
            "
          >
            绑定
          </UiButton>
          <UiButton
            v-else
            variant="primary"
            size="sm"
            :loading="operationKey === `identity:${record.id}:RESOLVED`"
            :disabled="writing"
            @click="
              resolveIdentityUnmatched(record, PortfolioIdentityUnmatchedStatusEnum.RESOLVED)
            "
          >
            确认绑定
          </UiButton>
          <UiButton
            size="sm"
            variant="ghost"
            :loading="operationKey === `identity:${record.id}:IGNORED`"
            :disabled="writing"
            @click="
              resolveIdentityUnmatched(record, PortfolioIdentityUnmatchedStatusEnum.IGNORED)
            "
          >
            忽略
          </UiButton>
        </template>
      </template>
    </UiDataTable>
    <h4 class="integration-dashboard__sub-title">全国教师上报待修正</h4>
    <div class="integration-dashboard__filter-bar">
      <UiSelect
        size="sm"
        v-model="nationalIssueQuery.status"
        allow-clear
        placeholder="全部状态"
        :options="[
          ...ALL_PORTFOLIO_NATIONAL_REPORT_ISSUE_STATUS_CODES.map((value) => ({
            label: PortfolioNationalReportIssueStatusDescription[value],
            value,
          })),
        ]"
        :disabled="writing"
      />
      <UiButton
        size="sm"
        :loading="loadState.nationalIssues"
        :disabled="writing"
        @click="searchNationalIssues"
      >
        查询
      </UiButton>
      <UiButton
        size="sm"
        tone="primary"
        :loading="operationKey === 'national-retransmit'"
        :disabled="writing"
        @click="retransmitNationalReportIssues"
      >
        重传待修正
      </UiButton>
    </div>
    <UiDataTable
      v-model:current="nationalIssueQuery.pageNum"
      v-model:page-size="nationalIssueQuery.pageSize"
      row-key="id"
      :columns="nationalIssueColumns"
      :data-source="nationalIssues"
      :loading="loadState.nationalIssues"
      :load-error="Boolean(loadError.nationalIssues)"
      pagination-mode="server"
      :total="nationalIssueTotal"
      @page-change="onNationalIssuePageChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'issueDetails'">
          {{ (record.issueDetails || []).join('；') }}
        </template>
        <template v-else-if="column.key === 'status'">
          {{
            strictEnumLabel(
              PortfolioNationalReportIssueStatusDescription,
              record.status,
              '全国教师上报问题状态',
            )
          }}
        </template>
        <template v-else-if="column.key === 'actions'">
          <UiTableActions
            :max-visible="2"
            :items="buildNationalIssueRowActions(record)"
            split
            @action="(key) => handleNationalIssueRowAction(key, record)"
          />
        </template>
      </template>
    </UiDataTable>
    <h4 class="integration-dashboard__sub-title">冲突单</h4>
    <UiDataTable
      v-model:current="conflictQuery.pageNum"
      v-model:page-size="conflictQuery.pageSize"
      row-key="id"
      :columns="conflictColumns"
      :data-source="conflicts"
      :loading="loadState.conflicts"
      :load-error="Boolean(loadError.conflicts)"
      pagination-mode="server"
      :total="conflictTotal"
      @page-change="onConflictPageChange"
    >
      <template #bodyCell="{ column, record }">
        <template
          v-if="
            column.key === 'actions'
              && record.ticketStatus === PortfolioConflictTicketStatusEnum.OPEN
          "
        >
          <UiTableActions
            :max-visible="2"
            :items="buildConflictRowActions(record)"
            split
            @action="(key) => handleConflictRowAction(key, record)"
          />
        </template>
      </template>
    </UiDataTable>
  </WorkbenchSurfaceCard>

  <WorkbenchSurfaceCard
    v-else-if="activeTab === 'failed-message'"
    class="integration-dashboard__panel"
  >
    <template #head>
      <span class="integration-dashboard__panel-title">消息推送入站与异常重放</span>
    </template>
    <div class="integration-dashboard__form integration-dashboard__message-enqueue">
      <label>入站数据源</label>
      <UiSelect
        size="sm"
        v-model="messageEnqueueForm.datasourceConfigId"
        placeholder="选择 MESSAGE_PUSH 数据源"
        :options="messageDatasourceOptions"
        :disabled="writing"
      />
      <label>消息幂等键</label>
      <UiInput
        size="sm"
        v-model="messageEnqueueForm.messageKey"
        placeholder="外部系统消息唯一键，重复投递返回同一收件箱"
        :disabled="writing"
      />
      <label>教师工号</label>
      <UiInput
        size="sm"
        v-model="messageEnqueueForm.teacherNumber"
        placeholder="信封身份键 teacherNumber"
        :disabled="writing"
      />
      <label>教师编码</label>
      <UiInput
        size="sm"
        v-model="messageEnqueueForm.teacherCode"
        placeholder="可选，与工号二选一"
        :disabled="writing"
      />
      <label>教师姓名</label>
      <UiInput
        size="sm"
        v-model="messageEnqueueForm.teacherName"
        placeholder="可选"
        :disabled="writing"
      />
      <label>外部记录键</label>
      <UiInput
        size="sm"
        v-model="messageEnqueueForm.externalRecordKey"
        placeholder="可选，缺省用消息幂等键"
        :disabled="writing"
      />
      <label>业务字段袋</label>
      <div class="integration-dashboard__payload-editor">
        <div
          v-for="(item, index) in messageEnqueueForm.fields"
          :key="`enqueue-field-${index}`"
          class="integration-dashboard__payload-field"
        >
          <UiInput
            size="sm"
            v-model="item.fieldCode"
            placeholder="字段编码"
            :disabled="writing"
          />
          <UiInput size="sm" v-model="item.fieldValue" placeholder="字段值" :disabled="writing" />
          <UiButton
            size="sm"
            variant="ghost"
            :disabled="writing"
            @click="removeEnqueuePayloadField(index)"
          >
            删除
          </UiButton>
        </div>
        <UiButton size="sm" variant="ghost" :disabled="writing" @click="addEnqueuePayloadField">
          添加字段
        </UiButton>
      </div>
      <UiButton
        variant="primary"
        size="sm"
        :loading="operationKey === 'message:enqueue'"
        :disabled="writing"
        @click="enqueueInboundMessage"
      >
        投递入站
      </UiButton>
    </div>
    <div class="integration-dashboard__filter-bar" style="margin-top: var(--dp-space-block)">
      <UiSelect
        size="sm"
        v-model="failedMessageDatasourceId"
        placeholder="选择消息推送数据源"
        :options="messageDatasourceOptions"
        :disabled="writing"
        @change="changeFailedMessageDatasource"
      />
      <UiButton
        size="sm"
        :loading="loadState.failedMessages"
        :disabled="writing"
        @click="loadFailedMessages"
      >
        刷新异常队列
      </UiButton>
    </div>
    <UiDataTable
      v-model:current="failedMessageQuery.pageNum"
      v-model:page-size="failedMessageQuery.pageSize"
      row-key="id"
      :columns="failedMessageColumns"
      :data-source="failedMessages"
      :loading="loadState.failedMessages"
      :load-error="Boolean(loadError.failedMessages)"
      pagination-mode="server"
      :total="failedMessageTotal"
      @page-change="onFailedMessagePageChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'payloadContract'">
          <UiTag :tone="record.payloadContractValid === false ? 'red' : 'green'">
            {{ record.payloadContractValid === false ? '非法' : '合法' }}
          </UiTag>
        </template>
        <template v-else-if="column.key === 'actions'">
          <UiTableActions
            :max-visible="2"
            :items="buildFailedMessageRowActions(record)"
            split
            @action="(key) => handleFailedMessageRowAction(key, record)"
          />
        </template>
      </template>
      <template #empty>
        <WorkbenchContextGateStrip
          v-if="!failedMessageDatasourceId"
          tag="未选择"
          body="请先选择消息推送数据源后再查看异常重放"
          hide-cta
        />
        <UiEmpty v-else size="sm" description="当前数据源没有异常消息" />
      </template>
    </UiDataTable>
  </WorkbenchSurfaceCard>

  <WorkbenchSurfaceCard v-else-if="activeTab === 'health'" class="integration-dashboard__panel">
    <template #head>
      <span class="integration-dashboard__panel-title">渠道健康看板</span>
    </template>
    <p v-if="loadState.health" class="integration-dashboard__hint">加载中…</p>
    <p v-else-if="health?.computedTime" class="integration-dashboard__hint">
      计算时间 {{ health.computedTime }}
    </p>
    <UiEmpty
      size="sm"
      v-if="!loadState.health && loadError.health"
      :description="loadError.health"
    />
    <UiEmpty
      size="sm"
      v-else-if="!loadState.health && !health?.channels.length"
      description="暂无渠道健康数据"
    />
    <ul v-else-if="health && !loadState.health" class="integration-dashboard__health-list">
      <li v-for="item in health.channels" :key="`${item.channelCode}-${item.pathwayCode}`">
        <strong>{{ item.channelCode }}</strong> / {{ item.pathwayCode }}
        <UiTag
          :tone="
            item.healthStatus === PortfolioIntegrationHealthStatusEnum.HEALTHY
              ? 'green'
              : 'orange'
          "
        >
          {{ item.healthStatus }}
        </UiTag>
        <span v-if="item.maturityScore">成熟度 {{ item.maturityScore }}</span>
      </li>
    </ul>
  </WorkbenchSurfaceCard>

  <UiDrawer
    v-model:open="failedMessageDrawerOpen"
    title="修正异常消息字段"
    width="640"
    :hide-footer="false"
    :closable="!writing"
    :mask-closable="!writing"
    :confirm-loading="operationKey.startsWith('failed-message:')"
    ok-text="修正并重放"
    @ok="selectedFailedMessage && requeueFailedMessage(selectedFailedMessage, true)"
  >
    <div v-if="selectedFailedMessage" class="integration-dashboard__failed-message-editor">
      <UiTag tone="red">{{ selectedFailedMessage.channelCode }}</UiTag>
      <strong>{{ selectedFailedMessage.messageKey }}</strong>
      <span>{{ selectedFailedMessage.processMessage }}</span>
      <span
        v-if="selectedFailedMessage.payloadContractValid === false"
        class="integration-dashboard__hint"
      >
        载荷契约非法：{{
          selectedFailedMessage.payloadContractMessage
        }}；须整包替换信封与字段袋，禁止原样重试。
      </span>
      <label>修正说明</label>
      <UiInput
        size="sm"
        v-model="requeueMessage"
        placeholder="说明修正内容与重放依据"
        :disabled="writing"
      />
      <label>教师工号</label>
      <UiInput size="sm" v-model="requeueEnvelope.teacherNumber" :disabled="writing" />
      <label>教师编码</label>
      <UiInput size="sm" v-model="requeueEnvelope.teacherCode" :disabled="writing" />
      <label>教师姓名</label>
      <UiInput size="sm" v-model="requeueEnvelope.teacherName" :disabled="writing" />
      <label>外部记录键</label>
      <UiInput size="sm" v-model="requeueEnvelope.externalRecordKey" :disabled="writing" />
      <label>业务字段袋</label>
      <div class="integration-dashboard__payload-editor">
        <div
          v-for="(item, index) in payloadFieldEdits"
          :key="`requeue-field-${index}`"
          class="integration-dashboard__payload-field"
        >
          <UiInput
            size="sm"
            v-model="item.fieldCode"
            placeholder="字段编码"
            :disabled="writing || selectedFailedMessage.payloadContractValid !== false"
          />
          <UiInput size="sm" v-model="item.fieldValue" placeholder="字段值" :disabled="writing" />
          <UiButton
            size="sm"
            variant="ghost"
            :disabled="writing || selectedFailedMessage.payloadContractValid !== false"
            @click="removeRequeuePayloadField(index)"
          >
            删除
          </UiButton>
        </div>
        <UiButton
          v-if="selectedFailedMessage.payloadContractValid === false"
          size="sm"
          variant="ghost"
          :disabled="writing"
          @click="addRequeuePayloadField"
        >
          添加字段
        </UiButton>
      </div>
    </div>
  </UiDrawer>
</template>

<style scoped lang="scss">
@use '../integration-owner-shared.scss';
</style>

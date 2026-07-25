<script lang="ts" setup>
import type { ColumnsType as TableColumnsType } from 'ant-design-vue/es/table'
import type { ExamWorkbenchMarkingProgressPanelResponse } from '@/apis/mark/exam-progress'
import type {
  FormalSessionResponse,
  FormalSessionStatusCode,
  TrialSessionResponse,
  TrialSessionStatusCode,
} from '@/apis/mark/marking-organization'
import type { SignalMetric } from '@/types/workbench'
import { TableOutlined } from '@ant-design/icons-vue'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getMarkingProgressPanel } from '@/apis/mark/exam-progress'
import {
  FORMAL_SESSION_STATUS_TONE,
  FormalSessionStatusDescription,
  TRIAL_SESSION_STATUS_TONE,
  TrialSessionStatusDescription,
} from '@/apis/mark/marking-organization'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiProgressBar from '@/components/ui-guide/ui/UiProgressBar.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamSelectGateStrip from '@/components/workbench/ExamSelectGateStrip.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchContextGateStrip from '@/components/workbench/WorkbenchContextGateStrip.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useExamMarkingProgressSessionList } from '@/composables/useExamMarkingProgressSessionList'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import {
  resolveMarkingOrganizationFormalSessionsRoute,
  resolveMarkingOrganizationTrialSessionsRoute,
} from '@/utils/marking-organization-navigation'
import { toneToColor } from '@/utils/score-tone'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherExamWorkspaceMarkingProgressDashboard' })

const route = useRoute()
const router = useRouter()
const { examId } = useWorkspaceExamId()

const successColor = toneToColor('green')
const primaryColor = toneToColor('blue')

const isTrialPhase = computed(() => route.name === 'TeacherExamWorkspaceTrialProgress')
const sessionPhase = computed(() => (isTrialPhase.value ? ('trial' as const) : ('formal' as const)))
const loading = ref(false)
const loadFailed = ref(false)
const panel = ref<ExamWorkbenchMarkingProgressPanelResponse | null>(null)

const organizationId = computed(() => panel.value?.organizationId)

const {
  sessionRows,
  sessionsLoading,
  sessionPagination,
  sessionFilterModel,
  filterFields,
  sessionTableEmptyDescription,
  applySessionFilter,
  resetSessionFilter,
  handleSessionPageChange,
} = useExamMarkingProgressSessionList(sessionPhase, organizationId)

const draftFilterModel = ref<Record<string, unknown>>({
  keyword: '',
  status: undefined,
  groupId: undefined,
})

watch(
  sessionFilterModel,
  (model) => {
    draftFilterModel.value = {
      keyword: model.keyword,
      status: model.status,
      groupId: model.groupId,
    }
  },
  { deep: true, immediate: true },
)

const taskSummary = computed(() => panel.value?.markingTaskSummary ?? null)
const progressPercent = computed(() => {
  const summary = taskSummary.value
  if (!summary || summary.totalTaskCount <= 0) return 0
  return Math.round((summary.finalizedTaskCount * 100) / summary.totalTaskCount)
})

const signalMetrics = computed<SignalMetric[]>(() => {
  const summary = taskSummary.value
  if (!summary) {
    return [{ key: 'total', label: '总任务', value: '—', tone: 'gray' }]
  }
  return [
    { key: 'total', label: '总任务', value: summary.totalTaskCount, tone: 'blue' },
    { key: 'done', label: '已完成', value: summary.finalizedTaskCount, tone: 'green' },
    { key: 'pending', label: '待完成', value: summary.pendingTaskCount, tone: 'orange' },
    { key: 'recycled', label: '已回收', value: summary.recycledTaskCount, tone: 'gray' },
  ]
})

const formalColumns: TableColumnsType<FormalSessionResponse> = [
  { title: '题组', dataIndex: 'groupName', key: 'groupName', width: 160 },
  { title: '状态', key: 'status', width: 120 },
  {
    title: '总任务',
    dataIndex: 'totalTaskCount',
    key: 'totalTaskCount',
    width: 88,
    align: 'right',
  },
  {
    title: '已完成',
    dataIndex: 'finalizedTaskCount',
    key: 'finalizedTaskCount',
    width: 88,
    align: 'right',
  },
  { title: '进度', key: 'progress', width: 180 },
  { title: '创建时间', key: 'createTime', width: 168 },
  { title: '操作', key: 'action', width: 100 },
]

const trialColumns: TableColumnsType<TrialSessionResponse> = [
  { title: '题组', dataIndex: 'groupName', key: 'groupName', width: 160 },
  { title: '状态', key: 'status', width: 120 },
  {
    title: '样卷数',
    dataIndex: 'totalTaskCount',
    key: 'totalTaskCount',
    width: 88,
    align: 'right',
  },
  {
    title: '已完成',
    dataIndex: 'finalizedTaskCount',
    key: 'finalizedTaskCount',
    width: 88,
    align: 'right',
  },
  { title: '进度', key: 'progress', width: 180 },
  { title: '校准结论', dataIndex: 'calibrationSummary', key: 'calibrationSummary', ellipsis: true },
  { title: '关闭时间', key: 'closeTime', width: 168 },
  { title: '操作', key: 'action', width: 100 },
]

function trialSessionStatusTone(status: TrialSessionStatusCode) {
  return TRIAL_SESSION_STATUS_TONE[status]
}

function trialSessionStatusLabel(status: TrialSessionStatusCode) {
  return strictEnumLabel(TrialSessionStatusDescription, status, '试评会话状态')
}

function formalSessionStatusTone(status: FormalSessionStatusCode) {
  return FORMAL_SESSION_STATUS_TONE[status]
}

function formalSessionStatusLabel(status: FormalSessionStatusCode) {
  return strictEnumLabel(FormalSessionStatusDescription, status, '正评会话状态')
}

function sessionProgressPercent(total: number, finalized: number): number {
  if (total <= 0) return 0
  return Math.round((finalized * 100) / total)
}

async function loadPanel() {
  if (!examId.value) {
    panel.value = null
    return
  }
  loading.value = true
  loadFailed.value = false
  try {
    panel.value = await getMarkingProgressPanel(examId.value)
  } catch (error) {
    panel.value = null
    loadFailed.value = true
    showUserError(error, '加载阅卷进度失败')
  } finally {
    loading.value = false
  }
}

function goTaskPool() {
  if (!examId.value) return
  router.push({
    name: isTrialPhase.value
      ? 'TeacherExamWorkspaceTrialTaskPool'
      : 'TeacherExamWorkspaceMarkingTaskPool',
    params: { examId: examId.value },
  })
}


function goSessionManage(record: FormalSessionResponse | TrialSessionResponse) {
  if (!examId.value || !record.organizationId) return
  const target = isTrialPhase.value
    ? resolveMarkingOrganizationTrialSessionsRoute(record.organizationId, examId.value)
    : resolveMarkingOrganizationFormalSessionsRoute(record.organizationId, examId.value)
  router.push(target)
}

function goSessionsPage(organizationIdValue: string) {
  if (!examId.value) return
  const target = isTrialPhase.value
    ? resolveMarkingOrganizationTrialSessionsRoute(organizationIdValue, examId.value)
    : resolveMarkingOrganizationFormalSessionsRoute(organizationIdValue, examId.value)
  router.push(target)
}

watch(examId, () => loadPanel(), { immediate: true })
</script>

<template>
  <StageWorkbenchShell class="marking-progress-dash">
    <template v-if="examId" #context>
      <ContextBar
        layout="workbench"
        show-title
        :title="isTrialPhase ? '试评进度' : '阅卷进度'"
      >
        <template #status>
          <UiTag :tone="progressPercent >= 100 ? 'green' : 'blue'" size="sm">
            任务完成 {{ progressPercent }}%
          </UiTag>
        </template>
        <template #actions>
          <UiButton variant="primary" size="sm" @click="goTaskPool">
            {{ isTrialPhase ? '试评任务池' : '阅卷任务池' }}
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <template v-if="examId && panel" #signal>
      <SignalBand compact variant="panel" :metrics="signalMetrics" />
    </template>

    <ExamSelectGateStrip v-if="!examId" class="marking-progress-dash__empty" />

    <UiEmpty
      size="sm"
      v-else-if="loadFailed"
      title="加载失败"
      class="marking-progress-dash__empty"
    />

    <UiSkeletonState v-else-if="loading && !panel" variant="card" compact />

    <UiEmpty size="sm" v-else-if="!panel" description="暂无进度数据" class="marking-progress-dash__empty" />

    <template v-else>
      <ExamWorkspaceJourneySubNav />

      <WorkbenchContextGateStrip
        v-if="!panel.markingOrgConfigured"
        tag="未配置"
        body="阅卷组织尚未配置完成"
        cta-label="前往阅卷设置"
        list-route-name="TeacherExamWorkspaceMarkingOrg"
        class="marking-progress-dash__empty"
      />

      <WorkbenchSurfaceCard v-else flush class="marking-progress-dash__table-card">
        <template #head>
          <div class="marking-progress-dash__head">
            <TableOutlined />
            <span>{{ isTrialPhase ? '试评会话' : '正评会话' }}</span>
          </div>
        </template>
        <template #toolbar>
          <div class="marking-progress-dash__toolbar">
            <UiFilterBar
              v-model="draftFilterModel"
              :fields="filterFields"
              variant="plain"
              search-text="查询"
              reset-text="重置"
              actions-align="end"
              @search="applySessionFilter"
              @reset="resetSessionFilter"
            />
            <UiButton
              v-if="panel.organizationId"
              variant="ghost"
              size="sm"
              @click="goSessionsPage(panel.organizationId)"
            >
              会话管理
            </UiButton>
          </div>
        </template>

        <UiDataTable
          v-if="isTrialPhase"
          :current="sessionPagination.current"
          :page-size="sessionPagination.pageSize"
          pagination-mode="server"
          :columns="trialColumns"
          :data-source="sessionRows as TrialSessionResponse[]"
          :loading="sessionsLoading"
          flat
          :total="sessionPagination.total"
          :empty-description="sessionTableEmptyDescription"
          row-key="id"
          size="middle"
          @page-change="handleSessionPageChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'status'">
              <UiTag :tone="trialSessionStatusTone(record.sessionStatus)" size="sm">
                {{ trialSessionStatusLabel(record.sessionStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'progress'">
              <UiProgressBar
                :percent="sessionProgressPercent(record.totalTaskCount, record.finalizedTaskCount)"
                size="sm"
                :color="
                  record.finalizedTaskCount >= record.totalTaskCount && record.totalTaskCount > 0
                    ? successColor
                    : primaryColor
                "
              
                :show-label="false"
              />
            </template>
            <template v-else-if="column.key === 'closeTime'">
              <span class="marking-progress-dash__mono">{{
                formatDateTime(record.closeTime) || '—'
              }}</span>
            </template>
            <template v-else-if="column.key === 'action'">
              <UiTableActions
                :items="[{ key: 'manage', label: '管理' }]"
                split
                @action="() => goSessionManage(record)"
              />
            </template>
          </template>
        </UiDataTable>

        <UiDataTable
          v-else
          :current="sessionPagination.current"
          :page-size="sessionPagination.pageSize"
          pagination-mode="server"
          :columns="formalColumns"
          :data-source="sessionRows as FormalSessionResponse[]"
          :loading="sessionsLoading"
          flat
          :total="sessionPagination.total"
          :empty-description="sessionTableEmptyDescription"
          row-key="id"
          size="middle"
          @page-change="handleSessionPageChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'status'">
              <UiTag :tone="formalSessionStatusTone(record.sessionStatus)" size="sm">
                {{ formalSessionStatusLabel(record.sessionStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'progress'">
              <UiProgressBar
                :percent="sessionProgressPercent(record.totalTaskCount, record.finalizedTaskCount)"
                size="sm"
                :color="
                  record.finalizedTaskCount >= record.totalTaskCount && record.totalTaskCount > 0
                    ? successColor
                    : primaryColor
                "
              
                :show-label="false"
              />
            </template>
            <template v-else-if="column.key === 'createTime'">
              <span class="marking-progress-dash__mono">{{
                formatDateTime(record.createTime) || '—'
              }}</span>
            </template>
            <template v-else-if="column.key === 'action'">
              <UiTableActions
                :items="[{ key: 'manage', label: '管理' }]"
                split
                @action="() => goSessionManage(record)"
              />
            </template>
          </template>
        </UiDataTable>
      </WorkbenchSurfaceCard>
    </template>
  </StageWorkbenchShell>
</template>

<style scoped>
.marking-progress-dash__empty {
  margin-top: var(--dp-space-4);
}

.marking-progress-dash__head {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2);
  font-size: 15px;
  font-weight: 600;
  color: var(--dp-text-primary);
  letter-spacing: -0.01em;
}

.marking-progress-dash__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--dp-space-3);
  width: 100%;
}

.marking-progress-dash__mono {
  font-variant-numeric: tabular-nums;
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}
</style>

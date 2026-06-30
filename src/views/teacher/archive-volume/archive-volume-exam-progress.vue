<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar>
        <template #status>
          <UiTag tone="blue" size="sm">考试归档进度</UiTag>
          <UiTag v-if="polling" tone="orange" size="sm">系统正在创建归档卷…</UiTag>
          <UiTag v-else-if="showCompleteProgress && isMultiVolumeExam" tone="gray" size="sm">
            {{ autoCreateVolumeProgressHint }}
          </UiTag>
          <UiTag v-else-if="primaryHealthyVolume" tone="gray" size="sm">{{ primaryHealthyVolume.archiveNo }}</UiTag>
        </template>
        <template #actions>
          <UiButton variant="ghost" size="sm" :loading="loading" @click="loadVolume">
            刷新
          </UiButton>
          <UiButton
            v-if="primaryHealthyVolume && !isMultiVolumeExam"
            variant="primary"
            size="sm"
            @click="goDetail(primaryHealthyVolume.volumeId)"
          >
            打开归档卷详情
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <template #rail>
      <MarkExamStageRail />
    </template>

    <a-skeleton v-if="loading" active :paragraph="{ rows: 5 }" />

    <template v-else-if="showCompleteProgress && isMultiVolumeExam">
      <SignalBand :metrics="signalMetrics" compact />
      <UiCard class="archive-volume-exam-progress__steps">
        <template #title>归档进度（跨院系 {{ autoCreateVolumeProgressHint }}）</template>
        <UiDataTable
          pagination-mode="none"
          :columns="volumeColumns"
          :data-source="healthyVolumes"
          :show-pagination="false"
          flat
          row-key="volumeId"
          size="middle"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'integrityStatus'">
              <UiTag :tone="integrityStatusTone(record.integrityStatus)" size="sm">
                {{ integrityStatusLabel(record.integrityStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'volumeStatus'">
              <UiTag :tone="volumeStatusTone(record.volumeStatus)" size="sm">
                {{ volumeStatusLabel(record.volumeStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'action'">
              <UiButton variant="ghost" size="sm" @click="goDetail(record.volumeId)">
                打开详情
              </UiButton>
            </template>
          </template>
        </UiDataTable>
      </UiCard>
    </template>

    <template v-else-if="showCompleteProgress && primaryHealthyVolume">
      <SignalBand :metrics="signalMetrics" compact />

      <UiCard class="archive-volume-exam-progress__steps">
        <template #title>归档进度</template>
        <ol class="progress-steps">
          <li :class="{ done: examGate?.gateOpen }">
            <span class="progress-steps__label">成绩发布 + 关考</span>
            <span class="progress-steps__hint">{{ gateProgressHint }}</span>
          </li>
          <li v-if="incompleteClasses.length > 0" class="progress-steps__class-list">
            <span class="progress-steps__label">按班进度</span>
            <ul class="progress-steps__classes">
              <li v-for="item in incompleteClasses" :key="item.classId">
                {{ item.className }}：尚有 {{ item.unpublishedBoundPaperCount }} 份未发布
              </li>
            </ul>
          </li>
          <li class="done">
            <span class="progress-steps__label">系统自动创建归档卷</span>
            <span class="progress-steps__hint">{{ formatDateTime(primaryHealthyVolume.createTime) }}</span>
          </li>
          <li :class="{ done: primaryHealthyVolume.integrityStatus === 'PASSED' }">
            <span class="progress-steps__label">材料聚合 / 完整性</span>
            <UiTag :tone="integrityStatusTone(primaryHealthyVolume.integrityStatus)" size="sm">
              {{ integrityStatusLabel(primaryHealthyVolume.integrityStatus) }}
            </UiTag>
          </li>
          <li :class="{ done: primaryHealthyVolume.volumeStatus === 'STORED' }">
            <span class="progress-steps__label">移交入库</span>
            <UiTag :tone="volumeStatusTone(primaryHealthyVolume.volumeStatus)" size="sm">
              {{ volumeStatusLabel(primaryHealthyVolume.volumeStatus) }}
            </UiTag>
          </li>
        </ol>
      </UiCard>
    </template>

    <template v-else>
      <UiEmpty
        v-if="volumeLoadFailed"
        description="加载归档卷失败"
      />
      <UiEmpty
        v-else-if="gateLoadFailed"
        description="加载考试双门禁失败"
      />

      <template v-else>
        <SignalBand :metrics="signalMetrics" compact />
        <UiAlertStrip
          v-if="hasPartialAutoCreateProgress"
          tone="warning"
          title="部分院系卷已创建"
          :description="partialAutoCreateDescription"
          dense
        />
        <UiCard v-if="healthyVolumes.length > 0" class="archive-volume-exam-progress__steps">
          <template #title>已创建归档卷</template>
          <UiDataTable
          pagination-mode="none"
          :columns="volumeColumns"
          :data-source="healthyVolumes"
          :show-pagination="false"
          flat
          row-key="volumeId"
          size="middle"
        >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'integrityStatus'">
                <UiTag :tone="integrityStatusTone(record.integrityStatus)" size="sm">
                  {{ integrityStatusLabel(record.integrityStatus) }}
                </UiTag>
              </template>
              <template v-else-if="column.key === 'volumeStatus'">
                <UiTag :tone="volumeStatusTone(record.volumeStatus)" size="sm">
                  {{ volumeStatusLabel(record.volumeStatus) }}
                </UiTag>
              </template>
              <template v-else-if="column.key === 'action'">
                <UiButton variant="ghost" size="sm" @click="goDetail(record.volumeId)">
                  打开详情
                </UiButton>
              </template>
            </template>
          </UiDataTable>
        </UiCard>
        <UiCard class="archive-volume-exam-progress__steps">
          <template #title>归档前置条件</template>
          <ol class="progress-steps">
            <li :class="{ done: examGate?.gateOpen }">
              <span class="progress-steps__label">成绩发布 + 关考</span>
            <span class="progress-steps__hint">{{ gateProgressHint }}</span>
          </li>
          <li v-if="incompleteClasses.length > 0" class="progress-steps__class-list">
            <span class="progress-steps__label">按班进度</span>
            <ul class="progress-steps__classes">
              <li v-for="item in incompleteClasses" :key="item.classId">
                {{ item.className }}：尚有 {{ item.unpublishedBoundPaperCount }} 份未发布
              </li>
            </ul>
          </li>
          <li :class="{ failed: hasAutoCreateFailure, pending: polling && !hasAutoCreateFailure }">
              <span class="progress-steps__label">系统自动创建归档卷</span>
              <span class="progress-steps__hint">{{ autoCreateStepHint }}</span>
            </li>
          </ol>
          <UiAlertStrip
            v-if="gateAnomaly"
            tone="error"
            title="考试状态异常"
            description="考试已关考但成绩未全部发布，请联系管理员处理。"
            dense
          />
          <p class="archive-volume-exam-progress__note">
            考后 ZIP 归档包用于离线交付；课程考核归档卷在本页跟踪建卷与入库进度。
          </p>
          <UiAlertStrip
            v-if="pollTimedOut"
            tone="warning"
            title="建卷仍在进行"
            description="系统仍在后台创建归档卷，请稍后点击刷新查看进度。"
            dense
          />
          <UiAlertStrip
            v-if="hasAutoCreateFailure"
            tone="error"
            title="自动建卷失败"
            :description="autoCreateFailedDescription"
            dense
          >
            <template v-if="autoCreateFailedNeedsClassScope" #actions>
              <UiButton variant="primary" size="sm" @click="goCandidateRoster">
                前往考生名册修正班级
              </UiButton>
            </template>
            <template v-else-if="showRetryAutoCreate" #actions>
              <UiButton variant="primary" size="sm" :loading="retrying || polling" @click="retryAutoCreate">
                重新触发自动建卷
              </UiButton>
            </template>
          </UiAlertStrip>
          <UiAlertStrip
            v-else-if="showRetryAutoCreate"
            tone="warning"
            title="自动建卷待处理"
            :description="pendingRetryDescription"
            dense
          >
            <template #actions>
              <UiButton variant="primary" size="sm" :loading="retrying || polling" @click="retryAutoCreate">
                重新触发自动建卷
              </UiButton>
            </template>
          </UiAlertStrip>
          <UiAlertStrip
            v-else-if="showNonOwnerHint"
            tone="info"
            title="等待主考处理"
            description="自动建卷需由考试主考老师重新触发，请联系主考老师处理。"
            dense
          />
        </UiCard>
      </template>
    </template>
  </StageWorkbenchShell>
</template>

<script setup lang="ts">
import type {
  ArchiveVolumeEventVO,
  ArchiveVolumeExamGateVO,
  ArchiveVolumeVO,
} from '@/apis/mark/archive-volume'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ARCHIVE_INTEGRITY_STATUS_LABEL,
  ARCHIVE_INTEGRITY_STATUS_TONE,
  ARCHIVE_VOLUME_STATUS_LABEL,
  ARCHIVE_VOLUME_STATUS_TONE,
  getArchiveVolumeDetail,
  getArchiveVolumeExamGate,
  pageArchiveVolumes,
  retryArchiveVolumeAutoCreate,
} from '@/apis/mark/archive-volume'
import { message } from 'ant-design-vue'
import MarkExamStageRail from '@/components/mark/MarkExamStageRail.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useArchiveAutoCreatePoll } from '@/composables/useArchiveAutoCreatePoll'
import { useExamArchiveGateHint } from '@/composables/useExamArchiveGateHint'
import {
  ARCHIVE_AUTO_CREATE_FAILURE_DESCRIPTION,
  CLASS_SCOPE_FIX_AUTO_CREATE_FAILURE_CATEGORIES,
  isArchiveAutoCreateFailureCategory,
} from '@/constants/archive-auto-create-failure-category'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { readPageList } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherArchiveVolumeExamProgress' })

/** 跨院系公共课按院系拆卷时，单考试关联卷数通常不超过院系班级 scope 数 */
const EXAM_ARCHIVE_VOLUME_PAGE_SIZE = 50

const route = useRoute()
const router = useRouter()
const examId = computed(() => String(route.params.examId ?? ''))
const loading = ref(true)
const volumeLoadFailed = ref(false)
const gateLoadFailed = ref(false)
const healthyVolumes = ref<ArchiveVolumeVO[]>([])
const events = ref<ArchiveVolumeEventVO[]>([])
const examGate = ref<ArchiveVolumeExamGateVO | null>(null)
const { gateProgressHint, gateAnomaly, incompleteClasses } = useExamArchiveGateHint(examGate)
const retrying = ref(false)
const pollTimedOut = ref(false)

const { polling, pollUntilHealthy } = useArchiveAutoCreatePoll({ examId })

function isAutoCreateFailureStub(vol: ArchiveVolumeVO): boolean {
  return vol.departmentId == null || vol.departmentId === ''
}

const primaryHealthyVolume = computed(() => healthyVolumes.value[0] ?? null)

const expectedAutoCreateVolumeCount = computed(() => examGate.value?.expectedAutoCreateVolumeCount ?? null)

const isMultiVolumeExam = computed(() =>
  (expectedAutoCreateVolumeCount.value ?? 0) > 1 || healthyVolumes.value.length > 1,
)

const showCompleteProgress = computed(() =>
  examGate.value?.autoCreateFullyHealthy === true && healthyVolumes.value.length > 0,
)

const autoCreateVolumeProgressHint = computed(() => {
  const expected = expectedAutoCreateVolumeCount.value ?? healthyVolumes.value.length
  const healthy = examGate.value?.healthyAutoCreateVolumeCount ?? healthyVolumes.value.length
  return `${healthy}/${expected} 院系卷`
})

const hasPartialAutoCreateProgress = computed(() =>
  healthyVolumes.value.length > 0 && examGate.value?.autoCreateFullyHealthy !== true,
)

const partialAutoCreateDescription = computed(() => {
  const expected = expectedAutoCreateVolumeCount.value
  const healthy = examGate.value?.healthyAutoCreateVolumeCount ?? healthyVolumes.value.length
  if (expected != null && expected > healthy) {
    return `已创建 ${healthy} 卷，仍缺 ${expected - healthy} 个院系卷；请等待后台建卷或手动重试。`
  }
  return '部分院系卷已创建，系统仍在补齐其余院系卷。'
})

const volumeColumns = [
  { title: '院系', dataIndex: 'departmentName', key: 'departmentName' },
  { title: '归档号', dataIndex: 'archiveNo', key: 'archiveNo' },
  { title: '完整性', key: 'integrityStatus' },
  { title: '卷状态', key: 'volumeStatus' },
  { title: '操作', key: 'action', width: 96 },
]

const autoCreateFailedEvent = computed(() =>
  events.value.find(item => item.eventType === 'AUTO_CREATE_FAILED'),
)

const autoCreateFailedNeedsClassScope = computed(() => {
  const category = examGate.value?.autoCreateFailureCategory
  return category != null
    && isArchiveAutoCreateFailureCategory(category)
    && CLASS_SCOPE_FIX_AUTO_CREATE_FAILURE_CATEGORIES.has(category)
})

const hasAutoCreateFailure = computed(() =>
  examGate.value?.autoCreateFailureStubPresent === true
  || autoCreateFailedEvent.value != null
  || examGate.value?.autoCreatePendingStatus === 'MANUAL_REQUIRED',
)

const showRetryAutoCreate = computed(() =>
  examGate.value?.archiveAutoCreateRetryAllowed === true
  && !autoCreateFailedNeedsClassScope.value,
)

const showNonOwnerHint = computed(() => {
  const gate = examGate.value
  if (!gate || showCompleteProgress.value) {
    return false
  }
  if (gate.archiveAutoCreateRetryAllowed === true) {
    return false
  }
  return hasAutoCreateFailure.value
    || gate.autoCreatePendingStatus === 'MANUAL_REQUIRED'
    || (gate.gateOpen === true && !gate.autoCreateFailureStubPresent)
})

const autoCreateStepHint = computed(() => {
  if (polling.value) {
    return '系统正在创建归档卷…'
  }
  if (hasAutoCreateFailure.value) {
    return examGate.value?.autoCreateLastError || autoCreateFailedEvent.value?.reason || '自动建卷失败'
  }
  return emptyDescription.value
})

const emptyDescription = computed(() => {
  const gate = examGate.value
  if (gate?.autoCreatePendingStatus === 'PENDING') {
    return gate.autoCreateNextRetryAt
      ? `系统将于 ${formatDateTime(gate.autoCreateNextRetryAt)} 自动重试建卷`
      : '系统正在排队自动建卷'
  }
  if (gate?.autoCreatePendingStatus === 'MANUAL_REQUIRED') {
    return gate.autoCreateLastError || '自动建卷多次失败，请修复问题后手动重试'
  }
  if (gate?.gateOpen) {
    return '双门禁已满足，归档卷尚未生成，可尝试重新触发自动建卷'
  }
  if (gate?.allScoresPublished && (gate.gradablePaperCount ?? 0) <= 0 && !gate.examClosed) {
    return '本场考试无可评阅试卷，关考后系统将自动创建归档卷'
  }
  return '本场考试尚未生成归档卷，请确认考试已关考且全部可评阅试卷成绩已发布'
})

const pendingRetryDescription = computed(() => {
  const gate = examGate.value
  if (gate?.autoCreatePendingStatus === 'MANUAL_REQUIRED') {
    return gate.autoCreateLastError || '自动建卷多次失败，请修复问题后重新触发'
  }
  if (gate?.autoCreatePendingStatus === 'PENDING') {
    return gate.autoCreateLastError
      ? `${gate.autoCreateLastError}；系统仍将自动重试`
      : '系统正在自动重试建卷，也可手动立即触发'
  }
  return '双门禁已满足但归档卷尚未生成'
})

const autoCreateFailedDescription = computed(() => {
  const category = examGate.value?.autoCreateFailureCategory
  if (category && isArchiveAutoCreateFailureCategory(category)) {
    const base = ARCHIVE_AUTO_CREATE_FAILURE_DESCRIPTION[category]
    const detail = examGate.value?.autoCreateLastError ?? autoCreateFailedEvent.value?.reason
    return detail ? `${base}（${detail}）` : base
  }
  const reason = autoCreateFailedEvent.value?.reason ?? examGate.value?.autoCreateLastError ?? ''
  return reason || '请查看事件诊断并联系管理员'
})

const signalMetrics = computed<SignalMetric[]>(() => {
  const gate = examGate.value
  if (!showCompleteProgress.value) {
    if (hasPartialAutoCreateProgress.value) {
      return [{ key: 'partial', label: '建卷进度', value: autoCreateVolumeProgressHint.value, tone: 'orange' }]
    }
    return gate
      ? [{ key: 'gate', label: '双门禁', value: gate.gateOpen ? '已满足' : '未满足', tone: gate.gateOpen ? 'green' : 'orange' }]
      : []
  }
  if (isMultiVolumeExam.value) {
    const allIntegrityPassed = healthyVolumes.value.every(item => item.integrityStatus === 'PASSED')
    const allStored = healthyVolumes.value.every(item => item.volumeStatus === 'STORED')
    return [
      { key: 'progress', label: '建卷进度', value: autoCreateVolumeProgressHint.value, tone: 'green' },
      { key: 'integrity', label: '完整性', value: allIntegrityPassed ? '全部通过' : '待补齐', tone: allIntegrityPassed ? 'green' : 'orange' },
      { key: 'status', label: '入库', value: allStored ? '全部入库' : '进行中', tone: allStored ? 'green' : 'orange' },
    ]
  }
  const vol = primaryHealthyVolume.value
  if (!vol) {
    return []
  }
  return [
    { key: 'integrity', label: '完整性', value: integrityStatusLabel(vol.integrityStatus), tone: vol.integrityStatus === 'PASSED' ? 'green' : 'orange' },
    { key: 'status', label: '卷状态', value: volumeStatusLabel(vol.volumeStatus) },
  ]
})

function volumeStatusLabel(code: ArchiveVolumeVO['volumeStatus']) {
  return strictEnumLabel(ARCHIVE_VOLUME_STATUS_LABEL, code, 'volumeStatus')
}

function volumeStatusTone(code: ArchiveVolumeVO['volumeStatus']): BadgeTone {
  return strictEnumTone(ARCHIVE_VOLUME_STATUS_TONE, code, 'volumeStatus')
}

function integrityStatusLabel(code: ArchiveVolumeVO['integrityStatus']) {
  return strictEnumLabel(ARCHIVE_INTEGRITY_STATUS_LABEL, code, 'integrityStatus')
}

function integrityStatusTone(code: ArchiveVolumeVO['integrityStatus']): BadgeTone {
  return strictEnumTone(ARCHIVE_INTEGRITY_STATUS_TONE, code, 'integrityStatus')
}

async function loadGate() {
  if (!examId.value) return
  try {
    examGate.value = await getArchiveVolumeExamGate(examId.value)
  }
  catch (error) {
    showUserError(error, '加载考试双门禁失败')
    examGate.value = null
    gateLoadFailed.value = true
  }
}

async function loadVolume() {
  if (!examId.value) {
    showUserError(new Error('缺少考试 ID'), '缺少考试 ID')
    loading.value = false
    return
  }
  loading.value = true
  volumeLoadFailed.value = false
  gateLoadFailed.value = false
  pollTimedOut.value = false
  examGate.value = null
  try {
    const page = await pageArchiveVolumes({
      examId: examId.value,
      pageNum: 1,
      pageSize: EXAM_ARCHIVE_VOLUME_PAGE_SIZE,
    })
    const list = readPageList(page, '归档卷查询异常')
    healthyVolumes.value = list.filter(item => !isAutoCreateFailureStub(item))
    const stubRow = list.find(item => isAutoCreateFailureStub(item))
    if (stubRow) {
      const detail = await getArchiveVolumeDetail(stubRow.volumeId)
      events.value = detail.events
    }
    else {
      events.value = []
    }
  }
  catch (error) {
    showUserError(error, '加载归档卷失败')
    healthyVolumes.value = []
    events.value = []
    volumeLoadFailed.value = true
    loading.value = false
    return
  }
  loading.value = false
  await loadGate()
}

async function startAutoCreatePoll() {
  pollTimedOut.value = false
  const result = await pollUntilHealthy()
  await loadVolume()
  if (result === 'timeout') {
    pollTimedOut.value = true
  }
}

function clearAutoCreatePollQuery() {
  if (route.query.autoCreatePoll !== '1') {
    return
  }
  const nextQuery = { ...route.query }
  delete nextQuery.autoCreatePoll
  void router.replace({ query: nextQuery })
}

function goDetail(volumeId: string) {
  if (!volumeId) return
  void router.push({
    name: 'TeacherArchiveVolumeDetail',
    params: { volumeId },
  })
}

function goCandidateRoster() {
  if (!examId.value) return
  void router.push({
    name: 'TeacherExamWorkspaceCandidateRoster',
    params: { examId: examId.value },
  })
}

async function retryAutoCreate() {
  if (!examId.value || retrying.value || polling.value) return
  retrying.value = true
  try {
    await retryArchiveVolumeAutoCreate(examId.value)
    message.success('已重新触发自动建卷')
    await startAutoCreatePoll()
  }
  catch (error) {
    showUserError(error, '重新触发自动建卷失败')
  }
  finally {
    retrying.value = false
  }
}

onMounted(() => {
  void loadVolume().then(() => {
    if (route.query.autoCreatePoll === '1') {
      clearAutoCreatePollQuery()
      void startAutoCreatePoll()
    }
  })
})
</script>

<style scoped>
.archive-volume-exam-progress__steps {
  margin-top: var(--dp-space-4, 16px);
}

.progress-steps {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: var(--dp-space-3, 12px);
}

.progress-steps li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-3, 12px);
  padding: var(--dp-space-3, 12px) var(--dp-space-4, 16px);
  border: 1px solid var(--dp-border-subtle, #e2e8f0);
  border-radius: var(--dp-radius-panel, 6px);
  background: var(--dp-surface-muted, #f8fafc);
}

.progress-steps li.done {
  border-color: var(--dp-border-success, #86efac);
  background: var(--dp-surface-success-subtle, #f0fdf4);
}

.progress-steps li.failed {
  border-color: var(--dp-border-danger, #fca5a5);
  background: var(--dp-surface-danger-subtle, #fef2f2);
}

.progress-steps li.pending {
  border-color: var(--dp-border-warning, #fcd34d);
  background: var(--dp-surface-warning-subtle, #fffbeb);
}

.progress-steps__label {
  font-weight: 500;
}

.progress-steps__hint {
  color: var(--dp-text-secondary, #64748b);
  font-size: 13px;
}

.progress-steps__class-list {
  flex-direction: column;
  align-items: flex-start;
}

.progress-steps__classes {
  margin: var(--dp-space-2, 8px) 0 0;
  padding-left: var(--dp-space-4, 16px);
  color: var(--dp-text-secondary, #64748b);
  font-size: 13px;
}

.archive-volume-exam-progress__note {
  margin: var(--dp-space-3, 12px) 0 0;
  color: var(--dp-text-secondary, #64748b);
  font-size: 13px;
}
</style>

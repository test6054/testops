<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar>
        <template #status>
          <UiTag tone="blue" size="sm">考试归档进度</UiTag>
          <UiTag v-if="volume" tone="gray" size="sm">{{ volume.archiveNo }}</UiTag>
        </template>
        <template #actions>
          <UiButton variant="ghost" size="sm" :loading="loading" @click="loadVolume">
            刷新
          </UiButton>
          <UiButton
            v-if="volume"
            variant="primary"
            size="sm"
            @click="goDetail"
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

    <template v-else-if="volume">
      <SignalBand :metrics="signalMetrics" compact />

      <UiCard class="archive-volume-exam-progress__steps">
        <template #title>归档进度</template>
        <ol class="progress-steps">
          <li :class="{ done: examGate?.gateOpen }">
            <span class="progress-steps__label">成绩发布 + 关考</span>
            <span class="progress-steps__hint">{{ gateProgressHint }}</span>
          </li>
          <li class="done">
            <span class="progress-steps__label">系统自动创建归档卷</span>
            <span class="progress-steps__hint">{{ formatDateTime(volume.createTime) }}</span>
          </li>
          <li :class="{ done: volume.integrityStatus === 'PASSED' }">
            <span class="progress-steps__label">材料聚合 / 完整性</span>
            <UiTag :tone="integrityStatusTone(volume.integrityStatus)" size="sm">
              {{ integrityStatusLabel(volume.integrityStatus) }}
            </UiTag>
          </li>
          <li :class="{ done: volume.volumeStatus === 'STORED' }">
            <span class="progress-steps__label">移交入库</span>
            <UiTag :tone="volumeStatusTone(volume.volumeStatus)" size="sm">
              {{ volumeStatusLabel(volume.volumeStatus) }}
            </UiTag>
          </li>
        </ol>
        <UiAlertStrip
          v-if="autoCreateFailedEvent"
          tone="error"
          title="自动建卷失败"
          :description="autoCreateFailedDescription"
          dense
        >
          <template v-if="autoCreateFailedNeedsClassScope" #actions>
            <UiButton variant="primary" size="sm" @click="goCandidateRoster">
              前往考生名册
            </UiButton>
          </template>
        </UiAlertStrip>
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
        <UiCard class="archive-volume-exam-progress__steps">
          <template #title>归档前置条件</template>
          <ol class="progress-steps">
            <li :class="{ done: examGate?.gateOpen }">
              <span class="progress-steps__label">成绩发布 + 关考</span>
              <span class="progress-steps__hint">{{ gateProgressHint }}</span>
            </li>
            <li>
              <span class="progress-steps__label">系统自动创建归档卷</span>
              <span class="progress-steps__hint">{{ emptyDescription }}</span>
            </li>
          </ol>
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
} from '@/apis/mark/archive-volume'
import MarkExamStageRail from '@/components/mark/MarkExamStageRail.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { readPageList } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherArchiveVolumeExamProgress' })

const route = useRoute()
const router = useRouter()
const examId = computed(() => String(route.params.examId ?? ''))
const loading = ref(true)
const volumeLoadFailed = ref(false)
const gateLoadFailed = ref(false)
const volume = ref<ArchiveVolumeVO | null>(null)
const events = ref<ArchiveVolumeEventVO[]>([])
const examGate = ref<ArchiveVolumeExamGateVO | null>(null)

const gateProgressHint = computed(() => {
  const gate = examGate.value
  if (!gate) return '—'
  if (gate.gateOpen) return '已完成'
  if (gate.allScoresPublished && !gate.examClosed) {
    return (gate.gradablePaperCount ?? 0) <= 0
      ? '无可评阅试卷，关考后将自动创建归档卷'
      : '成绩已全部发布，待关考'
  }
  if (!gate.examClosed) return '考试未关考'
  if (gate.allScoresPublished) {
    return (gate.gradablePaperCount ?? 0) <= 0 ? '无可评阅试卷，成绩门禁已满足' : '成绩已全部发布'
  }
  return `成绩发布 ${gate.publishedScoreCount ?? 0}/${gate.gradablePaperCount ?? 0}`
})

const emptyDescription = computed(() => {
  const gate = examGate.value
  if (gate?.gateOpen) {
    return '双门禁已满足，归档卷尚未生成，请联系管理员排查自动建卷'
  }
  if (gate?.allScoresPublished && (gate.gradablePaperCount ?? 0) <= 0 && !gate.examClosed) {
    return '本场考试无可评阅试卷，关考后系统将自动创建归档卷'
  }
  return '本场考试尚未生成归档卷，请确认考试已关考且全部可评阅试卷成绩已发布'
})

const autoCreateFailedEvent = computed(() =>
  events.value.find(item => item.eventType === 'AUTO_CREATE_FAILED'),
)

const autoCreateFailedDescription = computed(() => {
  const reason = autoCreateFailedEvent.value?.reason ?? ''
  if (reason.includes('跨院系')) {
    return '参考班级跨院系，无法自动创建单一归档卷。请按院系拆分参考班级，保存后重新触发自动建卷。'
  }
  return reason || '请查看事件诊断并联系管理员'
})

const autoCreateFailedNeedsClassScope = computed(() =>
  (autoCreateFailedEvent.value?.reason ?? '').includes('跨院系'),
)

const signalMetrics = computed<SignalMetric[]>(() => {
  if (!volume.value) {
    return examGate.value
      ? [{ key: 'gate', label: '双门禁', value: examGate.value.gateOpen ? '已满足' : '未满足', tone: examGate.value.gateOpen ? 'green' : 'orange' }]
      : []
  }
  return [
    { key: 'integrity', label: '完整性', value: integrityStatusLabel(volume.value.integrityStatus), tone: volume.value.integrityStatus === 'PASSED' ? 'green' : 'orange' },
    { key: 'status', label: '卷状态', value: volumeStatusLabel(volume.value.volumeStatus) },
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
  examGate.value = null
  try {
    const page = await pageArchiveVolumes({
      examId: examId.value,
      pageNum: 1,
      pageSize: 1,
    })
    const list = readPageList(page, '归档卷查询异常')
    volume.value = list[0] ?? null
    if (volume.value) {
      const detail = await getArchiveVolumeDetail(volume.value.volumeId)
      events.value = detail.events
      volume.value = detail.volume
    }
    else {
      events.value = []
    }
  }
  catch (error) {
    showUserError(error, '加载归档卷失败')
    volume.value = null
    events.value = []
    volumeLoadFailed.value = true
    loading.value = false
    return
  }
  loading.value = false
  await loadGate()
}

function goDetail() {
  if (!volume.value) return
  void router.push({
    name: 'TeacherArchiveVolumeDetail',
    params: { volumeId: volume.value.volumeId },
  })
}

function goCandidateRoster() {
  if (!examId.value) return
  void router.push({
    name: 'TeacherExamWorkspaceCandidateRoster',
    params: { examId: examId.value },
  })
}

onMounted(() => {
  void loadVolume()
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

.progress-steps__label {
  font-weight: 500;
}

.progress-steps__hint {
  color: var(--dp-text-secondary, #64748b);
  font-size: 13px;
}
</style>

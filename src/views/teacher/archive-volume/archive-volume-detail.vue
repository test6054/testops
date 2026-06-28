<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar>
        <template #status>
          <UiTag tone="blue" size="sm">{{ detail?.volume.archiveNo }}</UiTag>
          <UiTag
            v-if="detail"
            :tone="volumeStatusTone(detail.volume.volumeStatus)"
            size="sm"
          >
            {{ volumeStatusLabel(detail.volume.volumeStatus) }}
          </UiTag>
          <UiTag
            v-if="detail"
            :tone="integrityStatusTone(detail.volume.integrityStatus)"
            size="sm"
          >
            {{ integrityStatusLabel(detail.volume.integrityStatus) }}
          </UiTag>
          <UiTag
            v-if="detail"
            :tone="sourceTypeTone(detail.volume.sourceType)"
            size="sm"
          >
            {{ sourceTypeLabel(detail.volume.sourceType) }}
          </UiTag>
          <UiTag
            v-if="detail"
            :tone="transferStatusTone(detail.volume.transferStatus)"
            size="sm"
          >
            {{ transferStatusLabel(detail.volume.transferStatus) }}
          </UiTag>
          <UiTag
            v-if="detail?.volume.appraisalStatus"
            :tone="appraisalStatusTone(detail.volume.appraisalStatus)"
            size="sm"
          >
            {{ appraisalStatusLabel(detail.volume.appraisalStatus) }}
          </UiTag>
        </template>
        <template #actions>
          <UiButton variant="ghost" size="sm" @click="goBack">返回列表</UiButton>
          <UiButton variant="outline" size="sm" :loading="checkingIntegrity" @click="runIntegrityCheck">
            完整性自检
          </UiButton>
          <UiButton
            v-if="detail && detail.volume.volumeStatus === 'COLLECTING' && detail.volume.responsibleUserId === currentUserId && !canSubmitVolume"
            variant="outline"
            size="sm"
            disabled
            :title="submitBlockReason ?? undefined"
          >
            提交归档
          </UiButton>
          <UiButton
            v-if="canSubmitVolume"
            variant="primary"
            size="sm"
            :loading="submitting"
            @click="handleSubmit"
          >
            提交归档
          </UiButton>
          <UiButton
            v-if="canExportManifest"
            variant="outline"
            size="sm"
            :loading="exporting"
            @click="handleExport"
          >
            导出 manifest
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <a-skeleton v-if="loading" active :paragraph="{ rows: 8 }" />

    <template v-else-if="detail">
      <UiAlertStrip
        v-if="grantsLoadFailed"
        tone="warning"
        title="岗位职责加载失败"
        description="鉴定、销毁与查阅审批操作不可用"
        dense
        class="archive-volume-detail__alert"
      />
      <UiAlertStrip
        v-if="detail.volume.integrityStatus === 'UNKNOWN' || detail.volume.integrityStatus === 'FAILED'"
        tone="warning"
        title="请先执行完整性自检"
        description="完整性未通过前无法提交归档"
        dense
        class="archive-volume-detail__alert"
      />
      <UiAlertStrip
        v-if="!detail.latestFourPropertyCheck && detail.volume.volumeStatus === 'COLLECTING'"
        tone="warning"
        title="尚未执行四性检测"
        description="提交归档前须完成四性检测"
        dense
        class="archive-volume-detail__alert"
      />
      <UiAlertStrip
        v-else-if="detail.fourPropertyStale"
        tone="warning"
        title="四性结论已失效"
        description="材料或 OCR 变更后须重新执行四性检测"
        dense
        class="archive-volume-detail__alert"
      />
      <UiAlertStrip
        v-else-if="detail.latestFourPropertyCheck && !detail.latestFourPropertyCheck.overallPassed && detail.volume.volumeStatus === 'COLLECTING'"
        tone="warning"
        title="四性检测未通过"
        description="请先补正材料并重新执行四性检测"
        dense
        class="archive-volume-detail__alert"
      />
      <UiAlertStrip
        v-if="scoreSubmitBlockReason"
        tone="warning"
        :title="scoreSubmitBlockReason"
        description="成绩证明未满足提交前置条件"
        dense
        class="archive-volume-detail__alert"
      />
      <UiAlertStrip
        v-if="detail.hasBlockingRemediationForSubmit"
        tone="warning"
        title="整改任务阻断提交"
        description="存在未关闭整改任务，须关闭后再提交归档"
        dense
        class="archive-volume-detail__alert"
      />
      <UiAlertStrip
        v-else-if="detail.hasOpenRemediationTask"
        tone="info"
        title="迎评整改进行中"
        description="当前卷存在未关闭整改任务，可登记补正材料"
        dense
        class="archive-volume-detail__alert"
      />

      <div class="archive-volume-detail__head">
        <h1 class="archive-volume-detail__title">{{ detail.volume.archiveTitle }}</h1>
        <p class="archive-volume-detail__meta">
          {{ sourceTypeLabel(detail.volume.sourceType) }}
          <span v-if="detail.volume.teachingClassName"> · {{ detail.volume.teachingClassName }}</span>
          <span v-if="detail.volume.departmentName"> · {{ detail.volume.departmentName }}</span>
        </p>
      </div>

      <UiSectionTabs v-model="activeTab" :items="sectionTabs" compact>
        <section v-if="activeTab === 'materials'" class="archive-volume-detail__panel">
          <div class="archive-volume-detail__catalog">
            <ArchiveVolumeMaterialTreePanel
              v-model:selected-keys="selectedCatalogKeys"
              :materials="detail.materials"
              :missing-items="detail.latestIntegrityCheck?.missingItems ?? []"
            />
            <ArchiveVolumeMaterialTablePanel
              :volume-id="volumeId"
              :detail="detail"
              :selected-catalog-keys="selectedCatalogKeys"
              :can-register-material="canRegisterMaterial"
              @refreshed="loadDetail"
              @ocr-completed-stale="message.info('OCR 已完成，请重新执行完整性/四性检测')"
            />
          </div>
        </section>

        <ArchiveVolumeScoresPanel
          v-else-if="activeTab === 'scores'"
          :volume-id="volumeId"
          :detail="detail"
          :can-confirm-score-completion="canConfirmScoreCompletion"
          :can-sync-teaching-affairs="canSyncTeachingAffairs"
          @refreshed="loadDetail"
        />

        <ArchiveVolumeIntegrityPanel
          v-else-if="activeTab === 'integrity'"
          :volume-id="volumeId"
          :detail="detail"
          :displayed-integrity-result="displayedIntegrityResult"
          :displayed-four-property="displayedFourProperty"
          :checking-integrity="checkingIntegrity"
          :can-allow-material-delay="canAllowMaterialDelay"
          :can-waive-material-missing="canWaiveMaterialMissing"
          :can-waive-integrity="canWaiveIntegrity"
          @run-integrity-check="runIntegrityCheck"
          @refreshed="loadDetail"
          @integrity-checked="integrityResult = $event"
          @four-property-checked="fourPropertyResult = $event"
        />

        <ArchiveVolumeTransferPanel
          v-else-if="activeTab === 'transfer'"
          :volume-id="volumeId"
          :detail="detail"
          :can-review-transfer="canReviewTransfer"
          :can-reject-transfer="canRejectTransfer"
          @refreshed="loadDetail"
        />

        <ArchiveVolumeAccessPanel
          v-else-if="activeTab === 'access'"
          :volume-id="volumeId"
          :can-request-access="canRequestAccess"
          :can-approve-access-record="canApproveAccessRecord"
          :current-user-id="currentUserId"
        />

        <ArchiveVolumeAppraisalPanel
          v-else-if="activeTab === 'appraisal'"
          :volume-id="volumeId"
          :detail="detail"
          :can-manage-appraisal="canManageAppraisal"
          :can-approve-destruction="canApproveDestruction"
          :current-user-id="currentUserId"
          @refreshed="loadDetail"
        />

        <ArchiveVolumeEventsPanel
          v-else
          :events="detail.events"
        />
      </UiSectionTabs>
    </template>

    <UiEmpty v-else description="加载归档卷详情失败，请刷新重试" />
  </StageWorkbenchShell>
</template>

<script setup lang="ts">
import type {
  ArchiveAppraisalStatusCode,
  ArchiveVolumeAccessRecordVO,
  ArchiveVolumeDetailVO,
} from '@/apis/mark/archive-volume'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { message } from 'ant-design-vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { downloadFile } from '@/apis/edu/file-management'
import {
  ARCHIVE_APPRAISAL_STATUS_LABEL,
  ARCHIVE_APPRAISAL_STATUS_TONE,
  ARCHIVE_INTEGRITY_STATUS_LABEL,
  ARCHIVE_INTEGRITY_STATUS_TONE,
  ARCHIVE_TRANSFER_STATUS_LABEL,
  ARCHIVE_TRANSFER_STATUS_TONE,
  ARCHIVE_VOLUME_SOURCE_TYPE_LABEL,
  ARCHIVE_VOLUME_SOURCE_TYPE_TONE,
  ARCHIVE_VOLUME_STATUS_LABEL,
  ARCHIVE_VOLUME_STATUS_TONE,
  checkArchiveVolumeIntegrity,
  exportArchiveVolume,
  getArchiveVolumeDetail,
  submitArchiveVolume,
} from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useArchiveDutyAccess } from '@/composables/useArchiveDutyAccess'
import { canSubmitArchiveVolumeDetail, describeSubmitBlockReason, isScoreSubmitReady } from '@/composables/useArchiveVolumeSubmitGate'
import { useUserStore } from '@/stores/modules/user'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import ArchiveVolumeAccessPanel from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeAccessPanel.vue'
import ArchiveVolumeAppraisalPanel from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeAppraisalPanel.vue'
import ArchiveVolumeEventsPanel from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeEventsPanel.vue'
import ArchiveVolumeIntegrityPanel from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeIntegrityPanel.vue'
import ArchiveVolumeMaterialTablePanel from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeMaterialTablePanel.vue'
import ArchiveVolumeMaterialTreePanel from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeMaterialTreePanel.vue'
import ArchiveVolumeScoresPanel from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeScoresPanel.vue'
import ArchiveVolumeTransferPanel from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeTransferPanel.vue'

defineOptions({ name: 'TeacherArchiveVolumeDetail' })

const route = useRoute()
const router = useRouter()
const volumeId = computed(() => String(route.params.volumeId ?? ''))
const userStore = useUserStore()
const {
  canApproveDestruction,
  canApproveAccessForVolume,
  canManageRemediationAsCoordinator,
  canReviewTransfer,
  canRejectTransfer,
  grantsLoadFailed,
  loadGrants,
} = useArchiveDutyAccess()
const currentUserId = computed(() => String(userStore.userInfo?.userId ?? ''))

const loading = ref(true)
const detail = ref<ArchiveVolumeDetailVO | null>(null)
const activeTab = ref('materials')
const checkingIntegrity = ref(false)
const selectedCatalogKeys = ref<string[]>([])
const submitting = ref(false)
const exporting = ref(false)

const integrityResult = ref<Awaited<ReturnType<typeof checkArchiveVolumeIntegrity>> | null>(null)
const fourPropertyResult = ref<ArchiveVolumeDetailVO['latestFourPropertyCheck']>(undefined)

const sectionTabs = [
  { key: 'materials', label: '材料目录' },
  { key: 'scores', label: '成绩证明' },
  { key: 'integrity', label: '完整性/四性' },
  { key: 'transfer', label: '移交验收' },
  { key: 'access', label: '查阅' },
  { key: 'appraisal', label: '鉴定销毁' },
  { key: 'events', label: '事件流水' },
]

const canSyncTeachingAffairs = computed(() => {
  const detailValue = detail.value
  if (!detailValue?.canManageMaterials) return false
  const volume = detailValue.volume
  if (volume.scoreSource === 'MARK_INTERNAL') return false
  if (volume.volumeStatus !== 'DRAFT' && volume.volumeStatus !== 'COLLECTING') return false
  return volume.scoreCompletionStatus === 'PENDING' || volume.scoreCompletionStatus === 'NOT_REQUIRED'
})

const displayedIntegrityResult = computed(() =>
  integrityResult.value ?? detail.value?.latestIntegrityCheck ?? null,
)

const displayedFourProperty = computed(() =>
  fourPropertyResult.value ?? detail.value?.latestFourPropertyCheck ?? null,
)

const canConfirmScoreCompletion = computed(() => {
  const d = detail.value
  if (!d?.canManageMaterials) return false
  const vol = d.volume
  if (vol.volumeStatus !== 'DRAFT' && vol.volumeStatus !== 'COLLECTING') return false
  if (vol.scoreSource !== 'TEACHING_AFFAIRS' && vol.scoreSource !== 'OFFLINE_CONFIRMED') return false
  return vol.scoreCompletionStatus === 'PENDING'
})

const submitBlockReason = computed(() => {
  const d = detail.value
  if (!d) return null
  return describeSubmitBlockReason({
    volume: d.volume,
    currentUserId: currentUserId.value,
    fourPropertyStale: d.fourPropertyStale,
    fourPropertyPassed: d.latestFourPropertyCheck?.overallPassed,
    hasBlockingRemediationForSubmit: d.hasBlockingRemediationForSubmit,
  })
})

const scoreSubmitBlockReason = computed(() => {
  const d = detail.value
  if (!d || d.volume.volumeStatus !== 'COLLECTING') return null
  if (d.volume.responsibleUserId !== currentUserId.value) return null
  if (isScoreSubmitReady(d.volume)) return null
  if (d.volume.scoreSource === 'MARK_INTERNAL') {
    return '线上阅卷双门禁未满足'
  }
  return '成绩证明未完成'
})

function volumeStatusLabel(code: ArchiveVolumeDetailVO['volume']['volumeStatus']) {
  return strictEnumLabel(ARCHIVE_VOLUME_STATUS_LABEL, code, 'volumeStatus')
}

function volumeStatusTone(code: ArchiveVolumeDetailVO['volume']['volumeStatus']): BadgeTone {
  return strictEnumTone(ARCHIVE_VOLUME_STATUS_TONE, code, 'volumeStatus')
}

function integrityStatusLabel(code: ArchiveVolumeDetailVO['volume']['integrityStatus']) {
  return strictEnumLabel(ARCHIVE_INTEGRITY_STATUS_LABEL, code, 'integrityStatus')
}

function integrityStatusTone(code: ArchiveVolumeDetailVO['volume']['integrityStatus']): BadgeTone {
  return strictEnumTone(ARCHIVE_INTEGRITY_STATUS_TONE, code, 'integrityStatus')
}

function sourceTypeLabel(code: ArchiveVolumeDetailVO['volume']['sourceType']) {
  return strictEnumLabel(ARCHIVE_VOLUME_SOURCE_TYPE_LABEL, code, 'sourceType')
}

function sourceTypeTone(code: ArchiveVolumeDetailVO['volume']['sourceType']): BadgeTone {
  return strictEnumTone(ARCHIVE_VOLUME_SOURCE_TYPE_TONE, code, 'sourceType')
}

function transferStatusLabel(code: ArchiveVolumeDetailVO['volume']['transferStatus']) {
  return strictEnumLabel(ARCHIVE_TRANSFER_STATUS_LABEL, code, 'transferStatus')
}

function transferStatusTone(code: ArchiveVolumeDetailVO['volume']['transferStatus']): BadgeTone {
  return strictEnumTone(ARCHIVE_TRANSFER_STATUS_TONE, code, 'transferStatus')
}

function canApproveAccessRecord(record: ArchiveVolumeAccessRecordVO) {
  return canApproveAccessForVolume({
    departmentId: record.departmentId,
    securityLevel: record.securityLevel,
  })
}

function appraisalStatusLabel(code: ArchiveAppraisalStatusCode) {
  return strictEnumLabel(ARCHIVE_APPRAISAL_STATUS_LABEL, code, 'appraisalStatus')
}

function appraisalStatusTone(code: ArchiveAppraisalStatusCode): BadgeTone {
  return strictEnumTone(ARCHIVE_APPRAISAL_STATUS_TONE, code, 'appraisalStatus')
}

const canManageAppraisal = computed(() => detail.value?.canManageAppraisal === true)

const canSubmitVolume = computed(() =>
  detail.value ? canSubmitArchiveVolumeDetail(detail.value, currentUserId.value) : false,
)

const canExportManifest = computed(() => {
  const status = detail.value?.volume.volumeStatus
  return status === 'SUBMITTED' || status === 'STORED'
})

const canRegisterMaterial = computed(() => {
  const d = detail.value
  if (!d?.canManageMaterials) return false
  if (d.hasOpenRemediationTask) return true
  const status = d.volume.volumeStatus
  return status === 'DRAFT' || status === 'COLLECTING'
})

const canAllowMaterialDelay = computed(() => {
  const d = detail.value
  if (!d) return false
  return canManageRemediationAsCoordinator(d.volume)
})

const canWaiveMaterialMissing = computed(() => detail.value?.canManageArchiveAdmin === true)

const canWaiveIntegrity = computed(() => {
  const d = detail.value
  if (!d?.canManageArchiveAdmin) return false
  if (d.volume.integrityStatus === 'WAIVED') return false
  const status = d.volume.volumeStatus
  return status === 'DRAFT' || status === 'COLLECTING'
})

const canRequestAccess = computed(() => detail.value?.volume.volumeStatus === 'STORED')

async function loadDetail(options?: { silent?: boolean }) {
  if (!volumeId.value) {
    showUserError(new Error('缺少归档卷 ID'), '缺少归档卷 ID')
    loading.value = false
    return
  }
  if (!options?.silent) {
    loading.value = true
  }
  try {
    detail.value = await getArchiveVolumeDetail(volumeId.value)
    fourPropertyResult.value = detail.value.latestFourPropertyCheck
    integrityResult.value = detail.value.latestIntegrityCheck ?? null
  }
  catch (error) {
    if (!options?.silent) {
      showUserError(error, '加载归档卷详情失败')
      detail.value = null
    }
  }
  finally {
    if (!options?.silent) {
      loading.value = false
    }
  }
}

async function runIntegrityCheck() {
  checkingIntegrity.value = true
  try {
    integrityResult.value = await checkArchiveVolumeIntegrity(volumeId.value)
    message.success('完整性检查完成')
    await loadDetail()
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    checkingIntegrity.value = false
  }
}

async function handleSubmit() {
  submitting.value = true
  try {
    await submitArchiveVolume({ volumeId: volumeId.value })
    message.success('已提交归档')
    await loadDetail()
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    submitting.value = false
  }
}

async function handleExport() {
  exporting.value = true
  try {
    const result = await exportArchiveVolume(volumeId.value)
    if (!result.exportFileId) {
      message.error('导出未返回文件 ID')
      return
    }
    await downloadFile({ nodeId: result.exportFileId })
    message.success(`导出完成，材料 ${result.materialCount ?? 0} 项`)
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    exporting.value = false
  }
}

function goBack() {
  void router.push({ name: 'TeacherArchiveVolumeList' })
}

function resolveInitialTab() {
  const raw = route.query.tab
  if (typeof raw === 'string' && sectionTabs.some(item => item.key === raw)) {
    activeTab.value = raw
  }
}

onMounted(() => {
  void loadGrants()
  resolveInitialTab()
  void loadDetail()
})

watch(
  () => route.query.scanCommitted,
  (value) => {
    if (value !== '1') {
      return
    }
    activeTab.value = 'materials'
    void loadDetail({ silent: true })
    const nextQuery = { ...route.query }
    delete nextQuery.scanCommitted
    void router.replace({ path: route.path, query: nextQuery })
  },
  { immediate: true },
)
</script>

<style scoped>
.archive-volume-detail__alert {
  margin-bottom: var(--dp-space-4, 16px);
}

.archive-volume-detail__head {
  margin-bottom: var(--dp-space-4, 16px);
}

.archive-volume-detail__title {
  margin: 0;
  font-size: var(--dp-font-size-xl, 18px);
  font-weight: 600;
}

.archive-volume-detail__meta {
  margin: 4px 0 0;
  color: var(--dp-text-secondary, #64748b);
  font-size: 14px;
}

.archive-volume-detail__panel {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4, 16px);
}

.archive-volume-detail__catalog {
  display: flex;
  gap: var(--dp-space-4, 16px);
  align-items: flex-start;
}
</style>

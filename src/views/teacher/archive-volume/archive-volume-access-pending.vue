<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="待审批查阅" subtitle="跨卷借阅审批">
        <template #actions>
          <UiButton variant="ghost" size="sm" :loading="loading" @click="loadRecords">刷新</UiButton>
          <UiButton variant="outline" size="sm" @click="goList">返回归档工作台</UiButton>
        </template>
      </ContextBar>
    </template>

    <WorkbenchSurfaceCard flush>
      <UiSkeletonState v-if="loading" variant="card" compact />
      <UiEmpty v-else-if="records.length === 0" description="暂无待审批查阅申请" />
      <div v-else class="archive-access-pending__list">
        <article
          v-for="record in records"
          :key="record.accessRecordId"
          class="approval-card"
          :class="archiveAccessApprovalCardClass(record.accessStatus)"
        >
          <div class="approval-card__head">
            <span class="approval-card__applicant">
              {{ archiveAccessApplicantLabel(
                record.applicantNickName,
                record.applicantIdentifier,
                record.applicantUserId,
              ) }}
            </span>
            <UiTag :tone="archiveAccessStatusTone(record.accessStatus)" size="sm">
              {{ archiveAccessStatusLabel(record.accessStatus) }}
            </UiTag>
            <span class="approval-card__time">{{ formatDateTime(record.createTime) }}</span>
          </div>
          <p class="approval-card__meta">
            <span v-if="record.archiveNo">{{ record.archiveNo }}</span>
            <span v-if="record.archiveTitle"> · {{ record.archiveTitle }}</span>
            <span v-if="record.departmentName"> · {{ record.departmentName }}</span>
          </p>
          <p v-if="record.accessReason" class="approval-card__reason">{{ record.accessReason }}</p>
          <div v-if="canApprove(record)" class="approval-card__actions">
            <template v-if="rejectingId === record.accessRecordId">
              <a-textarea
                v-model:value="rejectComment"
                :rows="2"
                placeholder="填写驳回原因"
                class="approval-card__reject-input"
              />
              <div class="approval-card__action-row">
                <UiButton size="sm" variant="outline" :loading="submitting" @click="cancelReject">取消</UiButton>
                <UiButton size="sm" variant="outline" :loading="submitting" @click="submitReject(record.accessRecordId)">
                  确认驳回
                </UiButton>
              </div>
            </template>
            <template v-else-if="approvingId === record.accessRecordId">
              <a-textarea
                v-model:value="approveComment"
                :rows="2"
                placeholder="可选审批意见"
                class="approval-card__reject-input"
              />
              <div class="approval-card__action-row">
                <UiButton size="sm" variant="outline" @click="cancelApprove">取消</UiButton>
                <UiButton size="sm" :loading="submitting" @click="submitApprove(record.accessRecordId)">
                  确认批准
                </UiButton>
              </div>
            </template>
            <template v-else>
              <UiButton size="sm" @click="startApprove(record.accessRecordId)">批准</UiButton>
              <UiButton size="sm" variant="outline" @click="startReject(record.accessRecordId)">拒绝</UiButton>
              <UiButton size="sm" variant="ghost" @click="goVolumeDetail(record.volumeId)">打开卷详情</UiButton>
            </template>
          </div>
        </article>
      </div>
    </WorkbenchSurfaceCard>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { ArchiveVolumeAccessRecordResponse } from '@/apis/mark/archive-volume'
import message from 'ant-design-vue/es/message'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  approveArchiveVolumeAccess,
  listPendingArchiveAccessRecords,
  rejectArchiveVolumeAccess,
} from '@/apis/mark/archive-volume'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/UiEmpty.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import { useArchiveDutyAccess } from '@/composables/useArchiveDutyAccess'
import {
  archiveAccessApplicantLabel,
  archiveAccessApprovalCardClass,
  archiveAccessStatusLabel,
  archiveAccessStatusTone,
} from '@/utils/archive-access-record-ui'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'

defineOptions({ name: 'TeacherArchiveVolumeAccessPending' })

const router = useRouter()
const { canApproveAccessForVolume } = useArchiveDutyAccess()

const loading = ref(false)
const submitting = ref(false)
const records = ref<ArchiveVolumeAccessRecordResponse[]>([])
const approvingId = ref('')
const rejectingId = ref('')
const approveComment = ref('')
const rejectComment = ref('')

function canApprove(record: ArchiveVolumeAccessRecordResponse): boolean {
  return canApproveAccessForVolume({
    departmentId: record.departmentId,
    securityLevel: record.securityLevel,
  })
}

async function loadRecords(): Promise<void> {
  loading.value = true
  try {
    records.value = await listPendingArchiveAccessRecords()
  } catch (error) {
    records.value = []
    showUserError(error, '待审批查阅列表加载失败')
  } finally {
    loading.value = false
  }
}

function goList(): void {
  void router.push({ name: 'TeacherArchiveVolumeList' })
}

function goVolumeDetail(volumeId: string): void {
  void router.push({ name: 'TeacherArchiveVolumeDetail', params: { volumeId } })
}

function startApprove(accessRecordId: string): void {
  approvingId.value = accessRecordId
  approveComment.value = ''
  rejectingId.value = ''
  rejectComment.value = ''
}

function cancelApprove(): void {
  approvingId.value = ''
  approveComment.value = ''
}

function startReject(accessRecordId: string): void {
  rejectingId.value = accessRecordId
  rejectComment.value = ''
  approvingId.value = ''
  approveComment.value = ''
}

function cancelReject(): void {
  rejectingId.value = ''
  rejectComment.value = ''
}

async function submitApprove(accessRecordId: string): Promise<void> {
  submitting.value = true
  try {
    await approveArchiveVolumeAccess({
      accessRecordId,
      decisionComment: approveComment.value.trim() || undefined,
    })
    message.success('已批准查阅')
    cancelApprove()
    await loadRecords()
  } catch (error) {
    showUserError(error, '批准查阅失败')
  } finally {
    submitting.value = false
  }
}

async function submitReject(accessRecordId: string): Promise<void> {
  if (!rejectComment.value.trim()) {
    message.warning('请填写驳回原因')
    return
  }
  submitting.value = true
  try {
    await rejectArchiveVolumeAccess({
      accessRecordId,
      decisionComment: rejectComment.value.trim(),
    })
    message.success('已驳回查阅')
    cancelReject()
    await loadRecords()
  } catch (error) {
    showUserError(error, '驳回查阅失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  void loadRecords()
})
</script>

<style scoped>
.archive-access-pending__list {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-2, 8px);
  padding: var(--dp-space-3, 12px) 0;
}
</style>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="查阅审批"
        subtitle="涉密档案查阅申请按密级矩阵授权，批准后自动附加水印"
      >
        <template #actions>
          <UiButton variant="ghost" size="sm" @click="goList">查阅台账</UiButton>
        </template>
      </ContextBar>
    </template>

    <WorkbenchSurfaceCard flush>
      <UiSkeletonState v-if="loading" variant="card" compact />
      <div v-else-if="loadFailed" class="archive-access-pending__load-error">
        <p>待审批查阅申请加载失败</p>
        <UiButton size="sm" variant="outline" @click="loadRecords">重试</UiButton>
      </div>
      <UiEmpty size="sm" v-else-if="records.length === 0" description="暂无待审批查阅申请" />
      <div v-else class="archive-access-pending__list">
        <article
          v-for="record in records"
          :key="record.accessRecordId"
          class="approval-card"
          :class="archiveAccessApprovalCardClass(record.accessStatus)"
        >
          <div class="approval-card__head">
            <span class="approval-card__applicant">
              {{
                archiveAccessApplicantLabel(
                  record.applicantNickName,
                  record.applicantIdentifier,
                  record.applicantUserId,
                )
              }}
            </span>
            <UiTag :tone="archiveAccessStatusTone(record.accessStatus)" size="sm">
              {{ archiveAccessStatusLabel(record.accessStatus) }}
            </UiTag>
            <UiTag
              v-if="record.securityLevel"
              :tone="archiveSecurityLevelTagTone(record.securityLevel)"
              size="sm"
            >
              {{
                strictEnumLabel(
                  ArchiveSecurityLevelDescription,
                  record.securityLevel,
                  'securityLevel',
                )
              }}
            </UiTag>
            <span class="approval-card__time">申请于 {{ formatDateTime(record.createTime) }}</span>
          </div>
          <p class="approval-card__meta">
            <span v-if="record.archiveNo">{{ record.archiveNo }}</span>
            <span v-if="record.archiveTitle"> · {{ record.archiveTitle }}</span>
            <span v-if="record.departmentName"> · {{ record.departmentName }}</span>
          </p>
          <p v-if="record.accessReason" class="approval-card__reason">
            <span class="approval-card__reason-label">查阅事由</span>
            {{ record.accessReason }}
          </p>
          <div v-if="canApprove(record)" class="approval-card__actions">
            <template v-if="rejectingId === record.accessRecordId">
              <UiTextarea
                size="sm"
                v-model="rejectComment"
                :maxlength="500"
                :rows="2"
                placeholder="填写驳回原因"
                class="approval-card__reject-input"
                :show-count="true"
              />
              <div class="approval-card__action-row">
                <UiButton size="sm" variant="outline" :loading="submitting" @click="cancelReject">
                  取消
                </UiButton>
                <UiButton
                  size="sm"
                  variant="outline"
                  :loading="submitting"
                  @click="submitReject(record.accessRecordId)"
                >
                  确认驳回
                </UiButton>
              </div>
            </template>
            <template v-else-if="approvingId === record.accessRecordId">
              <UiTextarea
                size="sm"
                v-model="approveComment"
                :maxlength="500"
                :rows="2"
                placeholder="可选审批意见"
                class="approval-card__reject-input"
                :show-count="true"
              />
              <div class="approval-card__action-row">
                <UiButton size="sm" variant="outline" @click="cancelApprove">取消</UiButton>
                <UiButton
                  variant="primary"
                  size="sm"
                  :loading="submitting"
                  @click="submitApprove(record.accessRecordId)"
                >
                  确认批准
                </UiButton>
              </div>
            </template>
            <template v-else>
              <UiButton
                size="sm"
                variant="primary"
                status="success"
                @click="startApprove(record.accessRecordId)"
              >
                批准
              </UiButton>
              <UiButton
                size="sm"
                variant="outline"
                status="danger"
                @click="startReject(record.accessRecordId)"
              >
                驳回
              </UiButton>
              <UiButton size="sm" variant="ghost" @click="goVolumeDetail(record.volumeId)">
                查看卷详情
              </UiButton>
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
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import {
  ArchiveSecurityLevelCode,
  ArchiveSecurityLevelDescription,
} from '@/types/enums/archive-security-level-enum'
import {
  archiveAccessApplicantLabel,
  archiveAccessApprovalCardClass,
  archiveAccessStatusLabel,
  archiveAccessStatusTone,
} from '@/utils/archive-access-record-ui'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherArchiveVolumeAccessPending' })

const router = useRouter()
const loading = ref(false)
const loadFailed = ref(false)
const submitting = ref(false)
const records = ref<ArchiveVolumeAccessRecordResponse[]>([])
const approvingId = ref('')
const rejectingId = ref('')
const approveComment = ref('')
const rejectComment = ref('')

/** 密级标签色调：机密用紫色突出，其余密级灰色。 */
function archiveSecurityLevelTagTone(level: ArchiveSecurityLevelCode): 'purple' | 'gray' {
  return level === ArchiveSecurityLevelCode.CONFIDENTIAL ? 'purple' : 'gray'
}

function canApprove(record: ArchiveVolumeAccessRecordResponse): boolean {
  // MVR-189：与 BE listPendingAccessRecords canApprove 同源，屏蔽申请人自批自驳
  return record.canApprove === true
}

async function loadRecords(): Promise<void> {
  loading.value = true
  try {
    records.value = await listPendingArchiveAccessRecords()
    loadFailed.value = false
  } catch (error) {
    loadFailed.value = true
    showUserError(error, '待审批查阅列表加载失败')
  } finally {
    loading.value = false
  }
}

function goList(): void {
  void router.push({ name: 'TeacherArchiveVolumeLedger' })
}

function goVolumeDetail(volumeId: string): void {
  void router.push({ name: 'TeacherArchiveVolumeDetail', params: { volumeId } })
}

function startApprove(accessRecordId: string): void {
  // MVR-310：与 canApprove 同源，防拆栏后启动审批态
  const target = records.value.find((item) => item.accessRecordId === accessRecordId)
  if (!target || !canApprove(target)) {
    return
  }
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
  // MVR-310：与 canApprove 同源，防拆栏后启动驳回态
  const target = records.value.find((item) => item.accessRecordId === accessRecordId)
  if (!target || !canApprove(target)) {
    return
  }
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
  if (submitting.value) return
  // MVR-310：写 handler 二次拦截，与行级 canApprove / BE requireAccessApprover 对齐
  const target = records.value.find((item) => item.accessRecordId === accessRecordId)
  if (!target || !canApprove(target)) {
    void message.warning('当前账号无批准查阅权限')
    return
  }
  submitting.value = true
  try {
    await approveArchiveVolumeAccess({
      accessRecordId,
      decisionComment: approveComment.value.trim() || undefined,
    })
    void message.success('已批准查阅')
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
    showFormValidationMessage('请填写驳回原因')
    return
  }
  if (submitting.value) return
  // MVR-310：写 handler 二次拦截，与行级 canApprove / BE requireAccessApprover 对齐
  const target = records.value.find((item) => item.accessRecordId === accessRecordId)
  if (!target || !canApprove(target)) {
    void message.warning('当前账号无驳回查阅权限')
    return
  }
  submitting.value = true
  try {
    await rejectArchiveVolumeAccess({
      accessRecordId,
      decisionComment: rejectComment.value.trim(),
    })
    void message.success('已驳回查阅')
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
  gap: var(--dp-space-2);
  padding: var(--dp-space-3) 0;
}

.archive-access-pending__load-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-3);
}

.archive-access-pending__load-error p {
  margin: 0;
  color: var(--dp-text-secondary);
}

.approval-card__reason-label {
  margin-right: var(--dp-space-2);
  color: var(--dp-text-muted);
}
</style>

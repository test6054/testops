<script setup lang="ts">
import type {
  ArchiveVolumeDetailResponse,
  ArchiveVolumeMaterialResponse,
} from '@/apis/mark/archive-volume'
import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import {
  ArchiveMaterialSubmissionStatusCode,
  ArchiveMaterialTypeDescription,
  ArchiveScoreSourceDescription,
  ArchiveSecurityLevelDescription,
  ArchiveVolumeSourceTypeDescription,
  updateArchiveVolumeTaskSettings,
} from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiDatePicker from '@/components/ui-guide/ui/DatePicker.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiCol from '@/components/ui-guide/ui/UiCol.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiRow from '@/components/ui-guide/ui/UiRow.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { ArchiveVolumeMemberRoleCode } from '@/types/enums/archive-volume-member-role-enum'
import { getSemesterDescription } from '@/types/enums/semester-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel } from '@/utils/strict-enum'

const props = defineProps<{
  detail: ArchiveVolumeDetailResponse
  canManageCollaborators: boolean
  canUpdateArchiveDueTime: boolean
}>()

const emit = defineEmits<{
  'open-materials': []
  "updated": []
}>()

const savingTitle = ref(false)
const savingDue = ref(false)
const titleEditValue = ref('')
const dueEditValue = ref<string | undefined>()
const dueReason = ref('')

const volume = computed(() => props.detail.volume)
const labelCol = { style: { width: '112px' } }
const wrapperCol = { flex: 1 }

const termLabel = computed(() => {
  const parts = [
    volume.value.academicYear,
    volume.value.semester ? getSemesterDescription(volume.value.semester) : undefined,
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : '—'
})

const courseLabel = computed(() => {
  const v = volume.value
  return v.courseName || (v.courseId ? `课程 ${v.courseId}` : '—')
})

const sourceTypeLabel = computed(() => {
  const source = volume.value.sourceType
  return source
    ? strictEnumLabel(ArchiveVolumeSourceTypeDescription, source, 'sourceType')
    : '—'
})

const scoreSourceLabel = computed(() => {
  const source = volume.value.scoreSource
  return source
    ? strictEnumLabel(ArchiveScoreSourceDescription, source, 'scoreSource')
    : '—'
})

const relatedExamLabel = computed(() => {
  const v = volume.value
  return v.relatedExamName || v.relatedExamNo || (v.examId ? `考试 ${v.examId}` : '未关联')
})

const retentionLabel = computed(() => {
  if (volume.value.permanentRetention) return '永久保管'
  if (volume.value.retentionYears != null) return `${volume.value.retentionYears} 年`
  return '—'
})

const securityLevelLabel = computed(() => {
  const level = volume.value.securityLevel
  if (!level) return '—'
  return strictEnumLabel(ArchiveSecurityLevelDescription, level, 'securityLevel')
})

const organizerName = computed(() => {
  const organizer = (props.detail.collaborators ?? []).find(
    (m) => m.memberRole === ArchiveVolumeMemberRoleCode.ORGANIZER,
  )
  return organizer?.userName || (volume.value.responsibleUserId
    ? `用户 ${volume.value.responsibleUserId}`
    : '—')
})

const materialChecklist = computed(() => props.detail.materials ?? [])

const materialReadyCount = computed(
  () =>
    materialChecklist.value.filter(
      (row) => row.submissionStatus === ArchiveMaterialSubmissionStatusCode.SUBMITTED,
    ).length,
)

function materialRowLabel(row: ArchiveVolumeMaterialResponse): string {
  return strictEnumLabel(ArchiveMaterialTypeDescription, row.materialType, 'materialType')
}

function materialRowStatus(row: ArchiveVolumeMaterialResponse): string {
  if (row.submissionStatus === ArchiveMaterialSubmissionStatusCode.SUBMITTED) return '已登记'
  if (row.submissionStatus === ArchiveMaterialSubmissionStatusCode.DELAY_ALLOWED) return '可延迟'
  if (row.submissionStatus === ArchiveMaterialSubmissionStatusCode.OVERDUE) return '已逾期'
  if (row.submissionStatus === ArchiveMaterialSubmissionStatusCode.WAIVED_WITH_REASON)
    return '已豁免'
  return row.requiredFlag === false ? '选交' : '待登记'
}

watch(
  () => volume.value.archiveTitle,
  (title) => {
    titleEditValue.value = title || ''
  },
  { immediate: true },
)

watch(
  () => volume.value.archiveDueTime,
  (dueTime) => {
    dueReason.value = ''
    dueEditValue.value = dueTime || undefined
  },
  { immediate: true },
)

async function saveArchiveTitle(): Promise<void> {
  if (savingTitle.value) return
  if (props.canManageCollaborators !== true) {
    message.warning('当前账号无归档标题维护权限')
    return
  }
  const nextTitle = titleEditValue.value.trim()
  if (!nextTitle) {
    showFormValidationMessage('归档标题不能为空')
    return
  }
  if (nextTitle === (volume.value.archiveTitle || '')) {
    message.info('标题未变更')
    return
  }
  savingTitle.value = true
  try {
    await updateArchiveVolumeTaskSettings({
      volumeId: volume.value.volumeId,
      archiveTitle: nextTitle,
    })
    message.success('归档标题已更新')
    emit('updated')
  } catch (error) {
    showUserError(error, '更新归档标题失败')
  } finally {
    savingTitle.value = false
  }
}

async function saveArchiveDueTime(): Promise<void> {
  if (savingDue.value) return
  if (props.canUpdateArchiveDueTime !== true) {
    message.warning('当前账号无归档截止维护权限')
    return
  }
  if (!dueEditValue.value) {
    showFormValidationMessage('请选择归档截止时刻')
    return
  }
  const reason = dueReason.value.trim()
  if (!reason) {
    showFormValidationMessage('请填写覆盖原因')
    return
  }
  savingDue.value = true
  try {
    await updateArchiveVolumeTaskSettings({
      volumeId: volume.value.volumeId,
      expectedArchiveDueTime: volume.value.archiveDueTime ?? null,
      archiveDueTime: dueEditValue.value,
      reason,
    })
    message.success('归档截止已更新')
    emit('updated')
  } catch (error) {
    showUserError(error, '更新归档截止失败')
  } finally {
    savingDue.value = false
  }
}
</script>

<template>
  <WorkbenchSurfaceCard embedded class="av-task-settings">
    <UiForm
      layout="horizontal"
      :label-col="labelCol"
      :wrapper-col="wrapperCol"
      class="create-form"
    >
      <div class="form-section">
        <div class="section-header">
          <h3 class="section-title">任务信息</h3>
        </div>
        <p class="section-desc">
          与创建页同构；收材阶段可改归档标题。课程、学年学期等建卷身份只读。
        </p>

        <UiFormItem label="归档标题" required>
          <div v-if="canManageCollaborators" class="av-task-settings__inline-edit">
            <UiInput
              size="sm"
              v-model="titleEditValue"
              placeholder="例如：2024-2025 高等数学期末考查"
              :maxlength="512"
              class="av-task-settings__control-grow"
            />
            <UiButton size="sm" variant="primary" :loading="savingTitle" @click="saveArchiveTitle">
              保存标题
            </UiButton>
          </div>
          <UiInput v-else size="sm" :value="volume.archiveTitle || '—'" disabled />
        </UiFormItem>

        <UiFormItem label="档案编号">
          <UiInput size="sm" :value="volume.archiveNo || '—'" disabled />
        </UiFormItem>

        <UiRow :gutter="24" class="create-form__split-row">
          <UiCol :span="12">
            <UiFormItem label="课程" :label-col="labelCol" :wrapper-col="wrapperCol">
              <UiInput size="sm" :value="courseLabel" disabled />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem label="授课班级" :label-col="labelCol" :wrapper-col="wrapperCol">
              <UiInput size="sm" :value="volume.teachingClassName || '—'" disabled />
            </UiFormItem>
          </UiCol>
        </UiRow>

        <UiRow :gutter="24" class="create-form__split-row">
          <UiCol :span="12">
            <UiFormItem label="院系" :label-col="labelCol" :wrapper-col="wrapperCol">
              <UiInput size="sm" :value="volume.departmentName || '—'" disabled />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem label="学年学期" :label-col="labelCol" :wrapper-col="wrapperCol">
              <UiInput size="sm" :value="termLabel" disabled />
            </UiFormItem>
          </UiCol>
        </UiRow>

        <UiRow :gutter="24" class="create-form__split-row">
          <UiCol :span="12">
            <UiFormItem label="建卷来源" :label-col="labelCol" :wrapper-col="wrapperCol">
              <UiInput size="sm" :value="sourceTypeLabel" disabled />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem label="成绩来源" :label-col="labelCol" :wrapper-col="wrapperCol">
              <UiInput size="sm" :value="scoreSourceLabel" disabled />
            </UiFormItem>
          </UiCol>
        </UiRow>

        <UiFormItem label="关联考试">
          <UiInput size="sm" :value="relatedExamLabel" disabled />
        </UiFormItem>
      </div>

      <div class="form-section">
        <div class="section-header">
          <h3 class="section-title">归档方案</h3>
        </div>
        <p class="section-desc">
          模板套、密级与责任人创建时绑定；收材阶段可覆盖归档截止（须填原因）。
        </p>

        <UiFormItem label="目录模板套">
          <UiInput size="sm" :value="volume.templateSetCode || '—'" disabled />
        </UiFormItem>

        <UiRow :gutter="24" class="create-form__split-row">
          <UiCol :span="12">
            <UiFormItem label="密级" :label-col="labelCol" :wrapper-col="wrapperCol">
              <UiInput size="sm" :value="securityLevelLabel" disabled />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem label="保管期限" :label-col="labelCol" :wrapper-col="wrapperCol">
              <UiInput
                size="sm"
                :value="
                  volume.retentionUntil
                    ? `${retentionLabel}（到期 ${volume.retentionUntil}）`
                    : retentionLabel
                "
                disabled
              />
            </UiFormItem>
          </UiCol>
        </UiRow>

        <UiFormItem label="归档责任人">
          <UiInput size="sm" :value="organizerName" disabled />
          <template #extra>
            <span class="create-form__field-hint">对应卷内 ORGANIZER；更换责任人走主链流转。</span>
          </template>
        </UiFormItem>

        <UiFormItem label="归档截止" :required="canUpdateArchiveDueTime">
          <template v-if="canUpdateArchiveDueTime">
            <div class="av-task-settings__due-stack">
              <UiDatePicker
                size="sm"
                v-model="dueEditValue"
                show-time
                format="YYYY-MM-DD HH:mm"
                value-format="YYYY-MM-DD HH:mm:ss"
                placeholder="选择归档截止时刻"
                class="av-task-settings__control-grow"
              />
              <UiInput
                size="sm"
                v-model="dueReason"
                placeholder="覆盖原因（必填，写入审计）"
                :maxlength="200"
                class="av-task-settings__control-grow"
              />
              <UiButton size="sm" variant="primary" :loading="savingDue" @click="saveArchiveDueTime">
                保存截止时刻
              </UiButton>
            </div>
          </template>
          <UiInput
            v-else
            size="sm"
            :value="formatDateTime(volume.archiveDueTime) || '—'"
            disabled
          />
          <template #extra>
            <span class="create-form__field-hint">
              {{
                canUpdateArchiveDueTime
                  ? '须晚于当前时刻；覆盖原因写入事件流水。'
                  : '按租户归档时限策略计算；收材完成后不可再改。'
              }}
            </span>
          </template>
        </UiFormItem>
      </div>

      <div class="form-section">
        <div class="section-header">
          <h3 class="section-title">
            材料清单
            <span class="av-task-settings__count">
              {{ materialReadyCount }}/{{ materialChecklist.length }} 已登记
            </span>
          </h3>
          <UiButton size="sm" variant="ghost" @click="emit('open-materials')">去登记材料</UiButton>
        </div>
        <p class="section-desc">只读预览模板套解析出的材料槽位；登记请到「材料收集」。</p>
        <ul v-if="materialChecklist.length > 0" class="av-task-settings__material-list">
          <li
            v-for="row in materialChecklist"
            :key="row.materialId"
            class="av-task-settings__material-item"
          >
            <span class="av-task-settings__material-name">{{ materialRowLabel(row) }}</span>
            <span class="av-task-settings__material-status">{{ materialRowStatus(row) }}</span>
          </li>
        </ul>
        <p v-else class="av-task-settings__empty">暂无材料槽位，请确认任务已绑定模板套。</p>
      </div>
    </UiForm>
  </WorkbenchSurfaceCard>
</template>

<style lang="scss" scoped>
@use '@/styles/breakpoints' as bp;

.av-task-settings {
  padding: var(--dp-space-4);
  max-width: 920px;
  background: var(--dp-bg-container);
}

.form-section {
  margin-bottom: var(--dp-space-6);
  padding-bottom: var(--dp-space-4);
  border-bottom: 1px solid var(--dp-border-subtle);

  &:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-2);
  margin-bottom: var(--dp-space-2);
}

.section-title {
  margin: 0;
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--dp-text-primary);
}

.section-desc {
  margin: 0 0 var(--dp-space-4);
  font-size: 13px;
  line-height: 1.5;
  color: var(--dp-text-secondary);
}

.create-form {
  width: 100%;
}

.create-form__split-row {
  width: 100%;
}

.create-form__field-hint {
  font-size: 12px;
  line-height: 1.45;
  color: var(--dp-text-muted);
}

.av-task-settings__inline-edit,
.av-task-settings__due-stack {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dp-space-2);
  width: 100%;
}

.av-task-settings__due-stack {
  flex-direction: column;
  align-items: flex-start;
}

.av-task-settings__control-grow {
  flex: 1;
  min-width: 200px;
  max-width: 480px;
}

.av-task-settings__count {
  font-size: 12px;
  font-weight: 500;
  color: var(--dp-text-muted);
  font-variant-numeric: tabular-nums;
}

.av-task-settings__material-list {
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-control, 6px);
  background: var(--dp-surface);
  overflow: hidden;
}

.av-task-settings__material-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-3);
  padding: 8px 12px;
  font-size: 13px;
  border-bottom: 1px solid var(--dp-border-subtle);

  &:last-child {
    border-bottom: none;
  }
}

.av-task-settings__material-name {
  color: var(--dp-text-primary);
}

.av-task-settings__material-status {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--dp-text-muted);
}

.av-task-settings__empty {
  margin: 0;
  font-size: 13px;
  color: var(--dp-text-muted);
}

@media (max-width: bp.$ant-grid-md) {
  .av-task-settings__control-grow {
    max-width: none;
    width: 100%;
  }
}
</style>

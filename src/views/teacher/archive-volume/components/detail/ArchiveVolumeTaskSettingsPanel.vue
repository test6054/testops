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
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { ArchiveVolumeMemberRoleCode } from '@/types/enums/archive-volume-member-role-enum'
import { getSemesterDescription } from '@/types/enums/semester-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel } from '@/utils/strict-enum'
import ArchiveVolumeCollaboratorStrip from '@/views/teacher/archive-volume/components/ArchiveVolumeCollaboratorStrip.vue'

const props = defineProps<{
  detail: ArchiveVolumeDetailResponse
  canManageCollaborators: boolean
  canUpdateArchiveDueTime: boolean
}>()

const emit = defineEmits<{
  'open-collaborators': []
  'open-materials': []
  "updated": []
}>()

const savingTitle = ref(false)
const savingDue = ref(false)
const titleEditValue = ref('')
const dueEditValue = ref<string | undefined>()
const dueReason = ref('')

const volume = computed(() => props.detail.volume)
const canEditTaskSettings = computed(
  () => props.canManageCollaborators === true || props.canUpdateArchiveDueTime === true,
)

const identityRows = computed(() => {
  const v = volume.value
  const termParts = [
    v.academicYear,
    v.semester ? getSemesterDescription(v.semester) : undefined,
  ].filter(Boolean)
  return [
    { key: 'no', label: '归档编号', value: v.archiveNo || '—' },
    {
      key: 'course',
      label: '课程',
      value: v.courseName || (v.courseId ? `课程 ${v.courseId}` : '—'),
    },
    { key: 'class', label: '教学班', value: v.teachingClassName || '—' },
    { key: 'term', label: '学年学期', value: termParts.length ? termParts.join(' · ') : '—' },
    { key: 'dept', label: '院系', value: v.departmentName || '—' },
    {
      key: 'source',
      label: '建卷来源',
      value: v.sourceType
        ? strictEnumLabel(ArchiveVolumeSourceTypeDescription, v.sourceType, 'sourceType')
        : '—',
    },
    {
      key: 'score',
      label: '成绩来源',
      value: v.scoreSource
        ? strictEnumLabel(ArchiveScoreSourceDescription, v.scoreSource, 'scoreSource')
        : '—',
    },
    {
      key: 'exam',
      label: '关联考试',
      value: v.relatedExamName || v.relatedExamNo || (v.examId ? `考试 ${v.examId}` : '未关联'),
    },
  ]
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
    <header class="av-task-settings__header">
      <h3 class="av-task-settings__title">任务设置</h3>
      <p class="av-task-settings__intro">
        查看本卷建卷身份与任务参数。收材阶段可修改归档标题与截止；模板、密级与责任人流转不在本页变更。
      </p>
    </header>

    <section class="av-task-settings__block">
      <h4 class="av-task-settings__heading">卷身份</h4>
      <div v-if="canManageCollaborators" class="av-task-settings__title-form">
        <span class="av-task-settings__title-label">归档标题</span>
        <UiInput
          size="sm"
          v-model="titleEditValue"
          placeholder="归档标题"
          :maxlength="200"
        />
        <UiButton size="sm" variant="primary" :loading="savingTitle" @click="saveArchiveTitle">
          保存标题
        </UiButton>
      </div>
      <p v-else class="av-task-settings__value">{{ volume.archiveTitle || '—' }}</p>
      <dl class="av-task-settings__identity">
        <div v-for="row in identityRows" :key="row.key" class="av-task-settings__identity-row">
          <dt>{{ row.label }}</dt>
          <dd>{{ row.value }}</dd>
        </div>
      </dl>
    </section>

    <div class="av-task-settings__grid">
      <section class="av-task-settings__section">
        <h4 class="av-task-settings__heading">归档责任人</h4>
        <p class="av-task-settings__value">{{ organizerName }}</p>
        <p class="av-task-settings__hint">对应卷内 ORGANIZER；更换责任人走主链流转，不可在此删除。</p>
      </section>

      <section class="av-task-settings__section">
        <h4 class="av-task-settings__heading">模板套</h4>
        <p class="av-task-settings__value">{{ volume.templateSetCode || '—' }}</p>
        <p class="av-task-settings__hint">创建时绑定，决定材料目录与自查项范围。</p>
      </section>

      <section class="av-task-settings__section">
        <h4 class="av-task-settings__heading">密级</h4>
        <p class="av-task-settings__value">{{ securityLevelLabel }}</p>
        <p class="av-task-settings__hint">卷密级在「四性与定密」中确认，与考试涉密标记相互独立。</p>
      </section>

      <section class="av-task-settings__section">
        <h4 class="av-task-settings__heading">保管期限</h4>
        <p class="av-task-settings__value">{{ retentionLabel }}</p>
        <p v-if="volume.retentionUntil" class="av-task-settings__hint">
          到期日 {{ volume.retentionUntil }}
        </p>
        <p v-else-if="volume.templateSetCode" class="av-task-settings__hint">
          继承自模板套 {{ volume.templateSetCode }}
        </p>
      </section>

      <section class="av-task-settings__section av-task-settings__section--wide">
        <div class="av-task-settings__heading-row">
          <h4 class="av-task-settings__heading">协作组</h4>
          <UiButton
            v-if="canManageCollaborators"
            size="sm"
            variant="outline"
            @click="emit('open-collaborators')"
          >
            去协作管理
          </UiButton>
        </div>
        <ArchiveVolumeCollaboratorStrip
          v-if="detail.collaborators?.length"
          :collaborators="detail.collaborators"
          :can-manage="canManageCollaborators"
          @manage="emit('open-collaborators')"
        />
        <p v-else class="av-task-settings__hint">尚未添加协作老师，可在协作管理页添加。</p>
      </section>

      <section class="av-task-settings__section av-task-settings__section--wide">
        <h4 class="av-task-settings__heading">归档截止</h4>
        <template v-if="canUpdateArchiveDueTime">
          <div class="av-task-settings__due-form">
            <UiDatePicker
              v-model="dueEditValue"
              show-time
              format="YYYY-MM-DD HH:mm"
              value-format="YYYY-MM-DD HH:mm:ss"
            />
            <UiInput
              size="sm"
              v-model="dueReason"
              placeholder="覆盖原因（必填，写入审计）"
              :maxlength="200"
            />
            <UiButton size="sm" variant="primary" :loading="savingDue" @click="saveArchiveDueTime">
              保存截止时刻
            </UiButton>
          </div>
          <p class="av-task-settings__hint">收材阶段归档责任人可手工覆盖；须晚于当前时刻，原因写入事件流水。</p>
        </template>
        <template v-else>
          <p class="av-task-settings__value">{{ formatDateTime(volume.archiveDueTime) || '—' }}</p>
          <p class="av-task-settings__hint">
            {{
              canEditTaskSettings
                ? '按租户归档时限策略计算。'
                : '按租户归档时限策略计算；收材完成后不可再改。'
            }}
          </p>
        </template>
      </section>

      <section class="av-task-settings__section av-task-settings__section--wide">
        <div class="av-task-settings__heading-row">
          <h4 class="av-task-settings__heading">
            材料清单（只读）
            <span class="av-task-settings__count">
              {{ materialReadyCount }}/{{ materialChecklist.length }} 已登记
            </span>
          </h4>
          <UiButton size="sm" variant="ghost" @click="emit('open-materials')">去登记材料</UiButton>
        </div>
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
        <p v-else class="av-task-settings__hint">暂无材料槽位，请确认任务已绑定模板套。</p>
      </section>
    </div>
  </WorkbenchSurfaceCard>
</template>

<style scoped lang="scss">
.av-task-settings {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4);
  padding: var(--dp-space-4);
  max-width: 920px;
}

.av-task-settings__header {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-2);
}

.av-task-settings__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--dp-text-primary);
  text-wrap: balance;
}

.av-task-settings__intro {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--dp-text-secondary);
  max-width: 72ch;
}

.av-task-settings__block {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-3);
  padding: var(--dp-space-3);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: var(--dp-radius-control, 6px);
  background: var(--dp-surface-subtle, var(--dp-bg-layout));
}

.av-task-settings__title-form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dp-space-2);
  max-width: 560px;
}

.av-task-settings__title-label {
  flex: 0 0 72px;
  font-size: 13px;
  color: var(--dp-text-muted);
}

.av-task-settings__identity {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 2px;
}

.av-task-settings__identity-row {
  display: grid;
  grid-template-columns: 88px 1fr;
  gap: var(--dp-space-2);
  padding: 8px 10px;
  border-radius: 4px;
  background: var(--dp-surface);
  font-size: 13px;

  dt {
    margin: 0;
    color: var(--dp-text-muted);
  }

  dd {
    margin: 0;
    color: var(--dp-text-primary);
    word-break: break-word;
  }
}

.av-task-settings__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--dp-space-3);
}

.av-task-settings__section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: var(--dp-space-3);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: var(--dp-radius-control, 6px);
  background: var(--dp-surface-subtle, var(--dp-bg-layout));

  &--wide {
    grid-column: 1 / -1;
  }
}

.av-task-settings__heading-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-2);
}

.av-task-settings__heading {
  margin: 0;
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--dp-text-primary);
}

.av-task-settings__count {
  font-size: 12px;
  font-weight: 500;
  color: var(--dp-text-muted);
  font-variant-numeric: tabular-nums;
}

.av-task-settings__value {
  margin: 0;
  font-size: 14px;
  color: var(--dp-text-primary);
}

.av-task-settings__hint {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--dp-text-muted);
}

.av-task-settings__due-form {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--dp-space-2);
  max-width: 360px;
}

.av-task-settings__material-list {
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid rgba(0, 0, 0, 0.06);
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
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);

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
</style>

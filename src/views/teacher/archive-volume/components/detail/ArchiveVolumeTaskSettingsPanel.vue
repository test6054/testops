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
  ArchiveSecurityLevelDescription,
  updateArchiveVolumeTaskSettings,
} from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiDatePicker from '@/components/ui-guide/ui/DatePicker.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
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

const saving = ref(false)
const dueEditValue = ref<string | undefined>()
const dueReason = ref('')

const volume = computed(() => props.detail.volume)

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

const materialChecklist = computed(() => props.detail.materials ?? [])

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
  () => volume.value.archiveDueTime,
  (dueTime) => {
    dueReason.value = ''
    dueEditValue.value = dueTime || undefined
  },
  { immediate: true },
)

async function saveArchiveDueTime(): Promise<void> {
  if (saving.value) return
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
  saving.value = true
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
    saving.value = false
  }
}
</script>

<template>
  <WorkbenchSurfaceCard embedded class="av-task-settings">
    <header class="av-task-settings__header">
      <h3 class="av-task-settings__title">任务设置</h3>
      <p class="av-task-settings__intro">
        维护本卷任务级配置。租户模板母版与档案岗位请在「归档配置」中由管理员维护。
      </p>
    </header>

    <div class="av-task-settings__grid">
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
        <p v-if="volume.templateSetCode" class="av-task-settings__hint">
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
            <UiButton size="sm" variant="primary" :loading="saving" @click="saveArchiveDueTime">
              保存截止时刻
            </UiButton>
          </div>
          <p class="av-task-settings__hint">收材阶段归档责任人可手工覆盖；须晚于当前时刻。</p>
        </template>
        <template v-else>
          <p class="av-task-settings__value">{{ formatDateTime(volume.archiveDueTime) || '—' }}</p>
          <p class="av-task-settings__hint">按租户归档时限策略计算；收材完成后不可再改。</p>
        </template>
      </section>

      <section class="av-task-settings__section av-task-settings__section--wide">
        <div class="av-task-settings__heading-row">
          <h4 class="av-task-settings__heading">材料清单（只读）</h4>
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
  max-width: 820px;
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
  max-width: 65ch;
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
  font-size: 13px;
  font-weight: 600;
  color: var(--dp-text-primary);
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

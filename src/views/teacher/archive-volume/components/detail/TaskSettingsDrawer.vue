<script setup lang="ts">
import type {
  ArchiveVolumeDetailResponse,
  ArchiveVolumeMaterialResponse,
} from '@/apis/mark/archive-volume'
import { message } from 'ant-design-vue'
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
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel } from '@/utils/strict-enum'
import ArchiveVolumeCollaboratorStrip from '@/views/teacher/archive-volume/components/ArchiveVolumeCollaboratorStrip.vue'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  detail: ArchiveVolumeDetailResponse
  canManageCollaborators: boolean
  canUpdateArchiveDueTime: boolean
}>()

const emit = defineEmits<{
  'manage-collaborators': []
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
  () => [open.value, volume.value.archiveDueTime] as const,
  ([isOpen, dueTime]) => {
    if (!isOpen) return
    dueReason.value = ''
    if (!dueTime) {
      dueEditValue.value = undefined
      return
    }
    dueEditValue.value = dueTime
  },
  { immediate: true },
)

async function saveArchiveDueTime(): Promise<void> {
  if (saving.value) return
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
  <UiDrawer
    :open="open"
    title="任务设置"
    :width="560"
    :hide-footer="true"
    @update:open="(v: boolean) => (open = v)"
    @close="open = false"
  >
    <p class="task-settings__intro">
      任务级配置在此维护；租户模板母版与档案岗位请在「归档配置」中由管理员维护。
    </p>

    <section class="task-settings__section">
      <h4 class="task-settings__heading">模板套</h4>
      <p class="task-settings__value">{{ volume.templateSetCode || '—' }}</p>
      <p class="task-settings__hint">创建时绑定，决定材料目录与自查项范围。</p>
    </section>

    <section class="task-settings__section">
      <h4 class="task-settings__heading">密级</h4>
      <p class="task-settings__value">{{ securityLevelLabel }}</p>
    </section>

    <section class="task-settings__section">
      <h4 class="task-settings__heading">协作组</h4>
      <ArchiveVolumeCollaboratorStrip
        v-if="detail.collaborators?.length"
        :collaborators="detail.collaborators"
        :can-manage="canManageCollaborators"
        @manage="emit('manage-collaborators')"
      />
      <p v-else class="task-settings__hint">尚未添加协作老师</p>
      <UiButton
        v-if="canManageCollaborators"
        size="sm"
        variant="outline"
        @click="emit('manage-collaborators')"
      >
        管理协作老师
      </UiButton>
    </section>

    <section class="task-settings__section">
      <h4 class="task-settings__heading">保管期限</h4>
      <p class="task-settings__value">{{ retentionLabel }}</p>
      <p v-if="volume.templateSetCode" class="task-settings__hint">
        继承自模板套 {{ volume.templateSetCode }}
      </p>
    </section>

    <section class="task-settings__section">
      <h4 class="task-settings__heading">归档截止</h4>
      <template v-if="canUpdateArchiveDueTime">
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
        <p class="task-settings__hint">收材阶段归档责任人可手工覆盖；须晚于当前时刻。</p>
      </template>
      <template v-else>
        <p class="task-settings__value">{{ formatDateTime(volume.archiveDueTime) || '—' }}</p>
        <p class="task-settings__hint">按租户归档时限策略计算；收材完成后不可再改。</p>
      </template>
    </section>

    <section class="task-settings__section">
      <div class="task-settings__heading-row">
        <h4 class="task-settings__heading">材料清单（只读）</h4>
        <UiButton size="sm" variant="ghost" @click="emit('open-materials')">去登记材料</UiButton>
      </div>
      <ul v-if="materialChecklist.length > 0" class="task-settings__material-list">
        <li
          v-for="row in materialChecklist"
          :key="row.materialId"
          class="task-settings__material-item"
        >
          <span class="task-settings__material-name">{{ materialRowLabel(row) }}</span>
          <span class="task-settings__material-status">{{ materialRowStatus(row) }}</span>
        </li>
      </ul>
      <p v-else class="task-settings__hint">暂无材料槽位，请确认任务已绑定模板套。</p>
    </section>
  </UiDrawer>
</template>

<style scoped lang="scss">
.task-settings__intro {
  margin: 0 0 16px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--dp-text-muted);
}

.task-settings__section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.task-settings__heading-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.task-settings__heading {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--dp-text-primary);
}

.task-settings__value {
  margin: 0;
  font-size: 14px;
  color: var(--dp-text-secondary);
}

.task-settings__hint {
  margin: 0;
  font-size: 12px;
  color: var(--dp-text-muted);
}

.task-settings__material-list {
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--dp-border-light);
  border-radius: 6px;
}

.task-settings__material-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  font-size: 13px;
  border-bottom: 1px solid var(--dp-border-light);

  &:last-child {
    border-bottom: none;
  }
}

.task-settings__material-name {
  color: var(--dp-text-primary);
}

.task-settings__material-status {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--dp-text-muted);
}
</style>

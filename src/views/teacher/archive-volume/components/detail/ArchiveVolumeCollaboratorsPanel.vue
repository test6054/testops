<script setup lang="ts">
import type { ArchiveVolumeMemberDisplayVO } from '@/apis/mark/archive-volume'
import message from 'ant-design-vue/es/message'
import { ref } from 'vue'
import { addArchiveVolumeMember, removeArchiveVolumeMember } from '@/apis/mark/archive-volume'
import ArchiveDutyUserSelect from '@/components/mark/ArchiveDutyUserSelect.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import {
  ArchiveVolumeMemberRoleCode,
  archiveVolumeMemberRoleLabel,
} from '@/types/enums/archive-volume-member-role-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'

const props = defineProps<{
  volumeId: string
  collaborators: ArchiveVolumeMemberDisplayVO[]
  canManageCollaborators?: boolean
}>()

const emit = defineEmits<{
  changed: []
}>()

const addUserId = ref('')
const addRole = ref<ArchiveVolumeMemberRoleCode>(ArchiveVolumeMemberRoleCode.SCAN_OPERATOR)
const submitting = ref(false)

const roleOptions = [
  { value: ArchiveVolumeMemberRoleCode.SCAN_OPERATOR, label: '协作老师（扫描）' },
  { value: ArchiveVolumeMemberRoleCode.SUBMITTER, label: '提交老师' },
  { value: ArchiveVolumeMemberRoleCode.CATALOG_EDITOR, label: '编目老师' },
  { value: ArchiveVolumeMemberRoleCode.VIEWER, label: '只读' },
]

async function handleAdd() {
  if (submitting.value) {
    return
  }
  if (props.canManageCollaborators !== true) {
    message.warning('当前账号无协作老师管理权限')
    return
  }
  if (!addUserId.value.trim()) {
    showFormValidationMessage('请选择协作老师')
    return
  }
  submitting.value = true
  try {
    await addArchiveVolumeMember({
      volumeId: props.volumeId,
      userId: addUserId.value.trim(),
      memberRole: addRole.value,
    })
    message.success('已添加协作老师')
    emit('changed')
    addUserId.value = ''
  } catch (e) {
    showUserError(e)
  } finally {
    submitting.value = false
  }
}

async function handleRemove(member: ArchiveVolumeMemberDisplayVO) {
  if (!member.memberId || submitting.value) return
  if (props.canManageCollaborators !== true) {
    message.warning('当前账号无协作老师管理权限')
    return
  }
  const confirmed = await confirmAsync({
    title: '移除协作老师？',
    content: `将移除「${member.userName ?? member.userId}」在当前归档卷中的协作权限。`,
    type: 'warning',
    okText: '移除',
    cancelText: '取消',
  })
  if (!confirmed || submitting.value) return
  submitting.value = true
  try {
    await removeArchiveVolumeMember({ volumeId: props.volumeId, memberId: member.memberId })
    message.success('已移除')
    emit('changed')
  } catch (e) {
    showUserError(e)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <WorkbenchSurfaceCard embedded class="av-collab">
    <header class="av-collab__header">
      <h3 class="av-collab__title">协作管理</h3>
      <p class="av-collab__intro">
        归档责任人已绑定；可按角色添加扫描、提交、编目或只读协作老师。移除后立即失去本卷权限。
      </p>
    </header>

    <section class="av-collab__section">
      <h4 class="av-collab__heading">当前成员</h4>
      <ul v-if="collaborators.length" class="av-collab__list">
        <li v-for="m in collaborators" :key="m.memberId" class="av-collab__row">
          <div class="av-collab__info">
            <span class="av-collab__name">{{ m.userName ?? m.userId }}</span>
            <span class="av-collab__role">{{ archiveVolumeMemberRoleLabel(m.memberRole) }}</span>
          </div>
          <UiButton
            v-if="canManageCollaborators === true && m.memberRole !== ArchiveVolumeMemberRoleCode.ORGANIZER"
            size="sm"
            variant="ghost"
            :disabled="submitting"
            @click="handleRemove(m)"
          >
            移除
          </UiButton>
        </li>
      </ul>
      <p v-else class="av-collab__empty">暂无协作成员</p>
    </section>

    <section v-if="canManageCollaborators === true" class="av-collab__section av-collab__section--add">
      <h4 class="av-collab__heading">添加协作老师</h4>
      <div class="av-collab__form">
        <ArchiveDutyUserSelect
          v-model:value="addUserId"
          placeholder="选择本租户协作老师"
          :disabled="submitting"
        />
        <UiSelect size="sm" v-model="addRole" :options="roleOptions" />
        <UiButton variant="primary" size="sm" :loading="submitting" @click="handleAdd">
          添加或更新
        </UiButton>
      </div>
    </section>
    <p v-else class="av-collab__hint">当前账号仅可查看协作名单，无增删权限。</p>
  </WorkbenchSurfaceCard>
</template>

<style scoped lang="scss">
.av-collab {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4);
  padding: var(--dp-space-4);
  max-width: 640px;
}

.av-collab__header {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-2);
}

.av-collab__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--dp-text-primary);
}

.av-collab__intro {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--dp-text-secondary);
  max-width: 65ch;
}

.av-collab__section {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-3);
  padding: var(--dp-space-3);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: var(--dp-radius-control, 6px);
  background: var(--dp-surface-subtle, var(--dp-bg-layout));

  &--add {
    background: var(--dp-surface);
  }
}

.av-collab__heading {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--dp-text-primary);
}

.av-collab__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.av-collab__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-2);
  padding: 8px 10px;
  border-radius: 4px;
  background: var(--dp-surface);
  transition: background 200ms ease-out;

  &:hover {
    background: color-mix(in srgb, var(--ant-color-primary) 4%, var(--dp-surface));
  }
}

.av-collab__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.av-collab__name {
  font-size: 14px;
  color: var(--dp-text-primary);
}

.av-collab__role {
  font-size: 12px;
  color: var(--dp-text-muted);
}

.av-collab__empty,
.av-collab__hint {
  margin: 0;
  font-size: 13px;
  color: var(--dp-text-muted);
}

.av-collab__form {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--dp-space-2);
  max-width: 360px;
}

@media (prefers-reduced-motion: reduce) {
  .av-collab__row {
    transition: none;
  }
}
</style>

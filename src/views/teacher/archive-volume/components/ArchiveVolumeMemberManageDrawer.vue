<script setup lang="ts">
import type { ArchiveVolumeMemberDisplayVO } from '@/apis/mark/archive-volume'
import { message } from 'ant-design-vue'
import { ref, watch } from 'vue'
import { addArchiveVolumeMember, removeArchiveVolumeMember } from '@/apis/mark/archive-volume'
import ArchiveDutyUserSelect from '@/components/mark/ArchiveDutyUserSelect.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import {
  ArchiveVolumeMemberRoleCode,
  archiveVolumeMemberRoleLabel,
} from '@/types/enums/archive-volume-member-role-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'

const props = defineProps<{
  open: boolean
  volumeId: string
  collaborators: ArchiveVolumeMemberDisplayVO[]
}>()

const emit = defineEmits<{
  'update:open': [boolean]
  "changed": []
}>()

const addUserId = ref('')
const addRole = ref<ArchiveVolumeMemberRoleCode>(ArchiveVolumeMemberRoleCode.SCAN_OPERATOR)
const submitting = ref(false)

watch(
  () => props.open,
  (v) => {
    if (v) {
      addUserId.value = ''
      addRole.value = ArchiveVolumeMemberRoleCode.SCAN_OPERATOR
    }
  },
)

function close() {
  emit('update:open', false)
}

async function handleAdd() {
  if (submitting.value) {
    return
  }
  if (!addUserId.value.trim()) {
    showFormValidationMessage('请输入用户编号')
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

const roleOptions = [
  { value: ArchiveVolumeMemberRoleCode.SCAN_OPERATOR, label: '协作老师（扫描）' },
  { value: ArchiveVolumeMemberRoleCode.SUBMITTER, label: '提交老师' },
  { value: ArchiveVolumeMemberRoleCode.CATALOG_EDITOR, label: '编目老师' },
  { value: ArchiveVolumeMemberRoleCode.VIEWER, label: '只读' },
]
</script>

<template>
  <UiDrawer :open="open" title="管理协作老师" width="420" @close="close">
    <div class="member-list">
      <div v-for="m in collaborators" :key="m.memberId" class="member-row">
        <div class="member-row__info">
          <span class="member-row__name">{{ m.userName ?? m.userId }}</span>
          <span class="member-row__role">{{ archiveVolumeMemberRoleLabel(m.memberRole) }}</span>
        </div>
        <UiButton
          v-if="m.memberRole !== ArchiveVolumeMemberRoleCode.ORGANIZER"
          size="sm"
          variant="ghost"
          :disabled="submitting"
          @click="handleRemove(m)"
        >
          移除
        </UiButton>
      </div>
    </div>
    <div class="member-add">
      <ArchiveDutyUserSelect
        v-model:value="addUserId"
        placeholder="选择本租户协作老师"
        :disabled="submitting"
      />
      <UiSelect
        size="sm"
        v-model="addRole"
        :options="roleOptions"
        style="width: 100%; margin-top: 8px"
      />
      <UiButton
        variant="primary"
        size="sm"
        class="member-add__btn"
        :loading="submitting"
        @click="handleAdd"
      >
        添加或更新
      </UiButton>
    </div>
  </UiDrawer>
</template>

<style scoped lang="scss">
.member-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}
.member-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}
.member-row__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.member-row__name {
  color: var(--dp-text-primary);
}
.member-row__role {
  font-size: 12px;
  color: var(--dp-text-muted);
}
.member-add__btn {
  margin-top: 12px;
}
</style>

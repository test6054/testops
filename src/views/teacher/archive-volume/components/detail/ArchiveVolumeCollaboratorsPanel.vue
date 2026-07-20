<script setup lang="ts">
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ArchiveVolumeMemberDisplayVO } from '@/apis/mark/archive-volume'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import { computed, ref } from 'vue'
import { addArchiveVolumeMember, removeArchiveVolumeMember } from '@/apis/mark/archive-volume'
import ArchiveDutyUserSelect from '@/components/mark/ArchiveDutyUserSelect.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import {
  ArchiveVolumeMemberRoleCode,
  archiveVolumeMemberRoleLabel,
} from '@/types/enums/archive-volume-member-role-enum'
import {
  ArchiveVolumeMemberSourceCode,
  archiveVolumeMemberSourceLabel,
} from '@/types/enums/archive-volume-member-source-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'

const props = defineProps<{
  volumeId: string
  collaborators: ArchiveVolumeMemberDisplayVO[]
  canManageCollaborators?: boolean
}>()

const emit = defineEmits<{
  changed: []
}>()

interface CollaboratorRow {
  rowKey: string
  memberId: string
  userId: string
  userName: string
  loginName: string
  departmentName: string
  memberRole: ArchiveVolumeMemberRoleCode
  roleLabel: string
  roleTone: BadgeTone
  sourceLabel: string
  remark: string
  createTimeLabel: string
  capabilityLabel: string
  removable: boolean
  roleEditable: boolean
}

const addUserId = ref('')
const addRole = ref<ArchiveVolumeMemberRoleCode>(ArchiveVolumeMemberRoleCode.SCAN_OPERATOR)
const addRemark = ref('')
const submitting = ref(false)
const roleUpdatingMemberId = ref<string | null>(null)

const roleOptions = [
  { value: ArchiveVolumeMemberRoleCode.SCAN_OPERATOR, label: '协作老师（扫描）' },
  { value: ArchiveVolumeMemberRoleCode.SUBMITTER, label: '提交老师' },
  { value: ArchiveVolumeMemberRoleCode.CATALOG_EDITOR, label: '编目老师' },
  { value: ArchiveVolumeMemberRoleCode.VIEWER, label: '只读' },
]

const roleCapabilityRows = [
  {
    role: '归档责任人',
    capabilities: '扫描、材料、编目、提交、管理协作、开始收材、覆盖截止',
  },
  {
    role: '协作老师',
    capabilities: '扫描与材料登记（编目权受租户协作策略约束）',
  },
  {
    role: '编目老师',
    capabilities: '扫描、材料登记与卷内编目',
  },
  {
    role: '提交老师',
    capabilities: '在租户提交模式下汇总提交归档',
  },
  {
    role: '只读',
    capabilities: '仅查看卷内材料与进度',
  },
]

const rosterStats = computed(() => {
  const rows = props.collaborators
  return {
    total: rows.length,
    organizers: rows.filter((m) => m.memberRole === ArchiveVolumeMemberRoleCode.ORGANIZER).length,
    scanners: rows.filter((m) => m.memberRole === ArchiveVolumeMemberRoleCode.SCAN_OPERATOR).length,
    catalog: rows.filter((m) => m.memberRole === ArchiveVolumeMemberRoleCode.CATALOG_EDITOR).length,
    submitters: rows.filter((m) => m.memberRole === ArchiveVolumeMemberRoleCode.SUBMITTER).length,
    viewers: rows.filter((m) => m.memberRole === ArchiveVolumeMemberRoleCode.VIEWER).length,
  }
})

const tableRows = computed((): CollaboratorRow[] =>
  props.collaborators.map((member) => {
    const role = member.memberRole ?? ArchiveVolumeMemberRoleCode.VIEWER
    return {
      rowKey: member.memberId ?? `${member.userId}:${role}`,
      memberId: member.memberId ?? '',
      userId: member.userId ?? '',
      userName: member.userName ?? (member.userId ? `用户${member.userId}` : '—'),
      loginName: member.loginName ?? '—',
      departmentName: member.departmentName ?? '—',
      memberRole: role,
      roleLabel: archiveVolumeMemberRoleLabel(role),
      roleTone: roleTone(role),
      sourceLabel: archiveVolumeMemberSourceLabel(member.memberSource),
      remark: member.remark?.trim() || '—',
      createTimeLabel: formatDateTime(member.createTime) || '—',
      capabilityLabel: capabilitySummary(role),
      removable: role !== ArchiveVolumeMemberRoleCode.ORGANIZER,
      roleEditable: role !== ArchiveVolumeMemberRoleCode.ORGANIZER,
    }
  }),
)

const columns = computed((): ColumnType<CollaboratorRow>[] => {
  const base: ColumnType<CollaboratorRow>[] = [
    { title: '姓名', key: 'userName', width: 140 },
    { title: '账号', dataIndex: 'loginName', key: 'loginName', width: 120 },
    { title: '院系', dataIndex: 'departmentName', key: 'departmentName', width: 140 },
    { title: '角色', key: 'role', width: 168 },
    { title: '来源', dataIndex: 'sourceLabel', key: 'sourceLabel', width: 112 },
    { title: '加入时间', dataIndex: 'createTimeLabel', key: 'createTimeLabel', width: 156 },
    { title: '能力', dataIndex: 'capabilityLabel', key: 'capabilityLabel', width: 180 },
    { title: '备注', dataIndex: 'remark', key: 'remark', ellipsis: true },
  ]
  if (props.canManageCollaborators === true) {
    base.push({ title: '操作', key: 'actions', width: 88 })
  }
  return base
})

function roleTone(role: ArchiveVolumeMemberRoleCode): BadgeTone {
  if (role === ArchiveVolumeMemberRoleCode.ORGANIZER) return 'blue'
  if (role === ArchiveVolumeMemberRoleCode.SUBMITTER) return 'green'
  if (role === ArchiveVolumeMemberRoleCode.CATALOG_EDITOR) return 'purple'
  if (role === ArchiveVolumeMemberRoleCode.VIEWER) return 'gray'
  return 'orange'
}

function capabilitySummary(role: ArchiveVolumeMemberRoleCode): string {
  if (role === ArchiveVolumeMemberRoleCode.ORGANIZER) return '全权限组织'
  if (role === ArchiveVolumeMemberRoleCode.SCAN_OPERATOR) return '扫描 / 材料'
  if (role === ArchiveVolumeMemberRoleCode.CATALOG_EDITOR) return '扫描 / 材料 / 编目'
  if (role === ArchiveVolumeMemberRoleCode.SUBMITTER) return '提交归档'
  return '只读查看'
}

async function handleAdd() {
  if (submitting.value) return
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
    const remark = addRemark.value.trim()
    await addArchiveVolumeMember({
      volumeId: props.volumeId,
      userId: addUserId.value.trim(),
      memberRole: addRole.value,
      remark: remark || undefined,
    })
    message.success('已添加或更新协作老师')
    emit('changed')
    addUserId.value = ''
    addRemark.value = ''
  } catch (e) {
    showUserError(e)
  } finally {
    submitting.value = false
  }
}

async function handleRoleChange(row: CollaboratorRow, nextRole: ArchiveVolumeMemberRoleCode) {
  if (props.canManageCollaborators !== true || !row.roleEditable) return
  if (nextRole === row.memberRole) return
  if (roleUpdatingMemberId.value || submitting.value) return
  roleUpdatingMemberId.value = row.memberId
  try {
    await addArchiveVolumeMember({
      volumeId: props.volumeId,
      userId: row.userId,
      memberRole: nextRole,
    })
    message.success('角色已更新')
    emit('changed')
  } catch (e) {
    showUserError(e)
  } finally {
    roleUpdatingMemberId.value = null
  }
}

async function handleRemove(row: CollaboratorRow) {
  if (!row.memberId || submitting.value) return
  if (props.canManageCollaborators !== true) {
    message.warning('当前账号无协作老师管理权限')
    return
  }
  if (!row.removable) {
    message.warning('归档责任人不可移除，请通过更换责任人流转')
    return
  }
  const confirmed = await confirmAsync({
    title: '移除协作老师？',
    content: `将移除「${row.userName}」在当前归档卷中的协作权限，立即生效。`,
    type: 'warning',
    okText: '移除',
    cancelText: '取消',
  })
  if (!confirmed || submitting.value) return
  submitting.value = true
  try {
    await removeArchiveVolumeMember({ volumeId: props.volumeId, memberId: row.memberId })
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
        维护本卷收材与提交协作花名册。归档责任人唯一；其余老师按角色分工扫描、编目或提交。
      </p>
      <dl class="av-collab__stats">
        <div class="av-collab__stat">
          <dt>合计</dt>
          <dd>{{ rosterStats.total }}</dd>
        </div>
        <div class="av-collab__stat">
          <dt>责任人</dt>
          <dd>{{ rosterStats.organizers }}</dd>
        </div>
        <div class="av-collab__stat">
          <dt>扫描</dt>
          <dd>{{ rosterStats.scanners }}</dd>
        </div>
        <div class="av-collab__stat">
          <dt>编目</dt>
          <dd>{{ rosterStats.catalog }}</dd>
        </div>
        <div class="av-collab__stat">
          <dt>提交</dt>
          <dd>{{ rosterStats.submitters }}</dd>
        </div>
        <div class="av-collab__stat">
          <dt>只读</dt>
          <dd>{{ rosterStats.viewers }}</dd>
        </div>
      </dl>
    </header>

    <section class="av-collab__section">
      <h4 class="av-collab__heading">协作花名册</h4>
      <UiDataTable
        pagination-mode="none"
        :columns="columns"
        :data-source="tableRows"
        row-key="rowKey"
        size="middle"
        :show-pagination="false"
        flat
        :total="tableRows.length"
        empty-description="暂无协作成员"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'userName'">
            <span class="av-collab__name">{{ record.userName }}</span>
          </template>
          <template v-else-if="column.key === 'role'">
            <template v-if="canManageCollaborators === true && record.roleEditable">
              <UiSelect
                size="sm"
                :allow-clear="false"
                :model-value="record.memberRole"
                :options="roleOptions"
                :disabled="submitting || roleUpdatingMemberId === record.memberId"
                @update:model-value="
                  (value) => {
                    if (value == null) return
                    handleRoleChange(record, value as ArchiveVolumeMemberRoleCode)
                  }
                "
              />
            </template>
            <UiTag v-else :tone="record.roleTone" size="sm">{{ record.roleLabel }}</UiTag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiButton
              v-if="record.removable"
              size="sm"
              variant="ghost"
              :disabled="submitting"
              @click="handleRemove(record)"
            >
              移除
            </UiButton>
            <span v-else class="av-collab__locked">不可移除</span>
          </template>
        </template>
      </UiDataTable>
    </section>

    <section v-if="canManageCollaborators === true" class="av-collab__section av-collab__section--add">
      <h4 class="av-collab__heading">添加协作老师</h4>
      <div class="av-collab__form">
        <ArchiveDutyUserSelect
          v-model:value="addUserId"
          placeholder="选择本租户教师"
          :disabled="submitting"
        />
        <UiSelect
          size="sm"
          v-model="addRole"
          :options="roleOptions"
          :allow-clear="false"
          :disabled="submitting"
        />
        <UiInput
          size="sm"
          v-model="addRemark"
          placeholder="备注（选填，如分工说明）"
          :maxlength="200"
          :disabled="submitting"
        />
        <UiButton variant="primary" size="sm" :loading="submitting" @click="handleAdd">
          添加或更新角色
        </UiButton>
      </div>
      <p class="av-collab__hint">
        同一用户再次添加将更新其角色；来源为「{{
          archiveVolumeMemberSourceLabel(ArchiveVolumeMemberSourceCode.MANUAL)
        }}」。
      </p>
    </section>
    <p v-else class="av-collab__hint">当前账号仅可查看协作花名册，无增删改权限。</p>

    <section class="av-collab__section">
      <h4 class="av-collab__heading">角色能力说明</h4>
      <ul class="av-collab__cap-list">
        <li v-for="row in roleCapabilityRows" :key="row.role" class="av-collab__cap-row">
          <span class="av-collab__cap-role">{{ row.role }}</span>
          <span class="av-collab__cap-text">{{ row.capabilities }}</span>
        </li>
      </ul>
      <p class="av-collab__hint">
        租户「协作策略」可调整提交模式、协作老师编目权与自动播种规则；院系档案岗另走职责授权。
      </p>
    </section>
  </WorkbenchSurfaceCard>
</template>

<style scoped lang="scss">
.av-collab {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4);
  padding: var(--dp-space-4);
  max-width: 1100px;
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
  text-wrap: balance;
}

.av-collab__intro {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--dp-text-secondary);
  max-width: 72ch;
}

.av-collab__stats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-2);
  margin: var(--dp-space-1) 0 0;
}

.av-collab__stat {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 72px;
  padding: 6px 10px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: var(--dp-radius-control, 6px);
  background: var(--dp-surface-subtle, var(--dp-bg-layout));

  dt {
    margin: 0;
    font-size: 12px;
    color: var(--dp-text-muted);
  }

  dd {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--dp-text-primary);
  }
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

.av-collab__name {
  font-size: 14px;
  color: var(--dp-text-primary);
}

.av-collab__locked,
.av-collab__hint {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--dp-text-muted);
}

.av-collab__form {
  display: grid;
  grid-template-columns: minmax(200px, 280px) 168px minmax(160px, 1fr) auto;
  gap: var(--dp-space-2);
  align-items: center;
}

.av-collab__cap-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.av-collab__cap-row {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: var(--dp-space-2);
  padding: 8px 10px;
  border-radius: 4px;
  background: var(--dp-surface);
  font-size: 13px;
}

.av-collab__cap-role {
  font-weight: 600;
  color: var(--dp-text-primary);
}

.av-collab__cap-text {
  color: var(--dp-text-secondary);
}

@media (max-width: 900px) {
  .av-collab__form {
    grid-template-columns: 1fr;
  }

  .av-collab__cap-row {
    grid-template-columns: 1fr;
  }
}
</style>

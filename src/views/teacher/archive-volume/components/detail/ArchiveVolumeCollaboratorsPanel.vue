<script setup lang="ts">
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ArchiveVolumeMemberDisplayVO } from '@/apis/mark/archive-volume'
import type { BadgeTone, FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { addArchiveVolumeMember, removeArchiveVolumeMember } from '@/apis/mark/archive-volume'
import ArchiveDutyUserSelect from '@/components/mark/ArchiveDutyUserSelect.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import {
  ALL_ARCHIVE_VOLUME_MEMBER_ROLE_CODES,
  ArchiveVolumeMemberRoleCode,
  archiveVolumeMemberRoleLabel,
} from '@/types/enums/archive-volume-member-role-enum'
import { archiveVolumeMemberSourceLabel } from '@/types/enums/archive-volume-member-source-enum'
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

interface CollaboratorMemberRow {
  rowKind: 'member'
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

interface CollaboratorRoleGroupRow {
  rowKind: 'role'
  rowKey: string
  memberRole: ArchiveVolumeMemberRoleCode
  roleLabel: string
  roleTone: BadgeTone
  memberCount: number
  capabilityLabel: string
  children?: CollaboratorMemberRow[]
}

type CollaboratorTreeRow = CollaboratorRoleGroupRow | CollaboratorMemberRow

const submitting = ref(false)
const roleUpdatingMemberId = ref<string | null>(null)

const addFormModel = reactive<Record<string, unknown>>({
  userId: '',
  role: ArchiveVolumeMemberRoleCode.SCAN_OPERATOR,
  remark: '',
})

const rosterFilterModel = reactive<Record<string, unknown>>({
  keyword: '',
})

const rosterKeyword = ref('')

const roleSelectOptions = [
  { value: ArchiveVolumeMemberRoleCode.SCAN_OPERATOR, label: '协作老师（扫描）' },
  { value: ArchiveVolumeMemberRoleCode.SUBMITTER, label: '提交老师' },
  { value: ArchiveVolumeMemberRoleCode.CATALOG_EDITOR, label: '编目老师' },
  { value: ArchiveVolumeMemberRoleCode.VIEWER, label: '只读' },
]

const addFilterFields = computed((): FilterField[] => [
  {
    key: 'userId',
    label: '教师',
    type: 'custom',
    width: 280,
    minWidth: 220,
  },
  {
    key: 'role',
    label: '角色',
    type: 'select',
    options: roleSelectOptions,
    allowClear: false,
    width: 168,
    minWidth: 168,
  },
  {
    key: 'remark',
    label: '备注',
    type: 'input',
    placeholder: '选填，如分工说明',
    flex: 1,
    minWidth: 160,
  },
])

const rosterFilterFields = computed((): FilterField[] => [
  {
    key: 'keyword',
    label: '成员',
    type: 'input',
    inputPrefixIcon: 'search',
    placeholder: '姓名 / 账号 / 院系',
    allowClear: true,
    width: 280,
    minWidth: 200,
  },
])

const ROLE_TREE_ORDER: readonly ArchiveVolumeMemberRoleCode[] = ALL_ARCHIVE_VOLUME_MEMBER_ROLE_CODES

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

const signalMetrics = computed((): SignalMetric[] => {
  const stats = rosterStats.value
  return [
    { key: 'total', label: '合计', value: stats.total, tone: 'blue', iconTone: 'blue' },
    { key: 'organizers', label: '责任人', value: stats.organizers, tone: 'blue', iconTone: 'blue' },
    { key: 'scanners', label: '扫描', value: stats.scanners, tone: 'orange', iconTone: 'orange' },
    { key: 'catalog', label: '编目', value: stats.catalog, tone: 'purple', iconTone: 'purple' },
    { key: 'submitters', label: '提交', value: stats.submitters, tone: 'green', iconTone: 'green' },
    { key: 'viewers', label: '只读', value: stats.viewers, tone: 'gray', iconTone: 'gray' },
  ]
})

const treeRows = computed((): CollaboratorRoleGroupRow[] => {
  const keyword = rosterKeyword.value.trim().toLowerCase()
  const byRole = new Map<ArchiveVolumeMemberRoleCode, CollaboratorMemberRow[]>()
  for (const role of ROLE_TREE_ORDER) {
    byRole.set(role, [])
  }
  for (const member of props.collaborators) {
    const role = member.memberRole ?? ArchiveVolumeMemberRoleCode.VIEWER
    const row = toMemberRow(member, role)
    if (keyword && !memberMatchesKeyword(row, keyword)) {
      continue
    }
    const list = byRole.get(role) ?? []
    list.push(row)
    byRole.set(role, list)
  }
  return ROLE_TREE_ORDER.flatMap((role) => {
    const children = byRole.get(role) ?? []
    const showEmpty = !keyword
    if (!showEmpty && children.length === 0) {
      return []
    }
    const row: CollaboratorRoleGroupRow = {
      rowKind: 'role',
      rowKey: `role:${role}`,
      memberRole: role,
      roleLabel: archiveVolumeMemberRoleLabel(role),
      roleTone: roleTone(role),
      memberCount: children.length,
      capabilityLabel: capabilitySummary(role),
      children: children.length > 0 ? children : undefined,
    }
    return [row]
  })
})

const expandedRowKeys = ref<string[]>([])

watch(
  treeRows,
  (rows) => {
    expandedRowKeys.value = rows
      .filter((row) => (row.children?.length ?? 0) > 0)
      .map((row) => row.rowKey)
  },
  { immediate: true },
)

const columns = computed((): ColumnType<CollaboratorTreeRow>[] => {
  const base: ColumnType<CollaboratorTreeRow>[] = [
    { title: '角色 / 成员', key: 'identity', width: 220 },
    { title: '账号', key: 'loginName', width: 120 },
    { title: '院系', key: 'departmentName', width: 140 },
    { title: '来源', key: 'sourceLabel', width: 112 },
    { title: '加入时间', key: 'createTimeLabel', width: 156 },
    { title: '能力 / 备注', key: 'meta', ellipsis: true },
  ]
  return props.canManageCollaborators
    ? [...base, { title: '操作', key: 'actions', width: 200 }]
    : base
})

function memberMatchesKeyword(row: CollaboratorMemberRow, keyword: string): boolean {
  return [row.userName, row.loginName, row.departmentName, row.remark]
    .join(' ')
    .toLowerCase()
    .includes(keyword)
}

function toMemberRow(
  member: ArchiveVolumeMemberDisplayVO,
  role: ArchiveVolumeMemberRoleCode,
): CollaboratorMemberRow {
  return {
    rowKind: 'member',
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
}

function roleTone(role: ArchiveVolumeMemberRoleCode): BadgeTone {
  if (role === ArchiveVolumeMemberRoleCode.ORGANIZER) return 'blue'
  if (role === ArchiveVolumeMemberRoleCode.SUBMITTER) return 'green'
  if (role === ArchiveVolumeMemberRoleCode.CATALOG_EDITOR) return 'purple'
  if (role === ArchiveVolumeMemberRoleCode.VIEWER) return 'gray'
  return 'orange'
}

function capabilitySummary(role: ArchiveVolumeMemberRoleCode): string {
  if (role === ArchiveVolumeMemberRoleCode.ORGANIZER) {
    return '扫描、材料、编目、提交、管理协作、开始收材'
  }
  if (role === ArchiveVolumeMemberRoleCode.SCAN_OPERATOR) {
    return '扫描与材料登记（编目权受租户策略约束）'
  }
  if (role === ArchiveVolumeMemberRoleCode.CATALOG_EDITOR) {
    return '扫描、材料登记与卷内编目'
  }
  if (role === ArchiveVolumeMemberRoleCode.SUBMITTER) {
    return '在租户提交模式下汇总提交归档'
  }
  return '仅查看卷内材料与进度'
}

function isRoleGroup(record: CollaboratorTreeRow): record is CollaboratorRoleGroupRow {
  return record.rowKind === 'role'
}

function isMemberRow(record: CollaboratorTreeRow): record is CollaboratorMemberRow {
  return record.rowKind === 'member'
}

function rowClassName(record: CollaboratorTreeRow): string {
  return isRoleGroup(record) ? 'av-collab__row--role' : 'av-collab__row--member'
}

function memberActions(row: CollaboratorMemberRow): UiTableRowActionItem[] {
  if (!row.removable) {
    return []
  }
  return [
    {
      key: 'remove',
      label: '移除',
      tone: 'danger',
      disabled: submitting.value,
    },
  ]
}

function handleRosterSearch(value: Record<string, unknown>): void {
  rosterKeyword.value = String(value.keyword ?? '').trim()
}

function handleRosterReset(): void {
  rosterFilterModel.keyword = ''
  rosterKeyword.value = ''
}

async function handleAdd(): Promise<void> {
  if (submitting.value) return
  if (!props.canManageCollaborators) {
    void message.warning('当前账号无协作老师管理权限')
    return
  }
  const userId = String(addFormModel.userId ?? '').trim()
  if (!userId) {
    showFormValidationMessage('请选择协作老师')
    return
  }
  const role = addFormModel.role as ArchiveVolumeMemberRoleCode
  submitting.value = true
  try {
    const remark = String(addFormModel.remark ?? '').trim()
    await addArchiveVolumeMember({
      volumeId: props.volumeId,
      userId,
      memberRole: role,
      remark: remark || undefined,
    })
    void message.success('已添加或更新协作老师')
    emit('changed')
    addFormModel.userId = ''
    addFormModel.remark = ''
  } catch (e) {
    showUserError(e)
  } finally {
    submitting.value = false
  }
}

async function handleRoleChange(row: CollaboratorMemberRow, nextRole: ArchiveVolumeMemberRoleCode) {
  if (!props.canManageCollaborators || !row.roleEditable) return
  if (nextRole === row.memberRole) return
  if (roleUpdatingMemberId.value || submitting.value) return
  roleUpdatingMemberId.value = row.memberId
  try {
    await addArchiveVolumeMember({
      volumeId: props.volumeId,
      userId: row.userId,
      memberRole: nextRole,
    })
    void message.success('角色已更新')
    emit('changed')
  } catch (e) {
    showUserError(e)
  } finally {
    roleUpdatingMemberId.value = null
  }
}

async function handleMemberAction(key: string, row: CollaboratorMemberRow): Promise<void> {
  if (key !== 'remove') {
    return
  }
  await handleRemove(row)
}

async function handleRemove(row: CollaboratorMemberRow) {
  if (!row.memberId || submitting.value) return
  if (!props.canManageCollaborators) {
    void message.warning('当前账号无协作老师管理权限')
    return
  }
  if (!row.removable) {
    void message.warning('归档责任人不可移除，请通过更换责任人流转')
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
    void message.success('已移除')
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
    <SignalBand :metrics="signalMetrics" variant="panel" compact class="av-collab__signal" />

    <UiFilterBar
      v-if="canManageCollaborators"
      v-model="addFormModel"
      :fields="addFilterFields"
      variant="panel"
      show-labels
      class="av-collab__add"
    >
      <template #field-userId="{ update }">
        <ArchiveDutyUserSelect
          :value="String(addFormModel.userId ?? '') || null"
          placeholder="搜索并选择本租户教师"
          :disabled="submitting"
          @update:value="(value) => update(value ?? '')"
        />
      </template>
      <template #actions>
        <UiButton variant="primary" size="sm" :loading="submitting" @click="handleAdd">
          添加或更新角色
        </UiButton>
      </template>
    </UiFilterBar>
    <p v-else class="av-collab__hint">当前账号仅可查看协作花名册，无增删改权限。</p>

    <UiDataTable
      title="协作花名册"
      description="按角色树展开；添加后成员出现在对应角色节点下"
      pagination-mode="none"
      :columns="columns"
      :data-source="treeRows"
      row-key="rowKey"
      size="middle"
      :show-pagination="false"
      flat
      :total="rosterStats.total"
      empty-description="暂无匹配协作成员"
      v-model:expanded-row-keys="expandedRowKeys"
      :indent-size="18"
      :row-class-name="rowClassName"
      class="av-collab__table"
    >
      <template #toolbar-left>
        <UiFilterBar
          v-model="rosterFilterModel"
          :fields="rosterFilterFields"
          variant="plain"
          search-text="筛选"
          reset-text="清空"
          @search="handleRosterSearch"
          @reset="handleRosterReset"
        />
      </template>
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'identity'">
          <div v-if="isRoleGroup(record)" class="av-collab__role-node">
            <UiTag :tone="record.roleTone" size="sm">{{ record.roleLabel }}</UiTag>
            <span class="av-collab__role-count">{{ record.memberCount }} 人</span>
          </div>
          <span v-else-if="isMemberRow(record)" class="av-collab__name">{{ record.userName }}</span>
        </template>
        <template v-else-if="column.key === 'loginName'">
          <span v-if="isMemberRow(record)">{{ record.loginName }}</span>
          <span v-else class="av-collab__muted">—</span>
        </template>
        <template v-else-if="column.key === 'departmentName'">
          <span v-if="isMemberRow(record)">{{ record.departmentName }}</span>
          <span v-else class="av-collab__muted">—</span>
        </template>
        <template v-else-if="column.key === 'sourceLabel'">
          <span v-if="isMemberRow(record)">{{ record.sourceLabel }}</span>
          <span v-else class="av-collab__muted">—</span>
        </template>
        <template v-else-if="column.key === 'createTimeLabel'">
          <span v-if="isMemberRow(record)">{{ record.createTimeLabel }}</span>
          <span v-else class="av-collab__muted">—</span>
        </template>
        <template v-else-if="column.key === 'meta'">
          <span v-if="isRoleGroup(record)" class="av-collab__cap-text">{{
            record.capabilityLabel
          }}</span>
          <span v-else-if="isMemberRow(record)">{{ record.remark }}</span>
        </template>
        <template v-else-if="column.key === 'actions'">
          <template v-if="isMemberRow(record) && canManageCollaborators">
            <div class="av-collab__actions">
              <UiSelect
                v-if="record.roleEditable"
                size="sm"
                class="av-collab__role-select"
                :allow-clear="false"
                :model-value="record.memberRole"
                :options="roleSelectOptions"
                :disabled="submitting || roleUpdatingMemberId === record.memberId"
                @update:model-value="
                  (value) => {
                    if (value == null) return
                    handleRoleChange(record, value as ArchiveVolumeMemberRoleCode)
                  }
                "
              />
              <UiTableActions
                v-if="memberActions(record).length"
                :items="memberActions(record)"
                split
                @action="(key) => handleMemberAction(key, record)"
              />
              <span v-else class="av-collab__locked">不可移除</span>
            </div>
          </template>
          <span v-else-if="isRoleGroup(record)" class="av-collab__muted">
            {{ record.memberCount === 0 ? '待添加' : '' }}
          </span>
        </template>
      </template>
    </UiDataTable>
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

.av-collab__signal {
  margin: 0;
}

.av-collab__add {
  margin: 0;
}

.av-collab__table {
  margin: 0;
}

.av-collab__role-node {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.av-collab__role-count {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--dp-text-muted);
}

.av-collab__name {
  font-size: 14px;
  color: var(--dp-text-primary);
}

.av-collab__muted,
.av-collab__locked,
.av-collab__hint {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--dp-text-muted);
}

.av-collab__cap-text {
  font-size: 12px;
  line-height: 1.45;
  color: var(--dp-text-secondary);
}

.av-collab__actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.av-collab__role-select {
  min-width: 128px;
}

:deep(.av-collab__row--role) > td {
  background: color-mix(in srgb, var(--dp-blue-50) 45%, var(--dp-surface));
  font-weight: 500;
}

:deep(.av-collab__row--member) > td {
  background: var(--dp-surface);
}
</style>

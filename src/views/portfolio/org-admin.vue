<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { TreeProps } from 'ant-design-vue/es/tree'
import type {
  PortfolioOrgAliasSaveRequest,
  PortfolioOrgAliasVO,
  PortfolioOrgSyncInvalidUnitVO,
  PortfolioOrgSyncLogVO,
  PortfolioOrgTreeNodeVO,
  PortfolioOrgUnitSaveRequest,
} from '@/apis/portfolio/types'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref } from 'vue'
import {
  PORTFOLIO_ORG_UNIT_TYPE_OPTIONS,
  PortfolioEduUserOrgTreeNodeTypeCode,
  PortfolioEduUserOrgTreeNodeTypeDescription,
  PortfolioOrgAliasTargetTypeCode,
  PortfolioOrgAliasTargetTypeDescription,
  PortfolioOrgUnitTypeCode,
  PortfolioOrgUnitTypeDescription,
} from '@/apis/portfolio/enums'
import { portfolioOrgApi } from '@/apis/portfolio/org'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiDropdownAction from '@/components/ui-guide/ui/UiDropdownAction.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTree from '@/components/ui-guide/ui/UiTree.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { isPortfolioUnitNode, usePortfolioOrgTree } from '@/composables/usePortfolioOrgTree'
import { usePortfolioTeacherSearch } from '@/composables/usePortfolioTeacherSearch'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { hasTeacherTenantPermission } from '@/utils/permission'
import { strictEnumLabel } from '@/utils/strict-enum'

interface TreeNode {
  key: string
  title: string
  nodeType: PortfolioOrgTreeNodeVO['nodeType']
  portfolioOrgId?: string
  raw: PortfolioOrgTreeNodeVO
  children?: TreeNode[]
}

function isTreeNode(value: unknown): value is TreeNode {
  return (
    typeof value === 'object' &&
    value !== null &&
    'key' in value &&
    'title' in value &&
    'raw' in value
  )
}

const aliasColumns: ColumnsType = [
  { title: '历史名称', dataIndex: 'aliasName', key: 'aliasName', fixed: 'left' },
  { title: '生效起', dataIndex: 'effectiveFrom', key: 'effectiveFrom', width: 110 },
  { title: '生效止', dataIndex: 'effectiveTo', key: 'effectiveTo', width: 110 },
  { title: '备注', dataIndex: 'remark', key: 'remark', ellipsis: true },
  { title: '操作', key: 'actions', width: 120 },
]

const { loading, treeRoots, loadTree } = usePortfolioOrgTree()
const { teacherOptions, searchTeachers } = usePortfolioTeacherSearch()
const authStore = useAuthStore()
const userStore = useUserStore()
const canManageTenant = computed(() =>
  hasTeacherTenantPermission({
    roleKey: authStore.userRole,
    isTenantAdmin: userStore.isTenantAdmin,
  }),
)
const operationKey = ref('')
const writing = computed(() => Boolean(operationKey.value))
const syncing = computed(() => operationKey.value === 'org:sync')
const syncLogRequestToken = ref(0)
const syncDiagnostics = ref<PortfolioOrgSyncInvalidUnitVO[]>([])
const lastSyncLog = ref<PortfolioOrgSyncLogVO | null>(null)
const treeData = ref<TreeNode[]>([])
const selectedNode = ref<TreeNode | null>(null)

const unitVisible = ref(false)
const unitMode = ref<'create' | 'edit'>('create')
const unitEditor = reactive<PortfolioOrgUnitSaveRequest>({
  orgType: PortfolioOrgUnitTypeCode.TEACHING_RESEARCH_OFFICE,
  orgName: '',
  orgCode: '',
  sortOrder: 0,
  status: 'ACTIVE',
  leaderUserId: '',
})

const aliasVisible = ref(false)
const aliasMode = ref<'create' | 'edit'>('create')
const aliasEditor = reactive<PortfolioOrgAliasSaveRequest>({
  targetType: PortfolioOrgAliasTargetTypeCode.EDU_USER_DEPARTMENT,
  targetId: '',
  aliasName: '',
  remark: '',
})
const interactionLocked = computed(() => writing.value || unitVisible.value || aliasVisible.value)

/** 组织配置写操作必须串行，避免树节点、扩展组织与历史名称并发改写。 */
function beginOperation(key: string): boolean {
  if (writing.value) {
    return false
  }
  operationKey.value = key
  return true
}

function endOperation(key: string) {
  if (operationKey.value === key) {
    operationKey.value = ''
  }
}

function nodeTypeLabel(nodeType?: PortfolioOrgTreeNodeVO['nodeType']) {
  if (!nodeType) {
    return '—'
  }
  switch (nodeType) {
    case PortfolioEduUserOrgTreeNodeTypeCode.SCHOOL:
      return strictEnumLabel(
        PortfolioEduUserOrgTreeNodeTypeDescription,
        PortfolioEduUserOrgTreeNodeTypeCode.SCHOOL,
        '组织树节点类型',
      )
    case PortfolioEduUserOrgTreeNodeTypeCode.DEPARTMENT:
      return strictEnumLabel(
        PortfolioEduUserOrgTreeNodeTypeDescription,
        PortfolioEduUserOrgTreeNodeTypeCode.DEPARTMENT,
        '组织树节点类型',
      )
    case PortfolioEduUserOrgTreeNodeTypeCode.MAJOR:
      return strictEnumLabel(
        PortfolioEduUserOrgTreeNodeTypeDescription,
        PortfolioEduUserOrgTreeNodeTypeCode.MAJOR,
        '组织树节点类型',
      )
    case PortfolioEduUserOrgTreeNodeTypeCode.CLASS:
      return strictEnumLabel(
        PortfolioEduUserOrgTreeNodeTypeDescription,
        PortfolioEduUserOrgTreeNodeTypeCode.CLASS,
        '组织树节点类型',
      )
    case PortfolioOrgUnitTypeCode.MAJOR_GROUP:
      return strictEnumLabel(
        PortfolioOrgUnitTypeDescription,
        PortfolioOrgUnitTypeCode.MAJOR_GROUP,
        '组织单元类型',
      )
    case PortfolioOrgUnitTypeCode.TEACHING_RESEARCH_OFFICE:
      return strictEnumLabel(
        PortfolioOrgUnitTypeDescription,
        PortfolioOrgUnitTypeCode.TEACHING_RESEARCH_OFFICE,
        '组织单元类型',
      )
    case PortfolioOrgUnitTypeCode.CAMPUS:
      return strictEnumLabel(
        PortfolioOrgUnitTypeDescription,
        PortfolioOrgUnitTypeCode.CAMPUS,
        '组织单元类型',
      )
  }
}

function mapTree(nodes: PortfolioOrgTreeNodeVO[]): TreeNode[] {
  return nodes.map((node) => ({
    key: node.portfolioOrgId ?? node.id,
    title: node.leaderUserName
      ? `${node.code ? `${node.name} (${node.code})` : node.name} · 负责人 ${node.leaderUserName}`
      : node.code
        ? `${node.name} (${node.code})`
        : node.name,
    nodeType: node.nodeType,
    portfolioOrgId: node.portfolioOrgId,
    raw: node,
    children: node.children?.length ? mapTree(node.children) : undefined,
  }))
}

async function loadLatestSync() {
  if (!canManageTenant.value) {
    return
  }
  const currentToken = syncLogRequestToken.value + 1
  syncLogRequestToken.value = currentToken
  try {
    const result = await portfolioOrgApi.syncLatest()
    if (syncLogRequestToken.value !== currentToken) return
    lastSyncLog.value = result
  } catch (error) {
    if (syncLogRequestToken.value !== currentToken) return
    showUserError(error, '读取同步审计失败')
    lastSyncLog.value = null
  }
}

async function refreshTree() {
  await loadTree(false)
  treeData.value = mapTree(treeRoots.value)
  if (selectedNode.value) {
    const key = selectedNode.value.key
    selectedNode.value = findTreeNode(treeData.value, key)
  }
}

const contextSubtitle = computed(() => {
  const log = lastSyncLog.value
  if (!log) {
    return ''
  }
  return `上次校验 ${log.syncedTime} · 院系 ${log.departmentCount} / 专业 ${log.majorCount}`
})

async function handleSync() {
  const operation = 'org:sync'
  if (!beginOperation(operation)) return
  try {
    const result = await portfolioOrgApi.sync()
    syncDiagnostics.value = result.invalidPortfolioOrgUnits ?? []
    void message.success(`校验完成：院系 ${result.departmentCount}、专业 ${result.majorCount}`)
    if (syncDiagnostics.value.length > 0) {
      showFormValidationMessage(
        `挂接失效扩展组织 ${syncDiagnostics.value.length} 个，见下方诊断列表`,
      )
    }
    await refreshTree()
    await loadLatestSync()
  } catch (error) {
    showUserError(error, '组织校验失败')
  } finally {
    endOperation(operation)
  }
}

function findTreeNode(nodes: TreeNode[], key: string): TreeNode | null {
  for (const node of nodes) {
    if (node.key === key) {
      return node
    }
    if (node.children?.length) {
      const found = findTreeNode(node.children, key)
      if (found) {
        return found
      }
    }
  }
  return null
}

const onSelect: TreeProps['onSelect'] = (_keys, info) => {
  if (interactionLocked.value) {
    return
  }
  if (!info.node) {
    selectedNode.value = null
    return
  }
  if (!isTreeNode(info.node)) {
    throw new Error('组织树节点契约异常')
  }
  selectedNode.value = info.node
}

const selectedRaw = computed(() => selectedNode.value?.raw ?? null)
const selectedAliases = computed(() => selectedRaw.value?.aliases ?? [])
const canManageUnit = computed(() => isPortfolioUnitNode(selectedRaw.value?.nodeType))
const canManageAlias = computed(() => {
  const node = selectedRaw.value
  if (!node) {
    return false
  }
  return node.nodeType === 'DEPARTMENT' || node.nodeType === 'MAJOR' || Boolean(node.portfolioOrgId)
})

function resolveAliasTarget(
  node: PortfolioOrgTreeNodeVO,
): Pick<PortfolioOrgAliasSaveRequest, 'targetType' | 'targetId'> | null {
  if (node.nodeType === PortfolioEduUserOrgTreeNodeTypeCode.DEPARTMENT) {
    return { targetType: PortfolioOrgAliasTargetTypeCode.EDU_USER_DEPARTMENT, targetId: node.id }
  }
  if (node.nodeType === PortfolioEduUserOrgTreeNodeTypeCode.MAJOR) {
    return { targetType: PortfolioOrgAliasTargetTypeCode.EDU_USER_MAJOR, targetId: node.id }
  }
  if (node.portfolioOrgId) {
    return {
      targetType: PortfolioOrgAliasTargetTypeCode.PORTFOLIO_ORG_UNIT,
      targetId: node.portfolioOrgId,
    }
  }
  return null
}

function openUnitEditor(mode: 'create' | 'edit') {
  unitMode.value = mode
  if (mode === 'edit' && selectedRaw.value && canManageUnit.value) {
    const node = selectedRaw.value
    unitEditor.id = node.portfolioOrgId
    if (isPortfolioUnitNode(node.nodeType)) {
      unitEditor.orgType = node.nodeType
    }
    unitEditor.orgName = node.name
    unitEditor.orgCode = node.code
    if (isPortfolioUnitNode(node.parentNodeType)) {
      unitEditor.parentPortfolioOrgId = node.parentId
    } else {
      unitEditor.parentPortfolioOrgId = undefined
    }
    unitEditor.anchorDepartmentId = node.anchorDepartmentId
    unitEditor.anchorMajorId = node.anchorMajorId
    unitEditor.sortOrder = 0
    unitEditor.status = 'ACTIVE'
    unitEditor.leaderUserId = node.leaderUserId ?? ''
  } else {
    unitEditor.id = undefined
    unitEditor.orgType = PortfolioOrgUnitTypeCode.TEACHING_RESEARCH_OFFICE
    unitEditor.orgName = ''
    unitEditor.orgCode = ''
    unitEditor.parentPortfolioOrgId = selectedNode.value?.portfolioOrgId
    unitEditor.anchorDepartmentId =
      selectedRaw.value?.anchorDepartmentId ??
      (selectedRaw.value?.nodeType === PortfolioEduUserOrgTreeNodeTypeCode.DEPARTMENT
        ? selectedRaw.value.id
        : undefined)
    unitEditor.anchorMajorId =
      selectedRaw.value?.nodeType === PortfolioEduUserOrgTreeNodeTypeCode.MAJOR
        ? selectedRaw.value.id
        : selectedRaw.value?.anchorMajorId
    unitEditor.sortOrder = 0
    unitEditor.status = 'ACTIVE'
    unitEditor.leaderUserId = ''
  }
  unitVisible.value = true
}

async function submitUnit() {
  const orgName = unitEditor.orgName.trim()
  if (!orgName) {
    showFormValidationMessage('请填写扩展组织名称')
    return
  }
  const targetId = unitEditor.id || 'new'
  const operation = `unit:save:${targetId}`
  if (!beginOperation(operation)) return
  const request: PortfolioOrgUnitSaveRequest = {
    id: unitEditor.id,
    orgType: unitEditor.orgType,
    orgCode: unitEditor.orgCode?.trim() || undefined,
    orgName,
    parentPortfolioOrgId: unitEditor.parentPortfolioOrgId,
    anchorDepartmentId: unitEditor.anchorDepartmentId,
    anchorMajorId: unitEditor.anchorMajorId,
    sortOrder: unitEditor.sortOrder,
    status: unitEditor.status,
    leaderUserId: unitEditor.leaderUserId?.trim() || undefined,
  }
  try {
    await portfolioOrgApi.saveUnit(request)
    void message.success(unitMode.value === 'edit' ? '扩展组织已更新' : '扩展组织已创建')
    unitVisible.value = false
    syncDiagnostics.value = []
    await refreshTree()
  } catch (error) {
    showUserError(error, '保存扩展组织失败')
  } finally {
    endOperation(operation)
  }
}

async function deleteSelectedUnit() {
  const unitId = selectedNode.value?.portfolioOrgId
  if (!unitId) {
    showFormValidationMessage('请选择专业群或教研室等扩展组织节点')
    return
  }
  const operation = `unit:delete:${unitId}`
  if (!beginOperation(operation)) return
  const orgName = selectedRaw.value?.name || unitId
  if (
    !(await confirmAsync({
      title: '确认删除扩展组织？',
      content: `删除「${orgName}」后，该组织将从档案范围和历史名称维护中移除。`,
      type: 'error',
    }))
  ) {
    endOperation(operation)
    return
  }
  try {
    await portfolioOrgApi.deleteUnit(unitId)
    void message.success('已删除')
    selectedNode.value = null
    syncDiagnostics.value = []
    await refreshTree()
  } catch (error) {
    showUserError(error, '删除失败')
  } finally {
    endOperation(operation)
  }
}

function handleOrgAliasAction(key: string, row: PortfolioOrgAliasVO): void {
  if (key === 'edit') {
    openAliasEditor('edit', row)
    return
  }
  if (key === 'delete') {
    void deleteAlias(row)
  }
}

function openAliasEditor(mode: 'create' | 'edit', row?: PortfolioOrgAliasVO) {
  const node = selectedRaw.value
  if (!node) {
    showFormValidationMessage('请先选择组织节点')
    return
  }
  const target = resolveAliasTarget(node)
  if (!target) {
    showFormValidationMessage('当前节点不支持维护历史名称')
    return
  }
  aliasMode.value = mode
  aliasEditor.targetType = target.targetType
  aliasEditor.targetId = target.targetId
  if (mode === 'edit' && row) {
    aliasEditor.id = row.id
    aliasEditor.aliasName = row.aliasName
    aliasEditor.effectiveFrom = row.effectiveFrom
    aliasEditor.effectiveTo = row.effectiveTo
    aliasEditor.remark = row.remark ?? ''
  } else {
    aliasEditor.id = undefined
    aliasEditor.aliasName = ''
    aliasEditor.effectiveFrom = undefined
    aliasEditor.effectiveTo = undefined
    aliasEditor.remark = ''
  }
  aliasVisible.value = true
}

async function submitAlias() {
  const aliasName = aliasEditor.aliasName.trim()
  if (!aliasName) {
    showFormValidationMessage('请填写历史名称')
    return
  }
  if (
    aliasEditor.effectiveFrom &&
    aliasEditor.effectiveTo &&
    aliasEditor.effectiveFrom > aliasEditor.effectiveTo
  ) {
    showFormValidationMessage('生效截止日期不能早于生效起始日期')
    return
  }
  const targetId = aliasEditor.id || `${aliasEditor.targetType}:${aliasEditor.targetId}`
  const operation = `alias:save:${targetId}`
  if (!beginOperation(operation)) return
  const request: PortfolioOrgAliasSaveRequest = {
    id: aliasEditor.id,
    targetType: aliasEditor.targetType,
    targetId: aliasEditor.targetId,
    aliasName,
    effectiveFrom: aliasEditor.effectiveFrom,
    effectiveTo: aliasEditor.effectiveTo,
    remark: aliasEditor.remark?.trim() || undefined,
  }
  try {
    await portfolioOrgApi.saveAlias(request)
    void message.success(aliasMode.value === 'edit' ? '历史名称已更新' : '历史名称已添加')
    aliasVisible.value = false
    await refreshTree()
  } catch (error) {
    showUserError(error, '保存历史名称失败')
  } finally {
    endOperation(operation)
  }
}

async function deleteAlias(row: PortfolioOrgAliasVO) {
  const aliasId = row.id
  const aliasName = row.aliasName
  const operation = `alias:delete:${aliasId}`
  if (!beginOperation(operation)) return
  if (!(await confirmAsync({ content: `确认删除历史名称「${row.aliasName}」？`, type: 'error' }))) {
    endOperation(operation)
    return
  }
  try {
    await portfolioOrgApi.deleteAlias(aliasId)
    void message.success('已删除')
    await refreshTree()
  } catch (error) {
    showUserError(error, `删除历史名称「${aliasName}」失败`)
  } finally {
    endOperation(operation)
  }
}

const orgMoreActionItems = computed(() => [
  {
    key: 'alias',
    label: '历史名称',
    disabled: !canManageAlias.value || interactionLocked.value || loading.value,
  },
  {
    key: 'delete',
    label: '删除',
    danger: true,
    disabled: !canManageUnit.value || interactionLocked.value || loading.value,
  },
])

function onOrgMoreAction(key: string) {
  if (key === 'alias') {
    openAliasEditor('create')
    return
  }
  if (key === 'delete') {
    void deleteSelectedUnit()
  }
}

onMounted(async () => {
  await refreshTree()
  await loadLatestSync()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="组织管理" :subtitle="contextSubtitle">
        <template #actions>
          <UiButton
            size="sm"
            v-if="canManageTenant"
            variant="primary"
            :disabled="!selectedNode || interactionLocked || loading"
            @click="openUnitEditor('create')"
          >
            新增扩展组织
          </UiButton>
          <UiButton
            size="sm"
            v-if="canManageTenant && canManageUnit"
            variant="outline"
            :disabled="interactionLocked || loading"
            @click="openUnitEditor('edit')"
          >
            编辑扩展组织
          </UiButton>
          <UiButton
            size="sm"
            v-if="canManageTenant"
            variant="outline"
            :loading="syncing"
            :disabled="interactionLocked"
            @click="handleSync"
          >
            校验主数据挂接
          </UiButton>
          <UiDropdownAction
            v-if="canManageTenant"
            trigger-style="button"
            button-text="更多"
            :disabled="interactionLocked || loading"
            :items="orgMoreActionItems"
            @select="onOrgMoreAction"
          />
        </template>
      </ContextBar>
    </template>
    <UiCard v-if="syncDiagnostics.length" title="挂接失效诊断" class="org-admin__diagnostics">
      <ul class="org-admin__diagnostic-list">
        <li v-for="item in syncDiagnostics" :key="item.id">
          {{ item.orgName }}{{ item.orgCode ? ` (${item.orgCode})` : '' }} · 编号 {{ item.id }}
        </li>
      </ul>
    </UiCard>
    <div class="org-admin">
      <UiCard title="组织树" class="org-admin__tree" :loading="loading">
        <UiTree
          v-if="treeData.length"
          :tree-data="treeData"
          default-expand-all
          block-node
          :disabled="interactionLocked"
          @select="onSelect"
        />
        <UiEmpty size="sm" v-else description="暂无组织数据，请联系学校管理员校验主数据挂接" />
      </UiCard>
      <UiCard title="节点详情" class="org-admin__detail">
        <template v-if="selectedRaw">
          <dl class="org-admin__meta">
            <div>
              <dt>名称</dt>
              <dd>{{ selectedRaw.name }}</dd>
            </div>
            <div>
              <dt>类型</dt>
              <dd>
                <UiTag tone="blue">{{ nodeTypeLabel(selectedRaw.nodeType) }}</UiTag>
              </dd>
            </div>
            <div v-if="selectedRaw.code">
              <dt>编码</dt>
              <dd>{{ selectedRaw.code }}</dd>
            </div>
            <div v-if="selectedRaw.anchorDepartmentId">
              <dt>挂接院系</dt>
              <dd>{{ selectedRaw.anchorDepartmentId }}</dd>
            </div>
            <div v-if="selectedRaw.anchorMajorId">
              <dt>挂接专业</dt>
              <dd>{{ selectedRaw.anchorMajorId }}</dd>
            </div>
            <div v-if="selectedRaw.portfolioOrgId">
              <dt>扩展组织编号</dt>
              <dd>{{ selectedRaw.portfolioOrgId }}</dd>
            </div>
            <div v-if="selectedRaw.leaderUserId">
              <dt>负责人</dt>
              <dd>
                {{
                  selectedRaw.leaderTeacherNo
                    ? `${selectedRaw.leaderUserName} · ${selectedRaw.leaderTeacherNo}`
                    : selectedRaw.leaderUserName
                }}
              </dd>
            </div>
          </dl>
          <UiDataTable
            title="历史名称"
            pagination-mode="none"
            :columns="aliasColumns"
            :data-source="selectedAliases"
            row-key="id"
            :show-pagination="false"
            :sticky-header="false"
            flat
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'actions'">
                <UiTableActions
                  v-if="canManageTenant"
                  :items="[
                    { key: 'edit', label: '编辑', disabled: interactionLocked },
                    { key: 'delete', label: '删除', tone: 'danger', disabled: interactionLocked },
                  ]"
                  split
                  @action="(key) => handleOrgAliasAction(key, record)"
                />
              </template>
            </template>
            <template #empty>
              <UiEmpty size="sm" description="暂无历史名称" />
            </template>
          </UiDataTable>
        </template>
        <UiAlertStrip v-else tone="info" size="sm" dense inline :show-icon="false">
          <template #default>
            <span style="display: inline-flex; align-items: center; gap: 8px">
              <UiTag tone="blue" size="sm">未选择组织</UiTag>
              <span>请在左侧选择组织节点后维护扩展属性</span>
            </span>
          </template>
        </UiAlertStrip>
      </UiCard>
    </div>
    <UiDialog
      v-model:open="unitVisible"
      :title="unitMode === 'edit' ? '编辑扩展组织' : '新增扩展组织'"
      :confirm-loading="operationKey.startsWith('unit:save:')"
      :closable="!writing"
      :mask-closable="!writing"
      @ok="submitUnit"
    >
      <UiForm layout="vertical">
        <UiFormItem label="类型" required>
          <UiSelect
            size="sm"
            v-model="unitEditor.orgType"
            :options="PORTFOLIO_ORG_UNIT_TYPE_OPTIONS"
            :disabled="unitMode === 'edit' || writing"
          />
        </UiFormItem>
        <UiFormItem label="名称" required>
          <UiInput size="sm" v-model="unitEditor.orgName" :disabled="writing" />
        </UiFormItem>
        <UiFormItem label="编码">
          <UiInput size="sm" v-model="unitEditor.orgCode" :disabled="writing" />
        </UiFormItem>
        <UiFormItem v-if="unitEditor.anchorDepartmentId" label="挂接院系">
          <UiInput size="sm" :value="unitEditor.anchorDepartmentId" disabled />
        </UiFormItem>
        <UiFormItem v-if="unitEditor.anchorMajorId" label="挂接专业">
          <UiInput size="sm" :value="unitEditor.anchorMajorId" disabled />
        </UiFormItem>
        <UiFormItem label="负责人">
          <UiSelect
            size="sm"
            v-model="unitEditor.leaderUserId"
            allow-search
            allow-clear
            placeholder="搜索教师姓名或工号"
            :filter-option="false"
            :options="teacherOptions"
            :disabled="writing"
            @search="searchTeachers"
          />
        </UiFormItem>
      </UiForm>
    </UiDialog>
    <UiDialog
      v-model:open="aliasVisible"
      :title="aliasMode === 'edit' ? '编辑历史名称' : '添加历史名称'"
      :confirm-loading="operationKey.startsWith('alias:save:')"
      :closable="!writing"
      :mask-closable="!writing"
      @ok="submitAlias"
    >
      <UiForm layout="vertical">
        <UiFormItem label="目标类型">
          <UiInput
            size="sm"
            :value="
              strictEnumLabel(
                PortfolioOrgAliasTargetTypeDescription,
                aliasEditor.targetType,
                '组织别名目标类型',
              )
            "
            disabled
          />
        </UiFormItem>
        <UiFormItem label="历史名称" required>
          <UiInput size="sm" v-model="aliasEditor.aliasName" :disabled="writing" />
        </UiFormItem>
        <UiFormItem label="生效起始">
          <UiInput
            size="sm"
            v-model="aliasEditor.effectiveFrom"
            placeholder="年-月-日，例如 2026-07-16"
            :disabled="writing"
          />
        </UiFormItem>
        <UiFormItem label="生效截止">
          <UiInput
            size="sm"
            v-model="aliasEditor.effectiveTo"
            placeholder="年-月-日，例如 2026-07-16"
            :disabled="writing"
          />
        </UiFormItem>
        <UiFormItem label="备注">
          <UiInput size="sm" v-model="aliasEditor.remark" :disabled="writing" />
        </UiFormItem>
      </UiForm>
    </UiDialog>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.org-admin {
  display: grid;
  grid-template-columns: minmax(280px, 36%) 1fr;
  gap: var(--dp-space-3, 12px);
  align-items: start;
}

.org-admin__diagnostics {
  margin-bottom: var(--dp-space-3, 12px);
}

.org-admin__diagnostic-list {
  margin: 0;
  padding-left: 18px;
  color: var(--dp-text-secondary);
  font-size: 14px;
}

.org-admin__meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 16px;
  margin: 0 0 16px;

  div {
    display: flex;
    gap: 8px;
    font-size: 14px;
  }

  dt {
    margin: 0;
    color: var(--dp-text-secondary);
    white-space: nowrap;
  }

  dd {
    margin: 0;
    color: var(--dp-text-primary);
  }
}
</style>

<script setup lang="ts">
import type { TreeProps } from 'ant-design-vue'
import { message } from 'ant-design-vue'
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioOrgAliasSaveRequest,
  PortfolioOrgAliasVO,
  PortfolioOrgSyncInvalidUnitVO,
  PortfolioOrgSyncLogVO,
  PortfolioOrgTreeNodeVO,
  PortfolioOrgUnitSaveRequest,
} from '@/apis/portfolio/types'
import {
  PORTFOLIO_ORG_ALIAS_TARGET_TYPE_LABEL,
  PORTFOLIO_ORG_TREE_NODE_TYPE_LABEL,
  PORTFOLIO_ORG_UNIT_TYPE_OPTIONS,
  PORTFOLIO_PORTFOLIO_UNIT_NODE_TYPES,
} from '@/apis/portfolio/types'
import { computed, onMounted, reactive, ref } from 'vue'
import { portfolioOrgApi } from '@/apis/portfolio/org'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { isPortfolioUnitNode, usePortfolioOrgTree } from '@/composables/usePortfolioOrgTree'
import { usePortfolioTeacherSearch } from '@/composables/usePortfolioTeacherSearch'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'
import { showUserError } from '@/utils/error-handler'
import { hasTeacherTenantPermission } from '@/utils/permission'
import { strictEnumLabel } from '@/utils/strict-enum'

interface TreeNode {
  key: string
  title: string
  nodeType: string
  portfolioOrgId?: string
  raw: PortfolioOrgTreeNodeVO
  children?: TreeNode[]
}

const aliasColumns: ColumnsType = [
  { title: '历史名称', dataIndex: 'aliasName', key: 'aliasName' },
  { title: '生效起', dataIndex: 'effectiveFrom', key: 'effectiveFrom', width: 110 },
  { title: '生效止', dataIndex: 'effectiveTo', key: 'effectiveTo', width: 110 },
  { title: '备注', dataIndex: 'remark', key: 'remark', ellipsis: true },
  { title: '操作', key: 'actions', width: 120, fixed: 'right' },
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
const syncing = ref(false)
const syncDiagnostics = ref<PortfolioOrgSyncInvalidUnitVO[]>([])
const lastSyncLog = ref<PortfolioOrgSyncLogVO | null>(null)
const treeData = ref<TreeNode[]>([])
const selectedNode = ref<TreeNode | null>(null)

const unitVisible = ref(false)
const unitMode = ref<'create' | 'edit'>('create')
const unitEditor = reactive<PortfolioOrgUnitSaveRequest>({
  orgType: 'TEACHING_RESEARCH_OFFICE',
  orgName: '',
  orgCode: '',
  sortOrder: 0,
  status: 'ACTIVE',
  leaderUserId: '',
})

const aliasVisible = ref(false)
const aliasMode = ref<'create' | 'edit'>('create')
const aliasEditor = reactive<PortfolioOrgAliasSaveRequest>({
  targetType: 'EDU_USER_DEPARTMENT',
  targetId: '',
  aliasName: '',
  remark: '',
})

function nodeTypeLabel(nodeType?: string) {
  if (!nodeType) {
    return '—'
  }
  return strictEnumLabel(
    PORTFOLIO_ORG_TREE_NODE_TYPE_LABEL,
    nodeType as keyof typeof PORTFOLIO_ORG_TREE_NODE_TYPE_LABEL,
    '组织节点类型',
  )
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
  try {
    lastSyncLog.value = await portfolioOrgApi.syncLatest()
  } catch (error) {
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
  syncing.value = true
  try {
    const result = await portfolioOrgApi.sync()
    syncDiagnostics.value = result.invalidPortfolioOrgUnits ?? []
    message.success(`校验完成：院系 ${result.departmentCount}、专业 ${result.majorCount}`)
    if (syncDiagnostics.value.length > 0) {
      message.warning(`挂接失效扩展组织 ${syncDiagnostics.value.length} 个，见下方诊断列表`)
    }
    await refreshTree()
    await loadLatestSync()
  } catch (error) {
    showUserError(error, '组织校验失败')
  } finally {
    syncing.value = false
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
  selectedNode.value = (info.node as unknown as TreeNode) ?? null
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
  if (node.nodeType === 'DEPARTMENT') {
    return { targetType: 'EDU_USER_DEPARTMENT', targetId: node.id }
  }
  if (node.nodeType === 'MAJOR') {
    return { targetType: 'EDU_USER_MAJOR', targetId: node.id }
  }
  if (node.portfolioOrgId) {
    return { targetType: 'PORTFOLIO_ORG_UNIT', targetId: node.portfolioOrgId }
  }
  return null
}

function openUnitEditor(mode: 'create' | 'edit') {
  unitMode.value = mode
  if (mode === 'edit' && selectedRaw.value && canManageUnit.value) {
    const node = selectedRaw.value
    unitEditor.id = node.portfolioOrgId
    unitEditor.orgType = node.nodeType as PortfolioOrgUnitSaveRequest['orgType']
    unitEditor.orgName = node.name
    unitEditor.orgCode = node.code
    if (
      node.parentNodeType &&
      PORTFOLIO_PORTFOLIO_UNIT_NODE_TYPES.includes(
        node.parentNodeType as (typeof PORTFOLIO_PORTFOLIO_UNIT_NODE_TYPES)[number],
      )
    ) {
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
    unitEditor.orgType = 'TEACHING_RESEARCH_OFFICE'
    unitEditor.orgName = ''
    unitEditor.orgCode = ''
    unitEditor.parentPortfolioOrgId = selectedNode.value?.portfolioOrgId
    unitEditor.anchorDepartmentId =
      selectedRaw.value?.anchorDepartmentId ??
      (selectedRaw.value?.nodeType === 'DEPARTMENT' ? selectedRaw.value.id : undefined)
    unitEditor.anchorMajorId =
      selectedRaw.value?.nodeType === 'MAJOR'
        ? selectedRaw.value.id
        : selectedRaw.value?.anchorMajorId
    unitEditor.sortOrder = 0
    unitEditor.status = 'ACTIVE'
    unitEditor.leaderUserId = ''
  }
  unitVisible.value = true
}

async function submitUnit() {
  try {
    await portfolioOrgApi.saveUnit({
      ...unitEditor,
      leaderUserId: unitEditor.leaderUserId?.trim() || undefined,
    })
    message.success(unitMode.value === 'edit' ? '扩展组织已更新' : '扩展组织已创建')
    unitVisible.value = false
    await refreshTree()
  } catch (error) {
    showUserError(error, '保存扩展组织失败')
  }
}

async function deleteSelectedUnit() {
  const unitId = selectedNode.value?.portfolioOrgId
  if (!unitId) {
    message.warning('请选择专业群或教研室等扩展组织节点')
    return
  }
  if (!(await confirmAsync({ content: '确认删除该扩展组织？', type: 'error' }))) {
    return
  }
  try {
    await portfolioOrgApi.deleteUnit(unitId)
    message.success('已删除')
    selectedNode.value = null
    await refreshTree()
  } catch (error) {
    showUserError(error, '删除失败')
  }
}

function openAliasEditor(mode: 'create' | 'edit', row?: PortfolioOrgAliasVO) {
  const node = selectedRaw.value
  if (!node) {
    message.warning('请先选择组织节点')
    return
  }
  const target = resolveAliasTarget(node)
  if (!target) {
    message.warning('当前节点不支持维护历史名称')
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
  try {
    await portfolioOrgApi.saveAlias({ ...aliasEditor })
    message.success(aliasMode.value === 'edit' ? '历史名称已更新' : '历史名称已添加')
    aliasVisible.value = false
    await refreshTree()
  } catch (error) {
    showUserError(error, '保存历史名称失败')
  }
}

async function deleteAlias(row: PortfolioOrgAliasVO) {
  if (!(await confirmAsync({ content: `确认删除历史名称「${row.aliasName}」？`, type: 'error' }))) {
    return
  }
  try {
    await portfolioOrgApi.deleteAlias(row.id)
    message.success('已删除')
    await refreshTree()
  } catch (error) {
    showUserError(error, '删除历史名称失败')
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
          <UiButton v-if="canManageTenant" :loading="syncing" @click="handleSync">
            校验主数据挂接
          </UiButton>
          <UiButton
            v-if="canManageTenant"
            variant="primary"
            :disabled="!selectedNode"
            @click="openUnitEditor('create')"
          >
            新增扩展组织
          </UiButton>
          <UiButton v-if="canManageTenant && canManageUnit" @click="openUnitEditor('edit')">
            编辑扩展组织
          </UiButton>
          <UiButton
            v-if="canManageTenant"
            :disabled="!canManageAlias"
            @click="openAliasEditor('create')"
          >
            添加历史名称
          </UiButton>
          <UiButton
            v-if="canManageTenant"
            status="danger"
            :disabled="!canManageUnit"
            @click="deleteSelectedUnit"
          >
            删除扩展组织
          </UiButton>
        </template>
      </ContextBar>
    </template>
    <UiCard v-if="syncDiagnostics.length" title="挂接失效诊断" class="org-admin__diagnostics">
      <ul class="org-admin__diagnostic-list">
        <li v-for="item in syncDiagnostics" :key="item.id">
          {{ item.orgName }}{{ item.orgCode ? ` (${item.orgCode})` : '' }} · ID {{ item.id }}
        </li>
      </ul>
    </UiCard>
    <div class="org-admin">
      <UiCard title="组织树" class="org-admin__tree" :loading="loading">
        <a-tree
          v-if="treeData.length"
          :tree-data="treeData"
          default-expand-all
          block-node
          @select="onSelect"
        />
        <UiEmpty v-else description="暂无组织数据，请联系学校管理员校验主数据挂接" />
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
              <dt>扩展组织 ID</dt>
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
            :columns="aliasColumns"
            :data-source="selectedAliases"
            row-key="id"
            :pagination="false"
            flat
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'actions'">
                <template v-if="canManageTenant">
                  <UiTextAction @click="openAliasEditor('edit', record)"> 编辑 </UiTextAction>
                  <UiTextAction @click="deleteAlias(record)"> 删除 </UiTextAction>
                </template>
              </template>
            </template>
            <template #empty>
              <UiEmpty description="暂无历史名称" />
            </template>
          </UiDataTable>
        </template>
        <UiEmpty v-else description="请在左侧选择组织节点" />
      </UiCard>
    </div>
    <a-modal
      v-model:open="unitVisible"
      :title="unitMode === 'edit' ? '编辑扩展组织' : '新增扩展组织'"
      @ok="submitUnit"
    >
      <a-form layout="vertical">
        <a-form-item label="类型" required>
          <a-select
            v-model:value="unitEditor.orgType"
            :options="PORTFOLIO_ORG_UNIT_TYPE_OPTIONS"
            :disabled="unitMode === 'edit'"
          />
        </a-form-item>
        <a-form-item label="名称" required>
          <a-input v-model:value="unitEditor.orgName" />
        </a-form-item>
        <a-form-item label="编码">
          <a-input v-model:value="unitEditor.orgCode" />
        </a-form-item>
        <a-form-item v-if="unitEditor.anchorDepartmentId" label="挂接院系">
          <a-input :value="unitEditor.anchorDepartmentId" disabled />
        </a-form-item>
        <a-form-item v-if="unitEditor.anchorMajorId" label="挂接专业">
          <a-input :value="unitEditor.anchorMajorId" disabled />
        </a-form-item>
        <a-form-item label="负责人">
          <a-select
            v-model:value="unitEditor.leaderUserId"
            show-search
            allow-clear
            placeholder="搜索教师姓名或工号"
            :filter-option="false"
            :options="teacherOptions"
            @search="searchTeachers"
          />
        </a-form-item>
      </a-form>
    </a-modal>
    <a-modal
      v-model:open="aliasVisible"
      :title="aliasMode === 'edit' ? '编辑历史名称' : '添加历史名称'"
      @ok="submitAlias"
    >
      <a-form layout="vertical">
        <a-form-item label="目标类型">
          <a-input
            :value="
              strictEnumLabel(
                PORTFOLIO_ORG_ALIAS_TARGET_TYPE_LABEL,
                aliasEditor.targetType,
                'alias 目标类型',
              )
            "
            disabled
          />
        </a-form-item>
        <a-form-item label="历史名称" required>
          <a-input v-model:value="aliasEditor.aliasName" />
        </a-form-item>
        <a-form-item label="生效起始">
          <a-input v-model:value="aliasEditor.effectiveFrom" placeholder="YYYY-MM-DD" />
        </a-form-item>
        <a-form-item label="生效截止">
          <a-input v-model:value="aliasEditor.effectiveTo" placeholder="YYYY-MM-DD" />
        </a-form-item>
        <a-form-item label="备注">
          <a-input v-model:value="aliasEditor.remark" />
        </a-form-item>
      </a-form>
    </a-modal>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.org-admin {
  display: grid;
  grid-template-columns: minmax(280px, 36%) 1fr;
  gap: 16px;
  align-items: start;
}

.org-admin__diagnostics {
  margin-bottom: 16px;
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

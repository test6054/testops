<template>
  <a-drawer
    v-model:open="visible"
    :title="props.title"
    width="auto"
    :content-wrapper-style="{ maxWidth: '90vw' }"
    :mask-closable="false"
    destroy-on-close
    @close="handleCancel"
  >
    <div
      class="tree-selector-container"
      style="height: 100%; display: flex; flex-direction: row; gap: 16px; overflow: hidden"
    >
      <!-- 左侧：课程设计配置 -->
      <div
        v-if="$slots['header-extra']"
        class="selector-left-panel"
        style="
          width: 600px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        "
      >
        <slot
          name="header-extra"
          :selected-count="selectedStudents.length"
          :selected-students="selectedStudents"
          :selected-students-info="selectedStudentsInfo"
        />
      </div>

      <!-- 右侧：树形选择器 -->
      <div
        class="selector-right-panel"
        style="flex: 1; display: flex; flex-direction: column; overflow: hidden"
      >
        <!-- 搜索框 -->
        <div class="search-box" style="margin-bottom: 16px">
          <a-input-search
            v-model:value="searchKey"
            placeholder="搜索院系、班级或学生名称/学号"
            :allow-clear="true"
            @search="handleSearch"
          />
        </div>

        <!-- 统计信息 -->
        <div class="selection-stats">
          <span>已选择: </span>
          <span class="selection-count"> {{ selectedStudents.length }} 名学生 </span>
        </div>

        <!-- 树形结构 -->
        <div style="flex: 1; overflow-y: auto; min-height: 0">
          <a-spin :spinning="loading" style="width: 100%">
            <a-tree
              v-if="treeData.length > 0"
              :tree-data="processedTreeData"
              :checkable="true"
              :checked-keys="checkedKeys"
              :default-expand-all="!!searchKey"
              :default-expanded-keys="defaultExpandedKeys"
              :field-names="{
                key: 'id',
                title: 'name',
                children: 'children',
              }"
              :check-strictly="false"
              @check="handleCheck"
              @select="handleNodeClick"
            >
              <template #title="nodeData">
                <div class="custom-tree-node" @click.stop="handleTitleClick">
                  <!-- 院系节点 -->
                  <template v-if="nodeData.nodeType === ExamClassStudentTreeNodeTypeCode.DEPARTMENT">
                    <AppstoreOutlined class="icon-department" />
                    <span
                      class="node-name"
                      :class="{ 'disabled-student': disabledKeys.includes(nodeData.id) }"
                    >
                      {{ nodeData.name }}
                    </span>
                    <span class="node-stats">
                      ({{ nodeData.classCount }}个班级, {{ nodeData.studentCount }}名学生)
                    </span>
                    <UiTag
                      v-if="disabledKeys.includes(nodeData.id)"
                      tone="orange"
                      style="margin-left: 8px"
                    >
                      所有班级已被选中
                    </UiTag>
                  </template>

                  <!-- 班级节点 -->
                  <template v-else-if="nodeData.nodeType === ExamClassStudentTreeNodeTypeCode.CLASS">
                    <TeamOutlined class="icon-class" />
                    <span
                      class="node-name"
                      :class="{ 'disabled-student': disabledKeys.includes(nodeData.id) }"
                    >
                      {{ nodeData.name }}
                    </span>
                    <span class="node-stats" v-if="nodeData.major">
                      ({{ nodeData.major }}, {{ nodeData.studentCount }}名学生)
                    </span>
                    <UiTag
                      v-if="disabledKeys.includes(nodeData.id)"
                      tone="orange"
                      style="margin-left: 8px"
                    >
                      所有学生已被选中
                    </UiTag>
                  </template>

                  <!-- 学生节点 -->
                  <template v-else-if="nodeData.nodeType === ExamClassStudentTreeNodeTypeCode.STUDENT">
                    <UserOutlined class="icon-student" />
                    <span
                      class="node-name"
                      :class="{ 'disabled-student': disabledKeys.includes(nodeData.id) }"
                    >
                      {{ nodeData.name }}
                    </span>
                    <span class="node-stats" v-if="nodeData.studentNumber">
                      (学号: {{ nodeData.studentNumber }})
                    </span>
                    <UiTag
                      v-if="disabledKeys.includes(nodeData.id)"
                      tone="orange"
                      style="margin-left: 8px"
                    >
                      已被其他规则选中
                    </UiTag>
                  </template>
                </div>
              </template>
            </a-tree>

            <!-- 空状态 -->
            <UiEmpty v-else description="暂无班级和学生数据" />
          </a-spin>
        </div>

        <slot
          name="extra-content"
          :selected-count="selectedStudents.length"
          :selected-students="selectedStudents"
          :selected-students-info="selectedStudentsInfo"
        />
      </div>
    </div>

    <template #footer>
      <a-space>
        <a-button @click="handleCancel">取消</a-button>
        <a-button type="primary" :loading="props.confirmLoading" @click="handleConfirm">
          确定
        </a-button>
      </a-space>
    </template>
  </a-drawer>
</template>

<script setup lang="ts">
import type { DataNode } from 'ant-design-vue/es/vc-tree/interface'
import type { CheckInfo } from 'ant-design-vue/es/vc-tree/props'
import type { ClassStudentTreeConfirmPayload, ClassStudentTreeNode } from '@/apis/edu/class'
import AppstoreOutlined from '@ant-design/icons-vue/AppstoreOutlined'
import TeamOutlined from '@ant-design/icons-vue/TeamOutlined'
import UserOutlined from '@ant-design/icons-vue/UserOutlined'
import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import { getAvailableStudentTree, getClassStudentTree } from '@/apis/edu/class'
import { listExamStudentTree } from '@/apis/mark/exam-scope'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import { ExamClassStudentTreeNodeTypeCode } from '@/types/enums/exam-class-student-tree-node-type-enum'
import { showUserError } from '@/utils/error-handler'

interface Props {
  /** 抽屉标题 */
  title?: string
  /** 实践ID（用于过滤已添加的学生） */
  practiceId?: string
  /** 考试ID：设置后走 mark 名册 BFF 学生树 */
  examId?: string
  /** 仅展示这些班级 ID 下的学生；为空表示不按班级裁剪 */
  allowedClassIds?: string[]
  /** 初始选中的学生ID列表（用于编辑模式） */
  initialSelectedStudentIds?: (number | string)[]
  /** 需要排除的学生ID列表（已被其他规则选中，v3.0互斥选择） */
  excludedStudentIds?: string[]
  /** 确认后是否自动关闭弹窗，教师端可自定义关闭时机 */
  autoClose?: boolean
  /** 自定义确认按钮 loading 状态 */
  confirmLoading?: boolean
}

defineOptions({ name: 'ClassStudentTreeSelectorDrawer' })

const visible = defineModel<boolean>({ default: false })

const props = withDefaults(defineProps<Props>(), {
  title: '选择学生',
  initialSelectedStudentIds: () => [],
  excludedStudentIds: () => [],
  allowedClassIds: () => [],
  autoClose: true,
  confirmLoading: false,
})

// Emits
const emit = defineEmits<{
  (e: 'confirm', data: ClassStudentTreeConfirmPayload): void
}>()

// 响应式数据
const loading = ref(false)
const searchKey = ref('')
const treeData = ref<ClassStudentTreeNode[]>([])
const checkedKeys = ref<string[]>([])
const disabledKeys = ref<string[]>([])
const defaultExpandedKeys = ref<string[]>([])

// 递归查找节点
const findNodeById = (nodes: ClassStudentTreeNode[], id: string): ClassStudentTreeNode | null => {
  for (const node of nodes) {
    if (node.id === id) {
      return node
    }
    if (node.children) {
      const found = findNodeById(node.children, id)
      if (found) return found
    }
  }
  return null
}

// 只返回学生，即使选中了班级也展开为学生列表
const selectedStudents = computed(() => {
  return checkedKeys.value
    .filter((key) => key && key.startsWith('student_'))
    .map((key) => {
      const node = findNodeById(treeData.value, key)
      return node?.originalId
    })
    .filter((id): id is string => id !== undefined)
})

// 递归查找学生节点的父班级节点
const findParentClassNode = (
  nodes: ClassStudentTreeNode[],
  studentKey: string,
): ClassStudentTreeNode | null => {
  for (const node of nodes) {
    if (node.children) {
      // 检查当前节点的子节点中是否有目标学生
      const hasStudent = node.children.some((child) => child.id === studentKey)
      if (hasStudent && node.nodeType === ExamClassStudentTreeNodeTypeCode.CLASS) {
        return node
      }
      // 递归查找
      const found = findParentClassNode(node.children, studentKey)
      if (found) return found
    }
  }
  return null
}

// 获取学生详细信息（包含名称、班级信息和学号）
const selectedStudentsInfo = computed(() => {
  return checkedKeys.value
    .filter((key) => key.startsWith('student_'))
    .flatMap((key) => {
      const node = findNodeById(treeData.value, key)
      if (!node?.originalId || !node?.name) {
        return []
      }
      const parentClassNode = findParentClassNode(treeData.value, key)
      return [
        {
          id: node.originalId,
          name: node.name,
          classId: parentClassNode?.originalId,
          className: parentClassNode?.name,
          studentNumber: node.studentNumber,
        },
      ]
    })
})

// 过滤树数据（搜索功能）
const filteredTreeData = computed(() => {
  if (!searchKey.value) {
    return treeData.value
  }

  const keyword = searchKey.value.toLowerCase()

  // 递归过滤树节点
  const filterTree = (nodes: ClassStudentTreeNode[]): ClassStudentTreeNode[] => {
    return nodes
      .map((node) => {
        const children = node.children ? filterTree(node.children) : []
        const nameMatch = node.name.toLowerCase().includes(keyword)
        const numberMatch = node.studentNumber?.toLowerCase().includes(keyword)

        // 如果当前节点匹配或有子节点匹配，则保留
        if (nameMatch || numberMatch || children.length > 0) {
          return {
            ...node,
            children: children.length > 0 ? children : undefined,
          }
        }
        return null
      })
      .filter(Boolean) as ClassStudentTreeNode[]
  }

  return filterTree(treeData.value)
})

// 为 Antd Tree 添加 disabled 属性，配合 field-names 映射 id→key, name→title, children→children
const processedTreeData = computed(() => {
  const addDisabled = (nodes: ClassStudentTreeNode[]): DataNode[] => {
    return nodes.map((node): DataNode => ({
      ...node,
      key: node.id,
      title: node.name,
      disabled: disabledKeys.value.includes(node.id),
      children: node.children ? addDisabled(node.children) : undefined,
    }))
  }
  return addDisabled(filteredTreeData.value)
})

// 根据学生ID查找对应的树节点key
const findStudentNodeKeys = (studentIds: (number | string)[]): string[] => {
  const keys: string[] = []
  const searchNodes = (nodes: ClassStudentTreeNode[]) => {
    for (const node of nodes) {
      if (node.nodeType === ExamClassStudentTreeNodeTypeCode.STUDENT && node.originalId) {
        // 检查学生ID是否在初始选中列表中
        if (studentIds.some((id) => String(id) === String(node.originalId))) {
          keys.push(node.id)
        }
      }
      if (node.children) {
        searchNodes(node.children)
      }
    }
  }
  searchNodes(treeData.value)
  return keys
}

/**
 * 根据排除的学生ID列表计算禁用的节点keys（互斥选择）
 */
const calculateDisabledKeys = () => {
  if (!props.excludedStudentIds || props.excludedStudentIds.length === 0) {
    disabledKeys.value = []
    return
  }

  const keys: string[] = []

  // 递归检查节点及其子节点
  const checkNode = (node: ClassStudentTreeNode): boolean => {
    if (node.nodeType === ExamClassStudentTreeNodeTypeCode.STUDENT && node.originalId) {
      // 学生节点：检查是否在排除列表中
      const isExcluded = props.excludedStudentIds.includes(String(node.originalId))
      if (isExcluded) {
        keys.push(node.id)
      }
      return isExcluded
    } else if (node.nodeType === ExamClassStudentTreeNodeTypeCode.CLASS && node.children && node.children.length > 0) {
      // 班级节点：检查所有学生是否都被禁用
      const allStudentsDisabled = node.children.every((child) => checkNode(child))
      if (allStudentsDisabled) {
        keys.push(node.id)
      }
      return allStudentsDisabled
    } else if (node.nodeType === ExamClassStudentTreeNodeTypeCode.DEPARTMENT && node.children && node.children.length > 0) {
      // 院系节点：检查所有班级是否都被禁用
      const allClassesDisabled = node.children.every((child) => checkNode(child))
      if (allClassesDisabled) {
        keys.push(node.id)
      }
      return allClassesDisabled
    }
    return false
  }

  // 遍历所有根节点（院系）
  treeData.value.forEach((node) => checkNode(node))

  disabledKeys.value = keys
}

/** 按考试班级范围裁剪院系树，只保留 allowedClassIds 中的班级及其学生。 */
function filterTreeByClassScope(nodes: ClassStudentTreeNode[]): ClassStudentTreeNode[] {
  const allowed = props.allowedClassIds
  if (!allowed || allowed.length === 0) {
    return nodes
  }
  const allowedSet = new Set(allowed.map((id) => String(id)))
  const walk = (list: ClassStudentTreeNode[]): ClassStudentTreeNode[] => {
    const result: ClassStudentTreeNode[] = []
    for (const node of list) {
      if (node.nodeType === ExamClassStudentTreeNodeTypeCode.DEPARTMENT) {
        const children = walk(node.children ?? [])
        if (children.length > 0) {
          result.push({ ...node, children })
        }
        continue
      }
      if (node.nodeType === ExamClassStudentTreeNodeTypeCode.CLASS && allowedSet.has(String(node.originalId))) {
        result.push({ ...node, children: node.children ?? [] })
      }
    }
    return result
  }
  return walk(nodes)
}

// 加载树数据
const loadTreeData = async () => {
  loading.value = true
  try {
    let raw: ClassStudentTreeNode[]
    if (props.examId) {
      raw = await listExamStudentTree({
        examId: props.examId,
        classIds: props.allowedClassIds.length ? [...props.allowedClassIds] : undefined,
      })
    } else if (props.practiceId) {
      raw = await getAvailableStudentTree(props.practiceId)
    } else {
      raw = await getClassStudentTree()
    }
    treeData.value = props.examId ? raw : filterTreeByClassScope(raw)

    // 设置默认展开到第一层（院系层级，展开后显示班级）
    defaultExpandedKeys.value = treeData.value
      .filter((node) => node.nodeType === ExamClassStudentTreeNodeTypeCode.DEPARTMENT)
      .map((node) => node.id)

    // 如果有初始选中的学生ID，设置选中状态
    if (props.initialSelectedStudentIds && props.initialSelectedStudentIds.length > 0) {
      checkedKeys.value = findStudentNodeKeys(props.initialSelectedStudentIds)
    }

    // 计算禁用的节点（已被其他规则选中的学生）
    calculateDisabledKeys()
  } catch (error) {
    showUserError(error, '班级学生名单加载失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 监听抽屉打开，加载数据
watch(visible, async (newVal) => {
  if (newVal) {
    await loadTreeData()
    // 加载完成后，根据最新的 initialSelectedStudentIds 设置选中状态
    if (props.initialSelectedStudentIds && props.initialSelectedStudentIds.length > 0) {
      checkedKeys.value = findStudentNodeKeys(props.initialSelectedStudentIds)
    } else {
      checkedKeys.value = []
    }
  } else {
    // 关闭时只清空搜索，不清空选择（保留状态以便下次打开）
    searchKey.value = ''
  }
})

// 监听排除列表变化，动态更新禁用节点
watch(
  () => props.excludedStudentIds,
  () => {
    if (treeData.value.length > 0) {
      calculateDisabledKeys()
    }
  },
  { deep: true },
)

// 监听初始选中的学生ID变化，动态更新选中状态
watch(
  () => props.initialSelectedStudentIds,
  (newIds) => {
    // 只有在抽屉打开且树数据已加载时才更新
    if (visible.value && treeData.value.length > 0) {
      if (newIds && newIds.length > 0) {
        checkedKeys.value = findStudentNodeKeys(newIds)
      } else {
        checkedKeys.value = []
      }
    }
  },
  { deep: true, immediate: false },
)

/**
 * 处理树节点选中事件
 * ant-design-vue Tree @check 事件标准签名：check-strictly=false 时 checked 为 Key[]
 *
 * @param checked 选中的 keys（数组或含 halfChecked 的对象）
 * @param _info 选中事件附加信息
 */
const handleCheck = (
  checked: (string | number)[] | { checked: (string | number)[], halfChecked: (string | number)[] },
  _info: CheckInfo,
) => {
  // 提取 keys 数组（兼容 check-strictly 模式下的对象格式）
  const rawKeys = Array.isArray(checked) ? checked.map(String) : checked.checked.map(String)

  // 过滤掉无效的 keys 和被禁用的 keys
  const validKeys = rawKeys.filter((key) => key).filter((key) => !disabledKeys.value.includes(key))

  // 如果正在搜索，需要合并之前的选中状态
  if (searchKey.value) {
    // 获取当前过滤后树中所有节点的 keys
    const filteredKeys = new Set<string>()
    const collectKeys = (nodes: ClassStudentTreeNode[]) => {
      nodes.forEach((node) => {
        if (node.id) {
          filteredKeys.add(node.id)
        }
        if (node.children) {
          collectKeys(node.children)
        }
      })
    }
    collectKeys(filteredTreeData.value)

    // 保留不在当前过滤树中的已选中节点
    const preservedKeys = checkedKeys.value.filter((key) => key && !filteredKeys.has(key))

    // 合并：保留的 + 新选中的，再次过滤禁用节点
    checkedKeys.value = [...new Set([...preservedKeys, ...validKeys])]
      .filter(Boolean)
      .filter((key) => !disabledKeys.value.includes(key))
  } else {
    // 没有搜索时，直接更新（已经过滤了禁用节点）
    checkedKeys.value = validKeys
  }
}

// 处理搜索
const handleSearch = () => {
  // 搜索逻辑由 filteredTreeData computed 自动处理
}

// 处理节点点击
const handleNodeClick = () => {
  // 可选：处理节点单击事件
}

// 处理标题点击
const handleTitleClick = () => {
  // 可选：处理标题点击事件
}

// 处理取消
const handleCancel = () => {
  visible.value = false
}

// 处理确认
const handleConfirm = () => {
  if (selectedStudents.value.length === 0) {
    message.warning('请至少选择一名学生')
    return
  }

  emit('confirm', {
    students: selectedStudents.value,
    studentsInfo: selectedStudentsInfo.value,
  })

  if (props.autoClose) {
    visible.value = false
  }
}

// 对外暴露方法（可选，用于父组件手动控制）
defineExpose({
  setCheckedKeys: (keys: string[]) => {
    checkedKeys.value = keys
  },
  getCheckedKeys: () => checkedKeys.value,
  loadData: loadTreeData,
})
</script>

<style lang="scss" scoped>
.tree-selector-container {
  .selector-left-panel {
    border-right: 1px solid var(--ant-color-border);
    padding-right: 16px;
    overflow-y: auto;
  }

  .selector-right-panel {
    padding-left: 0;
  }

  .search-box {
    margin-bottom: 16px;
  }

  .selection-stats {
    margin-bottom: 12px;
    font-size: 13px;
    color: var(--ant-color-text-tertiary);

    .selection-count {
      color: var(--ant-color-primary);
      font-weight: 500;
    }
  }

  .custom-tree-node {
    .icon-department {
      margin-right: 8px;
      color: var(--ant-color-primary);
    }

    .icon-class {
      margin-right: 8px;
      color: var(--ant-color-success);
    }

    .icon-student {
      margin-right: 8px;
      color: var(--ant-color-text-secondary);
    }
    display: flex;
    align-items: center;
    flex: 1;
    padding-right: 8px;

    .node-name {
      font-weight: 500;
      color: var(--ant-color-text);

      &.disabled-student {
        color: var(--ant-color-text-tertiary);
        text-decoration: line-through;
      }
    }

    .node-stats {
      margin-left: 8px;
      font-size: 12px;
      color: var(--ant-color-text-tertiary);
    }
  }

  :deep(.ant-tree-node-selected) {
    .custom-tree-node {
      .node-name {
        color: var(--ant-color-primary);
      }
    }
  }
}
</style>

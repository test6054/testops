<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { PfEligibilityRuleTreeNodeDto } from '@/apis/portfolio/indicator-types'
import {
  PF_ELIGIBILITY_AUDIT_STATUS_OPTIONS,
  PF_ELIGIBILITY_NODE_TYPE_OPTIONS,
} from '@/apis/portfolio/indicator-types'
import { computed } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'

defineOptions({ name: 'PortfolioEligibilityTreeEditor' })

const props = defineProps<{
  node: PfEligibilityRuleTreeNodeDto
  depth?: number
}>()

const emit = defineEmits<{
  'update:node': [node: PfEligibilityRuleTreeNodeDto]
  remove: []
}>()

const depth = computed(() => props.depth ?? 0)

const isLogic = computed(() => {
  const nodeType = props.node.nodeType
  return nodeType === 'AND' || nodeType === 'OR' || nodeType === 'NOT'
})

function replaceNode(next: PfEligibilityRuleTreeNodeDto) {
  emit('update:node', next)
}

function patchNode(patch: Partial<PfEligibilityRuleTreeNodeDto>) {
  replaceNode({ ...props.node, ...patch })
}

function onAuditStatusChange(auditStatus: SelectValue) {
  if (typeof auditStatus !== 'string') {
    return
  }
  patchNode({ auditStatus })
}

function addChild() {
  replaceNode({
    ...props.node,
    children: [
      ...(props.node.children ?? []),
      { nodeType: 'LEAF', fieldKey: '', expectedValue: '' },
    ],
  })
}

function removeChild(index: number) {
  const children = [...(props.node.children ?? [])]
  children.splice(index, 1)
  replaceNode({ ...props.node, children })
}

function updateChild(index: number, child: PfEligibilityRuleTreeNodeDto) {
  const children = [...(props.node.children ?? [])]
  children[index] = child
  replaceNode({ ...props.node, children })
}

function onNodeTypeChange(nodeType: SelectValue) {
  if (typeof nodeType !== 'string') {
    return
  }
  if (nodeType === 'AND' || nodeType === 'OR' || nodeType === 'NOT') {
    const children = props.node.children?.length
      ? [...props.node.children]
      : [{ nodeType: 'LEAF', fieldKey: '', expectedValue: '' }]
    replaceNode({
      nodeType,
      children,
      fieldKey: undefined,
      expectedValue: undefined,
      auditStatus: undefined,
    })
    return
  }
  if (nodeType === 'AUDIT_GATE') {
    replaceNode({
      ...props.node,
      nodeType,
      children: undefined,
      auditStatus: props.node.auditStatus ?? 'PENDING',
    })
    return
  }
  replaceNode({
    ...props.node,
    nodeType,
    children: undefined,
  })
}
</script>

<template>
  <div class="tree-node" :style="{ marginLeft: `${depth * 12}px` }">
    <div class="tree-row">
      <a-select
        :value="node.nodeType"
        :options="PF_ELIGIBILITY_NODE_TYPE_OPTIONS"
        style="width: 120px"
        @update:value="onNodeTypeChange"
      />
      <template v-if="node.nodeType === 'LEAF'">
        <a-input
          :value="node.fieldKey"
          placeholder="fieldKey"
          style="width: 140px"
          @update:value="patchNode({ fieldKey: $event })"
        />
        <a-input
          :value="node.expectedValue"
          placeholder="expectedValue"
          style="width: 120px"
          @update:value="patchNode({ expectedValue: $event })"
        />
      </template>
      <template v-else-if="node.nodeType === 'AUDIT_GATE'">
        <a-input
          :value="node.fieldKey"
          placeholder="fieldKey"
          style="width: 140px"
          @update:value="patchNode({ fieldKey: $event })"
        />
        <a-select
          :value="node.auditStatus"
          :options="PF_ELIGIBILITY_AUDIT_STATUS_OPTIONS"
          style="width: 120px"
          @update:value="onAuditStatusChange"
        />
      </template>
      <template v-if="isLogic">
        <UiButton size="sm" @click="addChild"> 子节点 </UiButton>
      </template>
      <UiButton v-if="depth > 0" size="sm" @click="emit('remove')"> 删除 </UiButton>
    </div>
    <div v-if="isLogic && node.children?.length" class="tree-children">
      <PortfolioEligibilityTreeEditor
        v-for="(child, index) in node.children"
        :key="index"
        :node="child"
        :depth="depth + 1"
        @update:node="updateChild(index, $event)"
        @remove="removeChild(index)"
      />
    </div>
  </div>
</template>

<style scoped>
.tree-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.tree-children {
  margin-top: 4px;
}
</style>

<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { PfEligibilityRuleTreeNodeDto } from '@/apis/portfolio/indicator-types'
import { computed } from 'vue'
import {
  ALL_PF_ELIGIBILITY_AUDIT_STATUS_CODES,
  ALL_PF_ELIGIBILITY_NODE_TYPE_CODES,
  PF_ELIGIBILITY_AUDIT_STATUS_OPTIONS,
  PF_ELIGIBILITY_NODE_TYPE_OPTIONS,
  PfEligibilityAuditStatusCode,
  PfEligibilityNodeTypeCode,
} from '@/apis/portfolio/indicator-types'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'

defineOptions({ name: 'PortfolioEligibilityTreeEditor' })

const props = defineProps<{
  node: PfEligibilityRuleTreeNodeDto
  depth?: number
}>()

const emit = defineEmits<{
  'update:node': [node: PfEligibilityRuleTreeNodeDto]
  'remove': []
}>()

const depth = computed(() => props.depth ?? 0)

const isLogic = computed(() => {
  const nodeType = props.node.nodeType
  return (
    nodeType === PfEligibilityNodeTypeCode.AND
    || nodeType === PfEligibilityNodeTypeCode.OR
    || nodeType === PfEligibilityNodeTypeCode.NOT
  )
})

function replaceNode(next: PfEligibilityRuleTreeNodeDto) {
  emit('update:node', next)
}

function patchNode(patch: Partial<PfEligibilityRuleTreeNodeDto>) {
  replaceNode({ ...props.node, ...patch })
}

function patchTextField(
  key: 'fieldKey' | 'expectedValue',
  value: string | number | undefined,
) {
  patchNode({
    [key]: value == null || value === '' ? undefined : String(value),
  })
}

function resolveNodeType(value: SelectValue): PfEligibilityNodeTypeCode | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  return ALL_PF_ELIGIBILITY_NODE_TYPE_CODES.find((code) => code === value)
}

function resolveAuditStatus(value: SelectValue): PfEligibilityAuditStatusCode | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  return ALL_PF_ELIGIBILITY_AUDIT_STATUS_CODES.find((code) => code === value)
}

function onAuditStatusChange(auditStatus: SelectValue) {
  const nextStatus = resolveAuditStatus(auditStatus)
  if (!nextStatus) {
    return
  }
  patchNode({ auditStatus: nextStatus })
}

function addChild() {
  replaceNode({
    ...props.node,
    children: [
      ...(props.node.children ?? []),
      { nodeType: PfEligibilityNodeTypeCode.LEAF, fieldKey: '', expectedValue: '' },
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
  const nextType = resolveNodeType(nodeType)
  if (!nextType) {
    return
  }
  if (
    nextType === PfEligibilityNodeTypeCode.AND
    || nextType === PfEligibilityNodeTypeCode.OR
    || nextType === PfEligibilityNodeTypeCode.NOT
  ) {
    const children = props.node.children?.length
      ? [...props.node.children]
      : [{ nodeType: PfEligibilityNodeTypeCode.LEAF, fieldKey: '', expectedValue: '' }]
    replaceNode({
      nodeType: nextType,
      children,
      fieldKey: undefined,
      expectedValue: undefined,
      auditStatus: undefined,
    })
    return
  }
  if (nextType === PfEligibilityNodeTypeCode.AUDIT_GATE) {
    replaceNode({
      ...props.node,
      nodeType: nextType,
      children: undefined,
      auditStatus: props.node.auditStatus ?? PfEligibilityAuditStatusCode.PENDING,
    })
    return
  }
  replaceNode({
    ...props.node,
    nodeType: nextType,
    children: undefined,
  })
}
</script>

<template>
  <div class="tree-node" :style="{ marginLeft: `${depth * 12}px` }">
    <div class="tree-row">
      <UiSelect
        size="sm"
        :model-value="node.nodeType"
        :options="PF_ELIGIBILITY_NODE_TYPE_OPTIONS"
        style="width: 120px"
        @update:model-value="onNodeTypeChange"
      />
      <template v-if="node.nodeType === PfEligibilityNodeTypeCode.LEAF">
        <UiInput
          size="sm"
          :value="node.fieldKey"
          placeholder="字段键"
          style="width: 140px"
          @update:value="patchTextField('fieldKey', $event)"
        />
        <UiInput
          size="sm"
          :value="node.expectedValue"
          placeholder="期望值"
          style="width: 120px"
          @update:value="patchTextField('expectedValue', $event)"
        />
      </template>
      <template v-else-if="node.nodeType === PfEligibilityNodeTypeCode.AUDIT_GATE">
        <UiInput
          size="sm"
          :value="node.fieldKey"
          placeholder="字段键"
          style="width: 140px"
          @update:value="patchTextField('fieldKey', $event)"
        />
        <UiSelect
          size="sm"
          :model-value="node.auditStatus"
          :options="PF_ELIGIBILITY_AUDIT_STATUS_OPTIONS"
          style="width: 120px"
          @update:model-value="onAuditStatusChange"
        />
      </template>
      <template v-if="isLogic">
        <UiButton size="sm" @click="addChild"> 子节点 </UiButton>
      </template>
      <UiButton size="sm" v-if="depth > 0" @click="emit('remove')"> 删除 </UiButton>
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

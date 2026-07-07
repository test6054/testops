<script setup lang="ts">
import type { ExamLayoutBlockDto, ExamLayoutDocument } from '@/apis/mark/exam-layout-design'
import { computed } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import { ExamLayoutBlockTypeCode } from '@/types/enums/exam-layout-block-type-enum'
import { ExamLayoutEntryKindCode } from '@/types/enums/exam-layout-entry-kind-enum'
import { createDefaultBlock, hasIdentityBlock } from '@/utils/exam-layout-designer'

const props = withDefaults(
  defineProps<{
    document: ExamLayoutDocument | null
    detecting: boolean
    readonly?: boolean
  }>(),
  { readonly: false },
)

const emit = defineEmits<{
  'add-identity-block': [block: ExamLayoutBlockDto]
  'focus-layers': []
}>()

const visible = computed(
  () => props.document?.layoutEntryKind === ExamLayoutEntryKindCode.SOURCE_FILE
    && !props.detecting
    && Boolean(props.document)
    && !hasIdentityBlock(props.document),
)

function handleAddStudentNoBlock(): void {
  if (!props.document || props.readonly) {
    return
  }
  const maxLayer = props.document.blocks.reduce((max, block) => Math.max(max, block.layer ?? 0), 0)
  const block = createDefaultBlock(1, ExamLayoutBlockTypeCode.IDENTITY_BUBBLE, maxLayer + 1)
  emit('add-identity-block', block)
}
</script>

<template>
  <UiAlertStrip
    v-if="visible"
    tone="warning"
    :closable="false"
    dense
    title="尚未配置身份填涂区"
    description="识别草稿已保存。扫描阅卷前须在第 1 页框选学号/班级等身份填涂区，保存制卷时一并校验。"
    class="layout-identity-setup-strip"
  >
    <template #actions>
      <UiButton size="sm" variant="primary" :disabled="readonly" @click="handleAddStudentNoBlock">
        在第 1 页添加学号填涂区
      </UiButton>
      <UiButton size="sm" variant="outline" :disabled="readonly" @click="emit('focus-layers')">
        打开识别图层
      </UiButton>
    </template>
  </UiAlertStrip>
</template>

<style scoped lang="scss">
.layout-identity-setup-strip {
  margin-bottom: 8px;
}
</style>

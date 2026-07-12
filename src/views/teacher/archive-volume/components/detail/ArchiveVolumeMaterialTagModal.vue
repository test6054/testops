<template>
  <UiDrawer
    :open="open"
    title="编辑材料标签"
    :width="520"
    ok-text="保存"
    :confirm-loading="saving"
    :hide-footer="false"
    @update:open="emit('update:open', $event)"
    @close="emit('update:open', false)"
    @confirm="handleSave"
  >
    <p v-if="fileName" class="archive-material-tag-modal__hint">材料：{{ fileName }}</p>
    <a-form layout="vertical">
      <a-form-item label="自由标签" tooltip="回车或逗号分隔；最多 32 个，单个不超过 64 字">
        <ArchiveMaterialTagSelect v-model="tagValues" />
      </a-form-item>
    </a-form>
  </UiDrawer>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue'
import { ref, watch } from 'vue'
import { updateArchiveVolumeMaterialTags } from '@/apis/mark/archive-volume'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import { normalizeMaterialTagsForUpdate } from '@/utils/archive-material-tag'
import { showUserError } from '@/utils/error-handler'
import ArchiveMaterialTagSelect from '@/views/teacher/archive-volume/components/ArchiveMaterialTagSelect.vue'

defineOptions({ name: 'ArchiveVolumeMaterialTagModal' })

const props = defineProps<{
  open: boolean
  materialId?: string
  fileName?: string
  initialTags?: string[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  "success": []
}>()

const saving = ref(false)
const tagValues = ref<string[]>([])

watch(
  () => ({ initialTags: props.initialTags, open: props.open }),
  (tagState) => {
    if (tagState.open) {
      tagValues.value = [...(tagState.initialTags ?? [])]
    }
  },
  { immediate: true },
)

async function handleSave() {
  if (!props.materialId) {
    message.warning('材料 ID 缺失')
    return
  }
  const tags = normalizeMaterialTagsForUpdate(tagValues.value)
  if (tags === null) {
    return
  }
  saving.value = true
  try {
    await updateArchiveVolumeMaterialTags({ materialId: props.materialId, tags })
    message.success('材料标签已更新')
    emit('update:open', false)
    emit('success')
  } catch (error) {
    showUserError(error, '保存材料标签失败')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.archive-material-tag-modal__hint {
  margin: 0 0 var(--dp-space-3);
  font-size: 13px;
  color: var(--dp-text-secondary);
}
</style>

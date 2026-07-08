<script setup lang="ts">
import type { ArchiveVolumeMemberDisplayVO } from '@/apis/mark/archive-volume'
import { computed } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import { ArchiveVolumeMemberRoleCode } from '@/types/enums/archive-volume-member-role-enum'

const props = defineProps<{
  collaborators: ArchiveVolumeMemberDisplayVO[]
  canManage: boolean
}>()

const emit = defineEmits<{
  manage: []
}>()

const organizers = computed(() =>
  props.collaborators.filter((m) => m.memberRole === ArchiveVolumeMemberRoleCode.ORGANIZER),
)
const scanOperators = computed(() =>
  props.collaborators.filter((m) => m.memberRole === ArchiveVolumeMemberRoleCode.SCAN_OPERATOR),
)
const submitters = computed(() =>
  props.collaborators.filter((m) => m.memberRole === ArchiveVolumeMemberRoleCode.SUBMITTER),
)
const catalogEditors = computed(() =>
  props.collaborators.filter((m) => m.memberRole === ArchiveVolumeMemberRoleCode.CATALOG_EDITOR),
)

const viewers = computed(() =>
  props.collaborators.filter((m) => m.memberRole === ArchiveVolumeMemberRoleCode.VIEWER),
)

function joinNames(items: ArchiveVolumeMemberDisplayVO[]) {
  return items
    .map((i) => i.userName || (i.userId ? `用户${i.userId}` : ''))
    .filter(Boolean)
    .join('、')
}
</script>

<template>
  <div v-if="collaborators.length" class="collab-strip">
    <span v-if="organizers.length">归档责任人：{{ joinNames(organizers) }}</span>
    <span v-if="scanOperators.length"> · 协作老师：{{ joinNames(scanOperators) }}</span>
    <span v-if="catalogEditors.length"> · 编目老师：{{ joinNames(catalogEditors) }}</span>
    <span v-if="submitters.length"> · 提交老师：{{ joinNames(submitters) }}</span>
    <span v-if="viewers.length"> · 只读：{{ joinNames(viewers) }}</span>
    <UiButton
      v-if="canManage"
      size="sm"
      variant="ghost"
      class="collab-strip__manage"
      @click="emit('manage')"
    >
      管理协作老师
    </UiButton>
  </div>
</template>

<style scoped lang="scss">
.collab-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--dp-text-secondary);
  margin-bottom: 8px;
}
.collab-strip__manage {
  margin-left: 4px;
}
</style>

<script setup lang="ts">
// MVR-946：模板 canManage* 显隐/禁用仅认 === true
import type { ArchiveVolumeMemberDisplayVO } from '@/apis/mark/archive-volume'
import { computed } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import { ArchiveVolumeMemberRoleCode } from '@/types/enums/archive-volume-member-role-enum'

const props = withDefaults(
  defineProps<{

  collaborators: ArchiveVolumeMemberDisplayVO[]
  canManage?: boolean
}>(),
  {
  canManage: false,
  },
)

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
  <span v-if="collaborators.length" class="collab-strip">
    <span v-if="organizers.length">归档责任人 {{ joinNames(organizers) }}</span>
    <span v-if="scanOperators.length"> · 协作 {{ joinNames(scanOperators) }}</span>
    <span v-if="catalogEditors.length"> · 编目 {{ joinNames(catalogEditors) }}</span>
    <span v-if="submitters.length"> · 提交 {{ joinNames(submitters) }}</span>
    <span v-if="viewers.length"> · 只读 {{ joinNames(viewers) }}</span>
    <UiButton
      v-if="canManage === true"
      size="sm"
      variant="ghost"
      class="collab-strip__manage"
      @click="emit('manage')"
    >
      管理
    </UiButton>
  </span>
</template>

<style scoped lang="scss">
.collab-strip {
  display: inline;
  font-size: inherit;
  color: inherit;
  margin: 0;
}
.collab-strip__manage {
  margin-left: 4px;
  vertical-align: baseline;
  height: auto;
  padding-inline: 4px;
}
</style>

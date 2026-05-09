<template>
  <div class="student-info-cell">
    <GiCellAvatar
      :name="props.name"
      :avatar-url="resolvedAvatarUrl"
      :size="props.avatarSize"
      :show-name="false"
    />
    <div class="student-info-cell__content">
      <div class="student-info-cell__name">{{ props.name }}</div>
      <div v-if="props.showSubText && props.subText" class="student-info-cell__sub">
        {{ props.subText }}
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
/**
 * 学生信息单元格组件
 * 用于表格中显示学生头像、姓名、副文本（学号/班级）的统一组件
 * 布局：头像紧贴姓名，整体在单元格内居中显示
 */
import { computed } from 'vue'
import { normalizeAvatarUrl } from '@/components/GiCell/avatarContract'
import GiCellAvatar from '@/components/GiCell/GiCellAvatar.vue'

defineOptions({ name: 'StudentInfoCell' })

const props = withDefaults(defineProps<Props>(), {
  avatarUrl: '',
  subText: '',
  avatarSize: 32,
  showSubText: true,
})

const resolvedAvatarUrl = computed(() => normalizeAvatarUrl(props.avatarUrl))

interface Props {
  /** 学生姓名 */
  name: string
  /** 学生头像URL（可选） */
  avatarUrl?: string
  /** 副文本（学号/班级等） */
  subText?: string
  /** 头像大小，默认32 */
  avatarSize?: number
  /** 是否显示副文本，默认true */
  showSubText?: boolean
}
</script>

<style lang="scss" scoped>
.student-info-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  width: fit-content;
  margin: 0 auto;

  &__content {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    text-align: left;
  }

  &__name {
    font-size: 14px;
    font-weight: 500;
    color: var(--ant-color-text);
    line-height: 1.5;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__sub {
    font-size: 13px;
    color: var(--ant-color-text-tertiary);
    line-height: 1.4;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>

<template>
  <div class="gi-cell-avatar">
    <!-- 头像部分：复用原 Avatar 组件的完整逻辑 -->
    <div class="avatar-wrapper" :class="{ 'has-trigger': props.trigger }">
      <!-- 有头像URL且未加载失败时显示图片头像 -->
      <a-avatar
        v-if="hasImageAvatar && !imageLoadFailed"
        :size="avatarSize"
        :src="imageAvatarSrc"
        :alt="props.alt"
        @error="handleAvatarError"
      />
      <!-- 兜底：显示文字头像 -->
      <a-avatar v-else :size="avatarSize" :style="fallbackAvatarStyle">
        <span v-if="props.name" class="avatar-text">{{ avatarName }}</span>
        <span v-else class="avatar-text">{{ props.text || '?' }}</span>
      </a-avatar>
      <!-- 触发器覆盖层（用于头像上传场景） -->
      <div v-if="props.trigger" class="avatar-trigger-overlay">
        <slot name="trigger-icon"></slot>
      </div>
    </div>

    <!-- 姓名和副文本部分 -->
    <div v-if="props.showName || props.subText" class="gi-cell-avatar__content">
      <template v-if="props.showName">
        <a-typography-link v-if="props.isLink" class="gi-cell-avatar__name" @click="emit('click')">
          {{ props.name }}
        </a-typography-link>
        <div v-else class="gi-cell-avatar__name">
          {{ props.name }}
        </div>
      </template>
      <div v-if="props.subText" class="gi-cell-avatar__sub">
        {{ props.subText }}
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { OnlyEn } from '@/utils/regexp'
import { isAvatarUrl, normalizeAvatarUrl } from './avatarContract'

defineOptions({ name: 'GiCellAvatar' })

const props = withDefaults(defineProps<Props>(), {
  avatarUrl: '',
  name: '',
  text: '',
  subText: '',
  size: 32, // 统一默认大小为 32px
  alt: 'avatar',
  trigger: false,
  isLink: false,
  showName: true,
})

const emit = defineEmits<{
  (e: 'click'): void
}>()

// 图片加载状态
const imageLoadFailed = ref(false)

interface Props {
  avatarUrl?: string
  name?: string
  text?: string // 用于显示纯文本头像
  subText?: string // 副文本（如学号）
  size?: string | number // 头像大小
  alt?: string // 图片alt属性
  trigger?: boolean // 是否显示上传触发器（用于头像上传场景）
  isLink?: boolean
  showName?: boolean
}

/**
 * 中文复姓列表（常见的二字复姓）
 */
const COMPOUND_SURNAMES = [
  '欧阳',
  '太史',
  '端木',
  '上官',
  '司马',
  '东方',
  '独孤',
  '南宫',
  '万俟',
  '闻人',
  '夏侯',
  '诸葛',
  '尉迟',
  '公羊',
  '赫连',
  '澹台',
  '皇甫',
  '宗政',
  '濮阳',
  '公冶',
  '太叔',
  '申屠',
  '公孙',
  '慕容',
  '仲孙',
  '钟离',
  '长孙',
  '宇文',
  '司徒',
  '鲜于',
  '司空',
  '闾丘',
  '子车',
  '亓官',
  '司寇',
  '巫马',
  '公西',
  '颛孙',
  '壤驷',
  '公良',
  '漆雕',
  '乐正',
  '宰父',
  '谷梁',
  '拓跋',
  '夹谷',
  '轩辕',
  '令狐',
  '段干',
  '百里',
  '呼延',
  '东郭',
  '南门',
  '羊舌',
  '微生',
  '公户',
  '公玉',
  '公仪',
  '梁丘',
  '公仲',
  '公上',
  '公门',
  '公山',
  '公坚',
  '左丘',
  '公伯',
  '西门',
  '公祖',
  '第五',
  '公乘',
  '贯丘',
  '公皙',
  '南荣',
  '东里',
  '东宫',
  '仲长',
  '子书',
  '子桑',
  '即墨',
  '达奚',
  '褚师',
  '吴铭',
  '纳兰',
  '卧龙',
]

/**
 * 头像姓名提取逻辑
 * 规则：
 * 1. 英文姓名：John => J, John Smith => JS
 * 2. 中文姓名：默认显示姓氏（第1个字）
 * 3. 复姓：诸葛亮 => 诸葛，上官婉儿 => 上官
 */
const avatarName = computed(() => {
  let name = props.name || props.text
  if (!name) return '?'

  // 处理空字符串和纯空格
  name = name.trim()
  if (!name) return '?'

  // 英文姓名处理：如果包含空格，取各部分首字母
  if (name[0].match(OnlyEn)) {
    const nameArr = name.split(' ').filter((part) => part.length > 0)
    if (nameArr.length > 1) {
      // 多个单词：取前两个单词的首字母
      return `${nameArr[0][0]}${nameArr[1][0]}`.toUpperCase()
    }
    // 单个单词：取第一个字符
    return name.substring(0, 1).toUpperCase()
  }

  // 中文姓名处理
  const nameLength = name.length

  // 单字名：直接返回
  if (nameLength === 1) {
    return name
  }

  // 检查是否为复姓（两字及以上）
  if (nameLength >= 2) {
    const firstTwoChars = name.substring(0, 2)
    if (COMPOUND_SURNAMES.includes(firstTwoChars)) {
      // 复姓：返回复姓（前两字）
      return firstTwoChars
    }
  }

  // 非复姓：返回第一个字（姓氏）
  return name.substring(0, 1)
})

const imageAvatarSrc = computed(() => normalizeAvatarUrl(props.avatarUrl) || '')

const hasImageAvatar = computed(() => isAvatarUrl(imageAvatarSrc.value))

/**
 * 统一头像背景色 - 使用浅蓝色方案
 * 确保全站视觉统一
 */
const avatarColor = computed(() => {
  return 'color-mix(in srgb, var(--ant-color-primary) 16%, var(--ant-color-bg-container))'
})

/**
 * a-avatar 的 size prop 只接受 `number | 'small' | 'large' | 'default' | ScreenSizeMap`，
 * 这里 props.size 允许 string | number（兼容历史调用方传 '40' 这类字符串）。
 * 统一在此规范化为 number，并允许 'small' / 'large' / 'default' 字面值直通。
 */
type AntAvatarSize = number | 'small' | 'large' | 'default'

const avatarSize = computed<AntAvatarSize>(() => {
  if (typeof props.size === 'number') return props.size
  if (props.size === 'small' || props.size === 'large' || props.size === 'default') {
    return props.size
  }
  const parsed = Number.parseInt(props.size, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 32
})

// 根据头像大小计算合适的字体大小
const avatarFontSize = computed(() => {
  const size = typeof avatarSize.value === 'number' ? avatarSize.value : 32
  // 字体大小约为头像大小的50%，确保文字在圆形区域内美观显示
  return `${Math.max(13, Math.floor(size * 0.5))}px`
})

const fallbackAvatarStyle = computed(() => ({
  backgroundColor: avatarColor.value,
  color: 'var(--ant-color-primary)',
  fontWeight: '700',
  fontSize: avatarFontSize.value,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}))

// 图片加载事件处理（Ant Design Vue Avatar 的 error 事件返回 true 阻止默认回退）
const handleAvatarError = () => {
  imageLoadFailed.value = true
  return true
}

// 监听头像URL变化，重置加载失败状态
watch(
  () => props.avatarUrl,
  (newSrc, oldSrc) => {
    if (newSrc !== oldSrc) {
      imageLoadFailed.value = false
    }
  },
)
</script>

<style lang="scss" scoped>
.gi-cell-avatar {
  display: flex;
  align-items: center;
  gap: 12px;

  &__content {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0; // 允许文本溢出省略
  }

  &__name {
    font-size: 14px;
    font-weight: 500;
    color: var(--ant-color-text);
    line-height: 1.5;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__sub {
    font-size: 12px;
    color: var(--ant-color-text-tertiary);
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

// 头像文本样式
.avatar-text {
  font-family: var(--font-family-base);
  line-height: 1;
  letter-spacing: 0.5px;
  user-select: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

// 确保 Ant Design 的 Avatar 组件内容居中
:deep(.ant-avatar) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;

  .ant-avatar-string {
    line-height: 1 !important;
  }
}

// 头像触发器覆盖层（用于上传场景）
.avatar-wrapper {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;

  &.has-trigger {
    cursor: pointer;

    .avatar-trigger-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--ant-color-text) 40%, transparent);
      border-radius: var(--dp-radius-full);
      opacity: 0;
      transition: opacity 0.2s;
      color: var(--ant-color-bg-container);
      font-size: 16px;
    }

    &:hover .avatar-trigger-overlay {
      opacity: 1;
    }
  }
}
</style>

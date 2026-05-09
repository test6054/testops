<!--
  权限守卫组件
  用于包装需要权限控制的内容
-->
<template>
  <div class="permission-guard-wrapper">
    <div v-if="hasPermission" class="permission-guard">
      <slot />
    </div>
    <div v-else-if="showFallback" class="permission-denied">
      <a-result :sub-title="fallbackMessage" :title="fallbackTitle" status="403">
        <template #extra>
          <a-space>
            <a-button @click="handleGoBack"> 返回 </a-button>
            <a-button type="primary" @click="handleContactAdmin"> 联系管理员 </a-button>
          </a-space>
        </template>
      </a-result>
    </div>
  </div>
</template>

<script lang="ts" setup>
import message from 'ant-design-vue/es/message'
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { usePermission } from '@/composables/usePermission'

defineOptions({ name: 'PermissionGuard' })

const props = withDefaults(defineProps<Props>(), {
  roles: () => [],
  requireTenantAdmin: false,
  showFallback: true,
  fallbackTitle: '权限不足',
  fallbackMessage: '您没有权限访问此内容，请联系管理员获取相应权限。',
})

const emit = defineEmits<Emits>()

interface Props {
  /** 允许访问的角色列表 */
  roles?: string[]
  /** 是否需要租户管理员权限 */
  requireTenantAdmin?: boolean
  /** 权限检查函数 */
  checkPermission?: () => boolean
  /** 是否显示无权限时的回退内容 */
  showFallback?: boolean
  /** 回退内容标题 */
  fallbackTitle?: string
  /** 回退内容消息 */
  fallbackMessage?: string
}

interface Emits {
  (e: 'permission-granted'): void

  (e: 'permission-denied'): void
}

const router = useRouter()
const permission = usePermission()

// 权限检查
const hasPermission = computed(() => {
  const isAuthenticated = permission.isAuthenticated.value

  // 如果用户未认证，直接返回false
  if (!isAuthenticated) {
    return false
  }

  // 如果提供了自定义权限检查函数，优先使用
  if (props.checkPermission) {
    return props.checkPermission()
  }

  // 如果没有指定角色要求，默认允许访问
  if (props.roles.length === 0 && !props.requireTenantAdmin) {
    return true
  }

  // 检查角色权限
  let hasRolePermission = true
  if (props.roles.length > 0) {
    hasRolePermission = permission.checkAnyRole(props.roles)
  }

  // 检查租户管理员权限
  let hasTenantAdminPermission = true
  if (props.requireTenantAdmin) {
    hasTenantAdminPermission = permission.checkTenantManagement()
  }

  return hasRolePermission && hasTenantAdminPermission
})

// 监听权限变化，触发相应事件
watch(
  hasPermission,
  (granted) => {
    if (granted) {
      emit('permission-granted')
    } else {
      emit('permission-denied')
    }
  },
  { immediate: true },
)

// 处理返回
const handleGoBack = () => {
  if (window.history.length > 1) {
    router.go(-1)
  } else {
    router.push('/')
  }
}

// 处理联系管理员
const handleContactAdmin = () => {
  message.info('请联系系统管理员获取权限')
}
</script>

<style scoped>
.permission-guard-wrapper {
  /* 外层包装器，确保DOM结构稳定 */
  position: relative;
}

.permission-guard {
  /* 组件根容器，继承父容器样式 */
  position: relative;
}

.permission-denied {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 24px;
}
</style>

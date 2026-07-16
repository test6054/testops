<template>
  <div class="header-right-bar" :class="`header-right-bar--${variant}`" v-bind="$attrs">
    <div v-if="tenantDisplayInfo && variant === 'default'" class="tenant-info">
      <div class="tenant-name">{{ tenantDisplayInfo.schoolName }}</div>
      <div class="tenant-type">{{ tenantDisplayInfo.tenantTypeText }}</div>
    </div>

    <a-popover
      v-model:open="messagePopoverVisible"
      :arrow="false"
      :get-popup-container="getPopupContainer"
      :overlay-inner-style="popoverInnerStyle"
      :destroy-tooltip-on-hide="true"
      placement="bottomRight"
      trigger="click"
    >
      <button
        type="button"
        class="header-btn"
        :class="{ 'header-btn--workbench': variant === 'workbench' }"
        aria-label="消息通知"
      >
        <BellOutlined class="header-btn__icon" />
        <span v-if="unreadBadgeLabel" class="header-badge">{{ unreadBadgeLabel }}</span>
      </button>
      <template #content>
        <Message
          :variant="variant"
          @close="messagePopoverVisible = false"
          @readall-success="getMessageCount"
        />
      </template>
    </a-popover>

    <a-dropdown trigger="hover">
      <div v-if="variant === 'workbench'" class="user-chip">
        <div class="user-avatar">{{ avatarInitial }}</div>
        <span class="user-name">{{ userStore.nickname }}</span>
        <DownOutlined class="user-chevron" />
      </div>
      <div v-else class="user">
        <GiCellAvatar
          :name="userStore.nickname"
          :size="36"
          :avatar-url="userStore.avatarUrl"
          :show-name="false"
        />
        <span class="username">{{ userStore.nickname }}</span>
        <DownOutlined />
      </div>
      <template #overlay>
        <a-menu>
          <a-menu-item key="profile" @click="router.push('/profile')">
            <template #icon><UserOutlined /></template>
            <span>个人中心</span>
          </a-menu-item>
          <a-menu-item key="export" @click="openExportTaskCenter">
            <template #icon><DownloadOutlined /></template>
            <a-space>
              <span>导出任务中心</span>
              <a-badge
                v-if="exportTaskStore.runningCount > 0"
                :count="exportTaskStore.runningCount"
                :max-count="99"
                color="blue"
              />
            </a-space>
          </a-menu-item>
          <a-menu-divider />
          <a-menu-item key="logout" @click="showLogoutModal = true">
            <template #icon><LogoutOutlined /></template>
            <span>退出登录</span>
          </a-menu-item>
        </a-menu>
      </template>
    </a-dropdown>
  </div>
  <ExportTaskCenter />

  <UiConfirmModal
    v-model:open="showLogoutModal"
    type="warning"
    title="退出登录"
    content="确定要退出当前账号吗？"
    ok-text="确认退出"
    cancel-text="取消"
    :confirm-loading="logoutLoading"
    @ok="handleLogout"
  />
</template>

<script lang="ts" setup>
import BellOutlined from '@ant-design/icons-vue/BellOutlined'
import DownloadOutlined from '@ant-design/icons-vue/DownloadOutlined'
import DownOutlined from '@ant-design/icons-vue/DownOutlined'
import LogoutOutlined from '@ant-design/icons-vue/LogoutOutlined'
import UserOutlined from '@ant-design/icons-vue/UserOutlined'
import { storeToRefs } from 'pinia'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import ExportTaskCenter from '@/components/export/ExportTaskCenter.vue'
import GiCellAvatar from '@/components/GiCell/GiCellAvatar.vue'
import UiConfirmModal from '@/components/ui-guide/ui/ConfirmModal.vue'
import { useAuthStore, useUserStore } from '@/stores'
import { useExportTaskStore } from '@/stores/exportTask'
import { useNotificationStore } from '@/stores/modules/notification'
import mittBus from '@/utils/mitt'
import Message from './Message.vue'

defineOptions({ name: 'HeaderRight', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** default：主布局（含租户信息）；workbench：考试/归档工作台顶栏，对齐 exam-prototype */
    variant?: 'default' | 'workbench'
  }>(),
  {
    variant: 'default',
  },
)

const messagePopoverVisible = ref(false)

const getPopupContainer = () => document.body

const popoverInnerStyle = computed(() => ({
  padding: 0,
  minWidth: props.variant === 'workbench' ? '360px' : '320px',
}))

const notificationStore = useNotificationStore()
const { totalUnreadCount } = storeToRefs(notificationStore)

const unreadBadgeLabel = computed(() => {
  const count = totalUnreadCount.value
  if (count <= 0) return ''
  if (count > 99) return '99+'
  return String(count)
})

const avatarInitial = computed(() => {
  const name = userStore.nickname?.trim()
  return name ? name.charAt(0) : '?'
})

const getMessageCount = async () => {
  await notificationStore.loadUnreadCount()
}

const router = useRouter()
const userStore = useUserStore()
const authStore = useAuthStore()
const exportTaskStore = useExportTaskStore()

const tenantTypeMap = {
  CHUXIN: '初心版',
  XINGGUANG: '星光版',
  ZHIJIAO: '智教版',
}

const tenantDisplayInfo = computed(() => {
  const schoolName = userStore.userInfo?.schoolName
  const tenantType = userStore.userInfo?.tenantType
  if (!schoolName || !tenantType) {
    return null
  }

  return {
    schoolName,
    tenantTypeText: tenantTypeText(tenantType),
  }
})

function tenantTypeText(tenantType: string): string {
  if (tenantType === 'CHUXIN' || tenantType === 'XINGGUANG' || tenantType === 'ZHIJIAO') {
    return tenantTypeMap[tenantType]
  }
  return tenantType
}

const showLogoutModal = ref(false)
const logoutLoading = ref(false)

const handleLogout = async () => {
  logoutLoading.value = true
  try {
    await authStore.logout()
    showLogoutModal.value = false
    await router.replace('/login')
  } finally {
    logoutLoading.value = false
  }
}

const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    getMessageCount()
  }
}

onMounted(() => {
  getMessageCount()
  mittBus.on('count-refresh', getMessageCount)
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  mittBus.off('count-refresh', getMessageCount)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

const openExportTaskCenter = () => {
  exportTaskStore.openCenter()
}
</script>

<style lang="scss" scoped>
@use '@/styles/breakpoints' as bp;
.header-right-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;

  &--default {
    gap: 16px;
  }

  &--workbench {
    gap: 8px;

    .header-btn {
      width: 36px;
      height: 36px;
    }

    .header-btn__icon {
      font-size: 18px;
    }

    .header-badge {
      top: 2px;
      right: 2px;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      font-size: 9px;
      line-height: 16px;
    }

    .user-avatar {
      width: 28px;
      height: 28px;
      font-size: 12px;
    }

    .user-name {
      font-size: 13px;
    }
  }
}

.ant-dropdown-open .anticon-down,
.ant-dropdown-open .user-chevron {
  transform: rotate(180deg);
}

.tenant-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin-right: 4px;

  .tenant-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--ant-color-text);
    line-height: 1.4;
    white-space: nowrap;
  }

  .tenant-type {
    font-size: 11px;
    color: var(--ant-color-text-tertiary);
    line-height: 1.2;
    margin-top: 2px;
    white-space: nowrap;
  }
}

.header-btn {
  position: relative;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--ant-color-text-tertiary);
  cursor: pointer;
  padding: 0;
  transition:
    background 0.15s ease,
    color 0.15s ease;

  &:hover {
    background: var(--ant-color-fill-tertiary);
    color: var(--ant-color-text);
  }

  &__icon {
    font-size: 15px;
  }
}

.header-badge {
  position: absolute;
  top: 1px;
  right: 1px;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  background: var(--ant-color-primary);
  color: var(--ant-color-white);
  font-size: 8px;
  font-weight: 700;
  line-height: 14px;
  border-radius: var(--dp-radius-full);
  text-align: center;
  border: 1.5px solid var(--ant-color-bg-container);
  font-variant-numeric: tabular-nums;
  pointer-events: none;
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 10px 3px 4px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: var(--ant-color-fill-tertiary);
  }
}

.user-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--ant-color-primary-bg);
  color: var(--ant-color-primary);
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-name {
  font-size: 12.5px;
  color: var(--ant-color-text-secondary);
  font-weight: 500;
  white-space: nowrap;
}

.user-chevron {
  font-size: 10px;
  color: var(--ant-color-text-quaternary);
  transition: transform 0.3s;
}

.user {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  cursor: pointer;
  color: var(--ant-color-text);

  .username {
    margin-left: 10px;
    white-space: nowrap;
    font-size: 14px;
    font-weight: 600;
    color: var(--ant-color-text);
  }

  .anticon-down {
    transition: transform 0.3s;
    margin-left: 2px;
  }
}

@media (max-width: bp.$layout-mobile-max) {
  .tenant-info {
    display: none;
  }
}
</style>

<style lang="scss">
.ant-dropdown-menu .ant-dropdown-menu-item {
  font-weight: 500;
  color: var(--ant-color-text);
}
</style>

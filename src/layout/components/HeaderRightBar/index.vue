<template>
  <div class="header-right-bar" v-bind="$attrs">
    <a-space size="middle">
      <!-- 租户信息 -->
      <div v-if="tenantDisplayInfo" class="tenant-info">
        <div class="tenant-name">{{ tenantDisplayInfo.schoolName }}</div>
        <div class="tenant-type">{{ tenantDisplayInfo.tenantTypeText }}</div>
      </div>

      <!-- 消息通知（下拉弹窗） -->
      <a-popover
        v-model:open="messagePopoverVisible"
        :arrow="false"
        :overlay-inner-style="{ padding: 0, minWidth: '320px' }"
        :destroy-tooltip-on-hide="true"
        placement="bottomRight"
        trigger="click"
      >
        <a-badge :count="totalUnreadCount" :offset="[-2, 2]">
          <a-button type="text" class="header-icon-btn" aria-label="消息通知">
            <template #icon>
              <BellOutlined style="font-size: 20px" />
            </template>
          </a-button>
        </a-badge>
        <template #content>
          <Message @close="messagePopoverVisible = false" @readall-success="getMessageCount" />
        </template>
      </a-popover>

      <!-- 用户账户下拉菜单 -->
      <a-dropdown trigger="hover">
        <div class="user">
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
    </a-space>
  </div>
  <ExportTaskCenter />

  <!-- 退出登录确认弹窗 -->
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

// 消息弹窗状态
const messagePopoverVisible = ref(false)

// 使用统一的未读计数管理
const notificationStore = useNotificationStore()
const { totalUnreadCount } = storeToRefs(notificationStore)

// 查询未读消息数量（初始化时使用缓存，"全部已读"后强制刷新）
const getMessageCount = async () => {
  await notificationStore.loadUnreadCount()
}

const router = useRouter()
const userStore = useUserStore()
const authStore = useAuthStore()
const exportTaskStore = useExportTaskStore()

// 学校类型文本映射
const tenantTypeMap = {
  CHUXIN: '初心版',
  XINGGUANG: '星光版',
  ZHIJIAO: '智教版',
}

// 学校显示信息
const tenantDisplayInfo = computed(() => {
  const schoolName = userStore.userInfo?.schoolName
  const tenantType = userStore.userInfo?.tenantType
  if (!schoolName || !tenantType) {
    return null
  }

  return {
    schoolName,
    tenantTypeText: tenantTypeMap[tenantType as keyof typeof tenantTypeMap] || tenantType,
  }
})

// 退出登录
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

// 页面可见性变化时刷新未读计数（用户切换标签页回来后能看到最新状态）
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    getMessageCount()
  }
}

onMounted(() => {
  getMessageCount()
  // 监听消息计数刷新事件（用于公告阅读、消息已读等场景）
  mittBus.on('count-refresh', getMessageCount)
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  // 移除事件监听，避免内存泄漏
  mittBus.off('count-refresh', getMessageCount)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

const openExportTaskCenter = () => {
  exportTaskStore.openCenter()
}
</script>

<style lang="scss" scoped>
.ant-dropdown-open .anticon-down {
  transform: rotate(180deg);
}

.tenant-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin-right: 4px;
  padding: 0;

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

.header-icon-btn {
  color: var(--ant-color-text-secondary);

  &:hover {
    color: var(--ant-color-text);
    background-color: var(--ant-color-fill-tertiary);
  }
}

.header-right-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
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

// 响应式设计
@media (max-width: 768px) {
  .tenant-info {
    display: none; // 小屏幕隐藏租户信息
  }
}
</style>

<style lang="scss">
/* 用户下拉菜单选项样式（非 scoped，因为下拉菜单通过 teleport 渲染） */
.ant-dropdown-menu .ant-dropdown-menu-item {
  font-weight: 500;
  color: var(--ant-color-text);
}
</style>

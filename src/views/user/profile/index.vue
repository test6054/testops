<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="个人资料" :subtitle="userInfo.userName">
        <template #status>
          <UiTag tone="blue" size="sm">{{ roleLabel }}</UiTag>
          <UiTag v-if="tenantName" tone="gray" size="sm">{{ tenantName }}</UiTag>
        </template>
        <template #actions>
          <UiButton variant="ghost" size="sm" @click="goMessage">
            消息中心
            <UiBadge v-if="unreadTotal > 0" tone="red">{{ unreadTotal }}</UiBadge>
          </UiButton>
          <UiButton variant="outline" size="sm" :loading="refreshing" @click="refresh">
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
          <UiButton size="sm" variant="outline" status="danger" @click="handleLogout">
            <template #icon><LogoutOutlined /></template>
            退出登录
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <div class="profile-page__layout">
      <!-- 基础信息 -->
      <section class="profile-page__section">
        <UiCard class="profile-page__info-card">
          <template #title>
            <UserOutlined />
            <span>基础信息</span>
          </template>

          <div class="info-grid">
            <div class="info-grid__row">
              <span class="info-grid__label">姓名 / 昵称</span>
              <span class="info-grid__value">{{ userInfo.nickName }}</span>
            </div>
            <div class="info-grid__row">
              <span class="info-grid__label">用户名</span>
              <span class="info-grid__value">{{ userInfo.userName }}</span>
            </div>
            <div class="info-grid__row">
              <span class="info-grid__label">邮箱</span>
              <span class="info-grid__value">
                {{ userInfo.email || '未绑定' }}
                <UiTag v-if="userInfo.email" tone="green" size="sm">已绑定</UiTag>
                <UiTag v-else tone="orange" size="sm">待完善</UiTag>
              </span>
            </div>
            <div class="info-grid__row">
              <span class="info-grid__label">手机号</span>
              <span class="info-grid__value">
                {{ userInfo.mobile || '未绑定' }}
                <UiTag v-if="userInfo.mobile" tone="blue" size="sm">已绑定</UiTag>
                <UiTag v-else tone="red" size="sm">未绑定</UiTag>
              </span>
            </div>
            <div class="info-grid__row">
              <span class="info-grid__label">所属租户</span>
              <span class="info-grid__value">{{ tenantName }}</span>
            </div>
            <div class="info-grid__row">
              <span class="info-grid__label">系统角色</span>
              <span class="info-grid__value">{{ roleLabel }}</span>
            </div>
            <div v-if="userInfo.studentDetails" class="info-grid__row">
              <span class="info-grid__label">学号</span>
              <span class="info-grid__value">{{ userInfo.studentDetails.studentNumber }}</span>
            </div>
            <div v-if="userInfo.studentDetails" class="info-grid__row">
              <span class="info-grid__label">班级</span>
              <span class="info-grid__value">{{ userInfo.studentDetails.className }}</span>
            </div>
            <div v-if="userInfo.studentDetails?.enrollmentYear" class="info-grid__row">
              <span class="info-grid__label">入学年级</span>
              <span class="info-grid__value">{{ userInfo.studentDetails.enrollmentYear }} 级</span>
            </div>
            <div v-if="userInfo.teacherDetails" class="info-grid__row">
              <span class="info-grid__label">工号</span>
              <span class="info-grid__value">{{ userInfo.teacherDetails.teacherNumber }}</span>
            </div>
            <div class="info-grid__row">
              <span class="info-grid__label">账户状态</span>
              <span class="info-grid__value">
                <UiTag :tone="userStatusTone" size="sm">{{ userStatusLabel }}</UiTag>
              </span>
            </div>
            <div class="info-grid__row">
              <span class="info-grid__label">注册时间</span>
              <span class="info-grid__value">{{ formatDateTime(userInfo.createTime) }}</span>
            </div>
            <div class="info-grid__row">
              <span class="info-grid__label">最后登录</span>
              <span class="info-grid__value">{{ formatDateTime(userInfo.lastLoginTime) }}</span>
            </div>
          </div>
        </UiCard>
      </section>

      <!-- 安全设置 -->
      <section class="profile-page__section">
        <UiCard class="profile-page__security-card">
          <template #title>
            <SafetyOutlined />
            <span>账号安全</span>
          </template>

          <div class="security-list">
            <article class="security-item">
              <div class="security-item__main">
                <h4 class="security-item__title">登录密码</h4>
                <p class="security-item__desc">
                  上次修改：{{ formatDateTime(userInfo.passwordLastChangedTime) }}
                </p>
              </div>
              <UiButton size="sm" variant="outline" @click="goChangePassword"> 修改密码 </UiButton>
            </article>

            <article class="security-item">
              <div class="security-item__main">
                <h4 class="security-item__title">登录方式</h4>
                <p class="security-item__desc">
                  {{ userInfo.currentLoginProviderType || '账号密码' }}
                </p>
              </div>
              <UiTag tone="blue" size="sm">{{ userInfo.sourceFrom || '本系统' }}</UiTag>
            </article>

            <article v-if="userInfo.forcePasswordChange === true" class="security-item">
              <div class="security-item__main">
                <h4 class="security-item__title">强制修改密码</h4>
                <p class="security-item__desc">检测到管理员要求强制修改密码，请尽快前往修改。</p>
              </div>
              <UiTag tone="red" size="sm">待处理</UiTag>
            </article>
          </div>
        </UiCard>
      </section>
    </div>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import LogoutOutlined from '@ant-design/icons-vue/LogoutOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import SafetyOutlined from '@ant-design/icons-vue/SafetyOutlined'
import UserOutlined from '@ant-design/icons-vue/UserOutlined'
import message from 'ant-design-vue/es/message'
import { storeToRefs } from 'pinia'
import { computed, onActivated, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import UiBadge from '@/components/ui-guide/ui/Badge.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useAuthStore, useUserStore } from '@/stores'
import { useNotificationStore } from '@/stores/modules/notification'
import { getUserStatusLabel, getUserStatusTone } from '@/types/enums/user-status'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'

defineOptions({ name: 'UserProfile' })

const router = useRouter()
const authStore = useAuthStore()
const userStore = useUserStore()
const notificationStore = useNotificationStore()
const { totalUnreadCount } = storeToRefs(notificationStore)

const refreshing = ref(false)

const userInfo = computed(() => userStore.userInfo)
const tenantName = computed(() => userInfo.value.tenantName || userInfo.value.schoolName || '')
const displayName = computed(() => userInfo.value.nickName)
const userStatusLabel = computed(() => getUserStatusLabel(userInfo.value.status))
const userStatusTone = computed(() => getUserStatusTone(userInfo.value.status))

const roleLabel = computed(() => userInfo.value.roleDisplayName || userInfo.value.roleKey || '用户')

const isStudent = computed(() => userInfo.value.roleKey === 'SCH_STU')
const isTenantAdmin = computed(() => userInfo.value.isTenantAdmin === true)

const unreadTotal = computed(() => totalUnreadCount.value)

async function refresh() {
  refreshing.value = true
  try {
    await userStore.getInfo(true)
    await notificationStore.loadUnreadCount()
    void message.success('已刷新最新信息')
  } catch (error) {
    showUserError(error, '个人信息刷新失败')
  } finally {
    refreshing.value = false
  }
}

function goChangePassword() {
  router.push({ name: 'ChangePassword' })
}

function goMessage() {
  router.push({ name: 'Messages' })
}

function handleLogout() {
  void confirmAsync({
    title: '确认退出登录',
    content: '退出后需要重新输入账号密码登录。',
    type: 'error',
    okText: '退出',
    cancelText: '取消',
    onOk: async () => {
      await authStore.logout()
      await router.push({ name: 'Login' })
    },
  })
}

onMounted(() => {
  notificationStore.loadUnreadCount().catch((error) => {
    showUserError(error, '未读消息数加载失败')
  })
})

onActivated(() => {
  void userStore.getInfo(true).catch((error) => {
    showUserError(error, '个人信息刷新失败')
  })
  void notificationStore.loadUnreadCount().catch((error) => {
    showUserError(error, '未读消息数加载失败')
  })
})
</script>

<style lang="scss" scoped>
.profile-page__info-card,
.profile-page__security-card,
.profile-page__shortcuts-card {
  margin-top: 0;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--dp-space-component-xs) var(--dp-space-block);

  &__row {
    display: grid;
    grid-template-columns: 110px 1fr;
    align-items: center;
    gap: var(--dp-space-component);
    padding: var(--dp-space-component-tight) 0;
    border-bottom: 1px dashed var(--dp-border-subtle);
    font-size: var(--dp-font-size-sm);

    &:last-child {
      border-bottom: none;
    }
  }

  &__label {
    color: var(--dp-text-muted);
  }

  &__value {
    display: flex;
    align-items: center;
    gap: var(--dp-space-component-tight);
    color: var(--dp-text-primary);
    font-weight: 500;
  }
}

.security-list {
  display: grid;
  gap: var(--dp-space-component);
}

.security-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-component);
  padding: var(--dp-space-component) var(--dp-space-block);
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-panel);

  &__main {
    flex: 1;
    min-width: 0;
  }

  &__title {
    margin: 0 0 var(--dp-space-component-xs);
    font-size: var(--dp-font-size-md);
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__desc {
    margin: 0;
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-secondary);
  }
}

.profile-page__layout {
  display: grid;
  gap: var(--dp-space-block);
  max-width: 880px;
}
.profile-page__section {
  min-width: 0;
}
</style>









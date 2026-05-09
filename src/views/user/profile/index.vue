<template>
  <GiPageLayout>
    <div class="profile-page">
      <PageHeader :title="displayName">
        <template #tags>
          <UiTag tone="blue" size="md">{{ roleLabel }}</UiTag>
          <UiTag tone="gray" size="md">{{ userInfo.userName || '-' }}</UiTag>
          <UiTag v-if="tenantName" tone="gray" size="md">{{ tenantName }}</UiTag>
        </template>
        <template #actions>
          <UiButton variant="outline" size="sm" :loading="refreshing" @click="refresh">
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
          <UiButton size="sm" status="danger" @click="handleLogout">
            <template #icon><LogoutOutlined /></template>
            退出登录
          </UiButton>
        </template>
      </PageHeader>

      <a-row :gutter="16">
        <!-- 基础信息 -->
        <a-col :xs="24" :lg="14">
          <UiCard class="profile-page__info-card">
            <template #title>
              <UserOutlined />
              <span>基础信息</span>
            </template>

            <div class="info-grid">
              <div class="info-grid__row">
                <span class="info-grid__label">姓名 / 昵称</span>
                <span class="info-grid__value">{{ userInfo.nickName || '-' }}</span>
              </div>
              <div class="info-grid__row">
                <span class="info-grid__label">用户名</span>
                <span class="info-grid__value">{{ userInfo.userName || '-' }}</span>
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
                <span class="info-grid__value">{{ tenantName || '-' }}</span>
              </div>
              <div class="info-grid__row">
                <span class="info-grid__label">系统角色</span>
                <span class="info-grid__value">{{ roleLabel }}</span>
              </div>
              <div v-if="userInfo.studentDetails" class="info-grid__row">
                <span class="info-grid__label">学号</span>
                <span class="info-grid__value">{{ userInfo.studentDetails.studentNo || '-' }}</span>
              </div>
              <div v-if="userInfo.studentDetails" class="info-grid__row">
                <span class="info-grid__label">班级</span>
                <span class="info-grid__value">{{ userInfo.studentDetails.className || '-' }}</span>
              </div>
              <div v-if="userInfo.studentDetails?.enrollmentYear" class="info-grid__row">
                <span class="info-grid__label">入学年级</span>
                <span class="info-grid__value">{{ userInfo.studentDetails.enrollmentYear }} 级</span>
              </div>
              <div v-if="userInfo.teacherDetails" class="info-grid__row">
                <span class="info-grid__label">工号</span>
                <span class="info-grid__value">{{ userInfo.teacherDetails.workNo || '-' }}</span>
              </div>
              <div class="info-grid__row">
                <span class="info-grid__label">账户状态</span>
                <span class="info-grid__value">
                  <UiTag :tone="userInfo.status === 'active' ? 'green' : 'red'" size="sm">
                    {{ userInfo.status === 'active' ? '正常' : userInfo.status || '-' }}
                  </UiTag>
                </span>
              </div>
              <div class="info-grid__row">
                <span class="info-grid__label">注册时间</span>
                <span class="info-grid__value">{{ formatTime(userInfo.createTime) }}</span>
              </div>
              <div class="info-grid__row">
                <span class="info-grid__label">最后登录</span>
                <span class="info-grid__value">{{ formatTime(userInfo.lastLoginTime) }}</span>
              </div>
            </div>
          </UiCard>
        </a-col>

        <!-- 安全设置 + 入口 -->
        <a-col :xs="24" :lg="10">
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
                    上次修改：{{ formatTime(userInfo.passwordLastChangedTime) }}
                  </p>
                </div>
                <UiButton size="sm" variant="outline" @click="goChangePassword">
                  修改密码
                </UiButton>
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

              <article v-if="userInfo.forcePasswordChange" class="security-item">
                <div class="security-item__main">
                  <h4 class="security-item__title">强制修改密码</h4>
                  <p class="security-item__desc">检测到管理员要求强制修改密码，请尽快前往修改。</p>
                </div>
                <UiTag tone="red" size="sm">待处理</UiTag>
              </article>
            </div>
          </UiCard>

          <UiCard class="profile-page__shortcuts-card">
            <template #title>
              <AppstoreOutlined />
              <span>常用入口</span>
            </template>

            <div class="shortcut-list">
              <button type="button" class="shortcut-btn" @click="goMessage">
                <BellOutlined />
                <span>消息中心</span>
                <UiBadge v-if="unreadTotal > 0" tone="red">{{ unreadTotal }}</UiBadge>
              </button>
              <button type="button" class="shortcut-btn" @click="goHome">
                <HomeOutlined />
                <span>返回首页</span>
              </button>
            </div>
          </UiCard>
        </a-col>
      </a-row>
    </div>
  </GiPageLayout>
</template>

<script lang="ts" setup>
import AppstoreOutlined from '@ant-design/icons-vue/AppstoreOutlined'
import BellOutlined from '@ant-design/icons-vue/BellOutlined'
import HomeOutlined from '@ant-design/icons-vue/HomeOutlined'
import LogoutOutlined from '@ant-design/icons-vue/LogoutOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import SafetyOutlined from '@ant-design/icons-vue/SafetyOutlined'
import UserOutlined from '@ant-design/icons-vue/UserOutlined'
import { message, Modal } from 'ant-design-vue'
import dayjs from 'dayjs'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import GiPageLayout from '@/components/GiPageLayout/index.vue'
import { UiBadge, UiButton, UiCard, UiTag } from '@/components/ui-guide/ui'
import { globalUnreadCount } from '@/composables/useUnreadCount'
import { useAuthStore, useUserStore } from '@/stores'

defineOptions({ name: 'UserProfile' })

const router = useRouter()
const authStore = useAuthStore()
const userStore = useUserStore()

const refreshing = ref(false)

const userInfo = computed(() => userStore.userInfo)
const tenantName = computed(() => userInfo.value.tenantName || userInfo.value.schoolName || '')
const displayName = computed(() => userInfo.value.nickName || userInfo.value.userName || '当前用户')

const roleLabel = computed(() => userInfo.value.roleDisplayName || userInfo.value.roleKey || '用户')

const isStudent = computed(() => userInfo.value.roleKey === 'SCH_STU')
const isTenantAdmin = computed(() => userInfo.value.isTenantAdmin === true)

const accountSubject = computed(() => {
  if (isStudent.value) return '学生个人账户'
  if (isTenantAdmin.value) return '租户管理账户'
  return '阅卷教学账户'
})

const unreadTotal = computed(() => globalUnreadCount.totalUnreadCount.value)

function formatTime(value?: string): string {
  if (!value) return '-'
  return dayjs(value).format('YYYY-MM-DD HH:mm')
}

async function refresh() {
  refreshing.value = true
  try {
    await userStore.getInfo(true)
    await globalUnreadCount.refreshUnreadCount()
    message.success('已刷新最新信息')
  } catch (error) {
    const msg = error instanceof Error ? error.message : '刷新失败'
    message.error(msg)
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

function goHome() {
  router.push({ path: '/' })
}

function handleLogout() {
  Modal.confirm({
    title: '确认退出登录',
    content: '退出后需要重新输入账号密码登录。',
    okText: '退出',
    cancelText: '取消',
    okType: 'danger',
    onOk: async () => {
      await authStore.logout()
      await router.push({ name: 'Login' })
    },
  })
}

onMounted(() => {
  globalUnreadCount.fetchUnreadCount().catch(() => {})
})
</script>

<style lang="scss" scoped>
.profile-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 10px;
  min-height: 100vh;
}

.profile-page__info-card,
.profile-page__security-card,
.profile-page__shortcuts-card {
  height: 100%;
}

.profile-page__shortcuts-card {
  margin-top: 16px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px 24px;

  &__row {
    display: grid;
    grid-template-columns: 110px 1fr;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
    border-bottom: 1px dashed var(--ant-color-border-secondary);
    font-size: 13px;

    &:last-child {
      border-bottom: none;
    }
  }

  &__label {
    color: var(--ant-color-text-tertiary);
  }

  &__value {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--ant-color-text);
    font-weight: 500;
  }
}

.security-list,
.shortcut-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.security-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--ant-color-border-secondary);
  border-radius: var(--dp-radius-md, 6px);

  &__main {
    flex: 1;
    min-width: 0;
  }

  &__title {
    margin: 0 0 4px;
    font-size: 14px;
    font-weight: 600;
    color: var(--ant-color-text);
  }

  &__desc {
    margin: 0;
    font-size: 12px;
    color: var(--ant-color-text-secondary);
  }
}

.shortcut-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--ant-color-fill-quaternary);
  border: 1px solid var(--ant-color-border-secondary);
  border-radius: var(--dp-radius-md, 6px);
  cursor: pointer;
  text-align: left;
  font-size: 14px;
  color: var(--ant-color-text);
  transition:
    border-color 0.2s ease,
    background 0.2s ease;

  &:hover {
    border-color: rgba(22, 119, 255, 0.3);
    background: linear-gradient(135deg, rgba(22, 119, 255, 0.05) 0%, rgba(22, 119, 255, 0.02) 100%);
  }

  span {
    flex: 1;
  }
}
</style>

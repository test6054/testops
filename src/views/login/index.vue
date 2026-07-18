<template>
  <article class="seo-content" aria-hidden="true">
    <h1>教学质量中心 - 高校考试阅卷与教学质量治理平台</h1>
    <p>
      覆盖考试阅卷、OBE
      质量评价与教师档案治理：扫描录入、智能识别、批阅复核、成绩发布、达成度分析与认证支撑。
    </p>
  </article>

  <div class="login-page">
    <div class="login-page__glow login-page__glow--left" aria-hidden="true" />
    <div class="login-page__glow login-page__glow--right" aria-hidden="true" />

    <div class="login-brand__top">
      <img src="/logo.svg" alt="教学质量中心" class="login-brand__logo" />
      <div class="login-brand__mark">
        <div class="login-brand__name">教学质量中心</div>
        <div class="login-brand__sub">TEACHING QUALITY</div>
      </div>
    </div>

    <main class="login-stage">
      <section class="login-brand">
        <div class="login-brand__layout">
          <div class="login-brand__content-row">
            <div class="login-brand__capability-column">
              <div class="login-brand__hero">
                <div class="login-brand__visual">
                  <img
                    :src="loginHeroVisual"
                    alt="教学质量中心平台能力示意图"
                    class="login-brand__visual-image"
                  />
                </div>
              </div>
            </div>

            <section class="login-panel">
              <div class="login-panel__header">
                <p class="login-panel__eyebrow">欢迎回来</p>
                <h3 class="login-panel__title">登录教学质量中心</h3>
                <p v-if="isSubdomain && subdomainTenant" class="login-panel__subtitle">
                  {{ subdomainTenant.tenantName }}
                </p>
                <p v-else class="login-panel__subtitle">请选择登录方式并完成身份验证。</p>
              </div>

              <div class="login-panel__surface">
                <div v-if="isSubdomain" class="login-body">
                  <UiStateBlock
                    v-if="subdomainLoading"
                    state="loading"
                    title="正在识别学校..."
                    compact
                  />
                  <StudentLogin v-else :subdomain-mode="true" :subdomain-tenant="subdomainTenant" />
                </div>

                <div v-else class="login-body">
                  <UiRadioGroup v-model="activeTab" :options="loginTabItems" block size="lg" />

                  <div class="login-tab-content">
                    <AccountLogin
                      v-if="activeTab === '1'"
                      @switch-to-student="switchToStudentTab"
                    />
                    <StudentLogin
                      v-if="activeTab === '2'"
                      :subdomain-mode="false"
                      :prefill-data="studentPrefill"
                    />
                    <CasLogin
                      v-if="activeTab === '3'"
                      :tenant-id="casTenantId"
                      :subdomain-mode="false"
                      @tenant-ready="onCasTenantReady"
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>

    <footer class="login-footer">
      <p class="login-footer__copy">{{ copyright }} · 京ICP备13021011号</p>
    </footer>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getCasLoginUrl } from '@/apis/sso'
import loginHeroVisual from '@/assets/login/login-hero-visual.png'
import UiRadioGroup from '@/components/ui-guide/ui/UiRadioGroup.vue'
import UiStateBlock from '@/components/ui-guide/ui/UiStateBlock.vue'
import { resetAuthState } from '@/config/axios/auth-state'
import { useAppStore } from '@/stores'
import { showUserError } from '@/utils/error-handler'

import { resolveSubdomainTenant, subdomainLoading, subdomainTenant } from '@/utils/subdomain'
import AccountLogin from './components/account/index.vue'
import CasLogin from './components/cas/index.vue'
import StudentLogin from './components/student/index.vue'

defineOptions({ name: 'Login' })

const route = useRoute()
const appStore = useAppStore()

const isSubdomain = ref(false)
const activeTab = ref('1')
const studentPrefill = ref<{ studentNo: string; password: string }>({ studentNo: '', password: '' })

/** CAS 回跳或深链带来的预置租户；无子域时由 CasLogin 内选校解析 */
const casTenantId = ref<string>('')
const casTabLabel = ref('统一认证')
const copyright = computed(() => appStore.getCopyright())

const loginTabItems = computed(() => [
  { value: '1', label: '账号登录' },
  { value: '2', label: '学号登录' },
  { value: '3', label: casTabLabel.value },
])

function switchToStudentTab(val: { studentNo: string; password: string }) {
  activeTab.value = '2'
  studentPrefill.value = {
    studentNo: val.studentNo,
    password: val.password,
  }
}

function onCasTenantReady(payload: { tenantId: string; casEnabled: boolean; displayName: string }) {
  casTenantId.value = payload.tenantId
  if (payload.displayName) {
    casTabLabel.value = payload.displayName
  }
}

function checkCasCallback(): boolean {
  const ticket = queryString(route.query.ticket)
  const tenantId = queryString(route.query.tenantId)

  if (ticket && tenantId) {
    casTenantId.value = tenantId
    activeTab.value = '3'
    return true
  }
  return false
}

function shouldAutoTriggerCas(): boolean {
  const autoCas = queryString(route.query.autoCas)
  return autoCas === '1' || autoCas === 'true'
}

async function resolveCurrentTenantId(): Promise<string> {
  const routeTenantId = queryString(route.query.tenantId)
  if (routeTenantId) {
    return routeTenantId
  }

  const resolvedTenant = await resolveSubdomainTenant()
  if (resolvedTenant?.tenantId) {
    return resolvedTenant.tenantId
  }

  return ''
}

function queryString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

async function triggerAutoCasLogin() {
  if (!casTenantId.value) {
    return
  }

  activeTab.value = '3'
  const loginUrl = await getCasLoginUrl(casTenantId.value)
  if (!loginUrl) {
    throw new Error('统一认证暂不可用')
  }
  window.location.href = loginUrl
}

onMounted(async () => {
  resetAuthState()

  const isCasReturn = checkCasCallback()
  const seedTenantId = casTenantId.value || (await resolveCurrentTenantId())
  if (seedTenantId) {
    casTenantId.value = seedTenantId
  }

  if (isCasReturn) {
    activeTab.value = '3'
    return
  }

  if (seedTenantId && shouldAutoTriggerCas()) {
    try {
      await triggerAutoCasLogin()
    } catch (error) {
      showUserError(error, '自动跳转统一认证失败')
    }
  }
})
</script>

<style lang="scss" scoped>
@use '@/styles/breakpoints' as bp;

.seo-content {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

/* 底色对齐 web-vue 登录氛围；动作色锁定 mark 主色 --dp-color-primary (#1677ff) */
.login-page {
  --login-bg: #eaf3ff;
  --login-surface: rgba(255, 255, 255, 0.94);
  --login-text: var(--dp-text-primary);
  --login-muted: var(--dp-text-secondary);
  --login-accent: var(--dp-color-primary);
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100vh;
  min-height: 100vh;
  padding: var(--dp-space-6) var(--dp-space-8) var(--dp-space-4);
  overflow: hidden;
  background:
    radial-gradient(
      circle at 15% 18%,
      color-mix(in srgb, var(--dp-color-primary) 18%, transparent) 0%,
      transparent 26%
    ),
    radial-gradient(
      circle at 86% 22%,
      color-mix(in srgb, var(--dp-blue-100) 70%, transparent) 0%,
      transparent 24%
    ),
    linear-gradient(180deg, #f6faff 0%, #eaf3ff 100%);
}

.login-page__glow {
  position: absolute;
  border-radius: 999px;
  filter: blur(12px);
  pointer-events: none;
}

.login-page__glow--left {
  top: 90px;
  left: 120px;
  width: 280px;
  height: 280px;
  background: color-mix(in srgb, var(--dp-color-primary) 16%, transparent);
}

.login-page__glow--right {
  right: 100px;
  bottom: 140px;
  width: 320px;
  height: 320px;
  background: color-mix(in srgb, var(--dp-blue-100) 55%, transparent);
}

.login-stage {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  width: min(1400px, 100%);
  min-height: 0;
  margin: 0 auto;
  align-items: center;
}

.login-brand {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding: var(--dp-space-2) var(--dp-space-1) 0;
  overflow: hidden;
}

.login-brand::before {
  content: '';
  position: absolute;
  inset: 10px 0 84px;
  background:
    linear-gradient(
      color-mix(in srgb, var(--dp-color-primary) 8%, transparent) 1px,
      transparent 1px
    ),
    linear-gradient(
      90deg,
      color-mix(in srgb, var(--dp-color-primary) 8%, transparent) 1px,
      transparent 1px
    );
  background-size: 56px 56px;
  opacity: 0.45;
  pointer-events: none;
}

.login-brand__top,
.login-brand__layout,
.login-brand__content-row,
.login-brand__capability-column,
.login-brand__hero,
.login-brand__visual {
  position: relative;
  z-index: 1;
}

.login-brand__top {
  position: absolute;
  top: 28px;
  left: 48px;
  z-index: 10;
  display: inline-flex;
  align-items: center;
  gap: var(--dp-space-3);
}

.login-brand__logo {
  width: 34px;
  height: 34px;
}

.login-brand__mark {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-1);
}

.login-brand__name {
  font-size: var(--dp-font-size-3xl);
  line-height: 1.1;
  font-weight: var(--dp-font-weight-title);
  color: var(--login-text);
}

.login-brand__sub {
  font-size: var(--dp-type-hint-size);
  font-weight: var(--dp-font-weight-emphasis);
  letter-spacing: 0.14em;
  color: var(--dp-text-muted);
}

.login-brand__layout {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  align-self: stretch;
  width: 100%;
  min-height: 0;
  margin: 0;
  padding-top: 0;
}

.login-brand__content-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 420px;
  gap: var(--dp-space-10);
  align-items: stretch;
  flex: 1;
  min-height: 0;
}

.login-brand__capability-column {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.login-brand__hero {
  display: flex;
  flex: 1;
  align-items: stretch;
  justify-content: stretch;
  min-height: 0;
}

.login-brand__visual {
  position: relative;
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 0;
}

.login-brand__visual::before {
  content: '';
  position: absolute;
  inset: 8% 4% 10%;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--dp-color-primary) 16%, transparent) 0%,
    transparent 70%
  );
  filter: blur(24px);
  pointer-events: none;
}

.login-brand__visual-image {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center center;
  filter: drop-shadow(0 24px 40px color-mix(in srgb, var(--dp-color-primary) 12%, transparent));
}

.login-panel {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-self: center;
  width: 100%;
  border-radius: var(--dp-radius-panel);
  background: transparent;
  box-shadow: none;
  overflow: visible;
}

.login-panel__header {
  margin: 0;
  padding: var(--dp-space-5) var(--dp-space-5) var(--dp-space-3);
  border-radius: var(--dp-radius-panel) var(--dp-radius-panel) 0 0;
  background: var(--login-surface);
  box-shadow: 0 18px 40px color-mix(in srgb, var(--dp-color-primary) 10%, transparent);
}

.login-panel__eyebrow {
  margin: 0 0 var(--dp-space-2);
  font-size: var(--dp-type-hint-size);
  font-weight: var(--dp-font-weight-title);
  letter-spacing: 0.12em;
  color: var(--login-accent);
}

.login-panel__title {
  margin: 0;
  font-size: 28px;
  line-height: 1.15;
  font-weight: var(--dp-font-weight-title);
  color: var(--login-text);
}

.login-panel__subtitle {
  margin: var(--dp-space-2) 0 0;
  font-size: var(--dp-font-size-sm);
  line-height: 1.6;
  color: var(--login-muted);
}

.login-panel__surface {
  margin-top: -2px;
  padding: var(--dp-space-5);
  border-radius: 0 0 var(--dp-radius-panel) var(--dp-radius-panel);
  background: var(--login-surface);
  box-shadow: 0 18px 40px color-mix(in srgb, var(--dp-color-primary) 10%, transparent);
}

.login-body {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4);
}

.login-tab-content {
  margin-top: var(--dp-space-1);

  :deep(.ui-radio-group :where(.ant-radio-group)) {
    gap: 3px;
    padding: 3px;
    border-color: var(--dp-border-subtle);
    background: var(--dp-fill-quaternary);
  }

  :deep(.ui-radio-group .ant-radio-button-wrapper) {
    min-height: 34px;
    padding: 0 var(--dp-space-3);
    font-size: var(--dp-font-size-sm);
    font-weight: var(--dp-font-weight-emphasis);
    line-height: 34px;
    color: var(--dp-text-secondary);
  }

  :deep(.ui-radio-group .ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled)) {
    background: var(--dp-bg-container);
    color: var(--dp-text-primary);
    box-shadow: var(--dp-shadow-sm);
  }

  :deep(.ui-radio-group .ant-radio-button-wrapper:hover:not(.ant-radio-button-wrapper-disabled)) {
    color: var(--dp-text-primary);
  }

  :deep(.ant-form-item) {
    margin-bottom: var(--dp-space-4);
  }

  :deep(.ui-radio-group) {
    width: 100%;
  }

  :deep(.ui-input__control),
  :deep(.ui-password-input__control),
  :deep(.school-autocomplete__input .ant-select-selector) {
    border-radius: var(--dp-radius-control);
  }

  :deep(.ui-button--size-lg),
  :deep(.dp-btn--lg) {
    min-height: 48px;
    border-radius: var(--dp-radius-control);
    font-weight: var(--dp-font-weight-title);
  }
}

.login-footer {
  position: relative;
  z-index: 1;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: flex-end;
  width: min(1360px, 100%);
  margin: var(--dp-space-2) auto 0;
}

.login-footer__copy {
  margin: 0;
  font-size: var(--dp-type-hint-size);
  color: var(--dp-text-muted);
}

@media (max-width: 1180px) {
  .login-stage {
    display: block;
    overflow: auto;
  }

  .login-brand {
    min-height: auto;
    overflow: visible;
  }

  .login-brand__top {
    position: relative;
    top: auto;
    left: auto;
    margin-bottom: var(--dp-space-4);
  }

  .login-brand__layout {
    width: 100%;
    gap: var(--dp-space-6);
  }

  .login-brand__content-row {
    grid-template-columns: 1fr;
    gap: var(--dp-space-6);
    flex: none;
  }

  .login-brand__capability-column,
  .login-brand__hero,
  .login-brand__visual {
    flex: none;
  }

  .login-brand__visual {
    width: 100%;
    max-width: none;
    height: min(520px, 58vh);
    margin: 0 auto;
  }

  .login-brand__visual-image {
    width: 100%;
    height: 100%;
  }
}

@media (max-width: bp.$layout-mobile-max) {
  .login-page {
    height: auto;
    min-height: 100vh;
    padding: var(--dp-space-5) var(--dp-space-4) var(--dp-space-6);
    overflow: visible;
  }

  .login-stage {
    min-height: auto;
  }

  .login-brand__content-row {
    gap: var(--dp-space-5);
  }

  .login-brand__visual {
    height: min(320px, 42vh);
  }

  .login-brand__visual-image {
    object-fit: contain;
  }

  .login-panel__header {
    padding: var(--dp-space-4);
  }

  .login-panel__title {
    font-size: 24px;
  }

  .login-panel__surface {
    padding: var(--dp-space-4);
  }

  .login-footer {
    justify-content: flex-start;
  }
}
</style>

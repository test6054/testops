<template>
  <form class="student-form" @submit.prevent="handleLogin">
    <!-- 学校选择（普通模式显示，子域名模式隐藏） -->
    <UiFormField
      v-if="!subdomainMode"
      label="学校"
      :required="!subdomainMode"
      :error="fieldErrors.schoolName"
    >
      <SchoolAutocomplete
        v-model="form.schoolName"
        placeholder="请输入学校名称"
        @select="handleSchoolSelect"
        @clear="handleSchoolClear"
      />
    </UiFormField>

    <UiFormField label="学号" required :error="fieldErrors.studentNo">
      <UiInput
        v-model="form.studentNo"
        placeholder="请输入学号"
        size="lg"
        clearable
        autocomplete="username"
        :status="fieldErrors.studentNo ? 'error' : 'default'"
      />
    </UiFormField>

    <UiFormField label="密码" required :error="fieldErrors.password">
      <UiPasswordInput
        v-model="form.password"
        placeholder="请输入密码"
        size="lg"
        :status="fieldErrors.password ? 'error' : 'default'"
      />
    </UiFormField>

    <!-- 错误提示 -->
    <div v-if="errorMessage" class="login-error">
      <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clip-rule="evenodd"
        />
      </svg>
      <span>{{ errorMessage }}</span>
    </div>

    <UiButton type="submit" variant="primary" size="lg" block :loading="loading">学号登录</UiButton>
  </form>

  <!-- AJ-Captcha 滑块验证码弹窗 -->
  <AjCaptcha
    v-model="showCaptcha"
    captcha-type="blockPuzzle"
    @success="onCaptchaSuccess"
    @fail="onCaptchaFail"
  />
</template>

<script lang="ts" setup>
import type { TenantPublicInfo } from '@/apis/auth'
import { getCaptchaConfig, getTenantsByStudentNo } from '@/apis/auth'
import type { SchoolItem } from '@/components/SchoolAutocomplete.vue'
import SchoolAutocomplete from '@/components/SchoolAutocomplete.vue'
import message from 'ant-design-vue/es/message'
import { nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AjCaptcha from '@/components/AjCaptcha/index.vue'
import { UiButton, UiFormField, UiInput, UiPasswordInput } from '@/components/ui-guide/ui'
import { resetAuthState } from '@/config/axios/auth-state'
import { getDefaultRoute } from '@/router/permission'
import { useAuthStore, useUserStore } from '@/stores'
import { ErrorType, standardizeError } from '@/utils/error-handler'
import { getSafeRedirect } from '@/utils/redirect-validator'

// Props
const props = defineProps<{
  subdomainMode?: boolean
  subdomainTenant?: TenantPublicInfo | null
  prefillData?: { studentNo: string; password: string }
}>()

const router = useRouter()
const userStore = useUserStore()
const authStore = useAuthStore()
const loading = ref(false)
const errorMessage = ref('')

// 选中的学校信息
const selectedSchool = ref<SchoolItem | null>(null)

// 验证码相关
const isCaptchaEnabled = ref(false)
const showCaptcha = ref(false)
const captchaVerification = ref('')

// 表单数据
const form = reactive({
  schoolName: '',
  studentNo: '',
  password: '',
})

// 表单校验错误
const fieldErrors = reactive({
  schoolName: '',
  studentNo: '',
  password: '',
})

function validate(): boolean {
  fieldErrors.schoolName = ''
  fieldErrors.studentNo = ''
  fieldErrors.password = ''
  let valid = true
  if (!props.subdomainMode && !form.schoolName.trim()) {
    fieldErrors.schoolName = '请选择学校'
    valid = false
  }
  if (!form.studentNo.trim()) {
    fieldErrors.studentNo = '请输入学号'
    valid = false
  }
  if (!form.password) {
    fieldErrors.password = '请输入密码'
    valid = false
  }
  return valid
}

// 子域名模式时，自动设置学校名称
watch(
  () => props.subdomainTenant,
  (tenant) => {
    if (props.subdomainMode && tenant) {
      form.schoolName = tenant.tenantName
    }
  },
  { immediate: true },
)

// 根据学号自动查询关联学校（必须在 watch 之前定义，避免 TDZ 错误）
const autoFillSchoolByStudentNo = async (studentNo: string) => {
  if (!studentNo) return
  try {
    const tenants = await getTenantsByStudentNo(studentNo)
    if (tenants && tenants.length > 0) {
      // 如果只有一个学校，直接填充
      form.schoolName = tenants[0].tenantName
    }
  } catch {
    // 查询失败不影响用户手动选择
  }
}

// 监听预填充数据变化（从账号登录切换过来时携带学号和密码）
watch(
  () => props.prefillData,
  async (val) => {
    if (val) {
      if (val.studentNo) {
        form.studentNo = val.studentNo
        // 根据学号自动查询关联的学校
        if (!props.subdomainMode) {
          await autoFillSchoolByStudentNo(val.studentNo)
        }
      }
      if (val.password) {
        form.password = val.password
      }
    }
  },
  { immediate: true },
)

// 获取验证码配置
const fetchCaptchaConfig = async () => {
  try {
    const config = await getCaptchaConfig()
    isCaptchaEnabled.value = config.enabled
  } catch (error) {
    isCaptchaEnabled.value = false
  }
}

// 验证码验证成功回调
const onCaptchaSuccess = (verification: string) => {
  captchaVerification.value = verification
  doLogin()
}

// 验证码验证失败回调
const onCaptchaFail = () => {
  loading.value = false
}

// 学校选择处理
const handleSchoolSelect = (school: SchoolItem) => {
  selectedSchool.value = school
}

// 学校清除处理
const handleSchoolClear = () => {
  selectedSchool.value = null
}

const handleLogin = async () => {
  errorMessage.value = ''
  if (!validate()) return
  loading.value = true

  if (isCaptchaEnabled.value) {
    showCaptcha.value = true
  } else {
    await doLogin()
  }
}

// 执行登录
const doLogin = async () => {
  try {
    // 使用学校名称登录（后端根据schoolName查找租户）
    const schoolName = props.subdomainMode
      ? (props.subdomainTenant?.tenantName ?? '')
      : form.schoolName
    await authStore.studentNoLogin({
      studentNo: form.studentNo,
      password: form.password,
      schoolName,
      captchaVerification: isCaptchaEnabled.value ? captchaVerification.value : undefined,
    })

    // 获取用户信息
    try {
      await userStore.getInfo()
    } catch (error) {
      errorMessage.value = '获取用户信息失败，请重试'
      return
    }

    await nextTick()

    // 验证登录状态
    if (!authStore.isAuthenticated || !userStore.userInfo.userId) {
      errorMessage.value = '登录状态异常，请重试'
      return
    }

    // 检查是否需要强制修改密码
    if (userStore.userInfo.forcePasswordChange) {
      message.warning('出于安全考虑，您需要修改密码后才能继续使用系统')
      await router.push('/change-password')
      return
    }

    const { redirect, ...othersQuery } = router.currentRoute.value.query

    // 根据用户角色跳转到对应的默认页面（与 permission.ts getDefaultRoute 保持一致）
    const dashboardPath = getDefaultRoute(authStore.userRole)

    // 缓存学校名称（登录成功后）
    if (schoolName) {
      localStorage.setItem('LAST_STUDENT_SCHOOL', schoolName)
    }

    const finalPath = getSafeRedirect(redirect as string, dashboardPath)

    await router.push({
      path: finalPath,
      query: { ...othersQuery },
    })

    message.success('登录成功，欢迎使用')
  } catch (error: unknown) {
    const stdError = standardizeError(error)
    if (stdError.type === ErrorType.NETWORK) {
      errorMessage.value = '登录失败，请检查学号和密码后重试'
    } else {
      errorMessage.value = stdError.message || '登录失败，请检查学号和密码'
    }
    captchaVerification.value = ''
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // 重置认证状态，确保公开接口可以正常请求
  resetAuthState()
  // 获取验证码配置
  fetchCaptchaConfig()

  // 从缓存恢复上次选择的学校
  const lastSchool = localStorage.getItem('LAST_STUDENT_SCHOOL')
  if (lastSchool && !props.subdomainMode) {
    form.schoolName = lastSchool
  }
})
</script>

<style lang="scss" scoped>
.student-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.login-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--dp-red-50, #fef2f2);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--dp-radius-control, 4px);
  color: var(--dp-red-500, #ef4444);
  font-size: 13px;
  line-height: 1.5;

  svg {
    flex-shrink: 0;
  }
}

// SchoolAutocomplete 样式适配
:deep(.ant-select-auto-complete) {
  width: 100%;

  .ant-input-affix-wrapper {
    min-height: var(--dp-control-height-lg, 40px);
    border-radius: var(--dp-radius-control, 4px);
    border: 1px solid var(--dp-border, #e5e7eb);
    background-color: var(--dp-bg-control, #f3f4f6);
  }

  .ant-input-affix-wrapper:hover {
    border-color: var(--dp-blue-600, #2563eb);
  }

  .ant-input-affix-wrapper:focus-within {
    border-color: var(--dp-blue-600, #2563eb);
    box-shadow: 0 0 0 3px var(--dp-focus-ring, rgba(37, 99, 235, 0.25));
  }
}
</style>

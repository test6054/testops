import type { UserDetailedInfoVO } from '@/apis/auth'
import type { UserLoginResponseDto } from '@/types/auth'
import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { getUserDetailedInfo } from '@/apis/auth'
import { checkTenantAdminPermission } from '@/apis/edu/tenant-admin'
import { RoleEnum, UserStatusEnum } from '@/types/enums'
import { showUserError } from '@/utils/error-handler'
import { useAuthStore } from './auth'

export const useUserStore = defineStore(
  'user',
  () => {
    const userInfo = reactive<
      UserLoginResponseDto & {
        // 前端扩展字段
        tenantName?: string
        schoolName?: string
        tenantType?: string
        isTenantAdmin?: boolean
        permissionVersion?: number
        forcePasswordChange?: boolean
        currentLoginProviderType?: string
        sourceFrom?: string
      }
    >({
      userId: '',
      tenantId: '',
      userName: '',
      nickName: '',
      email: '',
      mobile: '',
      avatarUrl: '',
      status: UserStatusEnum.ACTIVE,
      roleKey: '',
      roleId: '',
      authorities: [],

      // 前端扩展字段
      tenantName: '',
      schoolName: '',
      tenantType: '',
      isTenantAdmin: undefined,
      permissionVersion: undefined,
      lastLoginTime: '',
      passwordLastChangedTime: '',
      gender: undefined,
      roleDisplayName: '',
      forcePasswordChange: false,
      currentLoginProviderType: '',
      sourceFrom: '',
      studentDetails: undefined,
      teacherDetails: undefined,
    })

    // 用户信息计算属性
    // nickName 是业务强制字段，必定存在且必定有值，禁止兜底
    const nickname = computed(() => userInfo.nickName)
    const username = computed(() => userInfo.userName)
    const avatarUrl = computed(() => userInfo.avatarUrl)
    const studentDetails = computed(() => userInfo.studentDetails)
    const teacherDetails = computed(() => userInfo.teacherDetails)
    const studentClassName = computed(() => userInfo.studentDetails?.className || '')
    const studentEnrollmentYear = computed(() => userInfo.studentDetails?.enrollmentYear ?? null)

    // 是否为租户管理员（SUPER_ADMIN 恒为 true；SCH_TECH 以 check-permission 为准）
    const isTenantAdmin = computed(() => {
      const authStore = useAuthStore()
      if (authStore.userRole === RoleEnum.SUPER_ADMIN) {
        return true
      }
      return userInfo.isTenantAdmin === true
    })

    // 租户信息
    const tenantInfo = computed(() => ({
      tenantId: userInfo.tenantId,
      tenantName: userInfo.tenantName,
    }))

    // 加载状态
    const isLoading = ref(false)
    // 获取用户信息的Promise引用，防止重复调用
    const getUserInfoPromise = ref<Promise<UserDetailedInfoVO | void> | null>(null)

    /** 登录接口部分字段仍为 number，与 detailed/me、选择器 string 合同对齐。 */
    function normalizeUserIdentityFields(
      userData: Partial<UserLoginResponseDto>,
    ): Partial<UserLoginResponseDto> {
      const normalized: Partial<UserLoginResponseDto> = { ...userData }
      if (userData.userId != null && userData.userId !== '') {
        normalized.userId = String(userData.userId)
      }
      if (userData.tenantId != null && userData.tenantId !== '') {
        normalized.tenantId = String(userData.tenantId)
      }
      if (userData.roleId != null && userData.roleId !== '') {
        normalized.roleId = String(userData.roleId)
      }
      return normalized
    }

    // 设置用户信息
    const setUserInfo = (userData: Partial<UserLoginResponseDto>) => {
      Object.assign(userInfo, normalizeUserIdentityFields(userData))

      // 更新 auth store 中的角色信息
      const authStore = useAuthStore()
      if (userData.roleKey) {
        authStore.setRole(userData.roleKey)
      }
      if (userData.authorities) {
        const perms = userData.authorities.map((auth: string | { authority: string }) =>
          typeof auth === 'string' ? auth : auth.authority,
        )
        authStore.setPermissions(perms)
      }
    }

    // 清除用户信息缓存
    const clearUserInfoCache = () => {
      // 清除内存中的用户信息
      Object.assign(userInfo, {
        userId: '',
        tenantId: '',
        userName: '',
        nickName: '',
        email: '',
        mobile: '',
        avatarUrl: '',
        status: UserStatusEnum.ACTIVE,
        roleKey: '',
        roleId: '',
        authorities: [],
        tenantName: '',
        schoolName: '',
        tenantType: '',
        isTenantAdmin: undefined,
        permissionVersion: undefined,
        lastLoginTime: '',
        passwordLastChangedTime: '',
        gender: undefined,
        roleDisplayName: '',
        createTime: '',
        forcePasswordChange: false,
        currentLoginProviderType: '',
        sourceFrom: '',
        studentDetails: undefined,
        teacherDetails: undefined,
      })

      // 清除localStorage中的用户信息
      const keys = [
        'userInfo.userId',
        'userInfo.userName',
        'userInfo.nickName',
        'userInfo.email',
        'userInfo.mobile',
        'userInfo.avatarUrl',
        'userInfo.roleKey',
        'userInfo.roleId',
        'userInfo.tenantId',
        'userInfo.status',
        'userInfo.isTenantAdmin',
        'userInfo.gender',
        'userInfo.roleDisplayName',
        'userInfo.createTime',
        'userInfo.lastLoginTime',
        'userInfo.passwordLastChangedTime',
        'userInfo.tenantName',
        'userInfo.schoolName',
        'userInfo.tenantType',
        'userInfo.forcePasswordChange',
        'userInfo.currentLoginProviderType',
        'userInfo.sourceFrom',
        'userInfo.studentDetails',
        'userInfo.teacherDetails',
      ]

      keys.forEach((key) => {
        localStorage.removeItem(`user.${key}`)
      })
    }

    // Alias for clearUserInfoCache to match expected interface
    const clearUserInfo = clearUserInfoCache

    // 获取用户信息 - 防重复调用版本
    const getInfo = async (forceRefresh = false) => {
      const authStore = useAuthStore()

      // 如果已经有正在进行的请求，返回该Promise
      if (getUserInfoPromise.value) {
        return getUserInfoPromise.value
      }
      // 如果已经有用户信息且token有效，且不是强制刷新，直接返回
      if (
        !forceRefresh
        && userInfo.userId
        && authStore.token
        && !authStore.isTokenExpiredCheck(authStore.token)
      ) {
        await fetchTenantAdminPermission(false)
        return Promise.resolve()
      }

      try {
        isLoading.value = true

        // 创建新的Promise并存储引用
        getUserInfoPromise.value = (async () => {
          const userData = await getUserDetailedInfo()

          // 使用 Object.assign 统一赋值，避免逐字段遗漏
          Object.assign(userInfo, normalizeUserIdentityFields(userData))

          // 处理学校名称：从 studentDetails 或 teacherDetails 中提取
          if (userData.studentDetails?.schoolName) {
            userInfo.schoolName = userData.studentDetails.schoolName
          } else if (userData.teacherDetails?.schoolName) {
            userInfo.schoolName = userData.teacherDetails.schoolName
          }

          // 同步角色和权限到 auth store
          if (userData.roleKey) {
            authStore.setRole(userData.roleKey)
            authStore.setPermissions(userData.authorities || [])
          }

          // 获取租户管理员权限 - 始终重新获取以确保状态最新
          await fetchTenantAdminPermission(false)

          return userData
        })()

        return await getUserInfoPromise.value
      } finally {
        isLoading.value = false
        // 清除Promise引用，允许下次调用
        getUserInfoPromise.value = null
      }
    }

    // 获取权限投影：服务端版本变化必须触发菜单全量重建，查询失败时清空旧特权投影。
    const fetchTenantAdminPermission = async (skipIfAlreadySet = false) => {
      if (skipIfAlreadySet && userInfo.isTenantAdmin !== undefined) {
        return
      }

      try {
        const response = await checkTenantAdminPermission()
        userInfo.isTenantAdmin = response.isTenantAdmin === true
        userInfo.permissionVersion = response.permissionVersion
      } catch (error) {
        // 失败不得静默降权为非管理员；保持未解析并提示
        userInfo.isTenantAdmin = undefined
        userInfo.permissionVersion = undefined
        showUserError(error, '管理员权限查询失败')
      }
    }

    const refreshSecurityState = async () => {
      const userData = await getUserDetailedInfo()
      userInfo.forcePasswordChange = userData.forcePasswordChange === true
      userInfo.passwordLastChangedTime = userData.passwordLastChangedTime
      userInfo.currentLoginProviderType = userData.currentLoginProviderType || ''
      userInfo.sourceFrom = userData.sourceFrom || ''
      return userInfo.forcePasswordChange === true
    }

    return {
      userInfo,
      nickname,
      username,
      avatarUrl,
      studentDetails,
      teacherDetails,
      studentClassName,
      studentEnrollmentYear,
      isTenantAdmin,
      tenantInfo,
      isLoading,
      getUserInfoPromise,

      setUserInfo,
      clearUserInfoCache,
      clearUserInfo,
      getInfo,
      fetchTenantAdminPermission,
      refreshSecurityState,
    }
  },
  {
    persist: {
      pick: [
        'userInfo.userId',
        'userInfo.userName',
        'userInfo.nickName',
        'userInfo.email',
        'userInfo.mobile',
        'userInfo.avatarUrl',
        'userInfo.roleKey',
        'userInfo.roleId',
        'userInfo.tenantId',
        'userInfo.status',
        'userInfo.gender',
        'userInfo.roleDisplayName',
        'userInfo.createTime',
        'userInfo.lastLoginTime',
        'userInfo.passwordLastChangedTime',
        'userInfo.tenantName',
        'userInfo.schoolName',
        'userInfo.tenantType',
        'userInfo.isTenantAdmin',
        'userInfo.studentDetails',
        'userInfo.teacherDetails',
        'userInfo.forcePasswordChange',
        'userInfo.currentLoginProviderType',
        'userInfo.sourceFrom',
      ],
      storage: localStorage,
    },
  },
)

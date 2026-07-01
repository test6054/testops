import type { TenantConfigDto } from '@/apis/edu/tenant-config'
import { getTenantConfig } from '@/apis/edu/tenant-config'
import type { TenantInfo } from '@/apis/edu/tenant-management'
import { getTenantDetail } from '@/apis/edu/tenant-management'
import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { STORAGE_TENANT_ID } from '@/constants/storage-keys'
import { TenantStatusEnum } from '@/types/enums'

export const useTenantStore = defineStore(
  'tenant',
  () => {
    const tenantId = ref<string | undefined>(localStorage.getItem(STORAGE_TENANT_ID) || undefined)

    // 完整租户信息 - 初始化为空，完全从后端获取
    const tenantInfo = reactive<TenantInfo>({
      id: '',
      tenantName: '',
      tenantCode: '',
      logoUrl: '',
      description: '',
      contactPerson: '',
      status: TenantStatusEnum.TRIAL,
      createTime: '',
      updateTime: '',
    })

    // 租户配置信息
    const tenantConfig = ref<TenantConfigDto | null>(null)

    // 计算属性
    const needInputTenantCode = computed(() => {
      return false
    })

    const isValidTenant = computed(() => !!tenantId.value && !!tenantInfo.tenantName)
    const tenantDisplayName = computed(() => tenantInfo.tenantName || '系统租户')
    const tenantLogo = computed(() => tenantInfo.logoUrl || '')
    const primaryColor = computed(() => 'var(--ant-color-primary)')
    const platformTitle = computed(() => '智能教学实训平台')

    // 基础方法
    const setTenantId = (id: string) => {
      tenantId.value = id
      localStorage.setItem(STORAGE_TENANT_ID, id)
    }

    // 设置租户信息
    const setTenantInfo = (info: Partial<TenantInfo>) => {
      Object.assign(tenantInfo, info)
      if (info.id) {
        setTenantId(info.id)
      }
    }

    // 从后端获取租户信息
    const fetchTenantInfo = async (id?: string) => {
      const targetId = id || tenantId.value
      if (!targetId) {
        return
      }
      const response = await getTenantDetail({ id: targetId })
      if (response) {
        // 直接使用后端返回的数据，不做无意义兜底
        setTenantInfo({
          ...response,
          id: response.id?.toString(),
          createUser: response.createUser?.toString(),
          updateUser: response.updateUser?.toString(),
        })
      }
    }

    const fetchTenantConfig = async (id?: string) => {
      const targetId = id || tenantId.value
      if (!targetId) {
        return
      }

      try {
        const response = await getTenantConfig(targetId)
        if (response) {
          // 保存租户配置数据
          tenantConfig.value = response
        }
      } catch {
        // 获取配置失败，清空配置数据
        tenantConfig.value = null
      }
    }

    // 清空租户ID和信息
    const resetTenantId = () => {
      tenantId.value = undefined
      localStorage.removeItem(STORAGE_TENANT_ID)
      Object.assign(tenantInfo, {
        id: '',
        tenantName: '',
        tenantCode: '',
        tenantType: '',
        logoUrl: '',
        description: '',
        contactPerson: '',
        status: TenantStatusEnum.TRIAL,
        createTime: '',
        updateTime: '',
        schoolId: '',
        schoolName: '',
        maxUsers: 0,
        contactPhone: '',
        contactEmail: '',
        admins: [],
        adminName: '',
        userCount: 0,
        activeUsers: 0,
        usedStorage: 0,
        maxStorage: 0,
        createUser: '',
        updateUser: '',
      })
      // 清空租户配置
      tenantConfig.value = null
    }

    return {
      // 状态
      tenantId,
      tenantInfo,
      tenantConfig,

      // 计算属性
      needInputTenantCode,
      isValidTenant,
      tenantDisplayName,
      tenantLogo,
      primaryColor,
      platformTitle,

      // 方法
      setTenantId,
      resetTenantId,
      setTenantInfo,

      // API调用方法
      fetchTenantInfo,
      fetchTenantConfig,
    }
  },
  {
    persist: {
      pick: ['tenantId', 'tenantInfo', 'tenantConfig'],
      storage: localStorage,
    },
  },
)

import type { TenantPublicInfo } from '@/apis/auth'
import { getTenantByCode } from '@/apis/auth'
/**
 * 子域名检测与租户解析工具
 */
import { ref } from 'vue'
import { getUserErrorMessage } from '@/utils/error-handler'

// 主域名列表（这些不算作租户子域名）
const MAIN_DOMAINS = [
  'www',
  'api',
  'admin',
  'app',
  'm',
  'mobile',
  'localhost',
  'static',
  'cdn',
  'img',
  'mail',
  'docs',
  'dev',
  'test',
  'staging',
]

// 支持的根域名
const SUPPORTED_ROOT_DOMAINS = ['shixunfang.com', 'shixunfang.local', 'lvh.me']

/**
 * 从当前URL解析子域名
 * @returns 子域名，如果是主域名则返回 null
 */
export function parseSubdomain(): string | null {
  const hostname = window.location.hostname

  // localhost 或 IP 地址不处理
  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return null
  }

  // 检查是否匹配支持的根域名
  for (const rootDomain of SUPPORTED_ROOT_DOMAINS) {
    if (hostname === rootDomain) {
      return null
    }

    const rootDomainSuffix = `.${rootDomain}`
    if (hostname.endsWith(rootDomainSuffix)) {
      // 提取子域名部分
      const subdomain = hostname.slice(0, hostname.length - rootDomainSuffix.length)

      // 如果没有子域名或是主域名，返回 null
      if (!subdomain || MAIN_DOMAINS.includes(subdomain.toLowerCase())) {
        return null
      }

      return subdomain.toLowerCase()
    }
  }

  return null
}

/**
 * 检测是否为子域名访问模式
 */
export function isSubdomainMode(): boolean {
  return parseSubdomain() !== null
}

/**
 * 子域名租户信息（响应式）
 */
export const subdomainTenant = ref<TenantPublicInfo | null>(null)
export const subdomainLoading = ref(false)
export const subdomainError = ref<string | null>(null)

/**
 * 从子域名解析租户信息
 * @returns 租户信息，如果解析失败返回 null
 */
export async function resolveSubdomainTenant(): Promise<TenantPublicInfo | null> {
  const subdomain = parseSubdomain()

  if (!subdomain) {
    subdomainTenant.value = null
    return null
  }

  try {
    subdomainLoading.value = true
    subdomainError.value = null

    const tenant = await getTenantByCode(subdomain)
    subdomainTenant.value = tenant
    return tenant
  } catch (error: unknown) {
    subdomainError.value = getUserErrorMessage(error, '无法识别当前学校，请确认访问地址是否正确')
    subdomainTenant.value = null
    return null
  } finally {
    subdomainLoading.value = false
  }
}

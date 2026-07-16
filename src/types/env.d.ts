/**
 * 全局类型 augmentations 唯一手写入口。
 *
 * 同目录其他文件：
 * - api-types.d.ts：ResultInfo / PageResult / QueryDto 等 API 契约
 * - components.d.ts / auto-imports.d.ts：unplugin 自动生成，勿手改
 */
/// <reference types="vite/client" />
/// <reference types="vue/jsx" />

export {}

/** .ts 中 import *.vue（WebStorm / tsserver 兜底；vue-tsc 由 Volar 解析 SFC） */
declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_PREFIX: string
    readonly VITE_API_BASE_URL: string
    readonly VITE_BASE: string
    readonly VITE_APP_SETTING: string
    readonly VITE_CLIENT_ID: string
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}

/**
 * Ant Design Vue 4.x + Vue 3.5 兼容补丁：GlobalComponents 索引签名兜底。
 * 具名组件类型由 components.d.ts 提供；上游修复后可删此段。
 * @see https://github.com/vuejs/language-tools/issues/5161
 */
import type { Component } from 'vue'
import type { RoleEnum } from '@/utils/permission'
import type { SeoMeta } from '@/utils/seo'

declare module 'vue' {
  interface GlobalComponents {
    [key: string]: Component
  }
}

declare module 'vue-router' {
  interface RouteMeta {
    /** 页面标题 */
    title?: string
    /** 是否需要认证 */
    requiresAuth?: boolean
    /** 允许访问的角色列表 */
    roles?: RoleEnum[]
    /** 菜单图标 */
    icon?: string
    /** SVG图标名称 */
    svgIcon?: string
    /** 是否在菜单中隐藏 */
    hideInMenu?: boolean
    /** 是否隐藏面包屑 */
    hideBreadcrumb?: boolean
    /** 是否缓存组件 */
    keepAlive?: boolean
    /** 禁用路由缓存 */
    noCache?: boolean
    /** SEO 配置 */
    seo?: SeoMeta
    /** 是否需要租户管理员权限 */
    requireTenantAdmin?: boolean
    /** 是否需要档案审核台权限（院系负责人/租户管理员） */
    requirePortfolioReviewer?: boolean
    /** 教学档案袋侧栏所属工作壳；只控制服务端授权后的菜单投影，不替代 API 权限。 */
    portfolioWorkShells?: import('@/apis/portfolio/types').PortfolioWorkShellCode[]
    /** 是否始终显示为子菜单（即使只有一个子路由） */
    alwaysShow?: boolean
    /** 内部标记：无可见子路由 */
    noShowingChildren?: boolean
    /** 高亮激活的菜单路径 */
    activeMenu?: string
    /** 菜单分组标识 */
    menuGroup?: string
    /** 菜单分组显示标题 */
    menuGroupTitle?: string
    /** 菜单分组图标 */
    menuGroupIcon?: string
    /** 菜单分组排序 */
    menuGroupOrder?: number
    /**
     * 侧栏菜单层级：primary 默认展示；secondary 收进「更多」。
     * 未声明视为 primary。
     */
    menuTier?: 'primary' | 'secondary'
    /** 批阅页宽布局：Main 容器放宽至全宽（上限 1680px） */
    layoutWide?: boolean
    /** 创建页全屏表单：取消 Main 内边距与宽度限制，使用 CreateFormPageShell */
    layoutCreatePage?: boolean
    /** 考试 / 归档卷详情工作台布局标识 */
    layout?: 'ExamWorkspace' | 'ArchiveVolumeDetail' | 'CreatePage'
    /** 子页已自带 StageWorkbenchShell 时置 true，避免布局重复包裹 */
    hasWorkbenchShell?: boolean
    /** StageRail 当前页高亮阶段键 */
    markStageKey?: string
    /** 考试工作台六步旅程键 */
    journeyKey?: 'overview' | 'prep' | 'scan' | 'assign' | 'mark' | 'publish' | 'archive'
    /** 工作台侧栏分组 */
    workspacePhase?: string
    /** 质量评价 scope 维度（路由 meta.scopeProfile） */
    scopeProfile?: import('@/constants/quality-scope-profile').QualityScopeProfile
    /** Publish 门控：培养方案已确认 */
    qualityGate?: import('@/constants/quality-scope-profile').QualityGate
    /** 培养方案门控阻断：可点击跳转工作台，非 RBAC */
    qualityGateBlocked?: boolean
    /** 覆盖默认 scope watch 字段 */
    scopeWatchFields?: import('@/constants/quality-scope-profile').QualityStoreScopeField[]
    /** 侧栏项禁用（由 Menu 根据业务状态写入） */
    disabled?: boolean
  }
}

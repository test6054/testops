/// <reference types="vite/client" />
/// <reference types="vue/jsx" />

export {}

// Vue 单文件组件模块声明（Vite 5+ 不再内置）
declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
}

/** 声明环境变量的类型 */
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


// Ant Design Vue 全局组件类型声明
// antdv 4.x 未提供 GlobalComponents 声明，Volar 无法将 a-xxx 映射到组件类型
// 导致 #overlay 等 slot 被报「无法识别的 slot name」
declare module '@vue/runtime-core' {
  interface GlobalComponents {
    ADropdown: typeof import('ant-design-vue/es/dropdown')['default']
    ADropdownButton: typeof import('ant-design-vue/es/dropdown')['DropdownButton']
    ATable: typeof import('ant-design-vue/es/table')['default']
    ATableColumn: typeof import('ant-design-vue/es/table')['TableColumn'] & {
      new (): {
        $slots: {
          // eslint-disable-next-line ts/no-explicit-any -- AntDV slot 类型来自库自身定义
          default: (props: { text: any, record: any, index: number, column: any }) => any
        }
      }
    }
  }
}


import type { RoleEnum } from '@/utils/permission'
// Vue Router 自定义 meta 字段类型声明
import type { SeoMeta } from '@/utils/seo'

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
    /** 批阅页宽布局：Main 容器放宽至全宽（上限 1680px） */
    layoutWide?: boolean
    /** 考试工作台布局标识 */
    layout?: 'ExamWorkspace'
    /** StageRail 当前页高亮阶段键 */
    markStageKey?: string
    /** 工作台侧栏分组 */
    workspacePhase?: string
  }
}


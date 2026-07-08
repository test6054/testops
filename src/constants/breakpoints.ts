/**
 * 断点常量真源（TS）。
 *
 * - LAYOUT_*：layout shell（useDevice：TabBar vs Asider）
 * - ANT_GRID_*：Ant Design Grid / useBreakpoint / a-col（SCSS：$ant-grid-*）
 * - RESPONSIVE_SHELL_*：容器 max-width / padding 阶梯（SCSS：$shell-*，勿与 Ant Grid 混用）
 * - UI_DATA_TABLE_VIEWPORT：表格列窄视口隐藏
 *
 * SCSS 镜像见 styles/_breakpoints.scss，数值须保持同步。
 */
interface AntGridMin {
  sm: number
  md: number
  lg: number
  xl: number
  xxl: number
}

interface DataTableViewportBreakpoint {
  md: number
  lg: number
}

interface ResponsiveShellBreakpoint {
  mobileMax: number
  tabletMin: number
  tabletMax: number
  laptopMin: number
  laptopMax: number
  desktopMin: number
  desktopMax: number
  wideMin: number
}

interface MediaQueryBreakpoint {
  mobile: string
  desktop: string
  antMd: string
  antLg: string
}

export const ANT_GRID_MIN: AntGridMin = {
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1600,
}

/** layout shell 移动视口上限（TabBar 模式） */
export const LAYOUT_MOBILE_MAX = 767

/** layout shell 桌面视口下限（Asider 模式），数值与 ANT_GRID_MIN.md 同步 */
export const LAYOUT_DESKTOP_MIN = 768

/** UiDataTable 列在窄视口下隐藏的断点 */
export const UI_DATA_TABLE_VIEWPORT: DataTableViewportBreakpoint = {
  md: ANT_GRID_MIN.md,
  lg: ANT_GRID_MIN.lg,
}

/** responsive.scss 容器断点（与 Ant grid 命名无关） */
export const RESPONSIVE_SHELL: ResponsiveShellBreakpoint = {
  mobileMax: 767,
  tabletMin: 768,
  tabletMax: 1024,
  laptopMin: 1025,
  laptopMax: 1280,
  desktopMin: 1281,
  desktopMax: 1440,
  wideMin: 1441,
}

/** 阅卷沉浸布局桌面下限 */
export const DESKTOP_MARKING_MIN = 1024

/** CSS media-query 字符串辅助 */
export const mq: MediaQueryBreakpoint = {
  mobile: `(max-width: ${LAYOUT_MOBILE_MAX}px)`,
  desktop: `(min-width: ${LAYOUT_DESKTOP_MIN}px)`,
  antMd: `(min-width: ${ANT_GRID_MIN.md}px)`,
  antLg: `(min-width: ${ANT_GRID_MIN.lg}px)`,
}

export type AntGridMinKey = keyof typeof ANT_GRID_MIN

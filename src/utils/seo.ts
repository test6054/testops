/**
 * SEO 动态 Meta 标签管理
 *
 * 用于在 SPA 中动态更新页面的 SEO 相关 Meta 标签
 * 支持 title、description、keywords、Open Graph 等
 *
 * @author 实训坊
 */

/** SEO Meta 配置接口 */
export interface SeoMeta {
  /** 页面标题 */
  title?: string
  /** 页面描述 */
  description?: string
  /** 页面关键词 */
  keywords?: string
  /** Open Graph 标题 */
  ogTitle?: string
  /** Open Graph 描述 */
  ogDescription?: string
  /** Open Graph 图片 */
  ogImage?: string
  /** Canonical URL */
  canonical?: string
}

/** 默认 SEO 配置 */
const DEFAULT_SEO: SeoMeta = {
  title: '实训坊 | 工科产教融合AI实训平台',
  description: '实训坊是面向工科院校的产教融合AI实训平台。提供企业级实训项目、AI智能评测、虚拟仿真实训、文档格式检查、OBE能力画像等功能，助力新工科人才培养与工程教育认证。',
  keywords: '实训坊,产教融合,工科实训,AI评测,虚拟仿真,新工科,OBE,工程教育认证,高校教学平台,企业项目实训',
}

/**
 * 更新 Meta 标签
 * @param name 标签 name/property 属性值
 * @param content 标签 content 属性值
 * @param attr 属性类型，默认 'name'，Open Graph 使用 'property'
 */
function updateMetaTag(name: string, content?: string, attr: 'name' | 'property' = 'name') {
  if (!content) return

  let el = document.querySelector(`meta[${attr}="${name}"]`)
  if (el !== null && !(el instanceof HTMLMetaElement)) {
    throw new Error(`SEO meta 标签类型异常：${name}`)
  }
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/**
 * 更新 Canonical 链接
 * @param url Canonical URL
 */
function updateCanonical(url?: string) {
  if (!url) return

  let el = document.querySelector('link[rel="canonical"]')
  if (el !== null && !(el instanceof HTMLLinkElement)) {
    throw new Error('SEO canonical 标签类型异常')
  }
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', url)
}

/**
 * 应用 SEO Meta 配置
 * @param meta SEO 配置对象
 */
export function applySeoMeta(meta?: SeoMeta) {
  const seo = {...DEFAULT_SEO, ...meta}

  // 更新 title
  if (seo.title) {
    document.title = seo.title
  }

  // 更新基础 Meta 标签
  updateMetaTag('description', seo.description)
  updateMetaTag('keywords', seo.keywords)

  // 更新 Open Graph 标签
  updateMetaTag('og:title', seo.ogTitle || seo.title, 'property')
  updateMetaTag('og:description', seo.ogDescription || seo.description, 'property')
  if (seo.ogImage) {
    updateMetaTag('og:image', seo.ogImage, 'property')
  }

  // 更新 Canonical
  updateCanonical(seo.canonical)
}

/**
 * 简化版App Store - 只保留必需功能
 * 移除复杂的主题系统和未使用的配置，专注性能
 */

import { defineStore } from 'pinia'
import { computed, reactive, toRefs } from 'vue'

// 基础配置类型
interface BasicConfig {
    SITE_FAVICON: string
    SITE_LOGO: string
    SITE_TITLE: string
    SITE_COPYRIGHT: string
    SITE_BEIAN: string
}

// 简化的配置接口
interface SimplifiedAppSettings {
    // 只保留实际使用的配置
    menuCollapse: boolean
    menuAccordion: boolean // 菜单手风琴模式，默认开启
    animate: boolean
    animateMode: string
    watermarkEnabled: boolean // 水印开关，默认关闭
    copyrightDisplay: boolean // 版权信息显示开关，默认开启
}

const storeSetup = () => {
    // 简化的配置 - 移除复杂的主题系统
    const settingConfig = reactive<SimplifiedAppSettings>({
        menuCollapse: false,
        menuAccordion: true, // 默认开启菜单手风琴模式
        animate: false, // 默认关闭动画提升性能
        animateMode: 'fade', // 使用最简单的动画
        watermarkEnabled: false, // 默认关闭水印功能
        copyrightDisplay: true // 默认显示版权信息
    })

    // 简化的页面切换动画
    const transitionName = computed(() =>
        settingConfig.animate ? settingConfig.animateMode : ''
    )

    // 设置左侧菜单折叠状态
    const setMenuCollapse = (collapsed: boolean) => {
        settingConfig.menuCollapse = collapsed
    }

    // 设置水印开关状态
    const setWatermarkEnabled = (enabled: boolean) => {
        settingConfig.watermarkEnabled = enabled
    }

    // 系统配置（保留必需的）
    const siteConfig = reactive<BasicConfig>({
        SITE_FAVICON: '/favicon.ico',
        SITE_LOGO: '/logo.svg',
        SITE_TITLE: '教学质量中心',
        SITE_COPYRIGHT: '© 教学质量中心',
        SITE_BEIAN: ''
    })

    // 初始化系统配置
    const initSiteConfig = () => {
        document.title = siteConfig.SITE_TITLE
        document
            .querySelector('link[rel="shortcut icon"]')
            ?.setAttribute('href', siteConfig.SITE_FAVICON)
    }

    // 设置系统配置
    const setSiteConfig = (config: BasicConfig) => {
        Object.assign(siteConfig, config)
        document.title = config.SITE_TITLE || ''
        document.querySelector('link[rel="shortcut icon"]')
            ?.setAttribute('href', config.SITE_FAVICON || '/favicon.ico')
    }

    // 便捷方法
    const getFavicon = () => siteConfig.SITE_FAVICON
    const getLogo = () => siteConfig.SITE_LOGO
    const getTitle = () => siteConfig.SITE_TITLE
    const getCopyright = () => siteConfig.SITE_COPYRIGHT
    const getForRecord = () => siteConfig.SITE_BEIAN

    return {
        // 简化的响应式配置
        ...toRefs(settingConfig),
        ...toRefs(siteConfig),

        // 计算属性
        transitionName,

        // 方法（只保留必需的）
        setMenuCollapse,
        setWatermarkEnabled,
        initSiteConfig,
        setSiteConfig,
        getFavicon,
        getLogo,
        getTitle,
        getCopyright,
        getForRecord,

        // 为了兼容性，提供默认的主题相关属性
        theme: 'light',
        menuDark: false,
        themeCSSVar: {},
    }
}

export const useAppStore = defineStore('app', storeSetup, {
    persist: {
        pick: ['menuCollapse', 'menuAccordion', 'animate', 'animateMode', 'watermarkEnabled', 'copyrightDisplay'],
        storage: localStorage,
    }
}
)

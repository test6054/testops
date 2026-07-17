<script lang="ts">
/**
 * 面包屑项：透传 a-breadcrumb-item，并保留 ant-design-vue 子节点校验标记，
 * 避免包装组件触发 “Only accepts Breadcrumb.Item ...” 警告。
 */
import BreadcrumbItem from 'ant-design-vue/es/breadcrumb/BreadcrumbItem'
import { defineComponent, h } from 'vue'

export default defineComponent({
  name: 'UiBreadcrumbItem',
  inheritAttrs: false,
  // ant-design-vue Breadcrumb 只接受带此标记的子节点
  __ANT_BREADCRUMB_ITEM: true,
  setup(_props, { attrs, slots }) {
    return () =>
      h(
        BreadcrumbItem,
        {
          ...attrs,
          class: ['ui-breadcrumb-item', attrs.class],
        },
        slots,
      )
  },
})
</script>

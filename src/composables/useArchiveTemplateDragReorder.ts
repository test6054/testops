import type { Ref } from 'vue'

export interface ArchiveTemplateDragReorderOptions<TMaterial> {
  /** 材料行所属分组名，组内拖拽排序 */
  resolveMaterialGroup: (item: TMaterial) => string
  /** 材料行排序字段，默认 sortOrder */
  materialOrderField?: keyof TMaterial
  /** 自查项排序字段：租户用 itemOrder，平台用 sortOrder */
  selfCheckOrderField?: 'itemOrder' | 'sortOrder'
}

/**
 * 归档模板材料 / 自查项排序字段维护：与 Sortable 拖拽配合写回主列表。
 */
export function useArchiveTemplateDragReorder<
  TMaterial extends object,
  TSelfCheck extends object,
>(
  materialRows: Ref<TMaterial[]>,
  selfCheckRows: Ref<TSelfCheck[]>,
  options: ArchiveTemplateDragReorderOptions<TMaterial>,
) {
  const materialOrderField = (options.materialOrderField ?? 'sortOrder') as keyof TMaterial
  const selfCheckOrderField = (options.selfCheckOrderField ?? 'sortOrder') as keyof TSelfCheck

  function writeOrder<T extends object>(row: T, field: keyof T, order: number): T {
    return { ...row, [field]: order }
  }

  function normalizeMaterialSortOrders() {
    materialRows.value = materialRows.value.map((item, index) =>
      writeOrder(item, materialOrderField, index + 1),
    )
  }

  function normalizeSelfCheckSortOrders() {
    selfCheckRows.value = selfCheckRows.value.map((item, index) =>
      writeOrder(item, selfCheckOrderField, index + 1),
    )
  }

  /** 组内 Sortable 完成后，将局部顺序写回 materialRows 并重算 sortOrder。 */
  function applyMaterialGroupOrder(groupName: string, orderedItems: TMaterial[]) {
    let groupCursor = 0
    materialRows.value = materialRows.value.map((item) => {
      if (options.resolveMaterialGroup(item) !== groupName) {
        return item
      }
      return orderedItems[groupCursor++]
    })
    normalizeMaterialSortOrders()
  }

  function applySelfCheckOrder(orderedItems: TSelfCheck[]) {
    selfCheckRows.value = [...orderedItems]
    normalizeSelfCheckSortOrders()
  }

  return {
    applyMaterialGroupOrder,
    applySelfCheckOrder,
    normalizeMaterialSortOrders,
    normalizeSelfCheckSortOrders,
  }
}

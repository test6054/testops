/**
 * @desc 求和
 */
export const sum = (arr: number[]) => {
  return arr.reduce((pre, cur) => pre + cur)
}

/**
 * @desc 获取平均值
 */
export const average = (arr: number[]) => {
  return sum(arr) / arr.length
}

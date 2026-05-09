#!/usr/bin/env node
/* eslint-disable no-console */

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * 查找并终止占用指定端口的进程
 * @param {number} port 端口号
 */
async function killPort(port) {
  try {
    console.log(`检查端口 ${port} 是否被占用...`)

    const { stdout } = await execAsync(`lsof -ti:${port}`)

    if (stdout.trim()) {
      const pids = stdout.trim().split('\n')
      console.log(`端口 ${port} 被以下进程占用: ${pids.join(', ')}`)

      for (const pid of pids) {
        try {
          const { stdout: processInfo } = await execAsync(`ps -p ${pid} -o pid,ppid,command`)
          console.log(`进程信息:\n${processInfo}`)
        } catch {
          console.log(`无法获取进程 ${pid} 的详细信息`)
        }
      }

      console.log(`正在终止占用端口 ${port} 的进程...`)
      await execAsync(`kill -9 ${pids.join(' ')}`)
      console.log(`已终止占用端口 ${port} 的进程`)

      await new Promise(resolve => setTimeout(resolve, 1000))
    } else {
      console.log(`端口 ${port} 未被占用`)
    }
  } catch (error) {
    if (error.message.includes('No such process')) {
      console.log(`端口 ${port} 未被占用`)
    } else {
      console.error(`检查端口时出错: ${error.message}`)
    }
  }
}

const port = process.argv[2] || 5273
killPort(port)

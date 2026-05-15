// #1869: 日志工具
function writeLog(msg) {
  try {
    const fs = require('fs')
    const now = new Date()
    const time = now.toLocaleTimeString('zh-CN', { hour12: false })
    fs.appendFileSync('C:\\Users\\Admin\\marktext-fold.log', `${time} [fold] ${msg}\n`)
  } catch (e) { /* ignore */ }
}

const foldCtrl = (ContentState) => {
  /**
   * 遍历根级 blocks，设置以下标记：
   *   block.hiddenByFold      {boolean} - 该 block 应被折叠隐藏
   *   block.hasFoldableContent {boolean} - 该标题下方有可折叠内容（仅标题 block 有效）
   *
   * 状态机：用 hidingUntilLevel 追踪"当前被折叠的标题层级"。
   * 遇到同级或更高级标题时停止隐藏，再判断新标题自身是否折叠。
   */
  ContentState.prototype.markFoldedBlocks = function() {
    let hidingUntilLevel = null
    let hiddenCount = 0

    for (const block of this.blocks) {
      block.hiddenByFold = false
      block.hasFoldableContent = false

      if (/^h[1-6]$/.test(block.type)) {
        const level = parseInt(block.type.slice(1))

        // 遇到同级或更高级标题，结束上一段隐藏区
        if (hidingUntilLevel !== null && level <= hidingUntilLevel) {
          hidingUntilLevel = null
        }

        // 若此标题本身折叠，开启新的隐藏区
        if (block.folded) {
          hidingUntilLevel = level
          // hasFoldableContent 暂标 true，最终由后续循环确认（有实际内容才真正显示图标）
          block.hasFoldableContent = true
        }
      } else if (hidingUntilLevel !== null) {
        block.hiddenByFold = true
        hiddenCount++
      }
    }
    writeLog(`markFoldedBlocks: total=${this.blocks.length} hidden=${hiddenCount}`)

    // 第二轮：修正 hasFoldableContent。
    // 若一个折叠标题后面紧跟的全是被隐藏的内容（hiddenByFold true），则确认有可折叠内容。
    // 若折叠标题后面没有任何 block，或直接跟着同级/更高级标题，则取消图标。
    for (let i = 0; i < this.blocks.length; i++) {
      const block = this.blocks[i]
      if (!block.folded && !/^h[1-6]$/.test(block.type)) continue

      if (/^h[1-6]$/.test(block.type) && !block.folded) {
        // 未折叠的标题：检查后面是否有内容，决定是否显示折叠图标
        const level = parseInt(block.type.slice(1))
        let hasContent = false
        for (let j = i + 1; j < this.blocks.length; j++) {
          const next = this.blocks[j]
          if (/^h[1-6]$/.test(next.type) && parseInt(next.type.slice(1)) <= level) break
          hasContent = true
          break
        }
        block.hasFoldableContent = hasContent
      }
      // 折叠标题的 hasFoldableContent 已在第一轮正确标记
    }
  }

  /**
   * 折叠/展开指定标题 block。
   * 折叠时若 cursor 在将被隐藏的区域内，自动移到标题行末尾。
   */
  ContentState.prototype.toggleFold = function(headingKey) {
    const headingBlock = this.getBlock(headingKey)
    if (!headingBlock || !/^h[1-6]$/.test(headingBlock.type)) {
      writeLog(`toggleFold: block not found or not heading, key=${headingKey}`)
      return
    }

    headingBlock.folded = !headingBlock.folded
    writeLog(`toggleFold: ${headingBlock.type} key=${headingKey} folded=${headingBlock.folded}`)

    // 无论折叠/展开，都将 cursor 移到标题行末尾，确保 cursor 不在 display:none 区域
    const headingLine = headingBlock.children && headingBlock.children[0]
    if (headingLine) {
      const lineKey = headingLine.key
      const offset = headingLine.text ? headingLine.text.length : 0
      this.cursor = {
        start: { key: lineKey, offset },
        end: { key: lineKey, offset },
        isEdit: false
      }
    }

    this.render()
  }
}

export default foldCtrl

// foldCtrl.js - 标题折叠功能（#1869）

// 日志写入工具（写到本地文件，AI 可直接读取）
let _foldLogger = null
try {
  const _path = require('path')
  const _os   = require('os')
  const _fs   = require('fs')
  const _logFile = _path.join(_os.homedir(), 'marktext-fold.log')
  // 在首次加载时写入会话开始标记
  _fs.appendFileSync(_logFile, \n===== marktext 启动  =====\n, 'utf8')
  _foldLogger = (msg) => {
    try { _fs.appendFileSync(_logFile, [] \n, 'utf8') } catch (e) {}
    console.log('[FOLD]', msg)
  }
} catch (e) {
  _foldLogger = (msg) => console.log('[FOLD]', msg)
}

const foldCtrl = (ContentState) => {
  /**
   * 遍历所有 blocks，为每个 block 设置：
   *   block.hiddenByFold      {boolean} - 该 block 应被折叠隐藏
   *   block.hasFoldableContent {boolean} - 该标题行有可折叠内容
   *
   * 关键修复：子标题行（如 h2 在折叠 h1 内部）也必须隐藏
   */
  ContentState.prototype.markFoldedBlocks = function() {
    let hidingUntilLevel = null
    let hiddenCount = 0
    let foldedCount = this.blocks.filter(b => b.folded).length

    for (const block of this.blocks) {
      block.hiddenByFold = false
      block.hasFoldableContent = false

      if (/^h[1-6]$/.test(block.type)) {
        const level = parseInt(block.type.slice(1))

        if (hidingUntilLevel !== null) {
          if (level <= hidingUntilLevel) {
            // 遇到同级或更高级标题 → 停止隐藏
            hidingUntilLevel = null
          } else {
            // 关键修复：子标题在折叠区域内，也要隐藏
            block.hiddenByFold = true
            hiddenCount++
          }
        }

        // 如果该标题自身已折叠（且未被上级折叠隐藏），设置隐藏级别
        if (!block.hiddenByFold && block.folded) {
          hidingUntilLevel = level
          block.hasFoldableContent = true
        }
      } else {
        // 非标题 block
        if (hidingUntilLevel !== null) {
          block.hiddenByFold = true
          hiddenCount++
        }
      }
    }

    // 第二遍：为未折叠的标题检测是否有可折叠内容
    for (let i = 0; i < this.blocks.length; i++) {
      const block = this.blocks[i]
      if (!/^h[1-6]$/.test(block.type) || block.folded || block.hiddenByFold) continue
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

    _foldLogger(markFoldedBlocks: total= folded= hidden=)
  }

  /**
   * 折叠/展开指定标题 block。
   * 折叠时若 cursor 在被隐藏的 block 中，自动移到标题行末尾。
   */
  ContentState.prototype.toggleFold = function(headingKey) {
    _foldLogger(	oggleFold: key=)
    const headingBlock = this.getBlock(headingKey)
    if (!headingBlock || !/^h[1-6]$/.test(headingBlock.type)) {
      _foldLogger(	oggleFold: block not found or not a heading)
      return
    }

    const willFold = !headingBlock.folded
    headingBlock.folded = willFold
    _foldLogger(	oggleFold:  folded=)

    if (willFold && this.cursor) {
      const cursorKey = this.cursor.start.key
      const cursorBlock = this.getBlock(cursorKey)
      if (cursorBlock) {
        const outmost = this.findOutMostBlock(cursorBlock)
        if (outmost) {
          this.markFoldedBlocks()
          if (outmost.hiddenByFold) {
            const headingLine = headingBlock.children && headingBlock.children[0]
            if (headingLine) {
              const lineKey = headingLine.key
              const offset = headingLine.text ? headingLine.text.length : 0
              this.cursor = { start: { key: lineKey, offset }, end: { key: lineKey, offset }, isEdit: false }
              _foldLogger(	oggleFold: cursor moved to heading line)
            }
          }
        }
      }
    }

    _foldLogger(	oggleFold: calling render)
    this.render()
  }
}

export default foldCtrl
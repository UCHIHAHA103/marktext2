const foldCtrl = (ContentState) => {
  // 折叠逻辑日志工具 - 写入本地文件供 AI 读取
  let _log = null
  try {
    const _path = require('path')
    const _os   = require('os')
    const _fs   = require('fs')
    const _lf   = _path.join(_os.homedir(), 'marktext-fold.log')
    const _ts   = new Date().toLocaleString('zh-CN')
    _fs.appendFileSync(_lf, '\n===== marktext 启动 ' + _ts + ' =====\n', 'utf8')
    _log = function(msg) {
      try { _fs.appendFileSync(_lf, new Date().toLocaleTimeString() + ' ' + msg + '\n', 'utf8') } catch(e) {}
      console.log('[FOLD]', msg)
    }
  } catch(e) {
    _log = function(msg) { console.log('[FOLD]', msg) }
  }

  ContentState.prototype.markFoldedBlocks = function() {
    let hidingUntilLevel = null
    let hidden = 0
    for (const block of this.blocks) {
      block.hiddenByFold = false
      block.hasFoldableContent = false
      if (/^h[1-6]\$/.test(block.type)) {
        const level = parseInt(block.type.slice(1))
        if (hidingUntilLevel !== null) {
          if (level <= hidingUntilLevel) {
            hidingUntilLevel = null  // 遇到同级/更高级标题，停止隐藏
          } else {
            block.hiddenByFold = true  // 关键修复：子标题也要隐藏
            hidden++
          }
        }
        if (!block.hiddenByFold && block.folded) {
          hidingUntilLevel = level
          block.hasFoldableContent = true
        }
      } else if (hidingUntilLevel !== null) {
        block.hiddenByFold = true
        hidden++
      }
    }
    // 第二遍：检测未折叠标题是否有可折叠内容
    for (let i = 0; i < this.blocks.length; i++) {
      const block = this.blocks[i]
      if (!/^h[1-6]\$/.test(block.type) || block.folded || block.hiddenByFold) continue
      const level = parseInt(block.type.slice(1))
      let hasContent = false
      for (let j = i + 1; j < this.blocks.length; j++) {
        const next = this.blocks[j]
        if (/^h[1-6]\$/.test(next.type) && parseInt(next.type.slice(1)) <= level) break
        hasContent = true; break
      }
      block.hasFoldableContent = hasContent
    }
    _log('markFoldedBlocks: total=' + this.blocks.length + ' hidden=' + hidden)
  }

  ContentState.prototype.toggleFold = function(headingKey) {
    _log('toggleFold: ' + headingKey)
    const headingBlock = this.getBlock(headingKey)
    if (!headingBlock || !/^h[1-6]\$/.test(headingBlock.type)) {
      _log('toggleFold: block not found or not heading'); return
    }
    const willFold = !headingBlock.folded
    headingBlock.folded = willFold
    _log('toggleFold: ' + headingBlock.type + ' folded=' + willFold)
    if (willFold && this.cursor) {
      const cursorBlock = this.getBlock(this.cursor.start.key)
      if (cursorBlock) {
        const outmost = this.findOutMostBlock(cursorBlock)
        if (outmost) {
          this.markFoldedBlocks()
          if (outmost.hiddenByFold) {
            const headingLine = headingBlock.children && headingBlock.children[0]
            if (headingLine) {
              const offset = headingLine.text ? headingLine.text.length : 0
              this.cursor = { start: { key: headingLine.key, offset }, end: { key: headingLine.key, offset }, isEdit: false }
            }
          }
        }
      }
    }
    this.render()
  }
}

export default foldCtrl

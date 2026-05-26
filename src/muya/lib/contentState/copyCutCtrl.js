import selection from '../selection'
import { CLASS_OR_ID } from '../config'
import { escapeHTML } from '../utils'
import { getSanitizeHtml } from '../utils/exportHtml'
import ExportMarkdown from '../utils/exportMarkdown'
import marked from '../parser/marked'

const copyCutCtrl = (ContentState) => {
  ContentState.prototype.docCutHandler = function(event) {
    const { selectedTableCells } = this
    if (selectedTableCells) {
      event.preventDefault()
      return this.deleteSelectedTableCells(true)
    }
  }

  ContentState.prototype.cutHandler = function() {
    if (this.selectedTableCells) {
      return
    }
    const { selectedImage } = this
    if (selectedImage) {
      const { key, token } = selectedImage
      this.deleteImage({
        key,
        token
      })
      this.selectedImage = null
      return
    }
    const { start, end } = selection.getCursorRange()
    if (!start || !end) {
      return
    }
    const startBlock = this.getBlock(start.key)
    const endBlock = this.getBlock(end.key)
    startBlock.text =
      startBlock.text.substring(0, start.offset) + endBlock.text.substring(end.offset)
    if (start.key !== end.key) {
      this.removeBlocks(startBlock, endBlock)
    }
    this.cursor = {
      start,
      end: start,
      isEdit: true
    }
    this.checkInlineUpdate(startBlock)
    this.partialRender()
    this.muya.dispatchChange()
  }

  ContentState.prototype.getClipBoardData = function() {
    const { start, end } = selection.getCursorRange()
    if (!start || !end) {
      return { html: '', text: '' }
    }
    if (start.key === end.key) {
      const startBlock = this.getBlock(start.key)
      const { type, text, functionType } = startBlock
      // Fix issue #942
      if (type === 'span' && functionType === 'codeContent') {
        const selectedText = text.substring(start.offset, end.offset)
        return {
          html: marked(selectedText, this.muya.options),
          text: selectedText
        }
      }
    }
    const html = selection.getSelectionHtml()
    const virtualDoc = new DOMParser().parseFromString(html, 'text/html') // This ensures nothing is actually fetched when we do clean-up below
    const wrapper = virtualDoc.createElement('div')
    wrapper.innerHTML = html
    const removedElements = wrapper.querySelectorAll(
      `.${CLASS_OR_ID.AG_TOOL_BAR},
      .${CLASS_OR_ID.AG_MATH_RENDER},
      .${CLASS_OR_ID.AG_RUBY_RENDER},
      .${CLASS_OR_ID.AG_HTML_PREVIEW},
      .${CLASS_OR_ID.AG_MATH_PREVIEW},
      .${CLASS_OR_ID.AG_COPY_REMOVE},
      .${CLASS_OR_ID.AG_LANGUAGE_INPUT},
      .${CLASS_OR_ID.AG_HTML_TAG} br,
      .${CLASS_OR_ID.AG_FRONT_ICON}`
    )

    for (const e of removedElements) {
      e.remove()
    }

    // Fix #1678 copy task list, and the first list item is not task list item.
    const taskListItems = wrapper.querySelectorAll('li.ag-task-list-item')
    for (const item of taskListItems) {
      const firstChild = item.firstElementChild
      if (firstChild && firstChild.nodeName !== 'INPUT') {
        const originItem = document.querySelector(`#${item.id}`)
        let checked = false
        if (
          originItem &&
          originItem.firstElementChild &&
          originItem.firstElementChild.nodeName === 'INPUT'
        ) {
          checked = originItem.firstElementChild.checked
        }

        const input = document.createElement('input')
        input.setAttribute('type', 'checkbox')
        if (checked) {
          input.setAttribute('checked', true)
        }

        item.insertBefore(input, firstChild)
      }
    }

    // cleanSrc（去掉 file:// 和 ?msec=）→ data URL 的映射，用于富文本粘贴时内嵌图片
    const imgDataUrlMap = new Map()

    const imageWrappers = wrapper.querySelectorAll('span.ag-inline-image')
    for (const imageWrapper of imageWrappers) {
      const dataRaw = imageWrapper.getAttribute('data-raw')
      const image = imageWrapper.querySelector('img')

      if (!image) continue // image wasn't loaded for whatever reason
      // 2 types of images:
      // Type 1: ![alt](src "title")
      const markdownSrcMatch = dataRaw.match(/!\[\]\((.*)\)/) // ![](<stuff here>)
      // Type 2: <img ... />
      let finalSrc = ''

      if (markdownSrcMatch && markdownSrcMatch.length >= 2) {
        finalSrc = markdownSrcMatch[1]
      } else {
        const imgSrcMatch = dataRaw.match(/<img[^>]*\bsrc="([^"]*)"/)
        if (imgSrcMatch && imgSrcMatch.length >= 2) {
          finalSrc = imgSrcMatch[1]
        } else {
          // Fallback to the actual image src
          finalSrc = image.getAttribute('src')
        }
      }

      const cleanSrc = finalSrc
        .replace('file://', '') // We should not include file:// in the copied image path since markdown should not have the protocol specified
        .replace(/\?msec=\d+/, '') // We also want to remove the "msec" query parameter used for cache busting

      image.setAttribute('src', cleanSrc)

      // 同步生成 data URL：图片已在 DOM 中加载，canvas.drawImage 不需要等待
      // 用 imageWrapper.id 找到真实 DOM 元素，避免虚拟 doc 里的 img 未加载
      if (imageWrapper.id) {
        const realWrapper = document.getElementById(imageWrapper.id)
        if (realWrapper) {
          const realImg = realWrapper.querySelector('img')
          if (realImg && realImg.complete && realImg.naturalWidth > 0) {
            try {
              // 限制 2000px 宽，防止超大图片使 HTML 过大
              const maxW = Math.min(realImg.naturalWidth, 2000)
              const scale = maxW / realImg.naturalWidth
              const cv = document.createElement('canvas')
              cv.width = maxW
              cv.height = Math.round(realImg.naturalHeight * scale)
              cv.getContext('2d').drawImage(realImg, 0, 0, cv.width, cv.height)
              imgDataUrlMap.set(cleanSrc, cv.toDataURL('image/jpeg', 0.85))
            } catch (e) {
              console.warn('[copy-mixed] 生成图片 data URL 失败:', e)
            }
          }
        }
      }
    }

    const hrs = wrapper.querySelectorAll('[data-role=hr]')
    for (const hr of hrs) {
      hr.replaceWith(document.createElement('hr'))
    }

    const headers = wrapper.querySelectorAll('[data-head]')
    for (const header of headers) {
      const p = document.createElement('p')
      p.textContent = header.textContent
      header.replaceWith(p)
    }

    // replace inline rule element: code, a, strong, em, del, auto_link to span element
    // in order to escape turndown translation

    const inlineRuleElements = wrapper.querySelectorAll(
      `a.${CLASS_OR_ID.AG_INLINE_RULE},
      code.${CLASS_OR_ID.AG_INLINE_RULE},
      strong.${CLASS_OR_ID.AG_INLINE_RULE},
      em.${CLASS_OR_ID.AG_INLINE_RULE},
      del.${CLASS_OR_ID.AG_INLINE_RULE}`
    )
    for (const e of inlineRuleElements) {
      const span = document.createElement('span')
      span.textContent = e.textContent
      e.replaceWith(span)
    }

    const aLinks = wrapper.querySelectorAll(`.${CLASS_OR_ID.AG_A_LINK}`)
    for (const l of aLinks) {
      const span = document.createElement('span')
      span.innerHTML = l.innerHTML
      l.replaceWith(span)
    }

    const codefense = wrapper.querySelectorAll("pre[data-role$='code']")
    for (const cf of codefense) {
      const id = cf.id
      const block = this.getBlock(id)
      const language = block.lang || ''
      const codeContent = cf.querySelector('.ag-code-content')
      const value = escapeHTML(codeContent.textContent)
      cf.innerHTML = `<code class="language-${language}">${value}</code>`
    }

    const tightListItem = wrapper.querySelectorAll('.ag-tight-list-item')
    for (const li of tightListItem) {
      for (const item of li.childNodes) {
        if (
          item.tagName === 'P' &&
          item.childElementCount === 1 &&
          item.classList.contains('ag-paragraph')
        ) {
          li.replaceChild(item.firstElementChild, item)
        }
      }
    }

    const htmlBlock = wrapper.querySelectorAll("figure[data-role='HTML']")
    for (const hb of htmlBlock) {
      const codeContent = hb.querySelector('.ag-code-content')
      const pre = document.createElement('pre')
      pre.textContent = codeContent.textContent
      hb.replaceWith(pre)
    }

    // Just work for turndown, turndown will add `leading` and `traling` space in line-break.
    const lineBreaks = wrapper.querySelectorAll('span.ag-soft-line-break, span.ag-hard-line-break')
    for (const b of lineBreaks) {
      b.innerHTML = ''
    }

    const mathBlock = wrapper.querySelectorAll('figure.ag-container-block')
    for (const mb of mathBlock) {
      const preElement = mb.querySelector('pre[data-role]')
      const functionType = preElement.getAttribute('data-role')
      const codeContent = mb.querySelector('.ag-code-content')
      const value = codeContent.textContent
      let pre
      switch (functionType) {
        case 'multiplemath':
          pre = document.createElement('pre')
          pre.classList.add('multiple-math')
          pre.textContent = value
          mb.replaceWith(pre)
          break
        case 'mermaid':
        case 'flowchart':
        case 'sequence':
        case 'plantuml':
        case 'vega-lite':
          pre = document.createElement('pre')
          pre.innerHTML = `<code class="language-${functionType}">${value}</code>`
          mb.replaceWith(pre)
          break
      }
    }

    let htmlData = wrapper.innerHTML
    const textData = this.htmlToMarkdown(htmlData)
    let htmlRendered = marked(textData)

    // 将渲染后 HTML 中的图片路径替换为 data URL，实现飞书/Word 风格的富文本粘贴
    if (imgDataUrlMap.size > 0) {
      const richDoc = new DOMParser().parseFromString(htmlRendered, 'text/html')
      richDoc.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute('src')
        if (src && imgDataUrlMap.has(src)) {
          img.setAttribute('src', imgDataUrlMap.get(src))
        }
      })
      htmlRendered = richDoc.body.innerHTML
    }

    return { html: htmlRendered, text: textData }
  }

  ContentState.prototype.docCopyHandler = function(event) {
    const { selectedTableCells } = this
    if (selectedTableCells) {
      event.preventDefault()
      const { row, column, cells } = selectedTableCells
      const tableContents = []
      let i
      let j
      for (i = 0; i < row; i++) {
        const rowWrapper = []
        for (j = 0; j < column; j++) {
          const cell = cells[i * column + j]

          rowWrapper.push({
            text: cell.text,
            align: cell.align
          })
        }
        tableContents.push(rowWrapper)
      }

      if (row === 1 && column === 1) {
        // Copy cells text if only one is selected
        if (tableContents[0][0].text.length > 0) {
          event.clipboardData.setData('text/html', '')
          event.clipboardData.setData('text/plain', tableContents[0][0].text)
        }
      } else {
        // Copy as markdown table
        const figureBlock = this.createBlock('figure', {
          functionType: 'table'
        })
        const table = this.createTableInFigure({ rows: row, columns: column }, tableContents)
        this.appendChild(figureBlock, table)
        const { isGitlabCompatibilityEnabled, listIndentation } = this
        const markdown = new ExportMarkdown(
          [figureBlock],
          listIndentation,
          isGitlabCompatibilityEnabled
        ).generate()
        if (markdown.length > 0) {
          event.clipboardData.setData('text/html', '')
          event.clipboardData.setData('text/plain', markdown)
        }
      }
    }
  }

  ContentState.prototype.copyHandler = function(event, type, copyInfo = null) {
    if (this.selectedTableCells) {
      // Hand over to docCopyHandler
      return
    }
    event.preventDefault()
    const { selectedImage } = this
    if (selectedImage) {
      // 优先将真实图片位图写入剪贴板，而非 Markdown 语法文本
      // 注意：imageId 在 singleRender 后会变化，改用 absoluteImagePath 或 src 匹配
      const absPath = selectedImage.absoluteImagePath
      let imageEl = null
      if (absPath) {
        // 在所有已渲染的图片中找到 src 匹配的那一张
        const allImgs = document.querySelectorAll('.ag-inline-image img')
        for (const img of allImgs) {
          if (img.currentSrc === absPath || img.src === absPath) {
            imageEl = img
            break
          }
        }
      }
      const absUrl = selectedImage.absoluteImagePath || ''
      console.log('[copy-image] selectedImage:', absUrl, 'imageEl:', imageEl)

      if (typeof window !== 'undefined' && window.electron && window.electron.ipcRenderer) {
        // 优先路径：对本地 file:// 图片，直接传路径给主进程用 nativeImage.createFromPath 读文件
        // 避免 canvas→dataUrl→IPC 传输超大 base64（大图可达几百 MB，IPC 无法承受）
        if (absUrl.startsWith('file://')) {
          const cleanUrl = absUrl.split('?')[0]                   // 去掉 ?msec= 参数
          let localPath = ''
          if (cleanUrl.startsWith('file:///')) {
            localPath = decodeURIComponent(cleanUrl.slice(8))     // file:/// 后面是 C:/...
          } else if (cleanUrl.startsWith('file://')) {
            localPath = decodeURIComponent(cleanUrl.slice(7))
          }
          if (localPath) {
            console.log('[copy-image] 使用文件路径方式，path:', localPath)
            window.electron.ipcRenderer.invoke('mt::write-image-file-to-clipboard', localPath)
              .then(ok => console.log('[copy-image] 文件路径 IPC 结果:', ok, localPath))
              .catch(e => console.error('[copy-image] 文件路径 IPC 失败:', e))
            return
          }
        }

        // 降级：canvas→dataUrl 方式（适用于 blob: / data: URL）
        if (imageEl && imageEl.complete && imageEl.naturalWidth > 0) {
          try {
            const canvas = document.createElement('canvas')
            canvas.width = imageEl.naturalWidth
            canvas.height = imageEl.naturalHeight
            const ctx = canvas.getContext('2d')
            ctx.drawImage(imageEl, 0, 0)
            const dataUrl = canvas.toDataURL('image/png')
            console.log('[copy-image] canvas 方式，宽:', imageEl.naturalWidth, '高:', imageEl.naturalHeight)
            window.electron.ipcRenderer.invoke('mt::write-image-to-clipboard', dataUrl)
              .then(ok => console.log('[copy-image] canvas IPC 结果:', ok))
              .catch(e => console.error('[copy-image] canvas IPC 失败:', e))
            return
          } catch (e) {
            console.error('[copy-image] canvas 处理失败，降级为文本', e)
          }
        }
      } else {
        console.warn('[copy-image] ipcRenderer 不可用，imageEl:', imageEl)
      }
      // 降级：写入 Markdown 语法
      const { token } = selectedImage
      if (token.raw.length > 0) {
        event.clipboardData.setData('text/html', token.raw)
        event.clipboardData.setData('text/plain', token.raw)
      }
      return
    }

    const { html, text } = this.getClipBoardData()
    switch (type) {
      case 'normal': {
        if (text.length > 0) {
          // html 已内嵌图片 data URL，粘贴到飞书/Word 时图片可见
          // 纯文字选区 html 也只有 p/strong/em 等基础标签，不影响纯文本场景
          event.clipboardData.setData('text/html', html)
          event.clipboardData.setData('text/plain', text)
        }
        break
      }
      case 'copyAsRich': {
        if (text.length > 0) {
          event.clipboardData.setData('text/html', html)
          event.clipboardData.setData('text/plain', text)
        }
        break
      }
      case 'copyAsHtml': {
        if (text.length > 0) {
          event.clipboardData.setData('text/html', '')
          event.clipboardData.setData(
            'text/plain',
            getSanitizeHtml(text, {
              superSubScript: this.muya.options.superSubScript,
              footnote: this.muya.options.footnote,
              isGitlabCompatibilityEnabled: this.muya.options.isGitlabCompatibilityEnabled
            })
          )
        }
        break
      }

      case 'copyBlock': {
        const block = typeof copyInfo === 'string' ? this.getBlock(copyInfo) : copyInfo
        if (!block) return
        const anchor = this.getAnchor(block)
        const { isGitlabCompatibilityEnabled, listIndentation } = this
        const markdown = new ExportMarkdown(
          [anchor],
          listIndentation,
          isGitlabCompatibilityEnabled
        ).generate()
        if (markdown.length > 0) {
          event.clipboardData.setData('text/html', '')
          event.clipboardData.setData('text/plain', markdown)
        }
        break
      }

      case 'copyCodeContent': {
        const codeContent = copyInfo
        if (typeof codeContent !== 'string') {
          return
        }
        if (codeContent.length > 0) {
          event.clipboardData.setData('text/html', '')
          event.clipboardData.setData('text/plain', codeContent)
        }
      }
    }
  }
}

export default copyCutCtrl

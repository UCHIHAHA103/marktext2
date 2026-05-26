<template>
  <teleport to="body">
    <transition name="lightbox-fade">
      <div
        v-if="visible"
        class="image-lightbox-overlay"
        @click.self="close"
        @keydown.prevent
      >
        <!-- 关闭按钮 -->
        <button class="lightbox-close" title="关闭 (Esc)" @click="close">
          <svg viewBox="0 0 16 16" fill="currentColor"><path d="M2 2l12 12M14 2L2 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>

        <!-- 上一张 -->
        <button
          v-if="images.length > 1"
          class="lightbox-nav lightbox-prev"
          title="上一张 (←)"
          @click="prev"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
        </button>

        <!-- 图片容器 -->
        <div class="lightbox-stage" @click.self="close" @wheel.prevent="handleWheel">
          <img
            ref="imgRef"
            :src="currentSrc"
            class="lightbox-img"
            :style="imgStyle"
            draggable="false"
            @load="onImgLoad"
            @mousedown="startDrag"
          />
        </div>

        <!-- 下一张 -->
        <button
          v-if="images.length > 1"
          class="lightbox-nav lightbox-next"
          title="下一张 (→)"
          @click="next"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
        </button>

        <!-- 工具栏 -->
        <div class="lightbox-toolbar" @click.stop @wheel.stop>
          <span v-if="images.length > 1" class="lightbox-counter">
            {{ currentIndex + 1 }} / {{ images.length }}
          </span>
          <div class="toolbar-group">
            <button class="tb-btn" title="缩小 (-)" @click="zoomOut">
              <svg viewBox="0 0 20 20" fill="currentColor"><path d="M13 11h-6a1 1 0 000 2h6a1 1 0 000-2zm4.707 7.293l-3.182-3.182A7.965 7.965 0 0015 10a8 8 0 10-8 8 7.965 7.965 0 004.111-1.475l3.182 3.182a1 1 0 001.414-1.414zM10 16a6 6 0 110-12 6 6 0 010 12z"/></svg>
            </button>
            <span class="tb-percent">{{ Math.round(scale * 100) }}%</span>
            <button class="tb-btn" title="放大 (+)" @click="zoomIn">
              <svg viewBox="0 0 20 20" fill="currentColor"><path d="M17.707 16.293l-3.182-3.182A7.965 7.965 0 0015 10a8 8 0 10-8 8 7.965 7.965 0 004.111-1.475l3.182 3.182a1 1 0 001.414-1.414zM10 16a6 6 0 110-12 6 6 0 010 12zm1-9a1 1 0 00-2 0v2H7a1 1 0 000 2h2v2a1 1 0 002 0v-2h2a1 1 0 000-2h-2V7z"/></svg>
            </button>
          </div>
          <div class="toolbar-group">
            <button class="tb-btn tb-text" title="适应窗口" @click="fitToWindow">适配</button>
            <button class="tb-btn tb-text" title="原始尺寸 (1:1)" @click="originalSize">1:1</button>
          </div>
          <div class="toolbar-sep" />
          <div class="toolbar-group">
            <button class="tb-btn" title="向左旋转 (L)" @click="rotateLeft">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            </button>
            <button class="tb-btn" title="向右旋转 (R)" @click="rotateRight">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
            </button>
          </div>
          <div class="toolbar-sep" />
          <div class="toolbar-group">
            <button class="tb-btn" title="复制图片 (Ctrl+C)" @click="copyImage">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            </button>
            <button class="tb-btn" title="另存为 (S)" @click="saveImage">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  images: {
    type: Array,
    default: () => []
  },
  initialSrc: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'copy'])

const imgRef = ref(null)
const scale = ref(1)
const rotation = ref(0)
const translateX = ref(0)
const translateY = ref(0)
const currentIndex = ref(0)
let isDragging = false
let dragStartX = 0
let dragStartY = 0
let dragStartTX = 0
let dragStartTY = 0

const currentSrc = computed(() => {
  if (props.images.length === 0) return props.initialSrc
  return props.images[currentIndex.value]?.src || props.initialSrc
})

const imgStyle = computed(() => ({
  transform: `translate(${translateX.value}px, ${translateY.value}px) rotate(${rotation.value}deg) scale(${scale.value})`,
  cursor: scale.value > 1 ? 'grab' : 'default',
  transition: isDragging ? 'none' : 'transform 0.2s ease'
}))

// 当图片或列表变化时，重置到初始状态
watch(() => props.initialSrc, (src) => {
  if (!src) return
  const idx = props.images.findIndex(img => img.src === src)
  currentIndex.value = idx >= 0 ? idx : 0
  resetTransform()
})

watch(() => props.visible, (val) => {
  if (val) {
    const idx = props.images.findIndex(img => img.src === props.initialSrc)
    currentIndex.value = idx >= 0 ? idx : 0
    resetTransform()
  }
})

watch(currentIndex, () => resetTransform())

function resetTransform() {
  scale.value = 1
  rotation.value = 0
  translateX.value = 0
  translateY.value = 0
}

function onImgLoad() {
  // 图片加载后自动适配窗口
  nextTick(() => fitToWindow())
}

function fitToWindow() {
  if (!imgRef.value) return
  const img = imgRef.value
  const naturalW = img.naturalWidth || img.width
  const naturalH = img.naturalHeight || img.height
  if (!naturalW || !naturalH) return
  const maxW = window.innerWidth * 0.85
  const maxH = window.innerHeight * 0.80
  const scaleW = maxW / naturalW
  const scaleH = maxH / naturalH
  scale.value = Math.min(scaleW, scaleH, 1)
  translateX.value = 0
  translateY.value = 0
}

function originalSize() {
  scale.value = 1
  translateX.value = 0
  translateY.value = 0
}

function zoomIn() {
  scale.value = Math.min(scale.value * 1.25, 10)
}

function zoomOut() {
  scale.value = Math.max(scale.value / 1.25, 0.05)
}

function rotateLeft() {
  rotation.value -= 90
}

function rotateRight() {
  rotation.value += 90
}

function prev() {
  if (props.images.length <= 1) return
  currentIndex.value = (currentIndex.value - 1 + props.images.length) % props.images.length
}

function next() {
  if (props.images.length <= 1) return
  currentIndex.value = (currentIndex.value + 1) % props.images.length
}

function close() {
  emit('close')
}

function handleWheel(e) {
  const delta = e.deltaY < 0 ? 1.1 : 0.9
  scale.value = Math.max(0.05, Math.min(scale.value * delta, 10))
}

function startDrag(e) {
  if (e.button !== 0) return
  isDragging = true
  dragStartX = e.clientX
  dragStartY = e.clientY
  dragStartTX = translateX.value
  dragStartTY = translateY.value
  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', stopDrag)
}

function onDragMove(e) {
  if (!isDragging) return
  translateX.value = dragStartTX + (e.clientX - dragStartX)
  translateY.value = dragStartTY + (e.clientY - dragStartY)
}

function stopDrag() {
  isDragging = false
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', stopDrag)
}

async function copyImage() {
  try {
    const src = currentSrc.value
    if (!src) return
    // 通过 canvas 把图片写入剪贴板
    const img = new Image()
    img.crossOrigin = 'anonymous'
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
      img.src = src
    })
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)
    canvas.toBlob(async (blob) => {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      } catch {
        // Electron 环境 fallback：复制 src 文本
        navigator.clipboard.writeText(src).catch(() => {})
      }
    }, 'image/png')
  } catch (e) {
    console.error('复制图片失败', e)
  }
}

function saveImage() {
  const src = currentSrc.value
  if (!src) return
  // 利用隐藏 <a> 触发下载（支持 http/https/base64/file 协议）
  const a = document.createElement('a')
  a.href = src
  const filename = src.split('/').pop().split('?')[0] || 'image.png'
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

function handleKeydown(e) {
  if (!props.visible) return
  // 灯箱打开时，吞掉键盘事件，不让 muya 处理
  e.stopImmediatePropagation()
  e.preventDefault()
  switch (e.key) {
    case 'Escape':
    case ' ':
      close()
      break
    case 'ArrowLeft':
      prev()
      break
    case 'ArrowRight':
      next()
      break
    case '+':
    case '=':
      zoomIn()
      break
    case '-':
      zoomOut()
      break
    case 'l':
    case 'L':
      rotateLeft()
      break
    case 'r':
    case 'R':
      rotateRight()
      break
    case 's':
    case 'S':
      if (!e.ctrlKey && !e.metaKey) saveImage()
      break
    case 'c':
    case 'C':
      if (e.ctrlKey || e.metaKey) copyImage()
      break
  }
}

onMounted(() => {
  // capture:true 确保在 muya 的冒泡阶段处理之前先拦截
  document.addEventListener('keydown', handleKeydown, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown, true)
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', stopDrag)
})
</script>

<style scoped>
.image-lightbox-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.88);
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}

/* 淡入淡出动画 */
.lightbox-fade-enter-active,
.lightbox-fade-leave-active {
  transition: opacity 0.2s ease;
}
.lightbox-fade-enter-from,
.lightbox-fade-leave-to {
  opacity: 0;
}

/* 关闭按钮 */
.lightbox-close {
  position: absolute;
  top: 16px;
  right: 20px;
  z-index: 1;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.15s ease;
  padding: 0;
}
.lightbox-close:hover {
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
}
.lightbox-close svg {
  width: 16px;
  height: 16px;
}

/* 导航箭头 */
.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;
  width: 44px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.15s ease;
  padding: 0;
}
.lightbox-nav:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}
.lightbox-prev { left: 12px; }
.lightbox-next { right: 12px; }
.lightbox-nav svg {
  width: 24px;
  height: 24px;
}

/* 图片舞台 */
.lightbox-stage {
  flex: 1;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 60px 70px 80px;
  box-sizing: border-box;
}

.lightbox-img {
  max-width: none;
  max-height: none;
  display: block;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
  border-radius: 2px;
  transform-origin: center center;
}

/* 工具栏 */
.lightbox-toolbar {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(30, 30, 30, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 6px 12px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 1;
}

.lightbox-counter {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  margin-right: 6px;
  min-width: 44px;
  text-align: center;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.toolbar-sep {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.15);
  margin: 0 4px;
}

.tb-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.65);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
  padding: 0;
}
.tb-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}
.tb-btn svg {
  width: 17px;
  height: 17px;
  flex-shrink: 0;
}
.tb-btn.tb-text {
  width: auto;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 500;
}

.tb-percent {
  min-width: 38px;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
</style>

<template>
  <div
    class="side-bar-toc"
    :class="[{ 'side-bar-toc-overflow': !wordWrapInToc, 'side-bar-toc-wordwrap': wordWrapInToc }]"
  >
    <div class="pane-title">
      {{ t('sideBar.toc.title') }}
    </div>
    <el-tree
      v-if="toc.length"
      ref="tocTree"
      :data="toc"
      :default-expand-all="true"
      :props="defaultProps"
      :expand-on-click-node="false"
      :indent="10"
      node-key="slug"
      highlight-current
      @node-click="handleClick"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useEditorStore } from '@/store/editor'
import { usePreferencesStore } from '@/store/preferences'
import bus from '../../bus'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const editorStore = useEditorStore()
const preferencesStore = usePreferencesStore()

const tocTree = ref(null)

const defaultProps = {
  children: 'children',
  label: 'label'
}

const { toc } = storeToRefs(editorStore)
const { wordWrapInToc } = storeToRefs(preferencesStore)

const handleClick = ({ slug }) => {
  bus.emit('scroll-to-header', slug)
}

// 滚动联动高亮：编辑器广播当前阅读标题，高亮目录对应节点
const onActiveHeading = (slug) => {
  if (tocTree.value && slug) {
    tocTree.value.setCurrentKey(slug)
  }
}

onMounted(() => {
  bus.on('toc-active-heading', onActiveHeading)
})
onBeforeUnmount(() => {
  bus.off('toc-active-heading', onActiveHeading)
})
</script>

<style>
.side-bar-toc {
  /* 高度由父级（.float-layer--toc max-height 或 .fixed-body flex）控制，自身只决定布局方向 */
  margin: 0;
  padding: 0 0 8px 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.side-bar-toc .el-tree-node {
  margin-top: 8px;
}

.side-bar-toc .el-tree {
  background: transparent;
  color: var(--sideBarColor);
}

.side-bar-toc .el-tree-node:focus > .el-tree-node__content {
  background-color: var(--sideBarItemHoverBgColor);
}

.side-bar-toc .el-tree-node__content:hover {
  background: var(--sideBarItemHoverBgColor);
}

/* 滚动联动当前标题高亮：主题色文字 + 淡色背景 + 左侧色条 */
.side-bar-toc .el-tree-node.is-current > .el-tree-node__content {
  background: var(--themeColor10);
  box-shadow: inset 2px 0 0 var(--themeColor);
}
.side-bar-toc .el-tree-node.is-current > .el-tree-node__content .el-tree-node__label,
.side-bar-toc .el-tree-node.is-current > .el-tree-node__content {
  color: var(--themeColor);
}

.side-bar-toc > li {
  font-size: 14px;
  margin-bottom: 15px;
  cursor: pointer;
}
.side-bar-toc-overflow {
  overflow: auto;
}
.side-bar-toc-wordwrap {
  overflow-x: hidden;
  overflow-y: auto;
}

.side-bar-toc-wordwrap .el-tree-node__content {
  white-space: normal;
  height: auto;
  min-height: 26px;
}
</style>

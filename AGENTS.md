# marktext2 Agent Guide

marktext2 是基于 Electron + Vite 的 Markdown 编辑器，fork 自 marktext/marktext，
主分支 `release-v0.18-htmlfix`，仓库 `UCHIHAHA103/marktext2`。

## 项目结构

- `src/main/` — Electron 主进程（IPC、窗口管理、偏好设置、文件系统）
- `src/renderer/` — Vue 3 + Pinia 渲染进程（编辑器 UI、标签栏、设置页）
- `src/muya/` — 自研 contenteditable 编辑器内核（block tree 架构）
  - `lib/contentState/` — block 状态管理（cursor、copy/cut/paste、fold、table 等）
  - `lib/parser/` — Markdown 解析与渲染（marked Lexer + snabbdom vdom）
  - `lib/ui/` — 浮动 UI 组件（formatPicker、quickInsert、tableTools、codePicker 等）
  - `lib/utils/exportMarkdown.js` — block tree → Markdown 序列化
  - `lib/utils/importMarkdown.js` — Markdown → block tree 反序列化
- `.github/workflows/build-win.yml` — CI 构建（push 触发自动构建 Windows 安装包）

## 关键约束

- **公司网络过滤 git push**：推送代码必须用 GitHub REST API（见 `.cursor/rules/work-pc-github-ops.mdc`）
- **写文件必须无 BOM**：PowerShell 写 JSON 需用 `UTF8Encoding($false)`
- **多文件操作在同一个 Shell 调用内完成**，防止跨进程变量丢失
- gh CLI 路径：`C:\Program Files\GitHub CLI\gh.exe`

## Agent Skills

### Issue tracker

Issues 存放在 GitHub Issues，仓库 `UCHIHAHA103/marktext2`。详见 `docs/agents/issue-tracker.md`。

### Triage labels

使用默认 mattpocock 标签词汇（needs-triage / needs-info / ready-for-agent / ready-for-human / wontfix）。详见 `docs/agents/triage-labels.md`。

### Domain docs

单一上下文仓库——根目录一个 `CONTEXT.md` + `docs/adr/`。详见 `docs/agents/domain.md`。

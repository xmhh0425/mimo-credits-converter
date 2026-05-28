# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 提供本仓库的协作指引。

## 项目概述

日常好用的 Chrome 扩展集合（Manifest V3），各扩展独立为一个目录，互不依赖、无构建、无测试。
当前包含以下扩展，后续持续迭代：

- **mimo-credits-converter** — 小米 MiMo 开放平台：Credits → 人民币换算 + Token 消耗统计

## 架构

每个扩展目录包含各自的 `manifest.json` + 业务代码，以 `content_scripts` 方式注入目标页面。

## 开发流程

直接编辑对应扩展目录下的代码，然后在 `chrome://extensions/` 点击扩展卡片的刷新按钮，再刷新目标页面生效。

## mimo-credits-converter

`mimo-credits-converter/content.js` 是唯一业务代码，注入 `platform.xiaomimimo.com/console/plan-manage*`。

内部结构：
- CSS 类名统一前缀 `mimo-*`，运行时注入 `<head>`
- `MODEL_RATES` 定义各模型 RMB/M 费率；新增模型只改此处即可，统计表格自动识别 API 返回的模型名
- DOM 选择器依赖平台哈希类名（`[class*="Part1_usageFigure__"]`），平台改版后需同步更新
- API 调用均为同源请求（`credentials: 'include'`），认证通过 cookie 中 `api-platform_ph` 参数传递
- `MutationObserver` 监听 `#root` 变化，200ms 防抖 + 1.5s/4s 两次定时兜底

调试：在目标页面的 DevTools Console 查看输出，错误前缀为 `MiMo today usage:` / `MiMo monthly usage:`。

注意事项：
- 平台哈希类名会在每次部署后变化，选择器失效是最常见的 bug 来源
- 扩展仅匹配 `https://platform.xiaomimimo.com/console/plan-manage*`，其他页面不会注入
- 费率常量 `CREDITS_PER_YUAN = 100_000_000` 是硬编码换算比，若有变动需同步更新

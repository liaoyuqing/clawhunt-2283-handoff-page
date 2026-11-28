# 会员空间平台 · 转人工页（微信小程序 / TypeScript / TDesign）

订单 2283（S3-MINI-077）交付仓库：转人工问题提交页、处理进度详情页与对话记录气泡。接口层全部由 mock 数据实现，不依赖任何外部服务即可完整跑通。

## 页面与能力

| 页面 | 路径 | 能力 |
| --- | --- | --- |
| 转人工提交页 | `miniprogram/pages/support/handoff` | 问题分类 6 选 1、问题描述 10–500 字校验、截图最多 3 张（`wx.chooseMedia` + 上传凭证 mock）、来源标签、我的咨询列表、提交 |
| 处理进度详情页 | `miniprogram/pages/support/handoff-detail?id=` | 四段步骤条（排队中 / 处理中 / 已回复 / 已关闭）、对话记录气泡、回复输入框、关闭态结束提示 |
| 消息气泡组件 | `miniprogram/components/message-bubble` | 会员消息靠右、管家团队消息靠左，每条带时间 |

## 目录结构

```text
miniprogram/
  app.json app.ts app.wxss             小程序入口与全局样式
  pages/support/handoff.*              转人工提交页
  pages/support/handoff-detail.*       处理进度详情页
  components/message-bubble/*          对话气泡组件
  services/support.ts                  服务层（唯一数据出入口，mock 与真实接口的替换点）
  mock/support.ts                      mock 数据与服务实现
  utils/validation.ts                  描述与提交校验（纯函数）
  utils/status.ts                      状态步骤条、关闭态、工作时间提示、联系方式扫描（纯函数）
  utils/source.ts                      来源解析与标签（纯函数）
  utils/format.ts                      时间格式化与列表分组（纯函数）
  utils/query.ts                       页面入口参数解析（纯函数）
tests/                                 单元测试（vitest，node 环境直调纯函数）
docs/checks/                           类型检查与单元测试原始日志
docs/screenshots/                      各条验收所需截图
scripts/build-npm.mjs                  构建 npm 组件产物
```

## 依赖与环境

- Node.js ≥ 18（本地实测 v26.13.1），npm ≥ 9（实测 11.20.0）
- 微信开发者工具（用于真机模拟器预览与截图；纯跑测试不需要）
- 运行时依赖：`tdesign-miniprogram` 1.18.0
- 开发依赖：`typescript` 5.7.2、`vitest` 5.1.2、`miniprogram-api-typings` 5.3.1、`@types/node` 26.6.11

安装：

```powershell
npm install
```

预期输出：安装过程无 error，结束后生成 `node_modules` 与 `package-lock.json`，末尾出现 `added N packages` 一类统计行。

## 构建 npm 产物

小程序渲染 TDesign 组件需要先构建 npm：

```powershell
npm run build:npm
```

该脚本把 `node_modules/tdesign-miniprogram/miniprogram_dist` 复制到 `miniprogram/miniprogram_npm/tdesign-miniprogram`。

预期输出：

```text
[build-npm] tdesign-miniprogram@1.18.0 → <repo>/miniprogram/miniprogram_npm/tdesign-miniprogram
[build-npm] 产物文件数 1191，总字节 1533408
```

随后用微信开发者工具打开仓库根目录（`project.config.json` 所在层）即可预览，工具会自动把 `miniprogram/` 作为小程序根目录编译。

## 类型检查

```powershell
npm run typecheck
```

等价于 `npx tsc --noEmit`，覆盖 `miniprogram/` 与 `tests/` 全部 TypeScript 源文件（strict、noUnusedLocals、noUnusedParameters 全开）。

预期输出：无任何输出，退出码 0。日志见 `docs/checks/typecheck.log`（该文件为空即为通过）。

## 单元测试

```powershell
npm test
```

等价于 `npx vitest run`。四个测试文件、50 个用例，覆盖 5 条验收点里所有可纯函数断言的部分（含「页面文案不含礼宾」「FAQ 条目字典在仓库内」「截图索引与文件一一对应」三条返修自查用例）。

预期输出：

```text
 ✓ tests/status.spec.ts (13 tests)
 ✓ tests/repository.spec.ts (15 tests)
 ✓ tests/validation.spec.ts (12 tests)
 ✓ tests/source.spec.ts (10 tests)

 Test Files  4 passed (4)
      Tests  50 passed (50)
```

逐用例清单见 `docs/checks/unit-tests.log`（verbose 输出，每个用例一行）。

## 一键自检

```powershell
npm run verify
```

依次执行 `build:npm`、`typecheck`、`test`。三步都返回 0 即工程可交付。

## 页面入口参数

`pages/support/handoff` 支持以下 query（都只是入口解析，不改变页面内校验规则）：

| 参数 | 取值 | 作用 |
| --- | --- | --- |
| `source` / `from` | `faq` / `butler` | 带入来源并显示「来自：管家对话」；`faq` 未带条目时显示「来自：常见问题」；不传或非法值不渲染来源 |
| `faq_title` | FAQ 条目标题 | 与 `source=faq` 等价（带了即视为 FAQ 入口），显示「来自：FAQ <条目>」 |
| `faq_id` | FAQ 条目 id | 按 `mock/support.ts` 的条目字典查出标题后显示「来自：FAQ <条目>」，查不到退回「来自：常见问题」 |
| `hours` | `on` / `off` | 覆盖工作时间判定，用于展示两套提示文案；真实环境该值由后端 `in_work_hours` 提供 |
| `demo` | `short9` / `ok10` | 预填 9 字 / 10 字描述，用于展示提交按钮的禁用与可用对比 |
| `category` | 6 个分类 key 之一 | 预选分类 |

`pages/support/handoff-detail` 支持 `id=工单号` 或 `status=queued|in_progress|replied|closed`，不传默认打开 `H-1001`。

## 与真实接口的对接点

- 所有数据出入口收敛在 `miniprogram/services/support.ts` 的 `supportService`，替换该文件内部实现即可接入真实后端，页面无需改动。
- 提交入参已按约定携带 `category`、`description`、`source`、`sourceDetail`、`attachmentTokens`，来源与 FAQ 条目都不会被丢弃。
- 工作时间口径由 `utils/status.ts` 的 `DEFAULT_WORK_HOURS`（09:00–18:00，法定节假日顺延）描述，`workHoursTip(inWorkHours, config)` 的第二个参数可整体替换为后端下发的时间口径；页面只消费 `inWorkHours` 布尔值与文案，不硬编码时段。
- 订阅消息授权组件由另一工单实现，本仓库在 `services/support.ts` 预留了 `subscribeNotifier.requestReplyNotice(ticketId)` 调用点，当前为空实现，替换为 `wx.requestSubscribeMessage` 即可。
- 页面不展示任何员工联系方式；`utils/status.ts` 的 `scanContacts` 用于在测试中证明页面可见文案的联系方式命中数为 0。

## 证据

`docs/checks/` 是逐条命令的原始日志：`typecheck.log`（空文件即通过）、`unit-tests.log`（50 个用例逐行）、`verify.log`（一条命令跑完三步）、`devtools.log`（开发者工具 import/编译/页面入口与 console、network 抓取记录）。

`docs/screenshots/` 是微信开发者工具模拟器实拍截图，文件名前缀即验收点编号：

| 文件 | 对应验收点 | 画面内容 |
| --- | --- | --- |
| `ac1-9chars-disabled.jpg` | AC1 | 描述 9 字，红字提示「请至少填写 10 个字，便于我们准确理解您的问题」，计数 9/500，提交按钮置灰且下方同文案 |
| `ac1-10chars-enabled.jpg` | AC1 | 描述 10 字，提示消失，计数 10/500，提交按钮可点 |
| `ac2-source-faq.jpg` | AC2 | 从 FAQ 某条进入（`faq_id=FAQ-1012`），卡片内显示「来自：FAQ 工位空调出风小如何报修」 |
| `ac2-source-faq-basic.jpg` | AC2 | FAQ 入口未带条目（`source=faq`），退回类别文案「来自：常见问题」 |
| `ac2-source-butler.jpg` | AC2 | 从管家对话进入，显示「来自：管家对话」 |
| `ac3-step-queued.jpg` | AC3 | 排队中：仅第 1 段高亮，后 3 段未到达 |
| `ac3-step-in-progress.jpg` | AC3 | 处理中：第 1 段已完成打勾，第 2 段高亮，后 2 段未到达 |
| `ac3-step-replied.jpg` | AC3 | 已回复：前 3 段完成，第 3 段高亮，第 4 段未到达 |
| `ac3-step-closed.jpg` | AC3 | 已关闭：4 段全部完成，第 4 段高亮 |
| `ac4-open-input-present.jpg` | AC4 | 已回复态底部保留「补充说明您的问题 + 发送」输入栏 |
| `ac4-closed-no-input.jpg` | AC4 | 已关闭态输入栏消失，改为「本次服务已结束，如有新问题请重新提交」 |
| `ac5-work-hours-tip.jpg` | AC5 | 工作时间内：蓝底「服务时间 9:00–18:00（法定节假日顺延），提交后将按顺序处理」 |
| `ac5-off-hours-tip.jpg` | AC5 | 非工作时间：橙底「当前为非服务时间，提交后将于次日 9:00 起依次处理」 |

共 13 张，截图由微信开发者工具模拟器（iPhone 尺寸 428×926）实拍，未经任何后期处理；每张图的入口参数与画面文案原文逐条抄录在 `docs/screenshots/INDEX.md`（由单元测试校验与文件一一对应），同一批画面的 console error 与 network 请求抓取记录见 `docs/checks/devtools.log`。
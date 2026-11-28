# 截图索引（逐张的入口参数与画面可见文案原文）

全部 13 张截图由微信开发者工具模拟器实拍（429×926，iPhone 尺寸），未经后期处理，位于本目录。
本文件把每张图里**能读到文字**逐字抄录，便于不方便看图时按文本核验；截图本身仍是唯一的一手证据。

| 文件 | 页面与入口参数 | 画面可见文案（原文） |
| --- | --- | --- |
| `ac1-9chars-disabled.jpg` | `pages/support/handoff?demo=short9` | 导航「联系管家团队」；描述「空调出风很小请看看」；计数「9/500」；红字「请至少填写 10 个字，便于我们准确理解您的问题」；按钮「提交问题」置灰，按钮下方同文案 |
| `ac1-10chars-enabled.jpg` | `pages/support/handoff?demo=ok10` | 描述「空调出风很小请看看吧」；计数「10/500」；无红字；按钮「提交问题」蓝底可点 |
| `ac2-source-faq.jpg` | `pages/support/handoff?faq_id=FAQ-1012` | 顶部「来自：FAQ 工位空调出风小如何报修」 |
| `ac2-source-faq-basic.jpg` | `pages/support/handoff?source=faq` | 顶部「来自：常见问题」（未带条目时退回类别文案） |
| `ac2-source-butler.jpg` | `pages/support/handoff?source=butler` | 顶部「来自：管家对话」 |
| `ac3-step-queued.jpg` | `pages/support/handoff-detail?id=H-1001` | 分类「空间与设施」；状态「排队中」；「来自：FAQ 工位空调出风小如何报修」；步骤条 1「排队中」高亮、2/3/4 灰；气泡「二楼靠窗的独立工位最近空调出风很小，下午有点闷，想请物业看一下。」11-24 09:12 |
| `ac3-step-in-progress.jpg` | `pages/support/handoff-detail?id=H-1002` | 分类「会员权益」；状态「处理中」；「来自：管家对话」；步骤条 1 打勾、2「处理中」高亮、3/4 灰；气泡「企业会员权益里的会议室免费时长，本月是否还能再用两次？」11-23 14:05；「管家团队」回复「已收到，正在核对您企业本月的会议室使用记录，稍后回复。」11-23 14:38 |
| `ac3-step-replied.jpg` | `pages/support/handoff-detail?id=H-1003` | 分类「活动报名」；状态「已回复」；步骤条 1、2 打勾、3「已回复」高亮、4 灰；4 条气泡（会员 2 条、「管家团队」2 条，时间 11-21 10:30 / 11:02 / 11:15 / 11:20） |
| `ac3-step-closed.jpg` | `pages/support/handoff-detail?id=H-1004` | 分类「资源对接」；状态「已关闭」；「来自：FAQ 如何对接其他会员企业」；步骤条 4 段全部打勾、4「已关闭」高亮；4 条气泡；底部「本次服务已结束，如有新问题请重新提交」 |
| `ac4-open-input-present.jpg` | `pages/support/handoff-detail?id=H-1003` | 底部保留输入栏：输入框提示「补充说明您的问题」+「发送」按钮 |
| `ac4-closed-no-input.jpg` | `pages/support/handoff-detail?id=H-1004` | 底部无输入栏、无发送按钮；仅「本次服务已结束，如有新问题请重新提交」 |
| `ac5-work-hours-tip.jpg` | `pages/support/handoff?hours=on` | 蓝底提示「服务时间 9:00–18:00（法定节假日顺延），提交后将按顺序处理」 |
| `ac5-off-hours-tip.jpg` | `pages/support/handoff?hours=off` | 橙底提示「当前为非服务时间，提交后将于次日 9:00 起依次处理」 |

## 可复核的三处关键点

1. **入口参数不绕过校验**：`demo=short9` 只把 9 个字与分类写进页面 data，随后走与手输完全同一个 `refreshGate()` → `checkDescription()` / `submitGate()` 路径；因此截图上出现的是校验函数算出的红字与置灰按钮，而不是页面自写的假状态。单元测试在 `tests/validation.spec.ts` 里独立断言 9 字 `enabled === false`、`reason` 等于提示文案。
2. **FAQ 条目不是不可核对的远程数据**：`faq_id=FAQ-1012` 由仓库内的 `miniprogram/mock/support.ts` 的 `FAQ_ENTRIES` 字典解析（`'FAQ-1012': '工位空调出风小如何报修'`），字典与断言都在仓库里，可逐行读、可 `npm test` 复现。
3. **AC5 是两张独立截图**：`ac5-work-hours-tip.jpg`（`hours=on`）与 `ac5-off-hours-tip.jpg`（`hours=off`）分别是独立文件、独立入口参数、独立画面，文案与底色都不同；对应单元测试断言两套文案互不相同（`texts_differ === true`）。

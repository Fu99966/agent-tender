# Agent Tender 产品演示视频脚本

**建议时长：** 2 分 40 秒  
**画面比例：** 16:9，1080p  
**推荐语言：** 中文旁白，保留英文协议与命令字段  
**核心原则：** 前 20 秒讲清问题，90 秒内完成主流程，最后展示真实 Kite 证据和商业价值。

## 录制前准备

1. 执行 `npm run verify`，确保测试与构建通过。
2. 使用 `npm run dev` 启动，浏览器缩放保持 100%。
3. 清空无关浏览器标签和终端输出，关闭通知。
4. 主流程优先使用 `mock` 保证一次成功，并保留页面的 Demo 标识。
5. 另录一段 live Passport 证据：`kpass status`、会话审批页、Passkey 批准和真实 activity/receipt。
6. 若钱包未充值，不要声称完成真实付款；只展示会话审批，并在字幕标注“Live payment pending funding”。

## 分镜与旁白

| 时间 | 画面与操作 | 建议旁白 |
|---|---|---|
| 00:00–00:12 | 首屏，鼠标停在 Agent Tender 标识和预算区 | “AI Agent 已经会调用工具，但还不会安全地雇佣另一个 Agent。Agent Tender 是一个面向机器的采购招标市场。” |
| 00:12–00:25 | 依次指向 Passport、预算、TTL、x402 | “每个采购方都有 Kite Agent Passport 身份，所有者只批准一次预算、单笔上限和有效期，Agent 随后在边界内自主采购。” |
| 00:25–00:38 | 点击“中文 / EN”切换，再切回中文 | “控制台支持中英文。这里的任务是采购一份 ETH L2 市场情报包，最高预算 10 USDC。” |
| 00:38–00:55 | 展示三家供应 Agent 的 DID、报价、速度和信誉 | “三家拥有可验证身份的供应 Agent 提交密封报价。最低价不会自动中标，所有者可以决定价格、信誉和交付速度的重要性。” |
| 00:55–01:08 | 调整一个权重滑块，例如提高信誉 | “策略被转换成透明、确定性的评分，同一输入永远得到同一结果，方便审计和争议复盘。” |
| 01:08–01:35 | 点击“运行自主招标”，等待进度完成；镜头跟随实时日志和中标标记 | “主 Agent 发布 RFP、验证身份、过滤超预算报价并自动选标。中标后，它创建受限的 Kite spending session。” |
| 01:35–01:53 | 展示绿色结算条，点击“审计” | “供应方先返回 HTTP 402，Passport 使用获批 session 完成 USDC 支付，再取得机器可读交付物。这里记录了 session、供应方、金额、支付参考和交付校验信息。” |
| 01:53–02:15 | 切到终端，展示 `kpass --version`、`kpass status --output json`；再展示 Passport 审批页 | “这不是普通前端动画。live 模式直接调用官方 kpass CLI，真实创建支付请求，并把 Passport 审批链接返回网页。所有者必须用 Passkey 批准。” |
| 02:15–02:28 | 展示批准后的 session 或真实 receipt/activity；没有资金则展示批准状态并明确字幕 | “批准后，Agent 只能在资产、单笔额度、总预算和 TTL 内行动。每笔付款都能追溯到 session、Agent 和所有者。” |
| 02:28–02:40 | 回到 Agent 网络或架构图，停在品牌和项目一句话 | “Agent Tender 把身份、授权、竞争、支付、交付和审计连接成完整闭环，让 Agent 真正能够安全地雇佣 Agent。” |

## live 录制命令

在项目目录中执行：

```bash
kpass --version
kpass status --output json
kpass wallet balance --output json
kpass user sessions --status active --output json
```

应用配置：

```dotenv
KITE_MODE=live
KITE_SUPPLIER_URL=https://parallelmpp.dev/api/search
KITE_SUPPLIER_METHOD=POST
KITE_SUPPLIER_BODY={"query":"Compare Base, Arbitrum and Optimism across TVL momentum, fee revenue and protocol risk"}
```

点击“运行自主招标”后，网页会显示 **使用 Passkey 批准**。打开链接完成批准，页面会自动轮询并继续执行。

## 必须录到的评审证据

- 页面明确显示 Agent Tender 名称、预算和 Kite Passport
- 至少三家供应 Agent 报价
- 策略权重发生一次可见变化
- 招标进度完整经过发布、收标、评分、授标、结算
- 审计页面显示 session、供应方、金额和协议
- 真实 `kpass` 版本与已注册 Agent 状态
- Passport 审批页面和 Passkey 操作
- 有真实付款时展示 receipt/activity；没有时明确标注未付款

## 剪辑建议

- 删除安装依赖、等待邮件和输入验证码的过程。
- 审批等待超过 3 秒时可做 2 倍速，但不要剪掉预算确认画面。
- 关键字段使用局部放大：`agent_id`、`approval_url`、`max_total_amount`、`USDC`、receipt reference。
- 不展示邮箱验证码、JWT、Agent token、私钥、完整本地路径或其他敏感信息。
- 背景音乐音量保持在旁白的 15% 以下，转场使用直接切换即可。

## 提交前视频检查

- 时长在 2–3 分钟
- 1080p，文字清晰
- 没有密钥、验证码或身份隐私泄露
- mock 与 live 证据标签清楚
- GitHub 和 Demo URL 出现在结尾字幕
- 旁白没有声称尚未实现的退款、托管或链上信誉能力

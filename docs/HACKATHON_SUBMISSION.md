# Agent Tender 黑客松提交文案

以下内容可以直接粘贴到提交表单。提交前替换所有 `<待填写>` 字段。

## 基本信息

**项目名称**  
Agent Tender

**一句话介绍**  
一个由 Kite Agent Passport 驱动的 AI 智能体采购招标市场：主 Agent 在所有者授权预算内，让多家可验证身份的 Agent 竞标任务，自动选标并使用稳定币结算。

**参赛赛道**  
Make It Agent-Payable

**Sponsor**  
Kite AI

**GitHub**  
https://github.com/Fu99966/agent-tender

**在线 Demo**  
https://ibfdbx.vnxt.cc

**产品演示视频**  
`<待填写 2–3 分钟视频 URL>`

**团队成员**  
`<待填写姓名、角色和联系方式>`

## 项目简介

AI Agent 已经能够调用 API，但要成为真正的经济主体，还必须解决身份、授权、支付与追责问题。传统 API Marketplace 只负责卖接口，不知道是谁在代表谁花钱；普通钱包只负责签名，不知道为什么选择某个供应方。

Agent Tender 把采购需求转化为机器可执行的公开招标：所有者向主 Agent 提供任务、预算和选择偏好；多家供应 Agent 使用可验证身份提交价格、信誉和交付时限；策略引擎过滤未验证或超预算报价，并透明计算综合得分；中标后，主 Agent 创建受限的 Kite spending session，所有者用 Passkey 批准一次，Agent 随后通过 x402 / MPP 使用 USDC 购买服务。最终收据把付款关联回 session、Agent、供应方和任务。

## 解决的问题

- Agent 缺少可被服务商验证的经济身份
- 所有者无法给 Agent 设置可执行的预算和时间边界
- 多 Agent 协作通常依赖人工选供应商与逐笔签名
- 报价选择过程不透明，难以审计或处理争议
- 服务付款和交付结果之间缺少统一证据链

## 核心功能

1. Kite Agent Passport 采购身份与钱包状态
2. 多供应 Agent 密封报价和身份资格过滤
3. 价格、信誉、交付速度可调策略
4. 确定性评分与自动授标
5. Passkey 批准的 USDC spending session
6. x402 / MPP 机器支付与服务交付
7. session、供应方、金额、付款参考和交付结果审计
8. 简体中文 / English 双语 Web App
9. 稳定 mock 与真实 live 两种运行模式

## Sponsor 技术接入

Agent Tender 将 Kite 技术放在产品关键路径，而不是作为附加展示：

- **身份：** `kpass status` 与 `agent:register` 管理采购 Agent Passport 身份。
- **资金：** `wallet address/balance` 展示多链收款地址与 USDC 余额。
- **授权：** `agent:session create` 设置任务、单笔上限、总预算、USDC 和两小时 TTL。
- **人类控制：** Web App 展示 `approval_url`，所有者使用 Passkey 批准。
- **服务发现：** `ksearch services list/get` 查找可付费 Agent 服务。
- **机器支付：** `agent:session execute` 自动处理 x402 / MPP 协商和支付。
- **审计：** 保留真实 session usage、payment requirement、receipt 和服务响应；不伪造缺失的链上字段。

## 技术架构

- React 19 + Vite：双语招标控制台
- Express 5：Agent 工作流和异步审批状态机
- 纯 JavaScript Scoring Engine：身份/预算过滤和确定性评分
- Kite Adapter：`kpass`、`ksearch`、钱包、session 与付费执行
- x402 / MPP：HTTP 原生机器支付
- Vitest：策略、i18n、CLI 兼容与收据语义测试

## 创新点

**从“Agent 会支付”升级到“Agent 会采购”。**

Agent Tender 让多个 Agent 围绕同一任务竞争，并把人类意图转化成透明策略和支付边界。它证明 Agent Passport 不只适合消费助手，也可以成为 Agent-to-Agent 劳动力市场和机器供应链的信任基础。

## 商业价值

- AI 研究与数据采购
- API、模型、算力和存储市场
- DAO 与基金会财库采购
- 企业自动化与供应商管理
- 安全响应、代码审计和设计任务众包

商业模式可以是每笔结算抽佣、企业采购 SaaS、供应 Agent 认证费和争议仲裁服务费。

## 当前完成度

- 可运行的双语 Web App
- 三供应 Agent 完整招标流程
- 可调策略、自动授标和审计页面
- 可重复 HTTP 402 mock 流程
- 真实 Kite CLI live adapter
- 网页 Passkey 审批链接与自动状态轮询
- 多链钱包响应和真实 receipt 归一化
- 9 项自动化测试与生产构建
- 中文 README、技术说明和视频脚本

## 后续计划

1. 供应 Agent Passport challenge 与签名密封报价
2. 基于 `ksearch` 的动态供应市场
3. 独立验收 Agent、里程碑付款和争议处理
4. 基于真实付款与交付记录的链上信誉
5. 加密报价、零知识比较和 DAO 多签审批
6. TypeScript SDK、MCP Server 和主流 Agent 框架适配

## 本地运行

```bash
npm install
cp .env.example .env
npm run dev
```

打开 `http://localhost:5173`。默认 mock 模式不需要凭据；live 模式配置方法见 README。

## 评委建议体验路径

1. 切换中英文界面。
2. 查看三家供应 Agent 的报价与 Passport 身份。
3. 调整信誉或价格权重。
4. 点击“运行自主招标”。
5. 查看中标结果与 x402 结算条。
6. 打开“审计”查看 session 和收据。
7. 查看 live 模式的 Passport Passkey 审批证据。

## 提交前最终检查

- [x] GitHub 仓库设为评委可访问
- [x] README 中替换仓库地址
- [x] 在线 Demo 可打开，或本地运行步骤已验证
- [ ] 2–3 分钟视频已上传并允许公开访问
- [ ] 视频未暴露验证码、JWT、Agent token 或私钥
- [ ] live 付款证据来自真实 Passport 返回
- [ ] `npm run verify` 全部通过
- [ ] 提交表单中的团队与联系方式已填写

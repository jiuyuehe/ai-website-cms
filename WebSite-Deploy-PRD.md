# 官方模板驱动的静态网站构建与发布平台 · 产品需求文档

> **Document Version：v2.0**  
> **Product Name：Template-governed Static Website Publishing Platform**  
> **Status：PRD_READY / Detailed Design Input**  
> **更新时间：2026-08-10**  
> **唯一权威来源：`WebSite-Deploy-PRD.md`**

---

# 0. 文档权威与决策状态

## 0.1 唯一权威来源

本文件是当前项目产品目标、范围、业务边界、P0 要求、验收标准和产品级未决事项的唯一权威来源。

以下材料是本版本的需求澄清依据，不是并列需求源：

- `spec/planning-history/deep-interview-website-deploy-prd-clarification.md`
- `spec/planning-history/website-deploy-prd-clarification-interview.md`
- `spec/planning-history/website-deploy-prd-clarification-context.md`

后续架构、API、数据、安全、测试和任务文档必须引用本文件中的 Requirement ID，不得另行定义冲突的产品范围。

## 0.2 已确认的 P0

P0 必须包含：

1. 官方模板目录与模板管理；
2. 模板数据契约、AI 使用说明和示例 API；
3. 面向受信合作方的统一构建发布 API；
4. JSON 数据校验与静态网站构建；
5. 单 Web Server 节点部署；
6. 新建发布与更新发布；
7. Preview；
8. Release 历史与 Rollback；
9. Webhook；
10. 管理后台；
11. 平台自动域名与自动 HTTPS；
12. 自定义域名与自动 HTTPS。

## 0.3 已确认的后置范围

以下能力不属于 P0，且不承诺具体版本：

- Telemetry；
- 多节点调度、迁移和自动故障切换；
- 模板计费、购买、订阅、授权与市场；
- 租户自助注册、成员和复杂 RBAC；
- 租户自定义或上传模板。

## 0.4 技术选型边界

Meli、Caddy、SSH/rsync 均是详细设计阶段可评估的候选实现方案，不是产品需求硬约束。

详细设计可以选用、部分复用或替换这些方案，但必须满足本 PRD 的可观察产品行为与验收标准。

## 0.5 详细设计阶段待确定

以下内容不得在 PRD 阶段擅自冻结：

- `OD-API-001`：精确 API Schema、字段、状态枚举、错误码与兼容规则；
- `OD-TPL-001`：模板版本选择、升级、兼容、弃用与历史版本可重现策略；
- `OD-OPS-001`：单节点故障恢复目标，包括 RTO、RPO、备份、恢复流程和演练要求。

其它不改变产品范围的实现细节也由详细设计确定，见第 16 章。

---

# 1. 产品背景与问题

## 1.1 背景

项目已有 `sub-projects/AI-Static-Website-Platform`，具备基于结构化内容、Schema 和模板构建静态网站的能力。

目标不是把任意静态压缩包托管成一个通用部署产品，而是形成一个由 SaaS 统一管理官方模板、由受信合作系统通过 API 使用模板并完成网站发布的平台。

官方模板是平台的长期产品资产，未来可以演进为收费项目；P0 先建立模板治理、AI 数据说明、构建和发布闭环，不提前加入计费系统。

## 1.2 当前要解决的问题

受信合作系统需要一种稳定方式：

```text
选择平台官方模板
→ 获取模板所需的数据说明
→ 由 AI/合作方生成结构化渲染数据
→ 一次请求完成校验、构建和发布
→ 获得可访问的 HTTPS 静态网站
```

如果只允许合作方自行构建任意 Artifact，平台将无法保证其使用官方模板，也无法统一管理模板质量、数据契约和未来商业权益。

## 1.3 产品定位

> 本平台是面向少量受信合作系统开放的、官方模板驱动的静态网站构建与发布 SaaS。调用方选择官方模板并提交结构化内容及发布意图，平台负责校验、构建、Preview、单节点发布、Release、Rollback、平台域名、自定义域名、自动 HTTPS、Webhook 和运营管理。

平台不是：

- 任意 Artifact 托管平台；
- 通用 CMS；
- 动态应用运行平台；
- 多节点调度或容灾平台；
- Telemetry 或营销分析平台；
- 模板市场或计费系统；
- 访客表单提交系统。

---

# 2. 产品目标与成功指标

## 2.1 产品目标

| ID | 目标 | 说明 |
| --- | --- | --- |
| `PG-001` | 统一模板资产 | 官方模板由平台管理员统一发布、版本管理和下线 |
| `PG-002` | AI 可用的数据契约 | AI 能通过 API 获取结构化契约、说明与示例，生成可校验的渲染数据 |
| `PG-003` | 一次调用完成发布 | 合作方无需理解内部构建、Artifact 和服务器细节 |
| `PG-004` | 发布安全 | 更新失败不破坏当前线上版本，支持 Preview、Release 和 Rollback |
| `PG-005` | 域名自动化 | 发布后自动获得平台 HTTPS 地址，并支持异步绑定自定义域名 |
| `PG-006` | 严格数据边界 | 本平台不接收、不转发、不存储访客表单业务数据 |
| `PG-007` | 控制复杂度 | P0 只支持单节点和受信合作方，不提前实现多节点、Telemetry 或计费 |

## 2.2 P0 成功指标

1. 合作方能选择官方模板，并获取对应数据契约、AI 说明和示例；
2. 合作方能通过统一接口完成新建发布和更新发布；
3. 有效请求最终生成一个可访问的平台 HTTPS 地址；
4. 无效模板数据在生产切换前被拒绝，并返回可定位的问题；
5. 更新发布失败时，旧网站继续可访问；
6. Preview 不修改当前 Production；
7. 保留范围内的历史 Release 可以回滚；
8. 自定义域名未完成 DNS/TLS 时，不阻塞平台域名发布成功；
9. 不同合作方不能访问或修改彼此的站点、发布、域名和凭证；
10. 访客表单数据不会进入本平台的 API、日志或存储。

P0 不设多节点高可用承诺。单节点故障恢复指标属于 `OD-OPS-001`。

---

# 3. 用户、角色与信任边界

## 3.1 角色

| 角色 | P0 职责与权限 |
| --- | --- |
| Platform Admin | 管理官方模板、合作方凭证、站点、发布、Preview、Release、Rollback、域名、证书状态、Webhook 和单节点运行状态 |
| Partner API Client | 使用独立 API 凭证读取模板及数据说明，创建/更新自己名下的站点并管理被授权资源 |
| Website Visitor | 访问静态网站；表单业务数据直接提交给合作方 Public API |

## 3.2 合作方模型

- P0 仅服务少量受信合作系统；
- 合作方不自助注册；
- Platform Admin 为每个合作方发放独立 API 凭证；
- 每个凭证必须绑定唯一合作方身份；
- 合作方之间必须进行服务端资源隔离；
- P0 不提供组织成员、席位、角色编排或租户自助后台。

## 3.3 信任边界

```text
Partner Backend
  │ Management Credential
  ▼
Unified Publishing API
  │ internal orchestration
  ├─ Template Contract / Validation / Build
  └─ Preview / Release / Domain / Publish

Website Visitor Browser
  ├─ GET Static Website → Platform Runtime
  └─ POST Business Form → Partner Public API
```

管理凭证不得进入静态页面、浏览器存储、公开配置或发布产物。

---

# 4. 核心术语与对象

| 术语 | 定义 |
| --- | --- |
| Official Template | 由平台管理员发布和管理、供合作方选择的官方模板 |
| Template Data Contract | 描述模板渲染数据字段、类型、必填性、约束和示例的结构化契约 |
| AI Guidance | 与结构化契约一并返回、帮助 AI 构造合法数据的说明文本和示例 |
| Partner | 获得管理员签发 API 凭证的受信合作系统 |
| Site | 合作方在平台中的网站身份和发布边界 |
| Preview | 不改变当前 Production 的预览发布 |
| Release | 一次可追踪、不可被原地修改的成功构建发布版本 |
| Deployment | 构建、发布、验证或回滚的一次异步操作 |
| Platform Hostname | 平台自动生成并自动管理 HTTPS 的站点域名 |
| Custom Domain | 合作方配置 DNS 后由平台验证、路由并自动管理 HTTPS 的域名 |
| Active Release | 当前由 Production 提供访问的 Release |

P0 核心对象：

```text
Partner
APICredential
OfficialTemplate
TemplateDataContract
Site
Deployment
Release
Preview
Domain
CertificateStatus
Webhook
WebhookDelivery
AuditRecord
RuntimeServerConfig
```

P0 不包含：

```text
TelemetryEvent
TelemetryAggregate
NodeScheduler
MigrationPlan
TemplatePrice
TemplateOrder
TenantMember
CustomTenantTemplate
BusinessSubmission
```

---

# 5. 产品范围

## 5.1 P0 模块

| 模块 | P0 能力 |
| --- | --- |
| 官方模板 | 模板上架、下线、列表、详情、版本信息 |
| 模板数据说明 | 结构化契约、AI 说明、示例的数据接口 |
| 统一构建发布 | 模板选择、JSON 校验、构建、新建发布、更新发布、状态查询 |
| Preview | 创建不影响 Production 的预览版本 |
| Release / Rollback | Release 历史、Active Release、保留范围内回滚 |
| 单节点 Runtime | 将静态内容发布到一个受管理的 Web Server |
| Domain / HTTPS | 平台域名、自定义域名、证书申请、状态和续期 |
| Webhook | 异步发布结果通知和投递状态 |
| 管理后台 | P0 运营、配置、状态、审计和故障定位入口 |
| 安全与隔离 | API 凭证、合作方隔离、审计、表单数据边界 |

## 5.2 后置能力

| ID | 后置能力 | 说明 |
| --- | --- | --- |
| `DEF-TEL-001` | Telemetry | SDK、Collector、事件、存储、查询和分析全部后置 |
| `DEF-NODE-001` | 多节点 | 调度、评分、Drain、迁移、自动故障切换和跨区全部后置 |
| `DEF-BILL-001` | 模板商业化 | 计费、订单、订阅、授权、权益和模板市场后置 |
| `DEF-TENANT-001` | 租户自助 | 注册、成员、复杂 RBAC、席位与自助凭证后置 |
| `DEF-TPL-001` | 租户模板 | 合作方上传、编辑或管理自定义模板后置 |

后置不等于 P1 承诺。进入某个后续版本前必须重新确认真实需求、成本和验收标准。

## 5.3 明确非目标

- 动态 PHP、Java、Node.js、Python 等站点服务端 Runtime；
- Site-per-Container 或 Kubernetes 调度；
- 任意反向代理和任意服务器配置注入；
- 调用方上传任意模板；
- 公开的两阶段“先构建 Artifact、再部署 Artifact”合作方流程；
- 通用 Artifact 托管产品；
- Telemetry、营销分析、AI 优化建议；
- 访客表单收件箱或业务提交 API。

---

# 6. 核心用户旅程

## 6.1 获取模板和数据说明

```text
Partner API Client
→ 查询可用官方模板
→ 查看模板详情和可用版本信息
→ 获取 Template Data Contract + AI Guidance + Examples
→ AI/合作方生成结构化渲染数据
```

API 返回数据，不返回仓库文件路径，也不要求调用方下载 `data_struct.md`。

## 6.2 首次发布

```text
Authenticate Partner
→ Select Official Template
→ Submit Structured Content + New Publish Intent
→ Validate Partner / Template / Data
→ Build Static Website
→ Create Release
→ Deploy To P0 Runtime Server
→ Verify Platform HTTPS URL
→ Mark Publication Successful
→ Notify By Webhook
```

首次发布成功以平台生成的 HTTPS 地址可访问为准，不等待自定义域名完成。

## 6.3 更新发布

```text
Authenticate Partner
→ Identify Existing Site
→ Submit Template + Structured Content + Update Intent
→ Validate And Build Candidate Release
→ Verify Candidate
→ Atomically Activate Candidate
→ Keep Previous Release Available For Rollback
```

失败的候选版本不得覆盖 Active Release。

## 6.4 Preview

Preview 必须提供独立访问地址，并且创建、更新或失败均不得修改 Production Active Release。

Preview 的访问控制、有效期、撤销、清理和搜索引擎策略在详细设计阶段确定。

## 6.5 Rollback

平台支持将仍在保留范围内的历史 Release 原子地重新设为 Active Release。回滚失败不得破坏当前 Active Release。

Release 保留策略在详细设计阶段确定，并必须在产品界面/API 中可见。

## 6.6 自定义域名

```text
Platform URL Already Active
→ Partner Requests Custom Domain
→ Platform Returns DNS Instructions
→ Partner Configures DNS
→ Platform Verifies Ownership And Routing
→ Platform Issues Certificate
→ Custom Domain Becomes Active
```

DNS 或 TLS 失败只影响该自定义域名，不回滚已成功的平台域名发布。

## 6.7 表单业务提交

```text
Website Visitor
→ Static Website Form
→ Partner Public API
```

本平台不位于该请求链路中。

---

# 7. 官方模板与数据契约要求

### `TPL-001` 官方模板所有权

P0 只允许 Platform Admin 创建、发布、更新、下线和查看官方模板。

### `TPL-002` 模板目录

Partner API Client 可以读取被允许使用的模板列表和模板详情，但不能修改模板。

模板目录至少提供足以选择模板的信息，包括模板标识、名称、状态、版本信息、用途摘要和数据说明入口。精确字段属于 `OD-API-001`。

### `TPL-003` 模板数据说明

每个可用模板必须提供：

1. 结构化 Template Data Contract；
2. 面向 AI 的说明文本；
3. 最小示例和完整示例；
4. 与当前模板版本关系明确的数据契约标识。

结构化契约是数据校验依据；说明文本和示例用于帮助 AI 生成符合契约的数据。

### `TPL-004` 契约来源一致性

模板数据说明不得通过直接返回 Markdown 文件实现。

详细设计必须确定一个可验证的权威结构化来源，并防止 Schema、模板、AI 说明和示例静默漂移。

### `TPL-005` 模板版本开放决策

平台必须显示模板版本信息，但模板版本选择、升级和兼容策略由 `OD-TPL-001` 决定。在该决策完成前，不得宣称模板升级自动兼容历史内容。

### `TPL-006` P0 模板边界

合作方不能上传、修改或发布自定义模板；模板计费和授权不属于 P0。

---

# 8. 统一构建发布要求

### `PUB-001` 统一发布入口

合作方通过一个统一产品边界提交模板选择、结构化内容和新建/更新发布意图。

调用方无需感知内部构建进程、Artifact、文件同步协议、Web Server 配置、证书存储或服务器目录。

### `PUB-002` 新建与更新

平台必须区分新建发布和更新已有 Site。Site 身份、调用方引用和并发控制的精确契约由详细设计定义。

### `PUB-003` 异步结果

构建发布属于耗时操作。P0 必须支持：

- 接受请求后返回可查询的操作身份；
- 查询进行中、成功和失败结果；
- 通过 Webhook 接收最终通知；
- API 超时后仍可对最终结果进行 Reconcile。

精确状态枚举属于 `OD-API-001`。

### `PUB-004` 重试与重复请求

网络重试不得无意创建多个 Site 或重复激活相同发布。详细设计必须定义幂等和并发规则，但 PRD 不提前固定 Header、字段或锁实现。

### `BLD-001` 数据校验

平台必须在构建和生产激活前，根据所选模板的数据契约校验结构化内容。

校验失败必须返回可定位到字段/约束的错误，不得产生可激活 Release。

### `BLD-002` 静态构建

通过校验的数据被构建为静态 HTML、CSS、JavaScript 和所需静态资源。

现有 `sub-projects/AI-Static-Website-Platform` 是可复用能力，但它以库、进程、Worker 或独立内部服务存在，由详细设计确定。

### `BLD-003` 构建隔离

一个合作方或 Site 的构建输入、临时文件、产物和错误不得泄露给其它合作方。

### `BLD-004` 内部 Artifact

内部可以生成、保存和传递不可变 Artifact，但 Artifact 是实现边界，不是 P0 合作方必须操作的公共产品对象。

---

# 9. Preview、Release 与 Rollback

### `PRV-001` Production 隔离

Preview 创建、更新或失败均不得修改 Production Active Release。

### `PRV-002` Preview 访问

成功 Preview 必须提供独立访问地址，并明确识别其非 Production 状态。

### `PRV-003` Preview 生命周期

Preview 的访问控制、有效期、撤销和清理规则在详细设计阶段确定。P0 不得默认把所有 Preview 永久公开。

### `REL-001` 不可变 Release

一次成功构建发布形成一个可追踪 Release。Release 不得被原地修改为另一份内容。

### `REL-002` 原子激活

Production 切换必须是原子的。构建、部署或验证失败时，上一 Active Release 继续服务。

### `REL-003` Release 历史

Platform Admin 和被授权合作方可以查看 Release 历史、当前 Active Release 和可回滚状态。

### `REL-004` Rollback

平台必须支持将仍在保留范围内的历史 Release 重新设为 Active Release。

### `REL-005` 保留策略

详细设计必须明确 Release/Artifact 保留数量或时长、清理规则和不可回滚提示。PRD 不预设具体数值。

---

# 10. 单节点 Runtime

### `RUN-001` 单节点

P0 只要求配置并管理一个 Web Server 节点。平台不得依赖多节点 Scheduler 才能完成发布。

### `RUN-002` 静态访问

已发布网站由 Web Server 直接提供静态资源。网站访问不应依赖每次请求调用控制平面。

### `RUN-003` 发布失败隔离

不完整、未验证或失败的候选产物不得成为线上 Active Release。

### `RUN-004` 运行状态

管理后台必须显示与单节点发布相关的基本状态和可操作错误。精确探测方式属于详细设计。

### `RUN-005` 不承诺多节点 HA

P0 不承诺自动故障切换、零停机迁移或跨区容灾。单节点故障恢复目标由 `OD-OPS-001` 决定。

## 10.1 候选实现方案

详细设计可以评估但不限于：

- Meli 或其部分能力作为控制面候选；
- Caddy 作为静态服务和自动 HTTPS 候选；
- SSH/rsync 作为部署传输候选。

选型必须以 P0 简单性、可维护性、安全性、回滚能力和域名自动化适配性为依据。PRD 不要求二开 Meli，也不要求固定使用 Caddy 或 SSH/rsync。

---

# 11. Domain 与 HTTPS

### `DOM-001` 平台域名自动生成

首次发布时，平台自动为 Site 生成平台控制的二级、三级或其它所需层级的域名，不要求合作方配置 DNS。

### `DOM-002` 平台域名自动 HTTPS

平台自动申请、安装、管理和续期平台域名证书。

### `DOM-003` 发布成功条件

平台域名通过 HTTPS 可访问后，发布可以成功。自定义域名未完成不阻塞该结果。

### `DOM-004` 自定义域名异步绑定

合作方可以为 Site 发起自定义域名绑定。平台返回真实 DNS 配置说明，并异步验证。

### `DOM-005` 所有权与路由验证

平台在激活自定义域名前必须验证域名控制权、DNS 指向和目标 Site 关系，防止域名劫持或跨合作方绑定。

### `DOM-006` 自定义域名 HTTPS

验证通过后，平台自动申请、安装、管理和续期证书。

### `DOM-007` 独立失败边界

自定义域名 DNS 或 TLS 失败不得破坏平台域名，也不得回滚已成功的 Release。

### `DOM-008` 状态可见

合作方和 Platform Admin 必须看到等待 DNS、处理中、已激活或失败等可操作状态。精确状态名称属于 `OD-API-001`。

---

# 12. Webhook

### `WHK-001` 发布结果通知

合作方可以配置 Webhook 以接收发布成功和失败的最终通知。

### `WHK-002` 可靠投递

Webhook 投递失败不回滚已成功发布。平台必须支持有限重试和投递结果查询。

### `WHK-003` 安全与去重

Webhook 必须具备来源完整性验证和事件去重依据。签名算法、Envelope、重试退避和事件列表由详细设计确定。

### `WHK-004` 最终事实

Webhook 是通知机制，不是唯一状态源。合作方必须能通过管理 API 查询最终结果。

---

# 13. 管理后台

## 13.1 P0 信息架构

```text
Overview
Official Templates
Partners & API Credentials
Sites
Deployments
Previews
Releases & Rollback
Domains & HTTPS
Webhooks
Runtime Server
Audit
```

明确不包含：

```text
Telemetry
Template Billing / Marketplace
Tenant Self-service Members
Business Submission Inbox
Multi-node Scheduler
```

### `ADM-001` 模板管理

Platform Admin 可以管理官方模板及其发布状态，并检查模板数据说明是否完整。

### `ADM-002` 合作方与凭证

Platform Admin 可以创建、停用和轮换合作方 API 凭证，并查看其作用边界和最后使用状态。

### `ADM-003` 发布运营

Platform Admin 可以查看站点、发布步骤、错误、Preview、Release、Rollback、域名、证书和 Webhook 投递状态。

### `ADM-004` 危险操作

删除、下线、回滚、停用凭证、解绑域名等操作必须提供明确影响说明、确认和结果反馈。

### `ADM-005` 状态完整性

页面必须覆盖加载、空、成功、失败、权限拒绝、处理中和重试状态。具体 UI 设计在详细开发文档阶段确定。

---

# 14. 数据、安全与审计边界

## 14.1 平台可以处理的数据

### `DATA-001` 模板产品数据

平台可以保存官方模板元数据、模板数据契约、AI 说明和示例。

### `DATA-002` 网站渲染数据

平台可以处理完成校验、重建、发布和回滚所必要的网站结构化内容、构建元数据、Release 和内部 Artifact。

网站渲染数据与访客表单业务数据是不同数据类别，不得混淆。

### `DATA-003` 运营元数据

平台可以保存合作方、凭证摘要、Site、Deployment、Release、Preview、Domain、Certificate Status、Webhook 和审计元数据。

### `DATA-004` 保留与删除

详细设计必须定义网站内容、Release、内部 Artifact、操作日志和审计记录的保留及删除规则，并保证删除不会绕过必要审计。

## 14.2 表单业务数据

### `FORM-001` 正确链路

```text
Browser
→ Partner Public API
```

### `FORM-002` 平台禁止行为

本平台不得：

- 提供通用表单提交入口；
- 接收或代理访客表单请求；
- 缓存、排队或重试表单业务 Payload；
- 存储姓名、电话、邮箱、消息、申请内容或附件；
- 在日志、Webhook、审计或构建数据中记录表单字段值。

### `FORM-003` 外部故障

合作方 Public API 故障时，表单提交失败由合作方处理。本平台不得临时接管数据。

## 14.3 身份、权限与隔离

### `SEC-001` 独立凭证

每个合作方使用独立强随机 API 凭证。平台只保存不可直接还原的凭证表示或受控 Secret 引用。

### `SEC-002` 服务端授权

所有合作方请求必须在服务端校验其对 Site、Template、Deployment、Release、Domain 和 Webhook 的访问权限。

### `SEC-003` 合作方隔离

任何 ID、筛选参数或引用字段都不能绕过合作方隔离。

### `SEC-004` 浏览器边界

管理凭证不得进入浏览器静态产物、公开配置、客户端存储或表单请求。

### `SEC-005` 管理面与客户站点隔离

管理后台的 Cookie、Session 和 Origin 边界不得覆盖或信任客户静态站点。

### `SEC-006` 构建输入安全

结构化内容、媒体和模板构建过程必须进行输入验证、资源限制和路径隔离。具体 Sandbox、文件限制和恶意内容策略由安全详细设计确定。

## 14.4 审计

### `AUD-001` 写操作审计

模板、凭证、Site、发布、Rollback、域名和 Webhook 的管理写操作必须记录 actor、partner、action、resource、request correlation、timestamp、result 和 safe change summary。

审计不得记录 Secret 或访客表单字段值。

---

# 15. 非功能需求

## 15.1 可靠性

| ID | 要求 |
| --- | --- |
| `NFR-REL-001` | 发布和回滚失败不得破坏当前 Active Release |
| `NFR-REL-002` | 已发布静态网站不应依赖控制平面处理每个访问请求 |
| `NFR-REL-003` | API 超时不能被直接解释为发布失败，最终状态必须可查询 |
| `NFR-REL-004` | 单节点故障恢复目标在详细设计阶段确定，P0 不虚假承诺多节点 HA |

## 15.2 性能与容量

| ID | 要求 |
| --- | --- |
| `NFR-PERF-001` | 静态资源应由适合生产静态服务的 Runtime 直接提供 |
| `NFR-PERF-002` | 构建发布采用异步处理，不要求长时间占用同步 API 请求 |
| `NFR-PERF-003` | P0 容量假设按单节点测量；站点数、包大小和并发限制在详细设计阶段给出证据 |

## 15.3 安全

| ID | 要求 |
| --- | --- |
| `NFR-SEC-001` | 所有管理和合作方 API 使用 HTTPS |
| `NFR-SEC-002` | 凭证支持停用和轮换，不在日志中明文出现 |
| `NFR-SEC-003` | 自定义域名激活前验证控制权和 Site 归属 |
| `NFR-SEC-004` | 构建、发布和管理操作遵守最小权限 |
| `NFR-SEC-005` | Webhook 具备完整性校验、超时、响应大小限制和回调目标安全校验 |

## 15.4 可运维性

| ID | 要求 |
| --- | --- |
| `NFR-OPS-001` | 能关联一次外部请求、构建、发布、验证和 Webhook 投递 |
| `NFR-OPS-002` | 管理后台提供可操作错误，不只显示未知失败 |
| `NFR-OPS-003` | 证书申请和续期失败可见且可重试 |
| `NFR-OPS-004` | 日志和审计遵守合作方隔离、Secret 脱敏和表单数据禁入规则 |

## 15.5 可访问性与兼容性

- 管理后台支持键盘操作、清晰焦点、语义化状态和可读错误；
- 支持当前主流桌面浏览器；
- 已发布网站的浏览器兼容性由官方模板契约和模板验收共同保证；
- 具体浏览器版本矩阵在详细开发文档阶段确定。

---

# 16. 详细设计 Open Decisions

## 16.1 阻塞公共契约冻结的决策

### `OD-API-001` 精确 API Schema

需要定义但不得在 PRD 中猜测：Template、Site、Publish、Preview、Deployment、Release、Rollback、Domain/DNS/TLS、Webhook、分页、错误和兼容契约。

### `OD-TPL-001` 模板版本兼容

需要确定调用方版本选择、数据契约变更、历史 Site 更新、模板下线、Release 可重现和未来权益兼容规则。

### `OD-OPS-001` 单节点故障恢复

需要确定备份范围、RTO、RPO、节点重建、域名与证书恢复、演练和验收证据。

## 16.2 其它详细设计决策

| ID | 决策 |
| --- | --- |
| `OD-PRV-001` | Preview 访问控制、有效期、撤销和清理 |
| `OD-REL-001` | Release/Artifact 保留策略和不可回滚提示 |
| `OD-WHK-001` | Webhook 事件范围、签名、重试和回调安全机制 |
| `OD-DOM-001` | 自定义域名数量、主域名、重定向和证书提供方策略 |
| `OD-AUTH-001` | API 凭证 Scope、轮换流程和管理员认证方式 |
| `OD-ADM-001` | 管理后台页面级交互和危险操作确认细节 |
| `OD-TECH-001` | Meli/Caddy/SSH-rsync 等候选方案的适配性结论 |

---

# 17. 异常与边界行为

| 场景 | P0 期望 |
| --- | --- |
| 模板不存在或不可用 | 在构建前拒绝，返回可操作错误 |
| JSON 不符合模板契约 | 在构建/激活前拒绝，指出字段或约束问题 |
| 构建失败 | 不创建可激活 Release，不影响当前 Production |
| 发布传输或验证失败 | 不激活不完整产物，状态可查询和重试 |
| API 请求超时 | 通过操作身份或请求关联查询最终状态 |
| Preview 失败 | Production 不受影响 |
| Rollback 失败 | 当前 Active Release 不受影响 |
| 目标 Release 不再保留 | 明确告知不可回滚，不伪造成功 |
| 平台域名证书失败 | 发布不能标记为可访问成功，错误可操作 |
| 自定义域名 DNS/TLS 失败 | 平台域名继续访问，自定义域名单独失败/等待 |
| Webhook 失败 | 重试并记录，不回滚成功发布 |
| 单节点故障 | 不承诺自动切换；按 `OD-OPS-001` 的恢复设计处理 |
| 合作方 Public API 故障 | 表单提交失败，本平台不接管任何业务数据 |

---

# 18. P0 验收标准

| ID | 验收标准 | 关联需求 | 预期证据 |
| --- | --- | --- | --- |
| `AC-001` | 管理员可发布官方模板，合作方可读取模板列表与详情 | `TPL-001` `TPL-002` | API/UI 自动化测试 |
| `AC-002` | 模板数据说明 API 返回结构化契约、AI 说明、最小/完整示例，不返回文件路径 | `TPL-003` `TPL-004` | Schema 与响应测试 |
| `AC-003` | 合法统一发布请求可完成校验、构建、发布并返回平台 HTTPS 地址 | `PUB-001` `BLD-001` `BLD-002` `DOM-001` | 端到端测试 |
| `AC-004` | 非法模板数据在激活前被拒绝并返回字段级错误 | `BLD-001` | 负向契约测试 |
| `AC-005` | 重试请求不会意外重复创建或重复激活发布 | `PUB-004` | 幂等/并发测试 |
| `AC-006` | 更新构建或发布失败时旧网站仍可访问 | `REL-002` `NFR-REL-001` | 故障注入测试 |
| `AC-007` | Preview 可访问且不修改 Production Active Release | `PRV-001` `PRV-002` | 集成测试 |
| `AC-008` | 保留范围内历史 Release 可回滚，回滚失败不破坏当前版本 | `REL-003` `REL-004` | 回滚测试 |
| `AC-009` | 平台自动生成域名并自动完成证书申请、使用和续期验证 | `DOM-001` `DOM-002` | 域名/TLS 集成测试 |
| `AC-010` | 自定义域名等待 DNS/TLS 时平台域名发布仍为成功 | `DOM-003` `DOM-004` `DOM-007` | 状态机集成测试 |
| `AC-011` | 自定义域名未经控制权和合作方归属验证不能激活 | `DOM-005` | 安全测试 |
| `AC-012` | Webhook 可通知最终结果，重复通知可去重，失败不回滚发布 | `WHK-001` `WHK-002` `WHK-003` | Webhook 集成测试 |
| `AC-013` | 管理后台覆盖 P0 模块和关键加载/空/失败/处理状态 | `ADM-001` 至 `ADM-005` | 浏览器验收 |
| `AC-014` | 合作方 A 无法读取或修改合作方 B 的资源 | `SEC-001` 至 `SEC-003` | 越权安全测试 |
| `AC-015` | 静态产物和浏览器不包含管理 API 凭证 | `SEC-004` | 构建产物扫描 |
| `AC-016` | 表单直接调用合作方 API，本平台 API、日志和存储无表单字段值 | `FORM-001` 至 `FORM-003` | 网络与数据边界测试 |
| `AC-017` | P0 在未配置 Scheduler 的单节点环境完成所有发布流程 | `RUN-001` | 部署验收 |
| `AC-018` | 产品中不存在 Telemetry、多节点调度、模板计费、租户自助或自定义模板入口 | `DEF-TEL-001` `DEF-NODE-001` `DEF-BILL-001` `DEF-TENANT-001` `DEF-TPL-001` | API/UI 范围检查 |

---

# 19. Requirement ID 与优先级

## 19.1 P0 Requirement IDs

```text
TPL-001 .. TPL-006
PUB-001 .. PUB-004
BLD-001 .. BLD-004
PRV-001 .. PRV-003
REL-001 .. REL-005
RUN-001 .. RUN-005
DOM-001 .. DOM-008
WHK-001 .. WHK-004
ADM-001 .. ADM-005
DATA-001 .. DATA-004
FORM-001 .. FORM-003
SEC-001 .. SEC-006
AUD-001
NFR-REL-001 .. NFR-REL-004
NFR-PERF-001 .. NFR-PERF-003
NFR-SEC-001 .. NFR-SEC-005
NFR-OPS-001 .. NFR-OPS-004
AC-001 .. AC-018
```

## 19.2 Deferred IDs

```text
DEF-TEL-001
DEF-NODE-001
DEF-BILL-001
DEF-TENANT-001
DEF-TPL-001
```

## 19.3 Open Decision IDs

```text
OD-API-001
OD-TPL-001
OD-OPS-001
OD-PRV-001
OD-REL-001
OD-WHK-001
OD-DOM-001
OD-AUTH-001
OD-ADM-001
OD-TECH-001
```

Requirement ID 只表示稳定引用，不等于已经完成详细设计或实现。

---

# 20. 路线图

## 20.1 P0

交付第 5.1 节的完整闭环，并通过第 18 章验收。

## 20.2 后续评估池

只有获得真实需求、成本与验收依据后，才评估：

1. Telemetry；
2. 多节点调度、迁移和高可用；
3. 模板计费与市场；
4. 租户自助与成员权限；
5. 租户自定义模板。

不得因为旧 PRD、历史版本号或候选技术自带能力而自动恢复这些范围。

---

# 21. 风险与依赖

| ID | 风险/依赖 | 当前处理 |
| --- | --- | --- |
| `RSK-001` | 模板 Schema、AI 说明、示例和实际模板发生漂移 | 详细设计建立单一结构化来源和一致性校验 |
| `RSK-002` | 模板版本策略未定导致历史 Site 不可重现 | `OD-TPL-001` 在 API/数据设计前关闭 |
| `RSK-003` | 单节点故障导致所有站点不可用 | 不宣称 HA；通过 `OD-OPS-001` 定义备份和恢复目标 |
| `RSK-004` | 自动证书受 DNS、CA 配额或续期失败影响 | 详细设计提供状态、告警、重试和运行手册 |
| `RSK-005` | 统一发布 API 重试造成重复发布 | 详细设计定义幂等和并发契约 |
| `RSK-006` | 合作方内容或媒体造成构建安全风险 | 详细设计定义输入、资源、路径和构建隔离控制 |
| `RSK-007` | 现有生成器与新服务边界不清 | 架构设计先评估复用方式，不在 PRD 中预设微服务拆分 |

外部依赖至少包括：

- 受管理的单台 Runtime Server；
- 平台域名与 DNS 控制能力；
- 证书签发服务；
- 合作方可接收 Webhook 的 Backend；
- 合作方自己的表单 Public API。

---

# 22. PRD Readiness

## 22.1 结论

```text
PRD readiness for detailed development design:
READY_WITH_NON_BLOCKING_GAPS
```

理由：

- 产品问题、目标用户、P0、后置范围和非目标已明确；
- 核心旅程、数据边界、安全边界和验收标准已明确；
- Meli、Caddy、SSH/rsync 已从产品硬约束降为候选方案；
- Telemetry 和多节点能力已从 P0 完整移除；
- 剩余问题已显式登记为详细设计 Open Decisions，不阻塞进入详细开发设计。

## 22.2 实现 Readiness

```text
Implementation readiness:
NOT_READY
```

在以下工作完成前不得开始业务代码实现：

1. 完成 `OD-API-001` 公共 API 契约；
2. 完成 `OD-TPL-001` 模板版本兼容策略；
3. 完成 `OD-OPS-001` 单节点故障恢复目标；
4. 生成并审计必要的架构、数据、安全、API、UI、测试和运维详细开发文档；
5. 依据本 PRD 的 Requirement ID 建立可执行任务与追踪关系。

---

# 最终产品边界

```text
Platform
= Official Template Governance
+ Template Data Contract And AI Guidance
+ Unified Static Build And Publish API
+ Single-node Runtime
+ Preview / Release / Rollback
+ Platform And Custom Domain HTTPS
+ Webhook
+ Administration

Platform
!= Telemetry
!= Multi-node Scheduler Or Migration
!= Template Billing Or Marketplace
!= Tenant Self-service
!= Tenant-authored Templates
!= Business Form Submission System

Browser Form
→ Partner Public API

Meli / Caddy / SSH-rsync
= Candidate Design Options, Not Product Requirements
```

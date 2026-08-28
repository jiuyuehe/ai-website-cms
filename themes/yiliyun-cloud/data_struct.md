# yiliyun-cloud theme data contract

## Overview

The theme keeps brand identity, copy, SEO, and content media in the canonical project data. Appearance defaults are shipped in `tokens.json` and emitted into CSS custom properties.

`yiliyun-cloud` 是一粒云 SaaS 企业网盘的蓝色软件产品主题。它面向 B 端软件介绍场景，首页在标准 hero / intro / capabilities 之外扩展了 `features`、`valueBand`、`pricing`、`roadmap`、`private` 等落地页模块，帮助企业把「产品能力 + 定价 + 未来规划 + 私有化」在一页内讲清楚。

```data-struct
{
  "version": 2,
  "theme": {"id": "yiliyun-cloud", "version": "1.0.0", "themeApiVersion": 1, "description": "Blue SaaS enterprise cloud drive theme with configurable brand, products, scenarios, pricing, roadmap, and private-deployment sections."},
  "sources": {
    "schemas": ["schemas/site.schema.json", "schemas/home.schema.json", "schemas/product.schema.json", "schemas/case.schema.json", "schemas/news.schema.json", "schemas/download.schema.json", "schemas/faq.schema.json"],
    "viewModels": ["engine/builder.js#buildViewModel", "engine/seo.js#pageSeo"],
    "templates": ["themes/yiliyun-cloud/templates/pages", "themes/yiliyun-cloud/templates/partials"],
    "contentRoots": ["content/site.json", "content/pages/home.json", "content/products", "content/cases", "content/news", "content/downloads", "content/faqs"],
    "themeConfig": ["tokens.json", "theme.json"]
  },
  "brand": {
    "nameField": "site.name",
    "descriptionField": "site.description",
    "logoField": "site.logo",
    "logoSlot": "brand-logo",
    "fallback": "When site.logo.src is absent, render site.shortName as a text wordmark; never fetch a remote logo."
  },
  "seo": {
    "titleField": "page.seo.title",
    "descriptionField": "page.seo.description",
    "canonicalField": "page.seo.canonical",
    "robotsIndexField": "page.seo.robots",
    "robotsFollowField": "page.seo.robots",
    "shareImageField": "page.seo.image"
  },
  "contentRules": {
    "rawHtml": "forbidden",
    "unknownFields": "forbidden",
    "codeVisuals": "forbidden",
    "dataSubmission": "external-component-only"
  },
  "pageTypes": [
    {
      "id": "home",
      "label": "Home",
      "routes": ["index.html"],
      "templates": ["templates/pages/home.hbs"],
      "requiredFields": ["site.name", "site.description", "site.logo", "site.contact.email", "page.seo.title", "page.seo.description", "page.seo.image", "page.seo.canonical", "page.seo.robots", "page.hero.slides", "page.hero.slides[].media", "page.intro.title", "page.intro.body", "page.capabilities"],
      "optionalFields": ["page.features", "page.valueBand", "page.pricing", "page.roadmap", "page.private", "page.sectionHeadings", "page.products", "page.cases", "page.news", "page.products[].cover", "page.cases[].cover", "page.news[].cover"]
    },
    {
      "id": "productsIndex",
      "label": "Products index",
      "routes": ["products/index.html"],
      "templates": ["templates/pages/products-index.hbs"],
      "requiredFields": ["site.name", "site.description", "site.logo", "site.contact.email", "page.seo.title", "page.seo.description", "page.seo.image", "page.seo.canonical", "page.seo.robots", "page.items"],
      "optionalFields": ["page.items[].cover"]
    },
    {
      "id": "productDetail",
      "label": "Product detail",
      "routes": ["products/:id/index.html"],
      "templates": ["templates/pages/product-detail.hbs"],
      "requiredFields": ["site.name", "site.description", "site.logo", "site.contact.email", "page.seo.title", "page.seo.description", "page.seo.image", "page.seo.canonical", "page.seo.robots", "page.item.title", "page.item.summary", "page.item.cover", "page.item.content.intro", "page.item.content.features", "page.item.content.advantages", "page.item.content.scenarios"],
      "optionalFields": ["page.item.content.faq"]
    },
    {
      "id": "casesIndex",
      "label": "Scenarios index",
      "routes": ["cases/index.html"],
      "templates": ["templates/pages/cases-index.hbs"],
      "requiredFields": ["site.name", "site.description", "site.logo", "site.contact.email", "page.seo.title", "page.seo.description", "page.seo.image", "page.seo.canonical", "page.seo.robots", "page.items"],
      "optionalFields": ["page.items[].cover"]
    },
    {
      "id": "caseDetail",
      "label": "Scenario detail",
      "routes": ["cases/:id/index.html"],
      "templates": ["templates/pages/case-detail.hbs"],
      "requiredFields": ["site.name", "site.description", "site.logo", "site.contact.email", "page.seo.title", "page.seo.description", "page.seo.image", "page.seo.canonical", "page.seo.robots", "page.item.title", "page.item.summary", "page.item.cover", "page.item.challenge", "page.item.solution", "page.item.results"],
      "optionalFields": []
    },
    {
      "id": "newsIndex",
      "label": "Media index",
      "routes": ["news/index.html"],
      "templates": ["templates/pages/news-index.hbs"],
      "requiredFields": ["site.name", "site.description", "site.logo", "site.contact.email", "page.seo.title", "page.seo.description", "page.seo.image", "page.seo.canonical", "page.seo.robots", "page.items"],
      "optionalFields": ["page.items[].cover"]
    },
    {
      "id": "newsDetail",
      "label": "Media detail",
      "routes": ["news/:id/index.html"],
      "templates": ["templates/pages/news-detail.hbs"],
      "requiredFields": ["site.name", "site.description", "site.logo", "site.contact.email", "page.seo.title", "page.seo.description", "page.seo.image", "page.seo.canonical", "page.seo.robots", "page.item.title", "page.item.summary", "page.item.cover", "page.item.publishedAt", "page.item.blocks"],
      "optionalFields": []
    },
    {
      "id": "downloadsIndex",
      "label": "Downloads index",
      "routes": ["downloads/index.html"],
      "templates": ["templates/pages/downloads-index.hbs"],
      "requiredFields": ["site.name", "site.description", "site.logo", "site.contact.email", "page.seo.title", "page.seo.description", "page.seo.image", "page.seo.canonical", "page.seo.robots", "page.items"],
      "optionalFields": []
    },
    {
      "id": "faqIndex",
      "label": "FAQ index",
      "routes": ["faq/index.html"],
      "templates": ["templates/pages/faq-index.hbs"],
      "requiredFields": ["site.name", "site.description", "site.logo", "site.contact.email", "page.seo.title", "page.seo.description", "page.seo.image", "page.seo.canonical", "page.seo.robots", "page.items"],
      "optionalFields": []
    },
    {
      "id": "notFound",
      "label": "Not found",
      "routes": ["404.html"],
      "templates": ["templates/pages/not-found.hbs"],
      "requiredFields": ["site.name", "site.description", "site.logo", "site.contact.email", "page.seo.title", "page.seo.description", "page.seo.image", "page.seo.canonical", "page.seo.robots"],
      "optionalFields": []
    }
  ],
  "fields": [
    {"path": "site.name", "type": "string", "requirement": "required", "description": "品牌名，用于 header、footer、SEO 与 JSON-LD。", "consumers": ["templates/partials/header.hbs", "templates/partials/footer.hbs"]},
    {"path": "site.shortName", "type": "string", "requirement": "required", "description": "短品牌名，用于无 logo 时的文字 wordmark。", "consumers": ["templates/partials/header.hbs", "templates/partials/footer.hbs"]},
    {"path": "site.description", "type": "text", "requirement": "required", "description": "企业一句话介绍，用于 footer 与元信息。", "consumers": ["templates/partials/footer.hbs"]},
    {"path": "site.logo", "type": "media", "requirement": "required", "description": "本地品牌标志与 alt 文本。", "fallback": "Render site.shortName as a text wordmark when src is absent.", "consumers": ["templates/partials/header.hbs", "templates/partials/footer.hbs"]},
    {"path": "site.contact.email", "type": "email", "requirement": "required", "description": "联系邮箱，用于 header CTA、contact band 与 footer。", "consumers": ["templates/pages/home.hbs", "templates/partials/footer.hbs"]},
    {"path": "site.contact.phone", "type": "string", "requirement": "required", "description": "联系电话，footer 展示，引擎会生成 phoneHref。", "consumers": ["templates/partials/footer.hbs"]},
    {"path": "site.contact.address", "type": "string", "requirement": "required", "description": "联系地址。", "consumers": ["templates/partials/footer.hbs"]},
    {"path": "site.navigation", "type": "array", "requirement": "required", "description": "主导航，指向各 index 页面路由。", "consumers": ["templates/partials/header.hbs"]},
    {"path": "site.headerActions", "type": "array", "requirement": "optional", "description": "header 右侧 CTA 按钮；route 允许 #锚点、mailto:/tel:、https 或内部路由。", "consumers": ["templates/partials/header.hbs"]},
    {"path": "site.footerGroups", "type": "array", "requirement": "optional", "description": "footer 链接分组。", "consumers": ["templates/partials/footer.hbs"]},
    {"path": "page.seo.title", "type": "string", "requirement": "required", "description": "页面 SEO 标题。", "consumers": ["templates/partials/page-head.hbs"]},
    {"path": "page.seo.description", "type": "text", "requirement": "required", "description": "页面 SEO 描述。", "consumers": ["templates/partials/page-head.hbs"]},
    {"path": "page.seo.image", "type": "url", "requirement": "required", "description": "分享图。", "consumers": ["templates/partials/page-head.hbs"]},
    {"path": "page.hero.slides", "type": "array", "requirement": "home required", "description": "首页 hero 轮播。", "consumers": ["templates/pages/home.hbs"]},
    {"path": "page.hero.slides[].eyebrow", "type": "string", "requirement": "optional", "description": "hero 顶部标签。", "consumers": ["templates/pages/home.hbs"]},
    {"path": "page.hero.slides[].title", "type": "string", "requirement": "required", "description": "hero 主标题。", "consumers": ["templates/pages/home.hbs"]},
    {"path": "page.hero.slides[].summary", "type": "string", "requirement": "required", "description": "hero 描述。", "consumers": ["templates/pages/home.hbs"]},
    {"path": "page.hero.slides[].media", "type": "media", "requirement": "required", "description": "hero 主视觉图；无图时主题回退到内置的产品界面示意。", "consumers": ["templates/pages/home.hbs"]},
    {"path": "page.hero.slides[].actions", "type": "array", "requirement": "required", "description": "hero 行动按钮。", "consumers": ["templates/pages/home.hbs"]},
    {"path": "page.intro.title", "type": "string", "requirement": "required", "description": "intro 区标题。", "consumers": ["templates/pages/home.hbs"]},
    {"path": "page.intro.body", "type": "text", "requirement": "required", "description": "intro 区描述。", "consumers": ["templates/pages/home.hbs"]},
    {"path": "page.capabilities", "type": "array", "requirement": "home required", "description": "intro 卡片（3-6 项，展示为 3 列卡片）。icon 限枚举。", "consumers": ["templates/pages/home.hbs"]},
    {"path": "page.features", "type": "array", "requirement": "home optional", "description": "核心能力卡片（3-12 项）。icon 为自由字符串，主题会解析为 lucide 图标。", "consumers": ["templates/pages/home.hbs"]},
    {"path": "page.valueBand", "type": "object", "requirement": "home optional", "description": "深色价值条：title + body + tags + metrics（value/label）。", "consumers": ["templates/pages/home.hbs"]},
    {"path": "page.pricing", "type": "object", "requirement": "home optional", "description": "定价区：title + body + note + plans（含 name/badge/fit/price/unit/features/highlight）。", "consumers": ["templates/pages/home.hbs"]},
    {"path": "page.roadmap", "type": "object", "requirement": "home optional", "description": "未来规划：title + body + items（title/body/status/statusTone）。", "consumers": ["templates/pages/home.hbs"]},
    {"path": "page.private", "type": "object", "requirement": "home optional", "description": "私有化区块：kicker + title + body + points + actionLabel。", "consumers": ["templates/pages/home.hbs"]},
    {"path": "page.products", "type": "array", "requirement": "home optional", "description": "首页精选产品（由 featuredProductIds 决定）。", "consumers": ["templates/pages/home.hbs", "templates/partials/product-card.hbs"]},
    {"path": "page.cases", "type": "array", "requirement": "home optional", "description": "首页精选案例（由 featuredCaseIds 决定）。", "consumers": ["templates/pages/home.hbs", "templates/partials/case-card.hbs"]},
    {"path": "page.news", "type": "array", "requirement": "home optional", "description": "首页最新动态（取最新 4 篇）。", "consumers": ["templates/pages/home.hbs"]},
    {"path": "page.items", "type": "array", "requirement": "index required", "description": "集合页条目列表。", "consumers": ["templates/pages/products-index.hbs", "templates/pages/cases-index.hbs", "templates/pages/news-index.hbs", "templates/pages/downloads-index.hbs", "templates/pages/faq-index.hbs"]},
    {"path": "page.item.title", "type": "string", "requirement": "detail required", "description": "详情页标题。", "consumers": ["templates/pages/product-detail.hbs", "templates/pages/case-detail.hbs", "templates/pages/news-detail.hbs"]},
    {"path": "page.item.summary", "type": "text", "requirement": "detail required", "description": "详情页导语。", "consumers": ["templates/pages/product-detail.hbs", "templates/pages/case-detail.hbs", "templates/pages/news-detail.hbs"]},
    {"path": "page.item.cover", "type": "media", "requirement": "detail required", "description": "详情页主图。", "consumers": ["templates/pages/product-detail.hbs", "templates/pages/case-detail.hbs", "templates/pages/news-detail.hbs"]},
    {"path": "page.item.content.features", "type": "array", "requirement": "product required", "description": "产品能力卡片。", "consumers": ["templates/pages/product-detail.hbs"]},
    {"path": "page.item.content.advantages", "type": "array", "requirement": "product required", "description": "产品优势列表。", "consumers": ["templates/pages/product-detail.hbs"]},
    {"path": "page.item.content.scenarios", "type": "array", "requirement": "product required", "description": "产品适用场景。", "consumers": ["templates/pages/product-detail.hbs"]},
    {"path": "page.item.challenge", "type": "text", "requirement": "case required", "description": "案例挑战叙事。", "consumers": ["templates/pages/case-detail.hbs"]},
    {"path": "page.item.solution", "type": "text", "requirement": "case required", "description": "案例方案叙事。", "consumers": ["templates/pages/case-detail.hbs"]},
    {"path": "page.item.results", "type": "array", "requirement": "case required", "description": "案例成果（1-12 条字符串）。", "consumers": ["templates/pages/case-detail.hbs"]},
    {"path": "page.item.publishedAt", "type": "date", "requirement": "news required", "description": "动态发布日期。", "consumers": ["templates/pages/news-detail.hbs"]},
    {"path": "page.item.blocks", "type": "array", "requirement": "news required", "description": "schema 校验的动态正文块。", "consumers": ["templates/pages/news-detail.hbs"]}
  ],
  "themeSettings": [
    {"path": "theme.tokens.light.surface", "cssVariable": "--surface", "description": "浅色背景（雾蓝）。"},
    {"path": "theme.tokens.light.accent", "cssVariable": "--accent", "description": "浅色蓝色主强调色 #2F6CF5。"},
    {"path": "theme.tokens.dark.surface", "cssVariable": "--surface", "description": "深色背景。"},
    {"path": "theme.tokens.layout.container", "cssVariable": "--container", "description": "内容最大宽度 1180px。"},
    {"path": "theme.tokens.layout.radiusCard", "cssVariable": "--radius-card", "description": "卡片圆角 24px。"},
    {"path": "theme.tokens.typography.display", "cssVariable": "--font-display", "description": "展示字体。"},
    {"path": "theme.tokens.typography.body", "cssVariable": "--font-body", "description": "正文字体。"},
    {"path": "theme.tokens.motion.ease", "cssVariable": "--ease", "description": "动效缓动。"}
  ],
  "imageSlots": [
    {"id": "brand-logo", "location": "global header", "fieldPath": "site.logo", "renderSize": {"width": 40, "height": 40}, "formats": ["svg", "webp", "png"], "alt": "required"},
    {"id": "home-hero-slide", "location": "home hero", "fieldPath": "page.hero.slides[].media", "renderSize": {"width": 1180, "height": 760}, "formats": ["png", "webp", "avif", "svg"], "alt": "required"},
    {"id": "home-product-cover", "location": "home products", "fieldPath": "page.products[].cover", "renderSize": {"width": 960, "height": 640}, "formats": ["webp", "png", "svg"], "alt": "required"},
    {"id": "home-scenario-cover", "location": "home scenarios", "fieldPath": "page.cases[].cover", "renderSize": {"width": 1200, "height": 800}, "formats": ["webp", "png", "svg"], "alt": "required"},
    {"id": "index-card-cover", "location": "collection indexes", "fieldPath": "page.items[].cover", "renderSize": {"width": 960, "height": 640}, "formats": ["webp", "png", "svg"], "alt": "required"},
    {"id": "detail-cover", "location": "detail header", "fieldPath": "page.item.cover", "renderSize": {"width": 1200, "height": 800}, "formats": ["webp", "png", "svg"], "alt": "required"},
    {"id": "article-cover", "location": "media article", "fieldPath": "page.item.cover", "renderSize": {"width": 1600, "height": 900}, "formats": ["webp", "png", "svg"], "alt": "required"}
  ],
  "examples": [
    {"pageType": "home", "kind": "minimal", "data": {"site": {"name": "一粒云", "shortName": "一粒云", "description": "SaaS 企业网盘。", "logo": {"src": "brand/yiliyun-mark.svg", "alt": "一粒云标志"}, "contact": {"phone": "+86 400 820 6688", "email": "hello@yiliyun.example", "address": "企业文件协作服务"}}, "page": {"seo": {"title": "一粒云 SaaS 企业网盘", "description": "统一管理企业文件与协作。", "image": "media/yiliyun/hero.png", "canonical": "https://yiliyun.example/", "robots": "index,follow"}, "hero": {"slides": [{"eyebrow": "一粒云 SaaS 企业网盘", "title": "企业文件协作，从安全管理开始", "summary": "统一管理企业文件与共享内容。", "media": {"src": "media/yiliyun/hero.png", "alt": "一粒云企业网盘界面"}, "actions": [{"label": "立即试用", "route": "mailto:hello@yiliyun.example"}]}]}, "intro": {"title": "一个企业空间", "body": "统一、可控、可追溯。"}, "capabilities": [{"title": "文件集中管理", "body": "统一归档。", "icon": "layers"}, {"title": "团队高效共享", "body": "减少重复传文件。", "icon": "workflow"}, {"title": "权限全程可控", "body": "访问可追踪。", "icon": "shield-check"}]}}},
    {"pageType": "home", "kind": "complete", "data": {"site": {"name": "一粒云", "shortName": "一粒云", "description": "SaaS 企业网盘。", "logo": {"src": "brand/yiliyun-mark.svg", "alt": "一粒云标志"}, "contact": {"phone": "+86 400 820 6688", "email": "hello@yiliyun.example", "address": "企业文件协作服务"}}, "page": {"seo": {"title": "一粒云 SaaS 企业网盘", "description": "统一管理企业文件与协作。", "image": "media/yiliyun/hero.png", "canonical": "https://yiliyun.example/", "robots": "index,follow"}, "hero": {"slides": [{"eyebrow": "一粒云 SaaS 企业网盘", "title": "企业文件协作，从安全管理开始", "summary": "统一管理企业文件与共享内容。", "media": {"src": "media/yiliyun/hero.png", "alt": "一粒云企业网盘界面"}, "actions": [{"label": "立即试用", "route": "mailto:hello@yiliyun.example"}]}]}, "intro": {"title": "一个企业空间", "body": "统一、可控、可追溯。"}, "capabilities": [{"title": "文件集中管理", "body": "统一归档。", "icon": "layers"}, {"title": "团队高效共享", "body": "减少重复传文件。", "icon": "workflow"}, {"title": "权限全程可控", "body": "访问可追踪。", "icon": "shield-check"}], "features": [{"title": "企业文件管理", "body": "资料统一存放。", "icon": "folder"}], "valueBand": {"title": "让工作跟着文件走", "body": "把业务资料放回企业自己的文件体系。", "tags": ["历史版本可追溯"], "metrics": [{"value": "统一入口", "label": "减少多平台来回找文件"}]}, "pricing": {"title": "三档套餐", "body": "按团队阶段选择。", "note": "页面价格仅供参考。", "plans": [{"name": "免费版", "fit": "适合小团队", "price": "¥0", "unit": "/ 永久", "features": ["基础企业网盘"]}]}, "roadmap": {"title": "从网盘扩展到企业智能工作", "body": "清晰展示未来方向。", "items": [{"title": "流程审批", "body": "增加审批闭环。", "status": "规划扩展", "statusTone": "next"}]}, "private": {"kicker": "私有化部署", "title": "数据留在本地", "body": "提供私有化版本。", "points": ["本地部署"], "actionLabel": "联系我们"}}}}
  ],
  "unsupportedData": ["Raw HTML inside content JSON", "Remote or unlicensed image URLs", "QR codes, barcodes, or machine-readable visuals", "Business fields outside canonical schemas", "Local form submission endpoints or embedded third-party state"]
}
```

## Supported Page Types

| Page type | Route | Template | Required fields | Optional fields |
|---|---|---|---|---|
| home | index.html | templates/pages/home.hbs | hero, intro, capabilities | features, valueBand, pricing, roadmap, private, featured collections |
| productsIndex | products/index.html | templates/pages/products-index.hbs | page.items | item covers |
| productDetail | products/:id/index.html | templates/pages/product-detail.hbs | item title, summary, cover, content | FAQ |
| casesIndex | cases/index.html | templates/pages/cases-index.hbs | page.items | item covers |
| caseDetail | cases/:id/index.html | templates/pages/case-detail.hbs | item title, summary, cover, story | none |
| newsIndex | news/index.html | templates/pages/news-index.hbs | page.items | item covers |
| newsDetail | news/:id/index.html | templates/pages/news-detail.hbs | item title, summary, cover, date, blocks | none |
| downloadsIndex | downloads/index.html | templates/pages/downloads-index.hbs | page.items | none |
| faqIndex | faq/index.html | templates/pages/faq-index.hbs | page.items | none |
| notFound | 404.html | templates/pages/not-found.hbs | shared brand and SEO | none |

## Home module mapping

`yiliyun-cloud` 首页将 `preview (6).html` 的落地页模块映射到 `content/pages/home.json` 的字段：

| HTML 模块 | Content 字段 | 说明 |
|---|---|---|
| 导航 | site.navigation / site.headerActions | header 右侧 CTA（#锚点、mailto 均可） |
| Hero（左侧文案 + 右侧产品 mock） | page.hero.slides | 有图时展示 `media.src`，无图时回退到内置产品界面示意 |
| 能力卡片（统一/协同/安全） | page.capabilities | 3-6 项，显示为 3 列编号卡片 |
| 核心能力（6 张功能卡） | page.features | 3-12 项，icon 为自由字符串 |
| 深色价值条 | page.valueBand | title/body/tags/metrics |
| 定价（三档套餐） | page.pricing | plans 数组，highlight 用于主推 |
| 未来规划（路线图） | page.roadmap | items 数组，statusTone 控制标签色 |
| 私有化部署 | page.private | kicker/title/body/points/actionLabel |
| 产品区 | page.products | 由 featuredProductIds 决定，缺省取前 2 个产品 |
| 场景区 | page.cases | 由 featuredCaseIds 决定，缺省取前 1 个案例 |
| 最新动态 | page.news | 取最新 4 篇新闻 |
| 联系区块 | links.contact | 首页底部 contact band |

## Field Reference

| Path | Type | Requirement | Constraints | Example | Consumers |
|---|---|---|---|---|---|
| site.name | string | required | 2-80 chars | 一粒云 | header, footer |
| site.description | text | required | 10-320 chars | SaaS 企业网盘 | footer |
| site.logo | media | required | local src + alt | yiliyun-mark.svg | header, footer |
| site.contact.email | email | required | valid email | hello@yiliyun.example | home, footer |
| site.contact.phone | string | required | 5+ chars | +86 400 820 6688 | footer |
| site.contact.address | string | required | 2+ chars | 企业文件协作服务 | footer |
| site.navigation | array | required | 2-8 items | 产品/案例/媒体/下载/FAQ | header |
| site.headerActions | array | optional | max 4 | 查看价格 #pricing | header |
| page.hero.slides | array | home required | 1-8 slides | hero slide | home |
| page.capabilities | array | home required | 3-6 objects | intro cards | home |
| page.features | array | home optional | 3-12 objects | feature cards | home |
| page.valueBand | object | home optional | title/body/tags/metrics | value band | home |
| page.pricing | object | home optional | title/body/note/plans | pricing | home |
| page.roadmap | object | home optional | title/body/items | roadmap | home |
| page.private | object | home optional | kicker/title/body/points | private deploy | home |
| page.items | array | index required | 0-100 objects | collection items | index templates |
| page.item.title | string | detail required | 2-160 chars | product/case/news title | detail templates |
| page.item.content.features | array | product required | 2-12 objects | product capabilities | product detail |
| page.item.content.advantages | array | product required | 2-12 objects | why long-term | product detail |
| page.item.content.scenarios | array | product required | 2-12 objects | use scenarios | product detail |
| page.item.challenge | text | case required | 10-600 chars | challenge | case detail |
| page.item.solution | text | case required | 10-600 chars | solution | case detail |
| page.item.results | array | case required | 1-12 strings | results | case detail |
| page.item.publishedAt | date | news required | ISO date | 2026-08-10 | news detail |
| page.item.blocks | array | news required | 1-60 blocks | content blocks | news detail |

## Icon whitelist

`icon` helper 通过 `engine/theme.js` 的 `iconSet` 白名单解析。主题 `yiliyun-cloud` 新增支持的图标：`folder`、`users`、`file-clock`、`link`、`building`、`check`、`route`、`shield-check`，加上默认的 `layers`、`workflow`、`message-circle`、`book-open`、`chart-no-axes-combined`、`arrow-right`、`arrow-left`、`arrow-up-right`、`menu`、`mail`、`phone`、`map-pin`、`download`、`plus`、`search`、`x` 等。不在白名单内的图标名会回退到 `layers`。

## Content Rules

Content JSON may provide validated plain text, block structures, local media objects, canonical routes, and SEO metadata. Raw HTML, arbitrary fields, remote media, QR or barcode visuals, machine-readable code images, and local submission endpoints are forbidden.

## Validation

Run `npm run validate`, `npm run build -- --changed`, `npm run report`, the data-struct audit, static-site audit, and font audit. Never edit `dist` or `.ai-cms` reports directly.

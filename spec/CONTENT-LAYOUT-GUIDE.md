# 内容布局指南（Content Layout Guide）

本文档说明在新闻、产品详情等内容中如何使用扩展后的排版原语，让内容呈现更专业、更具表现力，同时保证构建与校验通过。

## 一、支持的内容块（news.blocks）

| 类型 | 说明 | 示例字段 |
|---|---|---|
| `paragraph` | 正文段落 | `text` |
| `heading` | 小标题（level 2-4） | `level`, `text` |
| `list` | 无序列表；`ordered: true` 时为有序列表 | `items`, `ordered` |
| `quote` | 引用块，可带出处 | `text`, `attribution` |
| `image` | 单图，支持响应式 | `src`, `alt`, `mobileSrc`, `caption`, `aspectRatio`, `loading` |
| `image-grid` | 图片墙（2-4 列） | `cols`, `items: [image...]` |
| `grid` | 栅格，单元格为任意文本/图片/卡片 | `cols`, `items: [layoutItem...]` |
| `two-column` | 双栏（文字+图片 / 图片+文字） | `layout`, `columns: [[layoutItem...], [layoutItem...]]` |
| `carousel` | 轮播（自动播放、箭头、圆点） | `items`, `autoplay`, `showArrows`, `showDots` |
| `card` | 卡片（徽标+标题+正文+清单+图片） | `title`, `body`, `badge`, `items`, `image`, `link` |

## 二、响应式图片

图片支持以下可选字段：

```json
{
  "type": "image",
  "src": "media/news-knowledge.jpg",
  "alt": "文档在线预览",
  "mobileSrc": "media/news-knowledge-mobile.jpg",
  "caption": "在线预览更流畅",
  "aspectRatio": "4:3",
  "loading": "lazy"
}
```

- `mobileSrc`：移动端（≤767px）优先加载的窄图；未提供时不输出 `srcset`，直接使用 `src`。
- `aspectRatio`：如 `"4:3"`、`"16:9"`，预占位防布局抖动。
- `loading`：`lazy`（默认）或 `eager`（首屏大图用 `eager`）。
- 引擎不会自动生成 `.webp`，请勿引用不存在的文件（如 `xx.webp`），否则构建校验会报资源缺失。

## 三、组合示例

### 1. 文字 + 图片双栏

```json
{
  "type": "two-column",
  "layout": "text-media",
  "columns": [
    [
      {"type": "heading", "level": 2, "text": "标题"},
      {"type": "paragraph", "text": "说明文字……"},
      {"type": "list", "items": ["要点一", "要点二"]}
    ],
    [
      {"type": "image", "src": "media/hero.jpg", "alt": "场景图", "aspectRatio": "4:3"}
    ]
  ]
}
```

`layout` 可选 `text-media`（左文右图）或 `media-text`（左图右文）。

### 2. 卡片栅格

```json
{
  "type": "grid",
  "cols": 2,
  "items": [
    {"type": "card", "badge": "UI 优化", "title": "界面整体优化", "body": "说明……", "items": ["要点一", "要点二"]},
    {"type": "card", "badge": "性能提升", "title": "批量能力增强", "body": "说明……"}
  ]
}
```

### 3. 图片墙

```json
{
  "type": "image-grid",
  "cols": 3,
  "items": [
    {"src": "media/a.jpg", "alt": "图 A", "caption": "A"},
    {"src": "media/b.jpg", "alt": "图 B", "caption": "B"}
  ]
}
```

### 4. 轮播

```json
{
  "type": "carousel",
  "autoplay": 5000,
  "items": [
    {"image": {"src": "media/a.jpg", "alt": "A"}, "title": "标题 A", "body": "说明 A"},
    {"image": {"src": "media/b.jpg", "alt": "B"}, "title": "标题 B", "body": "说明 B"}
  ]
}
```

## 四、校验与构建

- 修改内容后运行：`node cli/ai-cms.js validate`，再 `node cli/ai-cms.js build`。
- 校验器会递归检查 `image-grid / grid / two-column / carousel / card` 中的所有图片资源，缺失会报错。
- 增量构建：`node cli/ai-cms.js build news --changed`（只重建 news 模块的变更）。

## 五、约定

- 图片统一放在 `public/media/` 下，内容中引用相对路径，如 `media/xxx.jpg`。
- 同一布局下尽量控制 `cols` ≤ 3，移动端自动切换为单列。
- 正文内嵌图片建议加 `caption` 与 `aspectRatio`，避免页面跳动。

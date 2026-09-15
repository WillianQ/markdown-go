# markdown-go

插件式 Markdown 渲染引擎。**纯字符串输出 HTML**（不碰 DOM，SSR 安全），内置标题自动编号 / TOC / 表格 / 列表 / 引用 / 代码高亮 / KaTeX 公式 / ECharts 图表。

- **零框架**：纯 ESM，无构建步骤
- **插件式**：`md.use(plugin)` 追加规则，规则集可组合
- **容错**：某个块/行内规则抛错 → 该处标红，不崩整篇

## 安装

```bash
npm install markdown-go
```

## 快速开始

```js
import MarkdownGo from "markdown-go";

const md = new MarkdownGo();
const html = md.render("# 你好\n\n**粗体** 与 `代码`");

// → <div class="markdown-body"><a name="你好"><h1>你好</h1></a>…</div>
```

输出**始终**包一层 `<div class="markdown-body">`，把样式挂在这个 class 上即可。

## API

| 成员 | 说明 |
|------|------|
| `new MarkdownGo()` | 创建实例，**默认加载全部内置插件**（见下） |
| `md.render(src)` | markdown 源码 → HTML 字符串 |
| `md.use(plugin)` | 追加一个插件（`{ initContext, blockRules, inlineRules }`），规则为**追加**语义 |

自定义插件：

```js
md.use({
  initContext: [],
  blockRules: [(md, ctx, lines, pos) => {
    // 命中则返回 { startPos, endPos, tokens: [{ tType, content }] }，否则返回 undefined
  }],
  inlineRules: [],
});
```

Token 类型（`types.js` 导出）：`HTML = 0`（已是 HTML 片段）、`TEXT = 1`（纯文本，转义后输出）、`INLINE = 2`（待继续行内解析）。

## 内置语法

| 语法 | 说明 |
|------|------|
| `# ` ~ `##### ` | 标题，**自动编号**（1 / 1.1 / 1.1.1），带 `<a name>` 锚点 |
| `@[TOC]` | 目录占位（前面可加多个 `@`） |
| 表格 | `\|` 分隔，单元格内 `\\\|` 转义 |
| `- ` / `1. ` | 有序 / 无序列表 |
| `> ` | 引用 |
| ` ``` ` | 代码围栏 |
| `---` | 分隔线 |
| `**粗**` `==标黄==` `~~删除~~` `++下划++` | 行内装饰 |
| `[文本]{* = ~ + 颜色 字号px}` | 富装饰（`*`粗 `=`黄底 `~`删除 `+`下划线） |
| `![alt](src)` / 链接 / 图片 | 图片与链接 |
| `$…$` / `$$…$$` | KaTeX 公式 |
| ` ```echarts ` | ECharts 图表块 |

## 插件

| 插件 | 文件 | 依赖 |
|------|------|------|
| 基础解析（标题/TOC/表格/列表/引用/围栏/分隔线/段落 + 行内） | `base-parse.js` | 无 |
| 字体装饰 | `plugin-font-decorate.js` | 无 |
| 代码高亮 | `plugin-highlight-code.js` | `highlight.js`（内置 js / python / json / sql） |
| KaTeX 公式 | `plugin-katex.js` | `katex` |
| ECharts 图表 | `plugin-echarts.js` | `echarts` |

> ⚠️ 默认实例会加载**全部**插件，因此这三个依赖是 `dependencies`。若只用基础解析，仍会装它们。

### ECharts 块语法

````markdown
```echarts
----
|月度销量|销量|利润|
|-|-|-|
|1月|120|30|
|2月|200|45|
----
"tooltip":{"trigger":"axis"},
"legend":{"bottom":0}
```
````

- 第一个 `----` 块是表格数据（首行表头，第一格作标题）；第二个 `----` 之后是 JSON 配置（**不带外层大括号**，键要双引号）。
- 不给 `series` 时按表头自动生成 line 系列，x 轴 = 第一列。
- 图表在 `setTimeout(…, 500)` 后初始化，**需要浏览器 DOM**；服务端渲染时该块只输出占位 `<div>`。

## 样式依赖（重要）

渲染只出 HTML，**不带 CSS**，需自行引入：

```js
import "katex/dist/katex.min.css";              // 公式
import "highlight.js/styles/github.css";        // 代码高亮主题（任选）
```

`.markdown-body` 的排版样式也由使用方提供。

## License

[MIT](./LICENSE)

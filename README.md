# markdown-go

> npm 包名：`@willianqrunning/markdown-go`

插件式 Markdown 渲染引擎。**最简单的逐行扫描，直接产出 HTML** —— 机制简单、插件好写、渲染快。

## 为什么是 markdown-go

Markdown 存在的意义，是**用最低的成本让显示有格式**：

- 纯文本没有格式，重点抓不住；
- Word / PDF 格式太重，编辑效率低。

Markdown 用 3~5 个最简单的语法补上这个缺口，**让作者聚焦内容，而不是排版**。

也正因如此，**多功能往往是它的反面**：功能越多，机制越复杂。如今不少渲染器为了堆功能，引入了庞大的 AST、复杂的插件协议，结果插件难写、渲染变慢，离"低成本"的初衷越来越远。

**markdown-go 走的是相反的路**：不做 AST、不做复杂协议，用最简单的**逐行扫描**直接产出 HTML。于是：

| | |
|---|---|
| **机制简单** | 读一遍源码就能看懂、能改；核心 100 行 |
| **插件方便** | 一个插件就是三个数组（`initContext` / `blockRules` / `inlineRules`），加语法 = 加一个函数 |
| **渲染快** | 无 AST 构建、无中间层，逐行扫过去就是 HTML |
| **零框架** | 纯 ESM，无构建步骤，SSR 安全（核心不碰 DOM） |
| **容错** | 某个块/行内规则抛错 → 该处标红，不崩整篇 |

## 安装

```bash
npm install @willianqrunning/markdown-go
```

## 快速开始

```js
import MarkdownGo from "@willianqrunning/markdown-go";

const md = new MarkdownGo();
const { html, toc } = md.render("# 你好\n\n**粗体** 与 `代码`");

// html → <div class="markdown-body"><a name="3uk46pb2"><h1>你好</h1></a>…</div>
// toc  → [{ level: 1, num: "", title: "你好", anchor: "3uk46pb2" }]
```

`render()` 返回一个对象：`html`（**始终**包一层 `<div class="markdown-body">`，样式挂这个 class）+ 各插件声明的输出字段。

## API

| 成员 | 说明 |
|------|------|
| `new MarkdownGo()` | 创建实例，**默认加载全部内置插件**（见下） |
| `md.render(src)` | markdown 源码 → `{ html, toc, ...插件输出 }` |
| `md.use(plugin)` | 追加一个插件，规则为**追加**语义（顺序很重要，见下） |

### 输出字段

| 字段 | 来源 | 说明 |
|------|------|------|
| `html` | 引擎 | 渲染好的 HTML 字符串 |
| `toc` | `base-parse` | 目录数组，见下 |

`toc` 元素：`{ level, num, title, anchor }`

- `level`：1~5
- `num`：自动编号（**level 1 为空串**，编号从 level 2 开始）
- `anchor`：**随机 8 位 id**，与标题文字解耦 —— 同一页面渲染多篇 md 也不会撞，中文/emoji/特殊字符都安全。跳转用 `<a href="#${anchor}">`。

文档里的 `@[TOC]` 占位符仍然可用（在文档内联位置渲染成目录树），与 `toc` 字段**同源**。

### 自定义插件

```js
md.use({
  initContext: [],
  blockRules: [(md, ctx, lines, pos) => {
    // 命中则返回 { startPos, endPos, tokens: [{ tType, content }] }，否则返回 undefined
  }],
  inlineRules: [],
  outputs: {
    // 解析完成后调用；(context, { html }) → 任意值，合并进 render() 的结果对象。
    // key 冲突：后 use 的覆盖；产出函数抛错：该字段降级 undefined + warn，不崩。
    headings: (ctx) => ctx.headingInfo.length,
  },
});
```

Token 类型（`types.js` 导出）：`HTML = 0`（已是 HTML 片段）、`TEXT = 1`（纯文本，转义后输出）、`INLINE = 2`（待继续行内解析）。

## 插件

内置插件（默认全加载）：

| 插件 | 文件 | 依赖 |
|------|------|------|
| 基础解析（标题/TOC/表格/列表/引用/围栏/分隔线/段落 + 行内） | `base-parse.js` | 无 |
| 字体装饰 | `plugins/font-decorate.js` | 无 |
| 代码高亮 | `plugins/highlight-code.js` | `highlight.js`（内置 js / python / json / sql） |
| KaTeX 公式 | `plugins/katex.js` | `katex` |
| ECharts 图表 | `plugins/echarts.js` | `echarts` |
| 行内代码 | `plugins/inline-code.js` | 无 |

插件可单独引入（子路径导出）：

```js
import katex from "@willianqrunning/markdown-go/plugins/katex";
md.use(katex);
```

### ⚠️ 安装顺序 = 使用顺序

`use()` 是**追加**语义，而渲染时**从后往前**匹配规则 —— 也就是说：

> **后 `use()` 的插件优先级更高**：两个插件都能处理同一段文本时，**后装的那个赢**。

默认实例的加载顺序是：

```
base-parse → font-decorate → highlight-code → echarts → katex → inline-code
```

所以匹配优先级正好相反：

```
inline-code > katex > echarts > highlight-code > font-decorate > base-parse
```

**顺序会影响结果，不是随便排的。** 例如某个插件会改写代码围栏的内容，就必须装在"代码高亮"**之前**（即优先级更低），否则高亮拿不到原始代码。

安装顺序 = 使用顺序 —— 请按优先级**从低到高**依次 `use()`。

## 样式依赖

渲染只出 HTML，**不带 CSS**，需自行引入：

```js
import "katex/dist/katex.min.css";              // 公式
import "highlight.js/styles/github.css";        // 代码高亮主题（任选）
```

`.markdown-body` 的排版样式也由使用方提供。

## 块行号（data-start-line / data-end-line）

每个顶层块的元素上都带**它在原文里的行号范围**（1-based，含起含终）—— 给"按块定位"的交互用（预览里点一段 → 从这一行开始读、左侧行号列、朗读进度高亮…）。

```html
<a data-start-line="3" data-end-line="3" name="ab12cd34"><h1>标题一</h1></a>
<p data-start-line="5" data-end-line="5">第一段。</p>
<ul data-start-line="7" data-end-line="8"><li>项一</li><li>项二</li></ul>
<pre data-start-line="10" data-end-line="12" class="hljs">…</pre>
```

几条规矩：

- **只标顶层块**。列表的 `<li>`、表格的 `<tr>`、引用里的 `<p>` 一律不标（要更细的粒度得改对应块规则）。
- **段落是"一行一段"**（引擎的逐行扫描机制）—— 连续两行文字会渲染成两个 `<p>`，各自带自己的行号。
- **行号覆盖到块的整个范围**：代码块含上下两条 ` ``` ` 标记行；空行不属于任何块（所以行号会跳号）。
- **每个块都有**：注释块（本来不产出 DOM）和 `@[TOC]`（元素要等行内阶段才生成）也不会漏 —— 前者补一个空 `<i>` 锚点，后者把属性贴到它生成的第一个 `<ul>` 上。
- 前端直接 `container.querySelectorAll('[data-start-line]')` 就能拿到全部块，**不用特判**。

## 内置语法

> 下列语法由内置插件提供，均为默认启用。

### 标题（自动编号 + 锚点）

```md
# 一级标题
## 二级标题
### 三级标题
```

渲染成 `<a name="随机8位"><h2>二级标题</h2></a>`，并记录进 `toc`（二级起自动编号 `1`、`1.1`…）。

### 目录占位

```md
@[TOC]
```

在该位置展开成目录树（前面可加多个 `@`，写法不变）。

### 表格

```md
| 名称 | 数量 | 备注 |
|------|------|------|
| 苹果 | 3    | 红   |
| 梨   | 5    | 黄   |
```

单元格内想写 `|`，用 `\|` 转义。

### 列表

```md
- 无序项
- 无序项

1. 有序项
2. 有序项
```

### 引用

```md
> 这是一段引用
```

### 代码围栏

````md
```js
const a = 1;
```
````

围栏匹配顺序（从高到低）：

1. ` ```echarts ` —— 图表，最优先判断；
2. ` ```js ` / ` ```python ` / ` ```json ` / ` ```sql ` —— 语法高亮；
3. 其它 ` ```xxx `（`jsx` / `html` / `ts` …）—— **统一当代码**，内容做 HTML 转义后原样输出，不会变成真标签；
4. 裸 ` ``` `（后面什么都没有）—— 当普通文字，不开启代码块。

> ` ```code ` / ` ```code:xx ` 旧语法已废弃，会按第 3 条当普通代码处理。

### 分隔线

```md
---
```

### 行内代码

```md
单行代码 `abc`，里面的符号原样显示：`**不是加粗**`、`<button></button>`。
```

反引号里的内容做 HTML 转义后放进 `<code>`，不参与其它行内解析（装饰 / 公式 / 原文 HTML 都不生效）。

### 行内装饰

符号必须**成对**出现：

```md
**加粗**  ==高亮==  ~~删除~~  ++斜体++  __下划线__
```

### 富装饰（符号 / 颜色 / 字号）

`[文字]{…}` 里**每个符号只写 1 次**即生效，且顺序无关：

```md
[加粗]{*}
[红字]{r}
[大字]{20}
[组合]{*r 20}
```

| 写什么 | 含义 |
|---|---|
| 符号 `*` `=` `~` `+` `_` | 加粗 / 高亮 / 删除 / 斜体 / 下划线（可叠加，如 `{~_}`） |
| 数字 `20` | 字号（自动补 `px`） |
| 单字母 `r` | 简写颜色：`b` `l` `y` `r` `c` `g` `o` `p` |
| 多字母 `red` | CSS 颜色名（写错就没颜色，不报错） |
| `#f00` / `#123456` | 十六进制颜色 |

### 图片与链接

```md
[链接文字](https://example.com)
![图片说明](https://example.com/a.png)
```

`src` **原样输出**，引擎不做任何业务地址映射：`![图](abc)` → `<img src="abc">`、`[文](abc)` → `<a href="abc">`。

需要把裸 id 映射成自己的接口地址（如 `/api/file/download?id=abc`）时，写一个插件覆盖对应行内规则即可。插件就是普通的 `{ initContext, blockRules, inlineRules }`，后 `use` 的规则优先级更高：

```js
md.use({
  initContext: [],
  blockRules: [],
  inlineRules: [
    // 数组顺序 = 优先级从低到高；这里覆盖 base-parse 的 [文](id)
    (md, ctx, token) => {
      const r = token.content.match(/(.*?)\[(.*?)\]\((\S*?)\)(.*)/);
      if (!r) return;
      const [, front, name, src, back] = r;
      const href = src.includes("/") ? src : `/api/file/download?id=${src}`;
      return [
        { tType: 2, content: front },
        { tType: 0, content: `<a href="${href}">${name}</a>` },
        { tType: 2, content: back },
      ];
    },
  ],
});
```

> Token 常量（`HTML=0` / `TEXT=1` / `INLINE=2`）从 `@willianqrunning/markdown-go/types` 引入。

### KaTeX 公式

```md
质能方程：$$E = mc^2$$

$$\frac{1}{2} + \alpha$$
```

公式用 **`$$…$$`（双美元）** 包裹，渲染为行内 KaTeX。

> ⚠️ **必须写在同一行** —— 匹配正则不跨行，拆成多行不会渲染。

### ECharts 图表

````md
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

## License

[MIT](https://github.com/WillianQ/markdown-go/blob/main/LICENSE)

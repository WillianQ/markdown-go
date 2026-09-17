// base-parse：MarkdownGo 内置规则集（标题/目录 TOC/列表/表格/引用/代码围栏/分隔线/注释/段落 + 内联样式/图/链）
// 老项目 base-parse.ts 的 JS 化：类型注剥成注释，逻辑原样。
import { HTML, TEXT, INLINE } from "./types.js";

// 标题编号跟踪：[level, "1.2.3", title] 列表 + 栈式 headingList
const initContextHeading = (context) => {
  context.headingInfo = [];
  context.headingList = [null];
  context.usedAnchors = new Set();
  return context;
};

// 锚点与标题文字解耦：随机 8 位 base36（同一页面渲染多篇 md 也不冲突；中文/emoji/特殊字符都安全）；
// 实例内 Set 去重兜底，避免极小概率撞车。
const makeAnchor = (context) => {
  let id;
  do {
    id = Math.random().toString(36).slice(2, 10).padEnd(8, "0");
  } while (context.usedAnchors.has(id));
  context.usedAnchors.add(id);
  return id;
};

const blockHeading = (md, context, lines, pos) => {
  const r = lines[pos].match(/^\s{0,5}(#{1,5})\s+(.*)$/);
  if (!r) return;

  const level = r[1].length;
  const title = r[2];
  const lastLevel = context.headingList.length - 1;

  if (level > lastLevel) {
    for (let k = lastLevel; k < level; k++) context.headingList.push(0);
  } else if (level < lastLevel) {
    for (let k = lastLevel; k > level; k--) context.headingList.pop();
  }
  context.headingList[level] = context.headingList[level] + 1;
  const titleNum = context.headingList.slice(2).join(".");
  const anchor = makeAnchor(context);
  context.headingInfo.push([level, titleNum, title, anchor]);

  return {
    startPos: pos,
    endPos: pos,
    tokens: [{ tType: HTML, content: `<a name="${anchor}"><h${level}>${title}</h${level}></a>` }],
  };
};

const blockContents = (md, context, lines, pos) => {
  if (!lines[pos].match(/^@*\[TOC\]$/)) return;
  return { startPos: pos, endPos: pos, tokens: [{ tType: INLINE, content: "@[TOC]" }] };
};

// 目录：把 blockContents 留下的 @[TOC] token 展开成标题树
const inlineContents = (md, context, token) => {
  if (token.content !== "@[TOC]") return;

  let lastLevel = 0;
  const tokens = [];
  let level = 0;

  for (let i = 0; i < context.headingInfo.length; i++) {
    const [lvl, titleNum, title, anchor] = context.headingInfo[i];
    level = lvl;
    if (lvl > lastLevel) {
      for (let k = lastLevel; k < lvl; k++) tokens.push({ tType: HTML, content: "<ul>" });
    } else if (lvl < lastLevel) {
      for (let k = lastLevel; k > lvl; k--) tokens.push({ tType: HTML, content: "</ul>" });
    }
    tokens.push({
      tType: HTML,
      content: `<li><a href="#${anchor}">${titleNum} ${title}</a></li>`,
    });
    lastLevel = lvl;
  }
  for (let k = level; k > 0; k--) tokens.push({ tType: HTML, content: "</ul>" });
  return tokens;
};

// 列表：缩进定层级，嵌套递归；同层并列 li
const blockList = (md, context, lines, pos) => {
  const r = lines[pos].match(/^(\s*)([*-]|\d+\.)\s(.*)$/);
  if (!r) return;

  const level = r[1].length;
  const listType = r[2].match(/[*-]/) ? "ul" : "ol";
  const startPos = pos;
  const tokens = [{ tType: HTML, content: `<${listType}>` }];

  while (pos < lines.length) {
    const r = lines[pos].match(/^(\s*)([*-]|\d+\.)\s(.*)$/);
    if (r) {
      const newLevel = r[1].length;
      if (level === newLevel) {
        tokens.push(
          { tType: HTML, content: "<li>" },
          { tType: INLINE, content: r[3] },
          { tType: HTML, content: "</li>" }
        );
      } else if (level < newLevel) {
        const result = blockList(md, context, lines, pos);
        tokens.push(...result.tokens);
        pos = result.endPos;
      } else {
        break;
      }
      pos++;
    } else {
      break;
    }
  }

  tokens.push({ tType: HTML, content: `</${listType}>` });
  return { startPos, endPos: pos - 1, tokens };
};

// 表格：| a | b | 风格，第二行分隔线判定表头
const blockTable = (md, context, lines, pos) => {
  if (!lines[pos + 1]?.match(/^\s{0,5}(\|[:-\s]*)+\|$/)) return;

  const tokens = [{ tType: HTML, content: '<table border="1">' }];
  const startPos = pos;

  const parseLine = (line, t) =>
    line
      .split(/(?<!\\)\|/) // 按"未被反斜杠转义的 |"分列，`\|` 是普通字符不是分隔符
      .slice(1, -1)
      .flatMap((x) => [
        { tType: HTML, content: `<${t}>` },
        { tType: INLINE, content: x.replace(/\\\|/g, "|") }, // 单元格内还原 `\|` → `|`
        { tType: HTML, content: `</${t}>` },
      ]);

  tokens.push(
    { tType: HTML, content: "<tr>" },
    ...parseLine(lines[pos], "th"),
    { tType: HTML, content: "</tr>" }
  );

  pos += 2;
  while (pos < lines.length && lines[pos].match(/^\s{0,5}(\|.*?)+\|$/)) {
    tokens.push(
      { tType: HTML, content: "<tr>" },
      ...parseLine(lines[pos], "td"),
      { tType: HTML, content: "</tr>" }
    );
    pos++;
  }

  tokens.push({ tType: HTML, content: "</table>" });
  return { startPos, endPos: pos - 1, tokens };
};

const blockBlockquote = (md, context, lines, pos) => {
  const r = lines[pos].match(/^>(.*)$/);
  if (!r) return;

  const startPos = pos;
  const tokens = [
    { tType: HTML, content: "<blockquote>" },
    { tType: HTML, content: "<p>" },
    { tType: INLINE, content: r[1] },
    { tType: HTML, content: "</p>" },
  ];

  pos++;
  while (pos < lines.length) {
    const r = lines[pos].match(/^>(.*)$/);
    if (!r) break;
    tokens.push(
      { tType: HTML, content: "<p>" },
      { tType: HTML, content: r[1] === "" ? "<br>" : r[1] },
      { tType: HTML, content: "</p>" }
    );
    pos++;
  }

  tokens.push({ tType: HTML, content: "</blockquote>" });
  return { startPos, endPos: pos - 1, tokens };
};

// HTML 转义：代码围栏内容必须原样展示，不能当 HTML 解析（否则 <Input.../> 会变成真 HTML / 可注入）
const escapeHtml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// 兜底代码围栏：```xxx（xxx 非空）整段原样当 code（转义、不参与行内解析）。
// 默认实例里 highlight-code 插件优先级更高，会先接住所有 ```xxx 并高亮；
// 这里只在未加载 highlight-code 时兜底。裸 ```（无任何内容）交给 blockParagraph 当文字。
const blockFence = (md, context, lines, pos) => {
  if (!lines[pos].match(/^```\S+$/)) return;

  const startPos = pos;
  let raw = "";
  pos++;
  while (pos < lines.length && !lines[pos].match(/^```$/)) {
    raw += lines[pos] + "\n";
    pos++;
  }

  return {
    startPos,
    endPos: pos,
    tokens: [{ tType: HTML, content: `<pre class="hljs"><code>${escapeHtml(raw)}</code></pre>` }],
  };
};

const blockHr = (md, context, lines, pos) => {
  if (!lines[pos].match(/^-{3,}$/) && !lines[pos].match(/^={3,}$/)) return;
  return { startPos: pos, endPos: pos, tokens: [{ tType: HTML, content: `<hr>` }] };
};

const blockHtmlAnnotation = (md, context, lines, pos) => {
  if (!lines[pos].match(/^<!--.*?$/)) return;

  const startPos = pos;
  while (pos < lines.length && !lines[pos].match(/^.*-->$/)) pos++;
  return { startPos, endPos: pos, tokens: [] };
};

const blockParagraph = (md, context, lines, pos) => {
  return {
    startPos: pos,
    endPos: pos,
    tokens: [
      { tType: HTML, content: "<p>" },
      { tType: INLINE, content: lines[pos] },
      { tType: HTML, content: "</p>" },
    ],
  };
};

// 内联：斜体 *text*（注意放行内规则尾部，兜底规则 inlineText 最前）
const inlineItalic = (_, __, token) => {
  const r = token.content.match(/(.*?)\*([^*]+)\*(.*)/);
  if (!r) return;
  const [, frontPart, text, backPart] = r;
  return [
    { tType: INLINE, content: frontPart },
    { tType: HTML, content: `<em>${text}</em>` },
    { tType: INLINE, content: backPart },
  ];
};

// 兜底：什么规则都不认 → 原样输出
const inlineText = (_, __, token) => [{ tType: TEXT, content: token.content }];

// 图片：![name](src){宽*高}；src 无 / 视为本地资源 id
const inlinePicture = (md, context, token) => {
  const r = token.content.match(/(.*?)\!\[(.*?)\]\((\S*?)\)(\{\S*?\})*(.*)/);
  if (!r) return;

  const [, frontPart, name, src, option, backPart] = r;
  let style = "";
  if (option) {
    const m = option.match(/^\{(\d*)\**(\d*)\}$/);
    if (m) {
      const width = m[1];
      const height = m[2] || m[1];
      style = `style="max-width:${width}px;max-height:${height}px`;
    }
  }
  const finalSrc = src.includes("/") ? src : `/api/file/download?id=${src}`;
  return [
    { tType: INLINE, content: frontPart },
    { tType: HTML, content: `<img src="${finalSrc}" ${style}></img>` },
    { tType: INLINE, content: backPart },
  ];
};

const inlineHtmlImg = (_, __, token) => {
  const r = token.content.match(/(.*?)(<img.*?>.*?<\/img>)(.*)/);
  if (!r) return;
  const [, frontPart, html, backPart] = r;
  return [
    { tType: INLINE, content: frontPart },
    { tType: HTML, content: html },
    { tType: INLINE, content: backPart },
  ];
};

const inlineHtmlFont = (_, __, token) => {
  const r = token.content.match(/(.*?)(<font.*?>.*?<\/font>)(.*)/);
  if (!r) return;
  const [, frontPart, html, backPart] = r;
  return [
    { tType: INLINE, content: frontPart },
    { tType: HTML, content: html },
    { tType: INLINE, content: backPart },
  ];
};

// 资源链：$[name](src) 当作站内文章跳转
const inlineResource = (md, context, token) => {
  const r = token.content.match(/(.*?)\$\[(.*?)\]\((\S*?)\)(.*)/);
  if (!r) return;
  const [, frontPart, name, src, backPart] = r;
  const finalSrc = src.includes("/") ? src : `/article?id=${src}`;
  return [
    { tType: INLINE, content: frontPart },
    { tType: HTML, content: `<a href="${finalSrc}" target="_blank">「${name}」</a>` },
    { tType: INLINE, content: backPart },
  ];
};

// 链接：[name](src)；src 无 / 视为本地文件资源
const inlineAnchor = (md, context, token) => {
  const r = token.content.match(/(.*?)\[(.*?)\]\((\S*?)\)(.*)/);
  if (!r) return;
  const [, frontPart, name, src, backPart] = r;
  const finalSrc = src.includes("/") ? src : `/api/file/download?id=${src}`;
  return [
    { tType: INLINE, content: frontPart },
    { tType: HTML, content: `<a href="${finalSrc}" target="_blank">「${name}」</a>` },
    { tType: INLINE, content: backPart },
  ];
};

// TOC 数据（结构化）：与 @[TOC] 内联渲染同源（headingInfo），供侧边栏等使用
const buildToc = (headingInfo) =>
  headingInfo.map(([level, num, title, anchor]) => ({ level, num, title, anchor }));

export default {
  initContext: [initContextHeading],
  blockRules: [
    blockParagraph,
    blockContents,
    blockHtmlAnnotation,
    blockHr,
    blockBlockquote,
    blockFence,
    blockTable,
    blockList,
    blockHeading,
  ],
  inlineRules: [
    inlineText,
    inlineItalic,
    inlineContents,
    inlineAnchor,
    inlineResource,
    inlineHtmlImg,
    inlinePicture,
    inlineHtmlFont,
  ],
  outputs: {
    toc: (context) => buildToc(context.headingInfo),
  },
};

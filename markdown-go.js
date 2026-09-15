// MarkdownGo 引擎：插件式 markdown 解析器（老项目 markdown-go.ts 的 JS 化，逻辑原样）
// 用法：const md = new MarkdownGo(); const { html, toc } = md.render(src)
//       → { html: HTML string（外层 .markdown-body）, toc: [...], ...插件 outputs 产出 }
// 设计：initContext/blockRules/inlineRules 三段数组，插件 use() 追加；
//       render 先块级切行、再行内逐 token 解析，全程带 try/catch 容错（坏块标红不崩）。
import { HTML, INLINE } from "./types.js";
import baseParse from "./base-parse.js";
import pluginFontDecorate from "./plugins/font-decorate.js";
import pluginHighlightCode from "./plugins/highlight-code.js";
import pluginEcharts from "./plugins/echarts.js";
import pluginKatex from "./plugins/katex.js";

export default class MarkdownGo {
  initContext = [];
  blockRules = [];
  inlineRules = [];
  plugins = [];

  use(plugin) {
    this.plugins.push(plugin);
    this.initContext = this.initContext.concat(plugin.initContext);
    this.blockRules = this.blockRules.concat(plugin.blockRules);
    this.inlineRules = this.inlineRules.concat(plugin.inlineRules);
  }

  constructor() {
    this.use(baseParse);
    this.use(pluginFontDecorate);
    this.use(pluginHighlightCode);
    this.use(pluginEcharts);
    this.use(pluginKatex);
  }

  render(src) {
    src = src.replace(/\t/g, "    ");
    const lines = src.split(/\n/).map((x) => x.trimEnd());

    let context = {};
    for (let i = this.initContext.length - 1; i >= 0; i--) {
      context = this.initContext[i](context);
    }

    // Block 解析
    const tokens = [];
    let pos = 0;
    while (pos < lines.length) {
      if (lines[pos].length === 0) {
        pos++;
        continue;
      }

      for (let i = this.blockRules.length - 1; i >= 0; i--) {
        try {
          const result = this.blockRules[i](this, context, lines, pos);
          if (result) {
            tokens.push(...result.tokens);
            pos = result.endPos + 1;
            break;
          }
        } catch (e) {
          tokens.push({
            tType: HTML,
            content: `<div style="background:#ff000022;border:1px solid #f00;padding:1em;margin:1em 0;border-radius:4px;color:#ff6b6b">
              <strong>🚨 Block 渲染错误 @ ${this.blockRules[i].name}:</strong>
              <pre style="margin:0.5em 0 0 0;font-size:12px">${e.message}</pre>
            </div>`,
          });
          pos++;
          break;
        }
      }
    }

    // Inline 解析
    pos = 0;
    while (pos < tokens.length) {
      if (tokens[pos].tType !== INLINE) {
        pos++;
        continue;
      }

      for (let i = this.inlineRules.length - 1; i >= 0; i--) {
        try {
          const newTokens = this.inlineRules[i](this, context, tokens[pos]);
          if (newTokens) {
            tokens.splice(pos, 1, ...newTokens);
            break;
          }
        } catch (e) {
          tokens[pos] = {
            tType: HTML,
            content: `<span style="background:#ff000022;border:1px solid #f00;padding:0.2em 0.5em;border-radius:3px;color:#ff6b6b;font-size:12px">
              🚨 Inline 渲染错误 @ ${this.inlineRules[i].name} ：${e.message} : ${tokens[pos].content}
            </span>`,
          };
          break;
        }
      }
    }

    const html =
      '<div class="markdown-body">' + tokens.reduce((p, c) => p + c.content, "") + "</div>";

    // 插件产出：outputs: { key: (context, { html }) => value }，按 use 顺序合并进结果对象。
    // 产出函数抛错 → 该字段降级 undefined + warn，不拖垮整篇渲染（与坏块容错同一哲学）。
    const result = { html };
    for (const plugin of this.plugins) {
      for (const [key, fn] of Object.entries(plugin.outputs ?? {})) {
        if (key in result) console.warn(`[markdown-go] 输出字段 "${key}" 被插件覆盖`);
        try {
          result[key] = fn(context, { html });
        } catch (e) {
          console.warn(`[markdown-go] outputs.${key} 产出失败：${e?.message ?? e}`);
          result[key] = undefined;
        }
      }
    }
    return result;
  }
}

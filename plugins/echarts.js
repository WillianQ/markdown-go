// echarts 插件：```echarts 块 —— 表格数据 + JSON 配置渲染图表（挂 setTimeout 等 DOM 就绪）
// 老项目 plugin-echarts.ts 的 JS 化（EchartsOption 接口剥掉，逻辑原样）
import { HTML, colorMap } from "../types.js";
import * as echarts from "echarts/core";
import { LineChart, BarChart, PieChart } from "echarts/charts";
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  DatasetComponent,
  GridComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  LineChart,
  BarChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  DatasetComponent,
  GridComponent,
  CanvasRenderer,
]);

const defaultOption = {
  height: 500,
  width: 800,
  hiddentable: false,
  axis: 0,
  reverse: false,
  title: { left: "center" },
  tooltip: { trigger: "item" },
  xAxis: { type: "category" },
  yAxis: [{}, { splitLine: { show: false } }],
  legend: { bottom: 0 },
};

// 属性值转义（JSON 里含双引号）
const escapeAttr = (s) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// 表格数据 + 配置 → 最终 option（Node / 浏览器共用，保证 data 属性与 setTimeout 一致）
const buildOption = (option, rawTable) => {
  if (!rawTable) return option;
  const getData = (l) => l.split("|").slice(1, -1);
  let data = rawTable.split("\n").map(getData);
  data.splice(1, 1);

  if (option.axis === 1) data = data[0].map((_, i) => data.map((row) => row[i]));
  if (option.reverse) data = [data[0], ...data.slice(1).reverse()];

  if (!option.series) {
    option.series = data[0].slice(1).map((h) => {
      const m = h.match(/([^{]*)(\{.*\})?/);
      return { name: m?.[1] || h, type: "line", ...(m?.[2] ? JSON.parse(m[2]) : {}) };
    });
  }
  option.title = { ...option.title, text: data[0][0] };
  option.dataset = { source: data };
  return option;
};

const blockEcharts = (md, context, lines, pos) => {
  // 优先级最高：echarts 插件最后 use()，render 从数组末尾往前匹配，
  // 因此 ```echarts 一定先于 highlight-code / blockFence 被判断。
  if (!lines[pos].match(/^```echarts$/)) return;

  const startPos = pos;
  let raw = "";
  pos++;
  while (pos < lines.length && !lines[pos].match(/^```$/)) {
    raw += lines[pos] + "\n";
    pos++;
  }

  try {
    const match = raw.match(/(?:----\n([\s\S]*)\n----)*\n([\s\S]*)/);
    if (!match) throw new Error("Invalid format");

    const [, rawTable, rawOpt] = match;
    const option = { ...defaultOption, ...JSON.parse(`{${rawOpt}}`) };
    const id = `echarts-${parseInt(String(Math.random() * 1e10), 10)}`;

    // 先把最终 option 算好（含 dataset/series/title），写进 data 属性：
    // 这样 SSR 输出的 HTML 只要前端引一段脚本就能初始化图表。
    const finalOption = buildOption({ ...option }, rawTable);
    delete finalOption.width;
    delete finalOption.height;

    const tokens = [
      {
        tType: HTML,
        content: `<div id="${id}" data-echarts="${escapeAttr(JSON.stringify(finalOption))}" style="width:${option.width}px;height:${option.height}px"></div>`,
      },
    ];
    if (!option.hiddentable && rawTable) {
      // md.render() 返回 { html, toc }，必须取 .html，否则对象被拼成 "[object Object]"
      tokens.push({ tType: HTML, content: md.render(rawTable.replace(/(\{.*?\}\|)/g, "|")).html });
    }

    // 浏览器里 render() 时直接初始化（setTimeout 等 DOM 就绪）
    setTimeout(() => {
      const div = document.getElementById(id);
      if (!div) return;
      echarts.init(div).setOption(finalOption);
    }, 500);

    return { startPos, endPos: pos, tokens };
  } catch (e) {
    return {
      startPos,
      endPos: pos,
      tokens: [
        {
          tType: HTML,
          content: `<pre><code style="font-size:20px;color:${colorMap.r}">Echarts 出错：${e.message}</code></pre>`,
        },
      ],
    };
  }
};

export default {
  initContext: [],
  blockRules: [blockEcharts],
  inlineRules: [],
};

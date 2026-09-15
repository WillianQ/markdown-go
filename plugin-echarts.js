// echarts 插件：```echarts 块 —— 表格数据 + JSON 配置渲染图表（挂 setTimeout 等 DOM 就绪）
// 老项目 plugin-echarts.ts 的 JS 化（EchartsOption 接口剥掉，逻辑原样）
import { HTML, colorMap } from "./types.js";
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

const blockEcharts = (md, context, lines, pos) => {
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

    const tokens = [
      { tType: HTML, content: `<div id="${id}" style="width:${option.width}px;height:${option.height}px"></div>` },
    ];
    if (!option.hiddentable && rawTable) {
      tokens.push({ tType: HTML, content: md.render(rawTable.replace(/(\{.*?\}\|)/g, "|")) });
    }

    setTimeout(() => {
      const div = document.getElementById(id);
      if (!div) return;

      if (rawTable) {
        const getData = (l) => l.split("|").slice(1, -1);
        let data = rawTable.split("\n").map(getData);
        data.splice(1, 1);

        if (option.axis === 1) {
          data = data[0].map((_, i) => data.map((row) => row[i]));
        }
        if (option.reverse) data = [data[0], ...data.slice(1).reverse()];

        if (!option.series) {
          option.series = data[0].slice(1).map((h, i) => {
            const m = h.match(/([^{]*)(\{.*\})?/);
            return { name: m?.[1] || h, type: "line", ...(m?.[2] ? JSON.parse(m[2]) : {}) };
          });
        }
        option.title = { ...option.title, text: data[0][0] };
        option.dataset = { source: data };
      }

      const chart = echarts.init(div);
      delete option.width;
      delete option.height;
      chart.setOption(option);
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

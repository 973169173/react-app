import React, { useMemo, useState, useEffect } from 'react';
import { Card, Table, Space, Typography, Empty, Segmented, Select, Tooltip, Button, Alert, Divider, Switch, Statistic, Progress, message, Input, Modal } from 'antd';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { ExportOutlined, BarChartOutlined, TableOutlined, InfoCircleOutlined } from '@ant-design/icons';
import './ResultViewer.css';
import { useApiUrl } from '../configContext';

const { Text } = Typography;

// Shared palette for pie slices and insights matching
const PIE_PALETTE = ['#2ec7c9','#b6a2de','#5ab1ef','#ffb980','#d87a80','#8d98b3','#e5cf0d','#97b552','#95706d','#dc69aa','#07a2a4','#9a7fd1','#588dd5','#f5994e','#c05050','#59678c','#c9ab00','#7eb00a','#6f5553','#c14089'];

// 动态图片预览：如果表中存在 figure / image / photo / picture 列，则在行悬浮时展示对应 base64 图片
// 不再使用固定测试图片

const IMAGE_COLUMN_CANDIDATES = ['figure','image','photo','picture','img'];

// Heuristic to decide whether a value looks like a base64-encoded image
function isLikelyBase64Image(val) {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (trimmed.startsWith('data:image/')) return true; // already a data url
  if (trimmed.length < 200) return false; // too short to be a real image
  if (!/^[A-Za-z0-9+/=\r\n]+$/.test(trimmed)) return false; // invalid base64 charset
  const head = trimmed.slice(0, 16);
  const signatureOk = head.startsWith('/9j/') || head.startsWith('iVBOR') || head.startsWith('R0lGOD') || head.startsWith('UklGR');
  if (!signatureOk) return false;
  try { atob(trimmed.slice(0, 80)); } catch { return false; }
  return true;
}

function guessImageMimeFromBase64(b64) {
  if (!b64 || typeof b64 !== 'string') return 'image/png';
  const head = b64.slice(0, 16);
  if (head.startsWith('/9j/')) return 'image/jpeg'; // JPEG
  if (head.startsWith('iVBOR')) return 'image/png'; // PNG
  if (head.startsWith('UklGR')) return 'image/webp'; // WEBP
  if (head.startsWith('R0lGOD')) return 'image/gif'; // GIF
  return 'image/png';
}

function buildDataUrlFromBase64(b64) {
  if (!b64) return null;
  if (b64.startsWith('data:image')) return b64; // already complete
  const mime = guessImageMimeFromBase64(b64);
  return `data:${mime};base64,${b64}`;
}

// Convert backend table shape {columns: [], data: [], index?: []} to rows/columns for antd
function toTableModel(data) {
  if (!data || !Array.isArray(data.columns) || !Array.isArray(data.data)) {
    return { columns: [], rows: [] };
  }
  const visibleCols = data.columns.filter((k) => !String(k).startsWith('_'));
  const rows = data.data.map((arr, i) => {
    const obj = {};
    data.columns.forEach((k, j) => (obj[k] = arr[j]));
    obj.key = data.index?.[i] ?? i;
    return obj;
  });
  // 保留所有原始列（包括以 _ 开头的内部字段）在 rows 里，
  // 仅通过 columns 控制展示哪些字段。
  // 这样下游 onRowClick(record, columnKey) 时，record 仍然包含 _source_ 等内部字段，
  // 方便继续做原文 / 高亮匹配或其它逻辑（与旧版本行为保持一致）。
  return { columns: visibleCols, rows };
}

function inferFields(rows, columns) {
  // Relaxed numeric detection: treat string numbers (e.g. "23") as numeric too.
  // This fixes cases where backend sends numeric-looking columns as strings (DataFrame object dtype).
  const numeric = [];
  const categorical = [];
  columns.forEach((c) => {
    const sampleRow = rows.find((r) => r && r[c] !== null && r[c] !== undefined);
    const sample = sampleRow ? sampleRow[c] : undefined;
    if (isProbablyNumeric(sample)) numeric.push(c);
    else categorical.push(c);
  });
  return { numeric, categorical };
}

// Props:
//  resultJSON: 原始表格结果（保持现有逻辑）
//  onRowClick: 行点击回调
//  analysisParams: { foName, tableName } 可选，如提供则展示“AI分析”模式
//  onFoNameChange: (newFoName) => void  当后端 analyze_table 返回新的 fo 名称时回调父组件
const ResultViewer = ({ resultJSON, onRowClick, analysisParams, onFoNameChange }) => {
  const getApiUrl = useApiUrl();
  const [vizType, setVizType] = useState('table');
  const [catField, setCatField] = useState(null);
  const [numField, setNumField] = useState(null);
  const [xField, setXField] = useState(null);
  const [yField, setYField] = useState(null);
  const [dense, setDense] = useState(true);
  // Hover image preview state (dynamic figure)
  const [hoverPreview, setHoverPreview] = useState({ visible: false, x: 0, y: 0, src: null, rowKey: null });
  // 后端分析结果
  const [analysisResults, setAnalysisResults] = useState([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState(null);
  // 当前用于分析请求的 fo 名称（会因 analyze 动作而演化）
  const [currentFoName, setCurrentFoName] = useState(analysisParams?.foName || '');
  const hasAnalysisContext = !!(currentFoName && analysisParams?.tableName);
  // 触发重新拉取分析结果的 token
  const [analysisReloadToken, setAnalysisReloadToken] = useState(0);

  // 分析生成面板相关状态
  const ANALYSIS_TYPES = ['auto','histogram','bar','pie','line','scatter'];
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [analysisColumn, setAnalysisColumn] = useState(null);
  const [analysisTypeSel, setAnalysisTypeSel] = useState('auto');
  const [analysisBins, setAnalysisBins] = useState();
  const [analysisTitle, setAnalysisTitle] = useState('');
  const [generating, setGenerating] = useState(false);

  // 同步外部传入 foName 变化（例如父组件切换项目）
  useEffect(() => {
    if (analysisParams?.foName && analysisParams.foName !== currentFoName) {
      setCurrentFoName(analysisParams.foName);
      // 切换项目时清空现有分析结果显示，等待重新拉取
      setAnalysisResults([]);
      setSelectedAnalysisId(null);
      setAnalysisReloadToken(t => t + 1);
    }
  }, [analysisParams?.foName]);
  // 简化交互：不再暴露排序和分组等高级选项

  // Parse and memoize
  const parsed = useMemo(() => {
    try {
      return typeof resultJSON === 'string' ? JSON.parse(resultJSON) : resultJSON;
    } catch {
      return null;
    }
  }, [resultJSON]);

  const isTabular = parsed && Array.isArray(parsed?.columns) && Array.isArray(parsed?.data);
  const { columns, rows } = useMemo(() => (isTabular ? toTableModel(parsed) : { columns: [], rows: [] }), [parsed, isTabular]);
  const { numeric, categorical } = useMemo(() => inferFields(rows, columns), [rows, columns]);
  // 可见图片列（列名符合候选且样本值像图片）
  const visibleImageColumn = useMemo(() => {
    for (const c of columns) {
      if (IMAGE_COLUMN_CANDIDATES.includes(String(c).toLowerCase())) {
        const sample = rows.find(r => r && r[c])?.[c];
        if (isLikelyBase64Image(sample)) return c;
      }
    }
    return null;
  }, [columns, rows]);

  // 隐藏图片列（以 _ 开头保留在 row 对象中，比如 _figure）
  const hiddenImageColumn = useMemo(() => {
    if (visibleImageColumn) return null; // 优先使用可见列
    if (!rows.length) return null;
    const sampleRow = rows.find(r => r);
    if (!sampleRow) return null;
    const keys = Object.keys(sampleRow).filter(k => k.startsWith('_'));
    for (const k of keys) {
      const lower = k.toLowerCase();
      if (IMAGE_COLUMN_CANDIDATES.some(c => lower.endsWith(c))) {
        const sample = rows.find(r => r && r[k])?.[k];
        if (isLikelyBase64Image(sample)) return k;
      }
    }
    return null;
  }, [rows, visibleImageColumn]);

  const imageField = visibleImageColumn || hiddenImageColumn;
  // 自动检测时间型字段（基于字段名与取样解析）
  const timeFields = useMemo(() => detectTimeFields(rows, columns), [rows, columns]);

  // Initialize selectors when data changes
  React.useEffect(() => {
    if (!columns.length) return;
    // 分类字段：优先第一列（若为非数值），否则选择第一个非数值列
    if (!catField) {
      const firstIsNumeric = typeof rows?.[0]?.[columns[0]] === 'number';
      if (!firstIsNumeric) setCatField(columns[0]);
      else if (categorical.length) setCatField(categorical[0]);
      else setCatField(columns[0]);
    }
    // 数值字段默认第一个数值列
    if (!numField && numeric.length) setNumField(numeric[0]);
    // X 轴：折线/柱状使用第一列；散点使用第一个数值列
    if (!xField) {
      if (vizType === 'line' && timeFields.length) setXField(timeFields[0]);
      else if (vizType === 'scatter' && numeric.length) setXField(numeric[0]);
      else setXField(columns[0]);
    } else {
      // 当切换到散点时，自动把 x 设为第一个数值列
      if (vizType === 'scatter' && numeric.length && xField !== numeric[0]) setXField(numeric[0]);
      // 当切换到折线时，若存在时间列，用时间列；否则保持默认列（后续会禁用折线）
      if (vizType === 'line' && timeFields.length && xField !== timeFields[0]) setXField(timeFields[0]);
      if (vizType !== 'scatter' && vizType !== 'line' && xField !== columns[0]) setXField(columns[0]);
    }
    // Y 轴默认第一个数值或第二列
    if (!yField && (numeric[0] || columns[1])) setYField(numeric[0] || columns[1]);
    // 分组字段不再暴露在 UI，保留为空
  }, [columns, categorical, numeric, vizType, timeFields]);

  // 若当前是折线图但不存在时间列，自动回退到柱状图
  React.useEffect(() => {
    if (vizType === 'line' && timeFields.length === 0) {
      setVizType('column');
    }
  }, [vizType, timeFields]);

  // 获取分析结果列表（仅当有 fo/table 并切换到 analysis 时）
  useEffect(() => {
    if (vizType !== 'analysis' || !hasAnalysisContext) return;
    const controller = new AbortController();
    async function fetchAnalysis() {
      setAnalysisLoading(true);
      try {
        const qs = new URLSearchParams({ fo_name: currentFoName, table_name: analysisParams.tableName });
        const resp = await fetch(getApiUrl(`/api/analysis-results?${qs.toString()}`), { signal: controller.signal });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const list = Array.isArray(data.results) ? data.results : [];
        setAnalysisResults(list);
        if (list.length && !selectedAnalysisId) setSelectedAnalysisId(list[0].chart_id || list[0].id || 0);
      } catch (e) {
        if (e.name !== 'AbortError') message.error('获取分析结果失败: ' + e.message);
      } finally {
        setAnalysisLoading(false);
      }
    }
    fetchAnalysis();
    return () => controller.abort();
  }, [vizType, hasAnalysisContext, analysisParams?.tableName, selectedAnalysisId, currentFoName, analysisReloadToken]);

  // 解析选择的后端分析图数据 -> echarts option
  const analysisChartOption = useMemo(() => {
    if (vizType !== 'analysis') return null;
    if (!selectedAnalysisId) return null;
    const row = analysisResults.find(r => String(r.chart_id || r.id) === String(selectedAnalysisId));
    if (!row) return null;

    // 通用解析函数
    const parseMaybeArray = (raw) => {
      if (raw == null) return [];
      if (Array.isArray(raw)) return raw;
      if (typeof raw !== 'string') return [];
      const t = raw.trim();
      if (!t) return [];
      try { const v = JSON.parse(t); if (Array.isArray(v)) return v; } catch {}
      if (t.includes(',')) return t.split(',').map(s => s.trim()).filter(Boolean);
      return [t];
    };

    const chartType = row.chart_type || row.type;
    const title = row.title || chartType || 'Chart';
    const labels = parseMaybeArray(row.labels);
    const values = parseMaybeArray(row.values).map(v => Number(v));
    const xData = parseMaybeArray(row.x_data);
    const yData = parseMaybeArray(row.y_data).map(v => Number(v));
    const palette = PIE_PALETTE;

    // 根据 chart_type 构造
    switch (chartType) {
      case 'pie':
        return {
          title: { text: title, left: 'center' },
            tooltip: { trigger: 'item' },
            legend: { top: '6%', type: 'scroll' },
            series: [{
              name: title,
              type: 'pie',
              radius: ['40%', '70%'],
              avoidLabelOverlap: true,
              data: labels.map((l,i)=>({ name: l, value: values[i] })),
            }],
            color: palette,
        };
      case 'bar':
        return {
          title: { text: title },
          tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
          xAxis: { type: 'category', data: xData },
          yAxis: { type: 'value' },
          series: [{ type: 'bar', data: yData, barMaxWidth: 42 }],
        };
      case 'line':
        return {
          title: { text: title },
          tooltip: { trigger: 'axis' },
          xAxis: { type: 'category', data: xData },
          yAxis: { type: 'value' },
          series: [{ type: 'line', data: yData, smooth: true, areaStyle: {} }],
        };
      case 'scatter':
        return {
          title: { text: title },
          tooltip: { trigger: 'item' },
          xAxis: { type: 'value', name: row.x_label || 'X' },
          yAxis: { type: 'value', name: row.y_label || 'Y' },
          series: [{ type: 'scatter', data: xData.map((x,i)=>[Number(x), yData[i]]) }],
        };
      case 'histogram':
        return {
          title: { text: title },
          tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
          xAxis: { type: 'category', data: xData },
          yAxis: { type: 'value' },
          series: [{ type: 'bar', data: yData, barMaxWidth: 42 }],
        };
      default:
        return null;
    }
  }, [vizType, analysisResults, selectedAnalysisId]);

  // Default sorting strategy per viz type
  React.useEffect(() => {
    // 图表内部按默认策略排序，无需用户选择
  }, [vizType]);

  const tableColumns = useMemo(
    () =>
      columns.map((key) => ({
        title: key,
        dataIndex: key,
        key,
        width: 140,
      })),
    [columns]
  );

  // Sorted data for charts and optionally table by xField ascending
  const sortedRows = useMemo(() => {
    if (!rows?.length) return rows;
    // 内部默认排序规则：
    // - 饼图/柱状：按 y/num 升序
    // - 折线/散点：按 x 升序
    // - 表格：不改动顺序
    let target = null;
    if (vizType === 'pie') target = numField || yField;
    else if (vizType === 'column') target = yField;
    else if (vizType === 'line' || vizType === 'scatter') target = xField;
    if (!target) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[target];
      const bv = b[target];
      // 若为折线图且 X 为时间字段，按时间戳排序
      if (vizType === 'line' && timeFields.includes(target)) {
        const ta = parseToTimestampMs(av);
        const tb = parseToTimestampMs(bv);
        if (typeof ta === 'number' && typeof tb === 'number') return ta - tb;
      }
      const na = typeof av === 'number' ? av : (av !== null && av !== undefined && av !== '' && !Number.isNaN(Number(av)) ? Number(av) : null);
      const nb = typeof bv === 'number' ? bv : (bv !== null && bv !== undefined && bv !== '' && !Number.isNaN(Number(bv)) ? Number(bv) : null);
      if (typeof na === 'number' && typeof nb === 'number') return na - nb;
      return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' });
    });
    return copy;
  }, [rows, vizType, xField, yField, numField, timeFields]);

  // Build ECharts option based on viz type
  const chartOption = useMemo(() => {
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const PALETTE = PIE_PALETTE;
    const textStyle = { fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif" };
    const axisCommon = {
      axisLine: { lineStyle: { color: '#d9d9d9' } },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#f0f0f0' } },
    };

    if (vizType === 'pie') {
      const field = catField || columns[0];
      if (!field) return null;
      const dataRaw = buildPieData(rows, field);
      const pieData = dataRaw.map((d) => ({ name: d.category, value: d.value }));
      const total = dataRaw.reduce((a, b) => a + (Number(b.value) || 0), 0);
      const names = pieData.map(d => d.name);
      const manyLegend = names.length > 8;
      const centerX = manyLegend ? '44%' : '50%';
      const titleText = `${field} 分布（计数）`;
      return {
        color: PALETTE,
        title: {
          text: titleText,
          left: 8,
          top: 6,
          textStyle: { fontSize: 14, fontWeight: 700, color: '#2b2f36' },
        },
        tooltip: { trigger: 'item', formatter: (p) => `${field}=${p.name}<br/>${((p.value/Math.max(total,1))*100).toFixed(2)}% (${formatNumber(p.value)})` },
        legend: {
          show: true,
          type: manyLegend ? 'scroll' : 'plain',
          orient: 'vertical',
          right: 6,
          top: 6,
          bottom: 6,
          itemWidth: 10,
          itemHeight: 10,
          itemGap: 8,
          textStyle: { fontSize: 12, color: '#666' },
          data: names,
          formatter: (name) => truncateLabel(name, 14),
        },
        series: [
          // Outer subtle ring for depth
          {
            type: 'pie',
            radius: ['72%','76%'],
            center: [centerX,'50%'],
            silent: true,
            label: { show: false },
            labelLine: { show: false },
            tooltip: { show: false },
            itemStyle: { color: '#eef2fb' },
            data: [{ value: 1 }],
            z: 1,
          },
          // Main donut with gradient slices and shadow
          {
            type: 'pie',
            radius: ['45%','70%'],
            center: [centerX,'50%'],
            avoidLabelOverlap: true,
            hoverOffset: 6,
            itemStyle: {
              borderColor: '#fff',
              borderWidth: 1,
              shadowBlur: 10,
              shadowColor: 'rgba(0,0,0,0.12)',
              shadowOffsetY: 4,
              color: (params) => {
                const base = PALETTE[params.dataIndex % PALETTE.length] || '#5B8FF9';
                const light = lightenColor(base, 22);
                const dark = darkenColor(base, 6);
                return new echarts.graphic.RadialGradient(0.4, 0.3, 1, [
                  { offset: 0, color: light },
                  { offset: 1, color: dark },
                ]);
              },
            },
            label: { show: false },
            labelLine: { show: false },
            data: pieData,
            emphasis: {
              scale: true,
              scaleSize: 6,
            },
            z: 2,
          },
          // Inner subtle ring for inner-edge highlight
          {
            type: 'pie',
            radius: ['40%','44%'],
            center: [centerX,'50%'],
            silent: true,
            label: { show: false },
            labelLine: { show: false },
            tooltip: { show: false },
            itemStyle: { color: '#f5f7fb' },
            data: [{ value: 1 }],
            z: 1,
          },
        ],
        textStyle,
      };
    }

    if (vizType === 'column') {
      if (!xField || !yField) return null;
      const categories = sortedRows.map(r => String(r[xField]));
      const values = sortedRows.map(r => Number(r[yField]) || 0);
      const primary = '#5B8FF9';
      return {
        color: [primary],
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: 64, right: 16, top: 42, bottom: 64 },
        xAxis: { type: 'category', data: categories, axisLabel: { interval: 0, rotate: 0 }, name: xField, nameLocation: 'middle', nameGap: 32, nameTextStyle: { color: '#666', fontWeight: 600, fontSize: 12 }, ...axisCommon },
        yAxis: { type: 'value', name: yField, nameLocation: 'middle', nameGap: 42, nameTextStyle: { color: '#666', fontWeight: 600 }, ...axisCommon },
        series: [
          {
            type: 'bar',
            data: values,
            barMaxWidth: 36,
            itemStyle: {
              borderRadius: [6,6,0,0],
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: primary },
                { offset: 1, color: '#ADC8FF' },
              ]),
            },
            label: { show: true, position: 'top', color: '#666', formatter: (p) => formatNumber(p.value) },
            emphasis: { focus: 'series' },
          },
        ],
        textStyle,
      };
    }

    if (vizType === 'line') {
      if (!xField || !yField) return null;
      const primary = '#5B8FF9';
      const isTimeX = timeFields.includes(xField);
      const lineData = isTimeX
        ? sortedRows.map(r => [parseToTimestampMs(r[xField]), Number(r[yField]) || 0]).filter(d => typeof d[0] === 'number')
        : (isProbablyNumeric(sortedRows?.[0]?.[xField])
            ? sortedRows.map(r => [Number(r[xField]) || 0, Number(r[yField]) || 0])
            : sortedRows.map((r, idx) => [idx, Number(r[yField]) || 0]));
      return {
        color: [primary],
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'line' },
          formatter: (params) => {
            const p = Array.isArray(params) ? params[0] : params;
            const x = p?.value?.[0];
            const y = p?.value?.[1];
            const xLabel = isTimeX ? formatTime(x) : x;
            return `${xField}: ${xLabel}<br/>${yField}: ${formatNumber(y)}`;
          }
        },
        grid: { left: 64, right: 16, top: 42, bottom: 46 },
        xAxis: isTimeX
          ? { type: 'time', name: `${xField}（时间）`, nameLocation: 'end', nameGap: 24, nameTextStyle: { color: '#666', fontWeight: 600 }, ...axisCommon }
          : { type: 'value', name: xField, nameLocation: 'end', nameGap: 24, nameTextStyle: { color: '#666', fontWeight: 600 }, ...axisCommon },
        yAxis: { type: 'value', name: yField, nameLocation: 'middle', nameGap: 42, nameTextStyle: { color: '#666', fontWeight: 600 }, ...axisCommon },
        series: [
          {
            type: 'line',
            data: lineData,
            smooth: true,
            symbol: 'circle',
            symbolSize: 6,
            lineStyle: { width: 3 },
            areaStyle: {
              opacity: 0.15,
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: primary },
                { offset: 1, color: '#ffffff' },
              ]),
            },
            emphasis: { focus: 'series' },
          },
        ],
        textStyle,
      };
    }

    if (vizType === 'scatter') {
      if (!xField || !yField) return null;
      const data = sortedRows.map(r => [Number(r[xField]) || 0, Number(r[yField]) || 0]);
      return {
        color: ['#5B8FF9'],
        tooltip: { trigger: 'item', formatter: (p) => `${xField}: ${formatNumber(p.value?.[0])}<br/>${yField}: ${formatNumber(p.value?.[1])}` },
        grid: { left: 64, right: 16, top: 24, bottom: 46 },
        xAxis: { type: 'value', name: xField, nameLocation: 'end', nameGap: 24, nameTextStyle: { color: '#666', fontWeight: 600 }, ...axisCommon },
        yAxis: { type: 'value', name: yField, nameLocation: 'middle', nameGap: 42, nameTextStyle: { color: '#666', fontWeight: 600 }, ...axisCommon },
        series: [{ type: 'scatter', data, symbolSize: 8, itemStyle: { opacity: 0.9 }, emphasis: { focus: 'series' } }],
        textStyle,
      };
    }
    return null;
  }, [rows, sortedRows, vizType, xField, yField, catField, columns]);

  // Map pie category -> color for insights list color matching
  const pieColorMap = useMemo(() => {
    if (vizType !== 'pie') return null;
    const field = catField || columns[0];
    if (!field) return null;
    const data = buildPieData(rows, field);
    const map = new Map();
    data.forEach((d, idx) => {
      const color = PIE_PALETTE[idx % PIE_PALETTE.length];
      map.set(d.category, color);
    });
    return map;
  }, [vizType, rows, columns, catField]);

  // Pie insights (top categories & summary)
  const pieInsights = useMemo(() => {
    if (vizType !== 'pie') return null;
    const field = catField || columns[0];
    if (!field) return null;
    const data = buildPieData(rows, field);
    const total = data.reduce((s, d) => s + (Number(d.value) || 0), 0);
    const distinct = data.length;
    const sorted = [...data].sort((a,b) => b.value - a.value);
    const top = sorted.slice(0, 5).map((d) => ({ ...d, percent: total > 0 ? (d.value/total)*100 : 0 }));
    const maxShare = top.length ? top[0].percent : 0;
    return { field, total, distinct, top, maxShare };
  }, [vizType, rows, columns, catField]);

  const toolbar = (
    <div className="result-toolbar">
      <Segmented
        value={vizType}
        onChange={setVizType}
        options={[
          { label: '表格', value: 'table', icon: <TableOutlined /> },
          { label: '饼图', value: 'pie', icon: <BarChartOutlined /> },
          { label: '柱状', value: 'column', icon: <BarChartOutlined /> },
          { label: '折线', value: 'line', icon: <BarChartOutlined />, disabled: timeFields.length === 0 },
          { label: '散点', value: 'scatter', icon: <BarChartOutlined />, disabled: numeric.length === 0 },
          ...(hasAnalysisContext ? [{ label: 'AI分析', value: 'analysis', icon: <BarChartOutlined /> }] : []),
        ]}
        size="small"
      />

      {(vizType === 'pie' || vizType === 'column' || vizType === 'line' || vizType === 'scatter') && (
        <Space size="small" wrap>
          {vizType === 'pie' && (
            <Select
              size="small"
              style={{ width: 200 }}
              value={catField}
              onChange={setCatField}
              placeholder="分类字段"
              options={columns.map((c) => ({ value: c, label: c }))}
            />
          )}

          {(vizType === 'column' || vizType === 'line') && (
            <Select size="small" style={{ width: 180 }} value={yField} onChange={setYField} placeholder="Y 轴(数值)" options={numeric.map((n) => ({ value: n, label: n }))} />
          )}

          {vizType === 'scatter' && (
            <Select size="small" style={{ width: 180 }} value={yField} onChange={setYField} placeholder="Y (数值)" options={numeric.map((n) => ({ value: n, label: n }))} />
          )}
        </Space>
      )}

      <div style={{ flex: 1 }} />
      <Space size={8}>
        <Tooltip title={dense ? '紧凑表格' : '标准表格'}>
          <Switch size="small" checked={dense} onChange={setDense} />
        </Tooltip>
        <Tooltip title="导出 CSV">
          <Button size="small" icon={<ExportOutlined />} onClick={() => exportCSV(rows, columns)}>CSV</Button>
        </Tooltip>
        {vizType !== 'table' && vizType !== 'analysis' && (
          <Tooltip title="导出图像 (PNG)">
            <Button size="small" onClick={() => exportChartPNG()} icon={<ExportOutlined />}>
              PNG
            </Button>
          </Tooltip>
        )}
        {vizType === 'analysis' && (
          <Tooltip title="导出图像 (PNG)">
            <Button size="small" disabled={!analysisChartOption} onClick={() => exportChartPNG()} icon={<ExportOutlined />}>PNG</Button>
          </Tooltip>
        )}
      </Space>
    </div>
  );

  const content = () => {
    if (!resultJSON) {
      return (
        <div className="result-empty">
          <Empty description="运行以查看结果" />
        </div>
      );
    }

    if (!parsed) {
      // 面向普通用户的友好提示，避免展示 JSON
      return <Alert type="warning" message="返回内容无法识别" description="当前结果暂不支持可视化展示，请检查上游算子或切换其他可视化方式。" />;
    }

    if (vizType !== 'analysis' && !isTabular) {
      return (
        <Alert
          type="info"
          message={<Space><InfoCircleOutlined /> 暂不支持该结果类型</Space>}
          description="当前结果不是表格数据，暂不提供 JSON 原文展示。请调整算子以输出表格数据，或导出 CSV 以便查看。"
        />
      );
    }

    // Analysis 模式渲染
    if (vizType === 'analysis') {
      if (!hasAnalysisContext) {
        return <Alert type="warning" message="缺少分析上下文" description="需要提供 foName 与 tableName 才能加载分析结果。" />;
      }
      return (
        <div className="chart-area fade-in">
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <Space wrap>
              <Select
                style={{ minWidth: 220 }}
                size="small"
                loading={analysisLoading}
                placeholder={analysisLoading ? '加载中...' : '选择分析图表'}
                value={selectedAnalysisId}
                onChange={setSelectedAnalysisId}
                options={analysisResults.map(r => ({
                  value: r.chart_id || r.id,
                  label: `${r.chart_type || r.type || 'chart'} - ${r.title || r.column_name || r.chart_id}`
                }))}
                dropdownMatchSelectWidth={false}
              />
              <Button size="small" type="primary" onClick={() => {
                setAnalysisColumn(analysisColumn || columns[0]);
                setShowGenerateModal(true);
              }}>生成分析</Button>
              <Button size="small" onClick={() => setVizType('table')}>返回表格</Button>
              <Button size="small" onClick={() => setVizType('pie')}>本地可视化</Button>
            </Space>
            {!analysisResults.length && !analysisLoading && (
              <Alert type="info" message="暂无分析结果" description="请先调用 /api/analyze-table 生成图表数据" />
            )}
            {analysisChartOption && (
              <ReactECharts
                option={analysisChartOption}
                style={{ height: 420, width: '100%' }}
                notMerge
                lazyUpdate
                opts={{ renderer: 'canvas' }}
              />
            )}
            {!analysisChartOption && analysisResults.length > 0 && (
              <Alert type="info" message="请选择一个图表" />
            )}
          </Space>
          <Modal
            open={showGenerateModal}
            title="生成后端分析图表"
            onCancel={() => { if (!generating) setShowGenerateModal(false); }}
            onOk={async () => {
              if (!analysisColumn || !analysisTypeSel) {
                message.warning('请选择列与分析类型');
                return;
              }
              try {
                setGenerating(true);
                const body = {
                  fo_name: currentFoName,
                  table_name: analysisParams.tableName,
                  column_name: analysisColumn,
                  analysis_type: analysisTypeSel,
                  bins: analysisTypeSel === 'histogram' ? (Number(analysisBins) || undefined) : undefined,
                  title: analysisTitle || undefined,
                };
                const resp = await fetch(getApiUrl('/api/analyze-table'), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(body),
                });
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                const data = await resp.json();
                if (!data.new_function_name) throw new Error('返回缺少 new_function_name');
                const newFo = data.new_function_name;
                setCurrentFoName(newFo);
                if (onFoNameChange) onFoNameChange(newFo);
                message.success('分析生成成功');
                setShowGenerateModal(false);
                setSelectedAnalysisId(null);
                setAnalysisReloadToken(t => t + 1);
              } catch (e) {
                message.error('分析生成失败: ' + e.message);
              } finally {
                setGenerating(false);
              }
            }}
            okButtonProps={{ loading: generating }}
            destroyOnClose
            maskClosable={!generating}
          >
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <div>
                <Text type="secondary">当前 fo (版本)：</Text>
                <Text code>{currentFoName || '-'}</Text>
              </div>
              <Select
                size="small"
                style={{ width: '100%' }}
                value={analysisColumn}
                onChange={setAnalysisColumn}
                placeholder="选择分析列"
                options={columns.map(c => ({ label: c, value: c }))}
              />
              <Select
                size="small"
                style={{ width: '100%' }}
                value={analysisTypeSel}
                onChange={setAnalysisTypeSel}
                placeholder="选择分析类型"
                options={ANALYSIS_TYPES.map(t => ({ label: t, value: t }))}
              />
              {analysisTypeSel === 'histogram' && (
                <Input
                  size="small"
                  placeholder="bins (可选, 默认自动)"
                  value={analysisBins}
                  onChange={e => setAnalysisBins(e.target.value)}
                />
              )}
              <Input
                size="small"
                placeholder="图表标题 (可选)"
                value={analysisTitle}
                onChange={e => setAnalysisTitle(e.target.value)}
              />
              <Alert type="info" showIcon message="说明" description="点击确定后将调用后端 /api/analyze-table 接口生成图表数据，并产生新的函数版本 fo_name。" />
            </Space>
          </Modal>
        </div>
      );
    }

    // Tabular rendering + Charts (ECharts)
    const contextBar = () => {
      if (vizType === 'table') return null;
      if (vizType === 'pie' && pieInsights) {
        return (
          <div className="result-context">
            <Text type="secondary">字段: </Text>
            <Text strong>{pieInsights.field}</Text>
            <Text type="secondary"> · 类别数 </Text>
            <Text strong>{pieInsights.distinct}</Text>
            <Text type="secondary"> · 总计 </Text>
            <Text strong>{formatNumber(pieInsights.total)}</Text>
          </div>
        );
      }
      if ((vizType === 'column' || vizType === 'line' || vizType === 'scatter') && xField && yField) {
        return (
          <div className="result-context">
            <Text type="secondary">X: </Text>
            <Text strong>{xField}</Text>
            <Text type="secondary"> · Y: </Text>
            <Text strong>{yField}</Text>
            {vizType === 'line' && timeFields.includes(xField) && (
              <>
                <Text type="secondary"> · 轴类型: </Text>
                <Text strong>时间</Text>
              </>
            )}
          </div>
        );
      }
      return null;
    };

    return (
      <>
        {contextBar()}
    {vizType === 'table' ? (
            <>
              <div className="result-context">
                <Text>本次查询到了符合条件的</Text>
                <Text strong style={{ margin: '0 4px' }}>{rows.length}</Text>
                <Text>条数据，每条数据包含</Text>
                <Text strong style={{ margin: '0 4px' }}>{columns.length}</Text>
                <Text>类信息</Text>
              </div>
              <Table
                columns={tableColumns}
                dataSource={rows.map((r, i) => ({ ...r, zebra: i % 2 }))}
                rowClassName={(_, i) => (i % 2 ? 'zebra-row' : '')}
                pagination={{ pageSize: 10, size: dense ? 'small' : 'default' }}
                size={dense ? 'small' : 'middle'}
                bordered
                sticky
                scroll={{ x: 'max-content', y: 360 }}
                onRow={(record) => ({
                  onClick: (event) => {
                    try {
                      const td = event.target.closest('td');
                      const visibleCols = columns; // 已过滤 _ 前缀
                      let columnKey = visibleCols[0];
                      if (td) {
                        const idx = Array.from(td.parentNode.children).indexOf(td);
                        if (idx >= 0 && idx < visibleCols.length) columnKey = visibleCols[idx];
                      }
                      if (onRowClick) onRowClick(record, columnKey);
                    } catch (err) {
                      console.warn('Row click handler error:', err);
                    }
                  },
                  onMouseEnter: (e) => {
                    if (!imageField) return; // 无图片列不显示
                    const raw = record[imageField];
                    const src = buildDataUrlFromBase64(raw);
                    if (!src) return;
                    setHoverPreview({ visible: true, x: e.clientX + 16, y: e.clientY + 12, src, rowKey: record.key });
                  },
                  onMouseMove: (e) => {
                    setHoverPreview(prev => prev.visible ? { ...prev, x: e.clientX + 16, y: e.clientY + 12 } : prev);
                  },
                  onMouseLeave: () => {
                    setHoverPreview(prev => prev.visible ? { ...prev, visible: false } : prev);
                  },
                  style: { cursor: 'pointer' }
                })}
              />
            </>
          ) : vizType === 'pie' ? (
          <div className="chart-grid two-col">
            <div className="chart-area fade-in">
              {!chartOption ? (
                <Alert type="info" message="请选择正确的字段以渲染图表" />
              ) : (
                <ReactECharts
                  option={chartOption}
                  style={{ height: 420, width: '100%' }}
                  notMerge
                  lazyUpdate
                  opts={{ renderer: 'canvas' }}
                />
              )}
            </div>
            <div className="insights-panel fade-in">
              <div style={{ marginBottom: 8 }}>
                <Text strong style={{ fontSize: 14 }}>Insights</Text>
              </div>
              {pieInsights ? (
                <>
                  <div className="insights-metrics-row">
                    <Card size="small" className="result-section metric" bordered={false}>
                      <Statistic title="总计" value={formatNumber(pieInsights.total)} valueStyle={{ fontWeight: 700 }} />
                    </Card>
                    <Card size="small" className="result-section metric" bordered={false}>
                      <Statistic title="类别数" value={pieInsights.distinct} valueStyle={{ fontWeight: 700 }} />
                    </Card>
                    <Card size="small" className="result-section metric" bordered={false}>
                      <Statistic title="最大占比" value={pieInsights.maxShare.toFixed(2) + '%'} valueStyle={{ fontWeight: 700 }} />
                    </Card>
                  </div>
                  <Divider style={{ margin: '8px 0' }} />
                  <div style={{ marginBottom: 6 }}>
                    <Text type="secondary">TOP 5 类别（按计数）</Text>
                  </div>
                  <div className="top-list">
                    {pieInsights.top.map((item, idx) => (
                      <div className="top-item" key={item.category}>
                        <div className="top-item-row">
                          <span className="dot" style={{ background: pieColorMap?.get(item.category) || '#5B8FF9' }} />
                          <Text ellipsis style={{ flex: 1 }}>{item.category}</Text>
                          <Text style={{ marginLeft: 8 }}>{item.percent.toFixed(1)}%</Text>
                          <Text type="secondary" style={{ marginLeft: 6 }}>({formatNumber(item.value)})</Text>
                        </div>
                        <Progress percent={Number(item.percent.toFixed(1))} showInfo={false} size="small" strokeColor={pieColorMap?.get(item.category) || '#5B8FF9'} trailColor="#f0f3f8" />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <Alert type="info" message="暂无可用洞察" />
              )}
            </div>
          </div>
        ) : (
          <div className="chart-area fade-in">
            {!chartOption ? (
              <Alert type="info" message="请选择正确的字段以渲染图表" />
            ) : (
              <ReactECharts
                option={chartOption}
                style={{ height: 420, width: '100%' }}
                notMerge
                lazyUpdate
                opts={{ renderer: 'canvas' }}
              />
            )}
          </div>
        )}
      </>
    );
  };

  return (
    <Card size="small" className="result-viewer-card" title={toolbar} bordered={false}>
      {content()}
      {hoverPreview.visible && hoverPreview.src && (
        <div
          className="rv-image-preview"
          style={{ left: hoverPreview.x, top: hoverPreview.y }}
        >
          <img src={hoverPreview.src} alt="preview" />
        </div>
      )}
    </Card>
  );
};

function exportCSV(rows, columns) {
  if (!rows?.length || !columns?.length) return;
  const header = columns.join(',');
  const lines = rows.map((r) => columns.map((c) => formatCSVCell(r[c])).join(','));
  const csv = [header, ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `result_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function formatCSVCell(val) {
  if (val == null) return '';
  const s = String(val).replace(/"/g, '""');
  if (s.search(/[",\n]/g) >= 0) return `"${s}"`;
  return s;
}

export default ResultViewer; // expose enhanced component supporting AI分析 (后端 analyze_table)

// Best-effort PNG export using canvas from charts; relies on AntV plot instances on DOM
function exportChartPNG() {
  // AntV G2Plot renders canvas/SVG inside container; try to find the last plot canvas
  const containers = document.querySelectorAll('.chart-area canvas');
  const canvas = containers[containers.length - 1];
  if (!canvas) return;
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = `chart_${Date.now()}.png`;
  a.click();
}

// Color utilities for gradient shades
function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b };
}

function clamp01(x) { return Math.max(0, Math.min(1, x)); }

function lightenColor(hex, percent) {
  try {
    const { r, g, b } = hexToRgb(hex);
    const p = clamp01(percent / 100);
    const nr = Math.round(r + (255 - r) * p);
    const ng = Math.round(g + (255 - g) * p);
    const nb = Math.round(b + (255 - b) * p);
    return `rgb(${nr}, ${ng}, ${nb})`;
  } catch { return hex; }
}

function darkenColor(hex, percent) {
  try {
    const { r, g, b } = hexToRgb(hex);
    const p = clamp01(percent / 100);
    const nr = Math.round(r * (1 - p));
    const ng = Math.round(g * (1 - p));
    const nb = Math.round(b * (1 - p));
    return `rgb(${nr}, ${ng}, ${nb})`;
  } catch { return hex; }
}

// Coerce numeric-like fields for chart axes to ensure proper numeric scaling
function coerceRowsForChart(rows, { vizType, xField, yField, numField, catField }) {
  if (!Array.isArray(rows)) return rows;
  return rows.map((r) => {
    const o = { ...r };
    const targets = new Set();
    // 对折线/散点的 X 轴保留数值；对柱状/饼图将 X 保持为类别（字符串）
    if (xField) {
      if (vizType === 'line' || vizType === 'scatter') targets.add(xField);
      else o[xField] = String(o[xField]);
    }
    if (yField) targets.add(yField);
    if (numField) targets.add(numField);
    if (catField) o[catField] = String(o[catField]);
    for (const key of targets) {
      const v = o[key];
      if (typeof v === 'number') continue;
      if (v === null || v === undefined || v === '') continue;
      const n = Number(v);
      if (!Number.isNaN(n)) o[key] = n;
    }
    return o;
  });
}

function isProbablyNumeric(v) {
  if (typeof v === 'number') return true;
  if (v === null || v === undefined || v === '') return false;
  const n = Number(v);
  return !Number.isNaN(n);
}

// Number format helper for labels/tooltips
function formatNumber(n) {
  if (n == null || Number.isNaN(n)) return '-';
  const num = Number(n);
  if (Math.abs(num) >= 1000) return num.toLocaleString();
  return String(num);
}

// Build pie data by grouping rows on a category field and counting occurrences
function buildPieData(rows, categoryField) {
  if (!Array.isArray(rows) || !categoryField) return [];
  const map = new Map();
  for (const r of rows) {
    const raw = r[categoryField];
    const key = raw === null || raw === undefined || raw === '' ? 'NULL' : String(raw);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return Array.from(map.entries()).map(([category, value]) => ({ category, value }));
}

// ---------------- Time detection helpers ----------------
// Try to parse a value to timestamp in ms; return number or null
function parseToTimestampMs(v) {
  if (v === null || v === undefined || v === '') return null;
  // If already Date
  if (v instanceof Date && !isNaN(v.getTime())) return v.getTime();
  // If number-like
  const sv = String(v).trim();
  if (/^\d+$/.test(sv)) {
    // numeric string; decide 10/13 digits
    if (sv.length === 13) {
      const ms = Number(sv);
      return isFinite(ms) ? ms : null;
    }
    if (sv.length === 10) {
      const ms = Number(sv) * 1000;
      return isFinite(ms) ? ms : null;
    }
    // Other lengths: might be yyyymmdd or yyyymmddHHmmss
    if (sv.length === 8) {
      // YYYYMMDD
      const y = Number(sv.slice(0, 4));
      const m = Number(sv.slice(4, 6)) - 1;
      const d = Number(sv.slice(6, 8));
      const ms = Date.UTC(y, m, d);
      return isFinite(ms) ? ms : null;
    }
    if (sv.length === 14) {
      // YYYYMMDDHHmmss
      const y = Number(sv.slice(0, 4));
      const m = Number(sv.slice(4, 6)) - 1;
      const d = Number(sv.slice(6, 8));
      const H = Number(sv.slice(8, 10));
      const M = Number(sv.slice(10, 12));
      const S = Number(sv.slice(12, 14));
      const ms = Date.UTC(y, m, d, H, M, S);
      return isFinite(ms) ? ms : null;
    }
  }
  // ISO-like strings
  const t = Date.parse(sv);
  if (!Number.isNaN(t)) return t;
  return null;
}

function isTimestampInReasonableRange(ms) {
  if (typeof ms !== 'number' || !isFinite(ms)) return false;
  const min = Date.UTC(1900, 0, 1);
  const max = Date.UTC(2100, 11, 31, 23, 59, 59);
  return ms >= min && ms <= max;
}

// Detect time-like fields by name and sample parsing
function detectTimeFields(rows, columns, sampleSize = 50, threshold = 0.8) {
  if (!Array.isArray(rows) || !Array.isArray(columns) || rows.length === 0) return [];
  const nameHints = /date|time|datetime|timestamp|ts|created|updated|modified|day|month|year/i;
  const candidates = [];
  for (const c of columns) {
    const values = [];
    for (let i = 0; i < rows.length && values.length < sampleSize; i++) {
      const v = rows[i][c];
      if (v !== null && v !== undefined && v !== '') values.push(v);
    }
    if (values.length === 0) continue;
    let hit = 0;
    for (const v of values) {
      const ms = parseToTimestampMs(v);
      if (ms !== null && isTimestampInReasonableRange(ms)) hit++;
    }
    const ratio = hit / values.length;
    const byName = nameHints.test(String(c));
    if (byName || ratio >= threshold) candidates.push(c);
  }
  // If multiple, prefer those with name hints first
  candidates.sort((a, b) => {
    const aName = nameHints.test(String(a)) ? 1 : 0;
    const bName = nameHints.test(String(b)) ? 1 : 0;
    return bName - aName;
  });
  return candidates;
}

// Format ms timestamp to readable label
function formatTime(ms) {
  if (typeof ms !== 'number' || !isFinite(ms)) return '-';
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${yyyy}-${MM}-${dd} ${hh}:${mm}`;
}

// Truncate long labels with ellipsis
function truncateLabel(name, max = 14) {
  const s = String(name ?? '');
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

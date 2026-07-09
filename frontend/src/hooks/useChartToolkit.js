import { useCallback, useEffect, useRef } from 'react';
import { LineSeries, LineStyle } from 'lightweight-charts';
import {
  bollinger,
  closesFromPoints,
  ema,
  fibLevels,
  rsi,
  sma,
  toLineData,
} from '../lib/chartIndicators';

const IND_COLORS = {
  sma: '#f59e0b',
  ema: '#38bdf8',
  bbMid: '#a78bfa',
  bbUpper: '#c4b5fd',
  bbLower: '#c4b5fd',
  rsi: '#f472b6',
  hline: '#22d3ee',
  trend: '#fb923c',
  fib: '#e879f9',
};

function removeSeriesKeys(chart, store, predicate) {
  Object.keys(store).forEach((key) => {
    if (!predicate(key)) return;
    try { chart?.removeSeries(store[key]); } catch { /* ignore */ }
    delete store[key];
  });
}

/**
 * Applies indicator overlays + drawing interactions to a lightweight-charts instance.
 * pointsRef: [{ time, value }] or candle [{ time, open, high, low, close }]
 * dataVersion: bump when series data changes so overlays recompute.
 */
export function useChartToolkit({
  chartRef,
  mainSeriesRef,
  pointsRef,
  indicators,
  drawMode,
  drawings,
  setDrawings,
  dataVersion = 0,
}) {
  const overlaySeriesRef = useRef({});
  const priceLinesRef = useRef([]);
  const clickPtsRef = useRef([]);
  const rsiPaneRef = useRef(null);

  const refreshIndicators = useCallback(() => {
    const chart = chartRef.current;
    const points = pointsRef.current || [];
    if (!chart || points.length < 5) return;

    removeSeriesKeys(chart, overlaySeriesRef.current, (k) =>
      ['sma', 'ema', 'bbMid', 'bbUpper', 'bbLower'].includes(k));
    if (rsiPaneRef.current) {
      try { chart.removeSeries(rsiPaneRef.current); } catch { /* ignore */ }
      rsiPaneRef.current = null;
    }

    const times = points.map((p) => p.time);
    const closes = closesFromPoints(points);
    const addLine = (key, data, color, options = {}) => {
      if (!data.length) return;
      const series = chart.addSeries(LineSeries, {
        color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        ...options,
      });
      series.setData(data);
      overlaySeriesRef.current[key] = series;
    };

    if (indicators.sma) {
      addLine('sma', toLineData(times, sma(closes, indicators.smaPeriod || 20)), IND_COLORS.sma);
    }
    if (indicators.ema) {
      addLine('ema', toLineData(times, ema(closes, indicators.emaPeriod || 20)), IND_COLORS.ema);
    }
    if (indicators.bb) {
      const bb = bollinger(closes, indicators.bbPeriod || 20, 2);
      addLine('bbMid', toLineData(times, bb.mid), IND_COLORS.bbMid, { lineStyle: LineStyle.Dashed });
      addLine('bbUpper', toLineData(times, bb.upper), IND_COLORS.bbUpper);
      addLine('bbLower', toLineData(times, bb.lower), IND_COLORS.bbLower);
    }
    if (indicators.rsi) {
      const rsiData = toLineData(times, rsi(closes, 14));
      if (rsiData.length) {
        const series = chart.addSeries(LineSeries, {
          color: IND_COLORS.rsi,
          lineWidth: 1,
          priceScaleId: 'rsi',
          priceLineVisible: false,
          lastValueVisible: true,
        });
        chart.priceScale('rsi').applyOptions({
          scaleMargins: { top: 0.82, bottom: 0 },
          borderVisible: false,
        });
        series.setData(rsiData);
        rsiPaneRef.current = series;
      }
    }
  }, [chartRef, pointsRef, indicators]);

  const redrawDrawings = useCallback(() => {
    const chart = chartRef.current;
    const main = mainSeriesRef.current;
    if (!chart || !main) return;

    removeSeriesKeys(chart, overlaySeriesRef.current, (k) => k.startsWith('trend'));
    priceLinesRef.current.forEach((pl) => {
      try { main.removePriceLine(pl); } catch { /* ignore */ }
    });
    priceLinesRef.current = [];

    (drawings || []).forEach((d, idx) => {
      if (d.type === 'hline') {
        const pl = main.createPriceLine({
          price: d.price,
          color: IND_COLORS.hline,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: 'H',
        });
        priceLinesRef.current.push(pl);
      }
      if (d.type === 'trend' && d.a && d.b) {
        const series = chart.addSeries(LineSeries, {
          color: IND_COLORS.trend,
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        const pts = [d.a, d.b].sort((x, y) => x.time - y.time);
        series.setData(pts);
        overlaySeriesRef.current[`trend${idx}`] = series;
      }
      if (d.type === 'fib' && d.high != null && d.low != null) {
        fibLevels(d.high, d.low).forEach((lvl) => {
          const pl = main.createPriceLine({
            price: lvl.price,
            color: IND_COLORS.fib,
            lineWidth: 1,
            lineStyle: LineStyle.Dotted,
            axisLabelVisible: true,
            title: lvl.label,
          });
          priceLinesRef.current.push(pl);
        });
      }
    });
  }, [chartRef, mainSeriesRef, drawings]);

  useEffect(() => {
    refreshIndicators();
  }, [refreshIndicators, dataVersion]);

  useEffect(() => {
    redrawDrawings();
  }, [redrawDrawings]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return undefined;

    const onClick = (param) => {
      if (!drawMode || drawMode === 'none' || !param?.point || param.time == null) return;
      const main = mainSeriesRef.current;
      if (!main) return;
      const price = main.coordinateToPrice(param.point.y);
      if (price == null) return;

      if (drawMode === 'hline') {
        setDrawings((prev) => [...prev, { type: 'hline', price: Number(price) }]);
        return;
      }

      if (drawMode === 'trend') {
        clickPtsRef.current.push({ time: param.time, value: Number(price) });
        if (clickPtsRef.current.length >= 2) {
          const [a, b] = clickPtsRef.current;
          setDrawings((prev) => [...prev, { type: 'trend', a, b }]);
          clickPtsRef.current = [];
        }
        return;
      }

      if (drawMode === 'fib') {
        clickPtsRef.current.push({ time: param.time, value: Number(price) });
        if (clickPtsRef.current.length >= 2) {
          const [a, b] = clickPtsRef.current;
          setDrawings((prev) => [...prev, {
            type: 'fib',
            high: Math.max(a.value, b.value),
            low: Math.min(a.value, b.value),
          }]);
          clickPtsRef.current = [];
        }
      }
    };

    chart.subscribeClick(onClick);
    return () => {
      try { chart.unsubscribeClick(onClick); } catch { /* ignore */ }
    };
  }, [chartRef, mainSeriesRef, drawMode, setDrawings, dataVersion]);

  useEffect(() => {
    clickPtsRef.current = [];
  }, [drawMode]);

  return { refreshIndicators };
}

export { IND_COLORS };

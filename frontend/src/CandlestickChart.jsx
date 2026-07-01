import React, { useEffect, useState } from 'react';
import './index.css';

// Generate some random looking financial data
const generateMockData = (numCandles) => {
  const data = [];
  let currentPrice = 100;
  for (let i = 0; i < numCandles; i++) {
    const open = currentPrice;
    const volatility = Math.random() * 10 + 2;
    const change = (Math.random() - 0.45) * volatility; // slight upward bias
    const close = open + change;
    
    // high is above max of open/close
    const high = Math.max(open, close) + Math.random() * 5;
    // low is below min of open/close
    const low = Math.min(open, close) - Math.random() * 5;
    
    data.push({ open, close, high, low, id: i });
    currentPrice = close;
  }
  return data;
};

const CandlestickChart = ({ width = '100%', height = '300px', numCandles = 20, isBackground = false }) => {
  const [data, setData] = useState([]);
  
  // Calculate max and min to scale the chart
  const [scale, setScale] = useState({ min: 0, max: 200, range: 200 });

  useEffect(() => {
    const initialData = generateMockData(numCandles);
    setData(initialData);
    
    const allPrices = initialData.flatMap(d => [d.high, d.low]);
    const max = Math.max(...allPrices) + 5;
    const min = Math.min(...allPrices) - 5;
    setScale({ min, max, range: max - min });
    
    // Simulate live data ticking every 2 seconds
    const interval = setInterval(() => {
      setData(prevData => {
        const newData = [...prevData];
        const lastCandle = { ...newData[newData.length - 1] };
        
        // Randomly update the close price of the last candle
        const tick = (Math.random() - 0.5) * 4;
        lastCandle.close += tick;
        
        // Update high/low if breached
        if (lastCandle.close > lastCandle.high) lastCandle.high = lastCandle.close;
        if (lastCandle.close < lastCandle.low) lastCandle.low = lastCandle.close;
        
        newData[newData.length - 1] = lastCandle;
        return newData;
      });
    }, 1500);
    
    return () => clearInterval(interval);
  }, [numCandles]);

  return (
    <div className={`candlestick-chart-container ${isBackground ? 'candlestick-bg' : ''}`} style={{ width, height }}>
      {data.map((candle, index) => {
        const isBullish = candle.close >= candle.open;
        
        // Convert prices to percentages (0 = bottom, 100 = top)
        const getPct = (val) => ((val - scale.min) / scale.range) * 100;
        
        const topY = getPct(Math.max(candle.open, candle.close));
        const bottomY = getPct(Math.min(candle.open, candle.close));
        const highY = getPct(candle.high);
        const lowY = getPct(candle.low);
        
        return (
          <div key={candle.id} className="candle-wrapper" style={{ left: `${(index / numCandles) * 100}%`, width: `${90 / numCandles}%` }}>
            {/* Wick */}
            <div 
              className={`candle-wick ${isBullish ? 'wick-bullish' : 'wick-bearish'}`} 
              style={{ bottom: `${lowY}%`, height: `${highY - lowY}%` }}
            ></div>
            {/* Body */}
            <div 
              className={`candle-body ${isBullish ? 'body-bullish' : 'body-bearish'}`} 
              style={{ bottom: `${bottomY}%`, height: `${Math.max(0.5, topY - bottomY)}%` }} // min height 0.5% for doji
            ></div>
          </div>
        );
      })}
    </div>
  );
};

export default CandlestickChart;

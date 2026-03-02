import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { fetchHistoricalPrices } from '../../utils/priceService';

interface PriceChartProps {
  symbol: string;
  currentPrice: number;
  priceChange: number;
  darkMode?: boolean;
}

export default function PriceChart({ symbol, currentPrice, priceChange, darkMode = false }: PriceChartProps) {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  useEffect(() => {
    const loadChartData = async () => {
      setLoading(true);
      try {
        const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : 30;
        const historicalData = await fetchHistoricalPrices(symbol, days);
        
        if (historicalData.length > 0) {
          const formattedData = historicalData.map(([timestamp, price]) => ({
            time: new Date(timestamp).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric' 
            }),
            price: price,
            timestamp
          }));
          setChartData(formattedData);
        } else {
          // Generate mock data if API fails
          setChartData(generateMockData(currentPrice, priceChange));
        }
      } catch (error) {
        console.error('Failed to load chart data:', error);
        setChartData(generateMockData(currentPrice, priceChange));
      } finally {
        setLoading(false);
      }
    };

    loadChartData();
  }, [symbol, timeRange, currentPrice]);

  const generateMockData = (basePrice: number, change: number) => {
    const data = [];
    const points = timeRange === '24h' ? 24 : timeRange === '7d' ? 7 : 30;
    const now = Date.now();
    const interval = timeRange === '24h' ? 3600000 : 86400000; // 1 hour or 1 day
    
    for (let i = points - 1; i >= 0; i--) {
      const timestamp = now - (i * interval);
      const randomVariation = (Math.random() - 0.5) * (basePrice * 0.02); // ±2% variation
      const price = basePrice + randomVariation - (basePrice * change / 100 / points * i);
      
      data.push({
        time: new Date(timestamp).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          ...(timeRange === '24h' ? { hour: 'numeric' } : {})
        }),
        price: Math.max(price, 0),
        timestamp
      });
    }
    return data;
  };

  const isPositive = priceChange >= 0;
  const chartColor = isPositive ? '#22c55e' : '#ef4444';
  const gradientId = `gradient-${symbol}`;

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span className="text-sm font-medium">
              {isPositive ? '+' : ''}{priceChange.toFixed(1)}%
            </span>
          </div>
        </div>
        
        <div className="flex gap-2">
          {(['24h', '7d', '30d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                timeRange === range
                  ? 'bg-purple-600 text-white'
                  : darkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="time" 
              stroke={darkMode ? '#6b7280' : '#9ca3af'}
              style={{ fontSize: '12px' }}
              tick={{ fill: darkMode ? '#9ca3af' : '#6b7280' }}
            />
            <YAxis 
              stroke={darkMode ? '#6b7280' : '#9ca3af'}
              style={{ fontSize: '12px' }}
              tick={{ fill: darkMode ? '#9ca3af' : '#6b7280' }}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
                borderRadius: '8px',
                color: darkMode ? '#ffffff' : '#000000'
              }}
              formatter={(value: any) => [`$${parseFloat(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Price']}
            />
            <Area 
              type="monotone" 
              dataKey="price" 
              stroke={chartColor} 
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Price Info */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div>
          <p className="text-xs text-gray-600 dark:text-gray-400">Current Price</p>
          <p className="text-lg text-gray-900 dark:text-white">
            ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600 dark:text-gray-400">24h Change</p>
          <p className={`text-lg ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}{priceChange.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600 dark:text-gray-400">Market</p>
          <p className="text-lg text-gray-900 dark:text-white">
            {isPositive ? 'Bullish' : 'Bearish'}
          </p>
        </div>
      </div>
    </div>
  );
}

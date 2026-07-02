import React, { useState } from 'react';
import { useThingSpeak } from '../hooks/useThingSpeak';
import { useWeather } from '../hooks/useWeather';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { CHART_FIELDS, FIELD_CONFIG, formatFieldLabel } from '../utils/sensorData';
import './Analytics.css';

const FIELD_COLORS = {
  temperature: '#e67e22',
  humidity: '#3498db',
  lightIntensity: '#f1c40f',
  soilMoisture: '#27ae60',
};

const FIELD_META = Object.fromEntries(
  CHART_FIELDS.map((field) => [
    field,
    {
      label: formatFieldLabel(field),
      unit: FIELD_CONFIG[field].unit,
      color: FIELD_COLORS[field],
      field,
    },
  ])
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <p className="tt-time">{new Date(label).toLocaleString()}</p>
      {payload.map((point, index) => (
        <p key={index} style={{ color: point.color }}>{point.name}: <strong>{point.value?.toFixed(2)}</strong></p>
      ))}
    </div>
  );
};

export default function Analytics() {
  const { feeds, loading, getStats } = useThingSpeak(30000);
  const { forecast, loading: weatherLoading, error: weatherError, predictRain } = useWeather();
  const [chartType, setChartType] = useState('area');
  const [selectedFields, setSelectedFields] = useState(['temperature', 'humidity']);
  const [range, setRange] = useState(50);
  const [temp, setTemp] = useState('');
  const [hum, setHum] = useState('');
  const [press, setPress] = useState('');

  const recentFeeds = feeds.slice(-range);
  const inletActivity = recentFeeds.filter((feed) => feed.inletPump === true).length;
  const rainSignals = recentFeeds.filter((feed) => feed.rainDetected === true).length;
  const dryReadings = recentFeeds.filter((feed) => feed.soilMoisture !== null && feed.soilMoisture < 25).length;

  const toggleField = (field) => {
    setSelectedFields((current) =>
      current.includes(field)
        ? (current.length > 1 ? current.filter((value) => value !== field) : current)
        : [...current, field]
    );
  };

  const handlePredict = () => {
    const temperature = parseFloat(temp);
    const humidity = parseFloat(hum);
    const pressure = parseFloat(press);

    if (Number.isNaN(temperature) || Number.isNaN(humidity) || Number.isNaN(pressure)) {
      alert('Please enter valid numbers for temperature, humidity, and pressure.');
      return;
    }

    predictRain(temperature, humidity, pressure);
  };

  const chartData = recentFeeds.map((feed) => {
    const point = { time: feed.time };
    selectedFields.forEach((field) => {
      point[field] = feed[field];
    });
    return point;
  });

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 10, right: 20, left: 0, bottom: 0 },
    };

    const axes = (
      <>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="time"
          tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
        />
        <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
      </>
    );

    if (chartType === 'area') {
      return (
        <AreaChart {...commonProps}>
          {axes}
          {selectedFields.map((field) => (
            <Area
              key={field}
              type="monotone"
              dataKey={field}
              name={FIELD_META[field].label}
              stroke={FIELD_META[field].color}
              fill={`${FIELD_META[field].color}22`}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </AreaChart>
      );
    }

    if (chartType === 'line') {
      return (
        <LineChart {...commonProps}>
          {axes}
          {selectedFields.map((field) => (
            <Line
              key={field}
              type="monotone"
              dataKey={field}
              name={FIELD_META[field].label}
              stroke={FIELD_META[field].color}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      );
    }

    return (
      <BarChart {...commonProps}>
        {axes}
        {selectedFields.map((field) => (
          <Bar
            key={field}
            dataKey={field}
            name={FIELD_META[field].label}
            fill={FIELD_META[field].color}
            radius={[3, 3, 0, 0]}
          />
        ))}
      </BarChart>
    );
  };

  return (
    <div className="analytics">
      <div className="page-header animate-up">
        <div>
          <h1>Analytics Center</h1>
          <p>Multi-sensor trend analysis and historical data exploration</p>
        </div>
        <div className="range-selector">
          {[25, 50, 100, 200].map((value) => (
            <button key={value} className={`range-btn ${range === value ? 'active' : ''}`} onClick={() => setRange(value)}>
              Last {value}
            </button>
          ))}
        </div>
      </div>

      <div className="stats-row animate-up">
        {Object.entries(FIELD_META).map(([key, meta]) => {
          const stats = getStats(key);
          return (
            <div key={key} className="stat-mini card" style={{ borderTop: `3px solid ${meta.color}` }}>
              <div className="sm-label">{meta.label}</div>
              <div className="sm-avg" style={{ color: meta.color }}>
                {stats ? stats.avg.toFixed(1) : '--'}<span>{meta.unit}</span>
              </div>
              <div className="sm-range">
                {stats ? `${stats.min.toFixed(1)} - ${stats.max.toFixed(1)}` : 'No data'}
              </div>
            </div>
          );
        })}
      </div>

      <div className="stats-row animate-up">
        <div className="stat-mini card">
          <div className="sm-label">Inlet Pump Active</div>
          <div className="sm-avg" style={{ color: '#2d5a27' }}>{inletActivity}</div>
          <div className="sm-range">of {recentFeeds.length || 0} readings</div>
        </div>
        <div className="stat-mini card">
          <div className="sm-label">Rain Signals</div>
          <div className="sm-avg" style={{ color: '#c0392b' }}>{rainSignals}</div>
          <div className="sm-range">detections in the selected window</div>
        </div>
        <div className="stat-mini card">
          <div className="sm-label">Dry Soil Readings</div>
          <div className="sm-avg" style={{ color: '#c8860a' }}>{dryReadings}</div>
          <div className="sm-range">below 25% moisture</div>
        </div>
      </div>

      <div className="chart-controls card animate-up">
        <div className="ctrl-section">
          <span className="ctrl-label">Chart Type</span>
          <div className="ctrl-group">
            {['area', 'line', 'bar'].map((type) => (
              <button key={type} className={`ctrl-btn ${chartType === type ? 'active' : ''}`} onClick={() => setChartType(type)}>
                {type === 'area' ? 'Area' : type === 'line' ? 'Line' : 'Bar'}
              </button>
            ))}
          </div>
        </div>
        <div className="ctrl-section">
          <span className="ctrl-label">Fields (multi-select)</span>
          <div className="ctrl-group field-pills">
            {Object.entries(FIELD_META).map(([key, meta]) => (
              <button
                key={key}
                className={`field-pill ${selectedFields.includes(key) ? 'active' : ''}`}
                style={selectedFields.includes(key) ? { background: meta.color, color: 'white', borderColor: meta.color } : {}}
                onClick={() => toggleField(key)}
              >
                {meta.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="main-chart card animate-up">
        <div className="chart-title-row">
          <h2>Sensor Readings - Last {range} Entries</h2>
          <span className="data-count">{chartData.length} data points</span>
        </div>
        {loading ? (
          <div className="loading-skeleton" style={{ height: 350 }} />
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            {renderChart()}
          </ResponsiveContainer>
        ) : (
          <div className="no-data-msg">No data available for the selected range.</div>
        )}
      </div>

      {selectedFields.length >= 2 && (
        <div className="scatter-section card animate-up">
          <h2>Correlation: {FIELD_META[selectedFields[0]].label} vs {FIELD_META[selectedFields[1]].label}</h2>
          <p className="scatter-desc">Each point represents one sensor reading. Look for clusters to identify patterns.</p>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey={selectedFields[0]}
                name={FIELD_META[selectedFields[0]].label}
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                label={{ value: FIELD_META[selectedFields[0]].label, position: 'insideBottom', offset: -5, fontSize: 12 }}
              />
              <YAxis
                dataKey={selectedFields[1]}
                name={FIELD_META[selectedFields[1]].label}
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
              />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
              <Scatter
                data={recentFeeds
                  .filter((feed) => feed[selectedFields[0]] !== null && feed[selectedFields[1]] !== null)
                  .map((feed) => ({
                    [selectedFields[0]]: feed[selectedFields[0]],
                    [selectedFields[1]]: feed[selectedFields[1]],
                    time: feed.time,
                  }))}
                fill={FIELD_META[selectedFields[0]].color}
                fillOpacity={0.7}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="weather-section card animate-up">
        <h2>Weather Rain Prediction (7 Days)</h2>
        <p className="weather-desc">Enter current weather conditions to estimate rainfall probability for the next week.</p>
        <div className="weather-inputs">
          <div className="input-group">
            <label>Temperature (C)</label>
            <input type="number" value={temp} onChange={(event) => setTemp(event.target.value)} placeholder="e.g. 25" />
          </div>
          <div className="input-group">
            <label>Humidity (%)</label>
            <input type="number" value={hum} onChange={(event) => setHum(event.target.value)} placeholder="e.g. 60" />
          </div>
          <div className="input-group">
            <label>Pressure (hPa)</label>
            <input type="number" value={press} onChange={(event) => setPress(event.target.value)} placeholder="e.g. 1013" />
          </div>
          <button className="predict-btn" onClick={handlePredict} disabled={weatherLoading}>
            {weatherLoading ? 'Predicting...' : 'Predict Rain'}
          </button>
        </div>
        {weatherError && <p className="error-msg">{weatherError}</p>}
        {forecast.length > 0 && (
          <div className="forecast-grid">
            {forecast.map((day) => (
              <div key={day.day} className="forecast-day">
                <div className="day-label">Day {day.day}</div>
                <div className="day-date">{day.date}</div>
                <div className="rain-prob" style={{ color: day.rainProbability > 0.5 ? '#e74c3c' : '#27ae60' }}>
                  {(day.rainProbability * 100).toFixed(1)}%
                </div>
                <div className="rain-bar">
                  <div className="rain-fill" style={{ width: `${day.rainProbability * 100}%`, background: day.rainProbability > 0.5 ? '#e74c3c' : '#27ae60' }}></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

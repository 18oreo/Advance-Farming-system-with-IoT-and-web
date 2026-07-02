import { useState, useCallback } from 'react';
import api from '../utils/api';

export const useWeather = () => {
  const [forecast, setForecast] = useState([]);
  const [currentConditions, setCurrentConditions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [source, setSource] = useState(null); // 'api-based' or 'sensor-based'

  const predictRain = useCallback(async (temperature, humidity, pressure, latitude, longitude) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/weather/predict-rain', {
        temperature,
        humidity,
        pressure,
        latitude: latitude || undefined,
        longitude: longitude || undefined,
      });

      if (response.data.success) {
        setForecast(response.data.forecast);
        setCurrentConditions(response.data.currentConditions);
        setSource(response.data.source);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      console.error('Weather prediction error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getFormattedForecast = useCallback(() => {
    return forecast.map(day => ({
      ...day,
      rainPercentage: Math.round(day.rainProbability * 100), // For UI display
      dayName: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
      dateFormatted: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));
  }, [forecast]);

  return {
    forecast,
    formattedForecast: getFormattedForecast(),
    currentConditions,
    loading,
    error,
    source,
    predictRain,
  };
};

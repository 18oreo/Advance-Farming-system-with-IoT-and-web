const axios = require('axios');

// Cache to store forecast data and avoid excessive API calls
const forecastCache = {
  data: null,
  timestamp: null,
  CACHE_DURATION: 3600000, // 1 hour in milliseconds
};

/**
 * Calculate dew point using Magnus approximation formula
 * Higher dew point close to temperature = higher rain probability
 */
function calculateDewPoint(temperature, humidity) {
  const a = 17.27;
  const b = 237.7;
  const alpha = ((a * temperature) / (b + temperature)) + Math.log(humidity / 100);
  const dewPoint = (b * alpha) / (a - alpha);
  return dewPoint;
}

/**
 * Calculate rain probability based on meteorological factors
 * Uses weighted average instead of sum to avoid hitting 100%
 */
function calculateRainProbability(weatherData) {
  let totalWeight = 0;
  let weightedSum = 0;

  // Factor 1: Cloud coverage (0-100%)
  // Weight: 20%
  if (weatherData.cloud !== undefined && weatherData.cloud !== null) {
    const cloudFactor = weatherData.cloud; // Already 0-100
    weightedSum += cloudFactor * 0.20;
    totalWeight += 0.20;
  }

  // Factor 2: Dew point analysis (0-100 scale)
  // When dew point is close to temperature, moisture will condense into rain
  // Weight: 25%
  const dewPoint = calculateDewPoint(weatherData.temperature, weatherData.humidity);
  const dewPointSpread = weatherData.temperature - dewPoint;
  let dewFactor = 0;
  
  if (dewPointSpread < 1) {
    dewFactor = 95; // Very likely to rain
  } else if (dewPointSpread < 2) {
    dewFactor = 85; // Likely to rain
  } else if (dewPointSpread < 3) {
    dewFactor = 75; // Moderate-high chance
  } else if (dewPointSpread < 5) {
    dewFactor = 55; // Moderate chance
  } else if (dewPointSpread < 8) {
    dewFactor = 35; // Moderate-low chance
  } else if (dewPointSpread < 12) {
    dewFactor = 15; // Low chance
  } else {
    dewFactor = 5; // Very low chance
  }
  
  weightedSum += dewFactor * 0.25;
  totalWeight += 0.25;

  // Factor 3: Atmospheric pressure trends (0-100 scale)
  // Falling pressure indicates approaching weather system
  // Weight: 20%
  let pressureFactor = 30; // Default: stable
  if (weatherData.pressureTrend === 'falling') {
    pressureFactor = 70; // Strong indicator of rain
  } else if (weatherData.pressureTrend === 'rising') {
    pressureFactor = 10; // Clearing conditions
  }
  
  weightedSum += pressureFactor * 0.20;
  totalWeight += 0.20;

  // Factor 4: Humidity levels (0-100 scale)
  // Very high humidity increases rain probability
  // Weight: 20%
  let humidityFactor = 0;
  if (weatherData.humidity > 90) {
    humidityFactor = 85;
  } else if (weatherData.humidity > 85) {
    humidityFactor = 70;
  } else if (weatherData.humidity > 80) {
    humidityFactor = 55;
  } else if (weatherData.humidity > 75) {
    humidityFactor = 40;
  } else if (weatherData.humidity > 70) {
    humidityFactor = 25;
  } else if (weatherData.humidity > 65) {
    humidityFactor = 15;
  } else if (weatherData.humidity > 60) {
    humidityFactor = 10;
  } else {
    humidityFactor = 5;
  }
  
  weightedSum += humidityFactor * 0.20;
  totalWeight += 0.20;

  // Factor 5: Current weather condition (0-100 scale)
  // Weight: 15%
  let conditionFactor = 0;
  const rainConditions = ['rain', 'drizzle', 'thunderstorm', 'shower'];
  if (rainConditions.some(cond => weatherData.condition && weatherData.condition.toLowerCase().includes(cond))) {
    conditionFactor = 85; // Already raining
  } else if (weatherData.condition && weatherData.condition.toLowerCase().includes('cloud')) {
    conditionFactor = 30;
  } else if (weatherData.condition && weatherData.condition.toLowerCase().includes('sunny')) {
    conditionFactor = 5;
  } else {
    conditionFactor = 15; // Default for unknown
  }
  
  weightedSum += conditionFactor * 0.15;
  totalWeight += 0.15;

  // Calculate weighted average
  const probability = totalWeight > 0 ? (weightedSum / totalWeight) : 30;
  
  // Ensure probability stays within 0-100 range
  return Math.max(0, Math.min(100, probability));
}

/**
 * Fetch 7-day forecast from WeatherAPI
 * Falls back to sensor-based prediction if API is unavailable
 */
async function get7DayForecast(latitude, longitude, sensorData) {
  try {
    // Try using OpenWeatherMap or WeatherAPI
    // Using free tier APIs that provide accurate forecasts
    const weatherApiKey = process.env.WEATHER_API_KEY || 'demo'; // Use environment variable
    
    // Alternative: Use free weather APIs that don't require key
    // OpenWeatherMap free: https://api.openweathermap.org/data/2.5/forecast
    // WeatherAPI free: https://api.weatherapi.com/v1/forecast.json
    
    let forecastData = [];

    // Try WeatherAPI (free tier supports 10 days)
    try {
      const response = await axios.get('https://api.weatherapi.com/v1/forecast.json', {
        params: {
          key: weatherApiKey,
          q: `${latitude},${longitude}`,
          days: 7,
          aqi: 'no',
          alerts: 'no',
        },
        timeout: 5000,
      });

      if (response.data && response.data.forecast && response.data.forecast.forecastday) {
        console.log('✅ Using WeatherAPI data');
        forecastData = response.data.forecast.forecastday.map((day, index) => {
          const dayData = day.day;
          const rainProb = dayData.daily_chance_of_rain || 0;
          
          return {
            day: index + 1,
            date: day.date,
            rainProbability: rainProb / 100, // Convert to decimal
            temperature: dayData.avg_temp_c,
            maxTemp: dayData.max_temp_c,
            minTemp: dayData.min_temp_c,
            humidity: dayData.avg_humidity,
            condition: dayData.condition.text,
            icon: dayData.condition.icon,
            windSpeed: dayData.max_wind_kph,
            precipitationMm: dayData.totalprecip_mm,
          };
        });
      }
    } catch (weatherApiError) {
      console.log('⚠️ WeatherAPI unavailable, trying OpenWeatherMap...');
      console.log('Error:', weatherApiError.message);
      
      // Fallback to OpenWeatherMap
      try {
        const response = await axios.get('https://api.openweathermap.org/data/2.5/forecast', {
          params: {
            appid: weatherApiKey,
            lat: latitude,
            lon: longitude,
            units: 'metric',
            cnt: 40, // 5 days of 3-hour forecasts
          },
          timeout: 5000,
        });

        if (response.data && response.data.list) {
          // Group into 7 days and calculate daily averages
          const dailyForecasts = {};
          
          response.data.list.forEach(forecast => {
            const date = new Date(forecast.dt * 1000).toISOString().split('T')[0];
            
            if (!dailyForecasts[date]) {
              dailyForecasts[date] = {
                temps: [],
                humidity: [],
                rain: [],
                descriptions: [],
                wind: [],
              };
            }
            
            dailyForecasts[date].temps.push(forecast.main.temp);
            dailyForecasts[date].humidity.push(forecast.main.humidity);
            dailyForecasts[date].wind.push(forecast.wind.speed);
            dailyForecasts[date].rain.push(forecast.rain ? forecast.rain['3h'] || 0 : 0);
            dailyForecasts[date].descriptions.push(forecast.weather[0].main);
          });

          let dayNum = 1;
          for (const [date, data] of Object.entries(dailyForecasts).slice(0, 7)) {
            const avgTemp = data.temps.reduce((a, b) => a + b) / data.temps.length;
            const avgHumidity = Math.round(data.humidity.reduce((a, b) => a + b) / data.humidity.length);
            const totalRain = data.rain.reduce((a, b) => a + b);
            
            // Calculate rain probability based on precipitation and weather condition
            let rainProb = Math.min(100, (totalRain * 10) + (data.descriptions.some(d => d.includes('Rain')) ? 40 : 0)) / 100;
            
            forecastData.push({
              day: dayNum++,
              date: date,
              rainProbability: rainProb,
              temperature: Math.round(avgTemp * 10) / 10,
              humidity: avgHumidity,
              condition: data.descriptions[0] || 'Unknown',
              precipitationMm: Math.round(totalRain * 10) / 10,
            });
          }
        }
      } catch (error) {
        console.log('❌ Both WeatherAPI and OpenWeatherMap failed');
        console.log('Using sensor-based fallback prediction');
      }
    }

    return forecastData.length > 0 ? forecastData : null;
  } catch (error) {
    console.error('Error fetching forecast:', error.message);
    return null;
  }
}

/**
 * Fallback: Generate forecast based on sensor data and meteorological patterns
 */
function generateSensorBasedForecast(temperature, humidity, pressure, previousReadings) {
  const forecast = [];
  
  // Analyze pressure trend
  let pressureTrend = 'stable';
  if (previousReadings && previousReadings.length > 0) {
    const avgPreviousPressure = previousReadings.reduce((a, b) => a + b) / previousReadings.length;
    if (pressure < avgPreviousPressure - 2) {
      pressureTrend = 'falling';
    } else if (pressure > avgPreviousPressure + 2) {
      pressureTrend = 'rising';
    }
  }

  for (let day = 1; day <= 7; day++) {
    // Simulate weather changes based on meteorological patterns
    const dayFactor = day * 0.15; // Small daily variation
    
    // Adjust temperature gradually (±1-2°C per day)
    const tempVariation = (Math.random() - 0.5) * 4;
    const dayTemp = temperature + tempVariation - (dayFactor * 2);
    
    // Adjust humidity
    const humidityVariation = (Math.random() - 0.5) * 20;
    const dayHumidity = Math.max(30, Math.min(100, humidity + humidityVariation + (dayFactor * 10)));
    
    // Calculate rain probability for this day
    const dayWeather = {
      temperature: dayTemp,
      humidity: dayHumidity,
      pressure: pressure - (dayFactor * 3), // Slight pressure decrease over time
      pressureTrend: day === 1 ? pressureTrend : 'stable',
      cloud: Math.max(0, Math.min(100, dayHumidity * 0.8 + (Math.random() * 20))),
      windSpeed: 10 + (Math.random() * 15),
      condition: 'Partly Cloudy',
    };

    const rainProb = calculateRainProbability(dayWeather);

    forecast.push({
      day,
      date: new Date(Date.now() + day * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      rainProbability: rainProb / 100, // Convert percentage (0-100) to decimal (0-1)
      temperature: Math.round(dayTemp * 10) / 10,
      humidity: Math.round(dayHumidity),
      condition: 'Partly Cloudy',
      source: 'sensor-based',
    });
  }

  return forecast;
}

exports.predictRain = async (req, res) => {
  try {
    const temperature = Number(req.body.temperature);
    const humidity = Number(req.body.humidity);
    const pressure = Number(req.body.pressure);
    const latitude = req.body.latitude || 23.1815; // Default: India center
    const longitude = req.body.longitude || 79.9864;

    if (![temperature, humidity, pressure].every(Number.isFinite)) {
      return res.status(400).json({
        success: false,
        message: 'Temperature, humidity, and pressure must be valid numbers',
      });
    }

    let forecast = null;

    // Try to get real API forecast
    forecast = await get7DayForecast(latitude, longitude, {
      temperature,
      humidity,
      pressure,
    });

    // Fallback to sensor-based prediction if API fails
    if (!forecast) {
      console.log('📊 Using sensor-based prediction algorithm');
      forecast = generateSensorBasedForecast(temperature, humidity, pressure, []);
    }

    // Ensure all values are in proper range
    forecast = forecast.map(day => ({
      ...day,
      rainProbability: Math.max(0, Math.min(1, day.rainProbability)),
    }));

    res.json({
      success: true,
      source: forecast[0]?.source || 'api-based',
      currentConditions: {
        temperature,
        humidity,
        pressure,
        latitude,
        longitude,
      },
      forecast,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Rain prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Prediction failed',
      error: error.message,
    });
  }
};

/**
 * Get weather and 7-day forecast for a specific location by name
 * Similar to Google Weather - just pass city name
 */
exports.getWeatherByLocation = async (req, res) => {
  try {
    const locationName = req.params.name;

    if (!locationName || locationName.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Location name is required',
      });
    }

    const weatherApiKey = process.env.WEATHER_API_KEY || 'demo';

    try {
      // Use WeatherAPI to get current weather and forecast
      const response = await axios.get('https://api.weatherapi.com/v1/forecast.json', {
        params: {
          key: weatherApiKey,
          q: locationName,
          days: 7,
          aqi: 'yes',
          alerts: 'no',
        },
        timeout: 5000,
      });

      if (response.data) {
        const current = response.data.current;
        const location = response.data.location;
        const forecastDays = response.data.forecast.forecastday;

        const forecast = forecastDays.map((day, index) => {
          const dayData = day.day;
          const rainProb = dayData.daily_chance_of_rain || 0;

          return {
            day: index + 1,
            date: day.date,
            rainProbability: rainProb / 100,
            temperature: dayData.avg_temp_c,
            maxTemp: dayData.max_temp_c,
            minTemp: dayData.min_temp_c,
            humidity: dayData.avg_humidity,
            condition: dayData.condition.text,
            icon: dayData.condition.icon,
            windSpeed: dayData.max_wind_kph,
            precipitationMm: dayData.totalprecip_mm,
            uvIndex: dayData.uv,
          };
        });

        return res.json({
          success: true,
          source: 'weather-api',
          location: {
            name: location.name,
            region: location.region,
            country: location.country,
            latitude: location.lat,
            longitude: location.lon,
            timezone: location.tz_id,
          },
          currentConditions: {
            temperature: current.temp_c,
            feelsLike: current.feelslike_c,
            humidity: current.humidity,
            condition: current.condition.text,
            icon: current.condition.icon,
            windSpeed: current.wind_kph,
            pressure: current.pressure_mb,
            visibility: current.vis_km,
            uv: current.uv,
          },
          forecast,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (weatherApiError) {
      console.log('WeatherAPI error, trying OpenWeatherMap...');

      // Fallback to OpenWeatherMap
      try {
        const geoResponse = await axios.get('https://api.openweathermap.org/geo/1.0/direct', {
          params: {
            q: locationName,
            limit: 1,
            appid: weatherApiKey,
          },
          timeout: 5000,
        });

        if (!geoResponse.data || geoResponse.data.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Location not found',
          });
        }

        const { lat, lon, name, country } = geoResponse.data[0];

        const forecastResponse = await axios.get('https://api.openweathermap.org/data/2.5/forecast', {
          params: {
            lat,
            lon,
            units: 'metric',
            appid: weatherApiKey,
          },
          timeout: 5000,
        });

        const dailyForecasts = {};

        forecastResponse.data.list.forEach(forecast => {
          const date = new Date(forecast.dt * 1000).toISOString().split('T')[0];

          if (!dailyForecasts[date]) {
            dailyForecasts[date] = {
              temps: [],
              humidity: [],
              rain: [],
              descriptions: [],
              wind: [],
              pressure: [],
            };
          }

          dailyForecasts[date].temps.push(forecast.main.temp);
          dailyForecasts[date].humidity.push(forecast.main.humidity);
          dailyForecasts[date].wind.push(forecast.wind.speed);
          dailyForecasts[date].pressure.push(forecast.main.pressure);
          dailyForecasts[date].rain.push(forecast.rain ? forecast.rain['3h'] || 0 : 0);
          dailyForecasts[date].descriptions.push(forecast.weather[0].main);
        });

        let dayNum = 1;
        const forecast = [];

        for (const [date, data] of Object.entries(dailyForecasts).slice(0, 7)) {
          const avgTemp = data.temps.reduce((a, b) => a + b) / data.temps.length;
          const maxTemp = Math.max(...data.temps);
          const minTemp = Math.min(...data.temps);
          const avgHumidity = Math.round(data.humidity.reduce((a, b) => a + b) / data.humidity.length);
          const totalRain = data.rain.reduce((a, b) => a + b);

          let rainProb = Math.min(100, (totalRain * 10) + (data.descriptions.some(d => d.includes('Rain')) ? 40 : 0)) / 100;

          forecast.push({
            day: dayNum++,
            date: date,
            rainProbability: rainProb,
            temperature: Math.round(avgTemp * 10) / 10,
            maxTemp: Math.round(maxTemp * 10) / 10,
            minTemp: Math.round(minTemp * 10) / 10,
            humidity: avgHumidity,
            condition: data.descriptions[0] || 'Unknown',
            precipitationMm: Math.round(totalRain * 10) / 10,
          });
        }

        return res.json({
          success: true,
          source: 'open-weather-map',
          location: {
            name,
            country,
            latitude: lat,
            longitude: lon,
          },
          currentConditions: {
            temperature: forecastResponse.data.list[0]?.main?.temp || 0,
            humidity: forecastResponse.data.list[0]?.main?.humidity || 0,
            pressure: forecastResponse.data.list[0]?.main?.pressure || 0,
          },
          forecast,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        throw error;
      }
    }
  } catch (error) {
    console.error('Get weather by location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weather data',
      error: error.message,
    });
  }
};

/**
 * Get weather and 7-day forecast for specific coordinates
 */
exports.getWeatherByCoordinates = async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      });
    }

    const latitude = Number(lat);
    const longitude = Number(lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid latitude or longitude',
      });
    }

    const forecast = await get7DayForecast(latitude, longitude, {});

    if (!forecast) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch weather data',
      });
    }

    res.json({
      success: true,
      source: 'api-based',
      location: {
        latitude,
        longitude,
      },
      forecast: forecast.map(day => ({
        ...day,
        rainProbability: Math.max(0, Math.min(1, day.rainProbability)),
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get weather by coordinates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weather data',
      error: error.message,
    });
  }
};

const express = require('express');
const router = express.Router();
const { predictRain, getWeatherByLocation, getWeatherByCoordinates } = require('../controllers/weatherController');

// POST /api/weather/predict-rain
// Body: { temperature: number, humidity: number, pressure: number, latitude?: number, longitude?: number }
// Returns 7-day forecast with rain probability
router.post('/predict-rain', predictRain);

// GET /api/weather/location/:name
// Returns weather and 7-day forecast for a specific location (city name)
router.get('/location/:name', getWeatherByLocation);

// GET /api/weather/coordinates
// Query params: lat, lon
// Returns weather and 7-day forecast for specific coordinates
router.get('/coordinates', getWeatherByCoordinates);

module.exports = router;


import React, { useState, useEffect, useRef } from 'react';
import { Thermometer, AlertTriangle, Battery, Clock, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import Chart from 'chart.js/auto';

const BatteryMonitoringDashboard = () => {
  const [latestReading, setLatestReading] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [alertStats, setAlertStats] = useState({ total: 0, unacknowledged: 0, today: 0 });
  const [historicalData, setHistoricalData] = useState([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [currentAlert, setCurrentAlert] = useState(null);
  const [playingSiren, setPlayingSiren] = useState(false);

  const API_BASE = 'http://localhost:5000/api';
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  // eslint-disable-next-line no-unused-vars
  const sirenRef = useRef(null);
  const lastTemperatureRef = useRef(null);

  // Create siren sound using Web Audio API
  const createSirenSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.5);
      oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 1);
      
      return new Promise(resolve => {
        oscillator.onended = resolve;
      });
    } catch (error) {
      console.error('Error creating siren sound:', error);
      return Promise.resolve();
    }
  };

  // Play siren sound
  const playSiren = async () => {
    if (playingSiren) return;
    
    setPlayingSiren(true);
    try {
      // Try to play 3 siren cycles
      for (let i = 0; i < 3; i++) {
        await createSirenSound();
        await new Promise(resolve => setTimeout(resolve, 200)); // Short pause between cycles
      }
    } catch (error) {
      console.error('Siren playback error:', error);
    } finally {
      setPlayingSiren(false);
    }
  };

  // Fetch latest temperature reading
  const fetchLatest = async (signal) => {
    try {
      const response = await fetch(`${API_BASE}/data/latest`, { signal });
      if (!response.ok) throw new Error(`Failed to fetch latest data: ${response.status}`);
      const data = await response.json();
      
      // Check if this is a new alert (temperature > 30 and different from last reading)
      if (data.alert && data.temperature > 30) {
        if (!lastTemperatureRef.current || 
            lastTemperatureRef.current.temperature !== data.temperature ||
            new Date(data.timestamp).getTime() !== new Date(lastTemperatureRef.current.timestamp).getTime()) {
          
          setCurrentAlert({
            temperature: data.temperature,
            timestamp: data.timestamp,
            acknowledged: false
          });
          
          // Play siren for new alert
          playSiren();
        }
      } else if (!data.alert) {
        // Clear current alert if temperature is normal
        setCurrentAlert(null);
      }
      
      setLatestReading(data);
      lastTemperatureRef.current = data;
      setLastUpdate(new Date());
      
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching latest data:', error.message);
        setError('Failed to load latest data.');
      }
    }
  };

  // Fetch alerts
  const fetchAlerts = async (signal) => {
    try {
      const response = await fetch(`${API_BASE}/alerts`, { signal });
      if (!response.ok) throw new Error(`Failed to fetch alerts: ${response.status}`);
      const data = await response.json();
      setAlerts(data);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching alerts:', error.message);
      }
    }
  };

  // Fetch alert statistics
  const fetchAlertStats = async (signal) => {
    try {
      const response = await fetch(`${API_BASE}/alerts/stats`, { signal });
      if (!response.ok) throw new Error(`Failed to fetch alert stats: ${response.status}`);
      const data = await response.json();
      setAlertStats(data);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching alert stats:', error.message);
      }
    }
  };

  // Fetch historical data
  const fetchHistoricalData = async (signal) => {
    try {
      const response = await fetch(`${API_BASE}/data?page=1&limit=50`, { signal });
      if (!response.ok) throw new Error(`Failed to fetch historical data: ${response.status}`);
      const { data } = await response.json();
      setHistoricalData(data);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching historical data:', error.message);
      }
    }
  };

  // Fetch all data initially and then periodically
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchAllData = async () => {
      setError(null);
      await Promise.allSettled([
        fetchLatest(signal),
        fetchAlerts(signal),
        fetchAlertStats(signal),
        fetchHistoricalData(signal),
      ]);
      setIsLoading(false);
    };

    // Initial fetch
    fetchAllData();

    // Set up intervals
    const latestInterval = setInterval(() => fetchLatest(signal), 5000); // Check every 5 seconds for new data
    const alertsInterval = setInterval(() => {
      fetchAlerts(signal);
      fetchAlertStats(signal);
    }, 10000); // Update alerts every 10 seconds
    const historyInterval = setInterval(() => fetchHistoricalData(signal), 30000); // Update history every 30 seconds

    return () => {
      controller.abort();
      clearInterval(latestInterval);
      clearInterval(alertsInterval);
      clearInterval(historyInterval);
    };
  }, []);

  // Initialize/update chart
  useEffect(() => {
    if (canvasRef.current && historicalData.length > 0) {
      // Destroy existing chart
      if (chartRef.current) {
        chartRef.current.destroy();
      }

      // Create new chart
      chartRef.current = new Chart(canvasRef.current, {
        type: 'line',
        data: {
          labels: historicalData.map((item) => new Date(item.timestamp).toLocaleTimeString()).reverse(),
          datasets: [{
            label: 'Temperature (°C)',
            data: historicalData.map((item) => item.temperature).reverse(),
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: historicalData.map((item) => (item.alert ? '#ef4444' : '#10b981')).reverse(),
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { title: { display: true, text: 'Time' }, grid: { color: '#e5e7eb' } },
            y: { title: { display: true, text: 'Temperature (°C)' }, beginAtZero: false, grid: { color: '#e5e7eb' } },
          },
          plugins: { legend: { display: true, position: 'top' } },
        },
      });
    }

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [historicalData]);

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) throw new Error('Invalid date');
      return date.toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  const getTemperatureColor = (temp, hasAlert) => {
    if (hasAlert && currentAlert && !currentAlert.acknowledged) return 'text-red-500';
    if (temp > 25) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getTemperatureStatus = (temp, hasAlert) => {
    if (hasAlert && currentAlert && !currentAlert.acknowledged) return { status: 'Critical', color: 'bg-red-500' };
    if (temp > 25) return { status: 'Warning', color: 'bg-yellow-500' };
    return { status: 'Normal', color: 'bg-green-500' };
  };

  const handleDismissAlert = () => {
    if (currentAlert) {
      setCurrentAlert({ ...currentAlert, acknowledged: true });
    }
  };

  const isCurrentlyAlerting = currentAlert && !currentAlert.acknowledged;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <style>
        {`
          @keyframes glow {
            0% { box-shadow: 0 0 5px rgba(239, 68, 68, 0.3), 0 0 10px rgba(239, 68, 68, 0.2), 0 0 15px rgba(239, 68, 68, 0.1); }
            50% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.6), 0 0 30px rgba(239, 68, 68, 0.4), 0 0 40px rgba(239, 68, 68, 0.2); }
            100% { box-shadow: 0 0 5px rgba(239, 68, 68, 0.3), 0 0 10px rgba(239, 68, 68, 0.2), 0 0 15px rgba(239, 68, 68, 0.1); }
          }
          .glow-effect {
            animation: glow 1.5s ease-in-out infinite;
          }
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
          .pulse-effect {
            animation: pulse 1s ease-in-out infinite;
          }
        `}
      </style>

      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-4">
            <div className="bg-indigo-600 p-3 rounded-xl">
              <Battery className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Battery Monitoring Dashboard</h1>
              <p className="text-gray-600 mt-1">Real-time ESP8266 temperature monitoring</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading && <div className="mb-6 text-center text-gray-600">Loading data...</div>}
        
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
            <div className="flex items-center">
              <AlertTriangle className="h-6 w-6 text-red-500 mr-3" />
              <p className="text-red-700">{error} Check if backend is running.</p>
            </div>
          </div>
        )}
        
        {isCurrentlyAlerting && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg glow-effect pulse-effect">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertTriangle className="h-6 w-6 text-red-500 mr-3" />
                <div>
                  <h3 className="text-red-800 font-semibold">🚨 CRITICAL TEMPERATURE ALERT! 🚨</h3>
                  <p className="text-red-700">
                    Battery temperature has exceeded safe limits ({currentAlert.temperature}°C) at {formatDate(currentAlert.timestamp)}
                  </p>
                  {playingSiren && <p className="text-red-600 text-sm mt-1">🔊 Siren is playing...</p>}
                </div>
              </div>
              <button
                onClick={handleDismissAlert}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
              >
                Acknowledge Alert
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className={`bg-white rounded-2xl shadow-lg p-6 border border-gray-100 ${isCurrentlyAlerting ? 'glow-effect' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Thermometer className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-gray-700 font-semibold">Temperature</h3>
              </div>
            </div>
            {latestReading?.temperature ? (
              <div>
                <div className={`text-4xl font-bold mb-2 ${getTemperatureColor(latestReading.temperature, latestReading.alert)}`}>
                  {latestReading.temperature}°C
                </div>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white ${getTemperatureStatus(latestReading.temperature, latestReading.alert).color}`}>
                  {getTemperatureStatus(latestReading.temperature, latestReading.alert).status}
                </div>
              </div>
            ) : (
              <div className="text-gray-400">No data available</div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <Shield className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-gray-700 font-semibold">System Status</h3>
              </div>
            </div>
            <div className="text-2xl font-bold text-green-600 mb-2">
              {latestReading ? 'Online' : 'Offline'}
            </div>
            <div className="text-sm text-gray-500">ESP8266 Connected</div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="text-gray-700 font-semibold">Total Alerts</h3>
              </div>
            </div>
            <div className="text-3xl font-bold text-orange-600 mb-2">{alertStats.total}</div>
            <div className="text-sm text-gray-500">
              {alertStats.unacknowledged} unacknowledged • {alertStats.today} today
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-gray-700 font-semibold">Last Update</h3>
              </div>
            </div>
            {lastUpdate ? (
              <div>
                <div className="text-lg font-semibold text-gray-800 mb-1">{lastUpdate.toLocaleTimeString()}</div>
                <div className="text-sm text-gray-500">{lastUpdate.toLocaleDateString()}</div>
              </div>
            ) : (
              <div className="text-gray-400">Never</div>
            )}
          </div>
        </div>

        {latestReading && (
          <div className={`bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100 ${isCurrentlyAlerting ? 'glow-effect' : ''}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Current Reading</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                <span>{formatDate(latestReading.timestamp)}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className={`text-6xl font-bold mb-2 ${getTemperatureColor(latestReading.temperature, latestReading.alert)}`}>
                  {latestReading.temperature}°C
                </div>
                <div className="text-gray-600">Battery Temperature</div>
              </div>
              <div className="text-center">
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full text-white text-2xl font-bold mb-2 ${getTemperatureStatus(latestReading.temperature, latestReading.alert).color}`}>
                  {isCurrentlyAlerting ? '!' : '✓'}
                </div>
                <div className="text-gray-600">{getTemperatureStatus(latestReading.temperature, latestReading.alert).status}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800 mb-2">
                  {latestReading.temperature > 30 ? 'HIGH' : latestReading.temperature > 25 ? 'MEDIUM' : 'LOW'}
                </div>
                <div className="text-gray-600">Risk Level</div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Temperature History</h2>
          <div className="h-64">
            {historicalData.length > 0 ? (
              <canvas ref={canvasRef}></canvas>
            ) : (
              <div className="text-gray-400 text-center flex items-center justify-center h-full">
                No historical data available
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <button
              onClick={() => setShowAlerts(!showAlerts)}
              className="flex items-center justify-between w-full text-left hover:bg-gray-50 p-2 rounded-lg transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-red-100 p-2 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Recent Alerts</h2>
                  <p className="text-gray-600">{alerts.length} temperature warnings recorded</p>
                </div>
              </div>
              {showAlerts ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
            </button>
          </div>
          
          {showAlerts && (
            <div className="p-6">
              {alerts.length > 0 ? (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {alerts.map((alert, index) => (
                    <div
                      key={alert._id || index}
                      className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200 hover:bg-red-100 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="bg-red-500 p-2 rounded-full">
                          <AlertTriangle className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-red-800">{alert.message}</div>
                          <div className="text-sm text-red-600">{formatDate(alert.timestamp)}</div>
                        </div>
                      </div>
                      <div className="text-red-600 font-bold text-lg">{alert.temperature}°C</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Shield className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Alerts</h3>
                  <p className="text-gray-600">All temperature readings are within normal range</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-gray-600">
            <p>Battery Monitoring System • ESP8266 + DHT11 • Real-time Updates Every 5 Seconds</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BatteryMonitoringDashboard;
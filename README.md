# Battery Monitoring Dashboard

A real-time IoT battery monitoring system built with React, Node.js, and ESP8266. This application provides live temperature monitoring with alert systems for critical battery conditions.

## 🚀 Features

- **Real-time Temperature Monitoring**: Live updates from ESP8266 DHT11 sensor every 5 seconds
- **Critical Alert System**: Visual and audio alerts for temperatures exceeding 28°C
- **Interactive Dashboard**: Modern UI with temperature trends and historical data
- **Data Visualization**: Chart.js integration for temperature history graphs
- **Alert Management**: Comprehensive alert tracking with acknowledgment system
- **Responsive Design**: Mobile-friendly interface using Tailwind CSS

## 🏗️ Architecture

### Frontend (React + Vite)
- **Framework**: React 19 with Vite for fast development
- **Styling**: Tailwind CSS for responsive design
- **Charts**: Chart.js for data visualization  
- **Icons**: Lucide React for modern iconography
- **State Management**: React hooks for real-time data handling

### Backend (Express.js)
- **Server**: Express.js REST API
- **Database**: MongoDB for data persistence
- **Real-time Updates**: Polling-based data fetching
- **CORS**: Cross-origin resource sharing enabled

### Hardware Integration
- **Microcontroller**: ESP8266
- **Sensor**: DHT11 for temperature monitoring
- **Communication**: HTTP POST requests to backend API

## 📊 System Overview

```
ESP8266 (DHT11) → HTTP POST → Express API → MongoDB → React Dashboard
                                    ↓
                              Real-time Alerts & Notifications
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- ESP8266 with DHT11 sensor

### Backend Setup
```bash
cd backend
npm install
npm run dev
```

### Frontend Setup
```bash
npm install
npm run dev
```

### Environment Configuration
Create `.env` file in the backend directory:
```env
MONGO_URI=mongodb://localhost:27017/battery_monitoring
PORT=5000
NODE_ENV=development
```

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/data` | Receive temperature data from ESP8266 |
| GET | `/api/data/latest` | Get latest temperature reading |
| GET | `/api/data` | Get historical data (paginated) |
| GET | `/api/alerts` | Get recent alerts |
| GET | `/api/alerts/stats` | Get alert statistics |
| PUT | `/api/alerts/:id/acknowledge` | Acknowledge specific alert |

## 📱 Dashboard Components

### Key Metrics Cards
- **Temperature Display**: Current battery temperature with color-coded status
- **System Status**: ESP8266 connection status
- **Alert Counter**: Total alerts with breakdown
- **Last Update**: Real-time update timestamp

### Temperature Chart
- Historical temperature trends
- Alert markers for critical readings
- Interactive Chart.js visualization

### Alert Management
- Real-time critical temperature notifications
- Audio siren for immediate attention
- Alert acknowledgment system
- Collapsible alert history panel

## 🚨 Alert System

### Temperature Thresholds
- **Normal**: < 25°C (Green)
- **Warning**: 25-28°C (Yellow)  
- **Critical**: > 28°C (Red with alerts)

### Alert Features
- Visual glow effects for critical alerts
- Audio siren using Web Audio API
- Pulse animations for attention
- One-click alert acknowledgment

## 🔄 Real-time Updates

- **Latest Data**: Every 5 seconds
- **Alerts**: Every 10 seconds
- **Historical Data**: Every 30 seconds
- **Automatic Reconnection**: Error handling with retry logic

## 📦 Dependencies

### Frontend
- React 19 + React DOM
- Chart.js for data visualization
- Lucide React for icons
- Tailwind CSS for styling
- Vite for build tooling

### Backend
- Express.js for REST API
- Mongoose for MongoDB integration
- CORS for cross-origin requests
- Nodemon for development

## 🚀 Deployment

### Production Build
```bash
npm run build
npm run preview
```

### Backend Production
```bash
cd backend
npm start
```

## 📋 Hardware Setup

### ESP8266 Configuration
```cpp
// POST temperature data to: http://your-server:5000/api/data
// JSON format: {"temperature": 25.6}
```

## 🛡️ Error Handling

- MongoDB connection monitoring
- API timeout handling
- Graceful degradation for offline scenarios
- Real-time connection status indicators

## 🔮 Future Enhancements

- [ ] WebSocket integration for true real-time updates
- [ ] Email/SMS notifications
- [ ] Data export functionality
- [ ] Multiple sensor support
- [ ] Historical data analytics
- [ ] User authentication system

## 📝 License

MIT License - Feel free to use this project for educational and commercial purposes.


Developed as part of MSRIT SEM4 MCIOT coursework.

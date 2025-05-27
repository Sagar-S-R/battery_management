import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/battery_monitoring', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Reading Schema
const readingSchema = new mongoose.Schema({
  temperature: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  alert: { type: Boolean, default: false },
});
const Reading = mongoose.model('Reading', readingSchema);

// Alert Schema
const alertSchema = new mongoose.Schema({
  temperature: { type: Number, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  acknowledged: { type: Boolean, default: false }
});
const Alert = mongoose.model('Alert', alertSchema);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date(), db: mongoose.connection.readyState });
});

// Save temperature data from Arduino
app.post('/api/data', async (req, res) => {
  try {
    const { temperature } = req.body;
    if (!temperature || isNaN(temperature)) {
      return res.status(400).json({ error: 'Invalid temperature' });
    }

    const alert = temperature > 28;
    const reading = new Reading({ temperature, alert });
    await reading.save();

    // Create alert record if temperature is high
    if (alert) {
      const alertDoc = new Alert({ 
        temperature, 
        message: `Critical temperature alert: ${temperature}°C detected!`
      });
      await alertDoc.save();
      console.log(`ALERT: Temperature ${temperature}°C exceeds threshold!`);
    }

    res.status(201).json({ 
      message: 'Data saved successfully', 
      alert,
      temperature,
      timestamp: reading.timestamp
    });
  } catch (error) {
    console.error('Error saving data:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get latest reading
app.get('/api/data/latest', async (req, res) => {
  try {
    const latest = await Reading.findOne().sort({ timestamp: -1 });
    if (!latest) {
      return res.status(404).json({ error: 'No data found' });
    }
    res.json(latest);
  } catch (error) {
    console.error('Error fetching latest data:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get historical data
app.get('/api/data', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const readings = await Reading.find()
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.json({ data: readings });
  } catch (error) {
    console.error('Error fetching historical data:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get alerts
app.get('/api/alerts', async (req, res) => {
  try {
    const alerts = await Alert.find().sort({ timestamp: -1 }).limit(20);
    res.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get alert statistics
app.get('/api/alerts/stats', async (req, res) => {
  try {
    const totalAlerts = await Alert.countDocuments();
    const unacknowledgedAlerts = await Alert.countDocuments({ acknowledged: false });
    const todayAlerts = await Alert.countDocuments({
      timestamp: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    });
    
    res.json({
      total: totalAlerts,
      unacknowledged: unacknowledgedAlerts,
      today: todayAlerts
    });
  } catch (error) {
    console.error('Error fetching alert stats:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Acknowledge alert
app.put('/api/alerts/:id/acknowledge', async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { acknowledged: true },
      { new: true }
    );
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    res.json({ message: 'Alert acknowledged', alert });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
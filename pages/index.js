import { useState, useEffect } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';

// Dynamically import Chart.js components to avoid SSR issues
const Line = dynamic(() => import('react-chartjs-2').then((mod) => mod.Line), {
  ssr: false,
});

// Firebase configuration - MUST match ESP32 configuration
const firebaseConfig = {
  apiKey: "AIzaSyChry2-Uvu5efQLq3hEzVzvDeE6w0jGOEs",
  authDomain: "smartcircuitprotection.firebaseapp.com",
  databaseURL: "https://smartcircuitprotection-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smartcircuitprotection", 
  storageBucket: "smartcircuitprotection.firebasestorage.app",
  messagingSenderId: "1040337435557",
  appId: "1:1040337435557:web:da9c4c166b99877790064c",
  measurementId: "G-FQTTHJ9JRB"
};

export default function Home() {
  const [sensorData, setSensorData] = useState({
    voltage: '--',
    current: '--',
    power: '--',
    shortCircuit: false,
    timestamp: '--',
    circuitOff: false,
    isZeroCurrent: false,
    zeroCurrentShortCircuit: false
  });
  
  const [connectionStatus, setConnectionStatus] = useState('Initializing...');
  const [isConnected, setIsConnected] = useState(false);
  const [shortCircuitAlert, setShortCircuitAlert] = useState(false);
  
  // Chart data states
  const [chartData, setChartData] = useState({
    labels: [],
    voltage: [],
    current: [],
    power: [],
    shortCircuitEvents: []
  });
  
  const [shortCircuitLogs, setShortCircuitLogs] = useState([]);
  const [showCharts, setShowCharts] = useState(true);
  const [showLogs, setShowLogs] = useState(false);

  // Register Chart.js components
  useEffect(() => {
    const registerChartJS = async () => {
      if (typeof window !== 'undefined') {
        const ChartJS = await import('chart.js');
        ChartJS.Chart.register(
          ChartJS.CategoryScale,
          ChartJS.LinearScale,
          ChartJS.PointElement,
          ChartJS.LineElement,
          ChartJS.Title,
          ChartJS.Tooltip,
          ChartJS.Legend,
          ChartJS.Filler
        );
      }
    };
    registerChartJS();
  }, []);

  // Function to update chart data
  const updateChartData = (newData) => {
    const now = new Date();
    const timeLabel = now.toLocaleTimeString();
    
    setChartData(prevData => {
      const newLabels = [...prevData.labels, timeLabel];
      const newVoltage = [...prevData.voltage, parseFloat(newData.voltage)];
      const newCurrent = [...prevData.current, parseFloat(newData.current)];
      const newPower = [...prevData.power, parseFloat(newData.power)];
      // Mark short circuit events - including zero current detection
      const isShortCircuitEvent = newData.shortCircuit || newData.zeroCurrentShortCircuit;
      const newShortCircuitEvents = [...prevData.shortCircuitEvents, isShortCircuitEvent ? parseFloat(newData.current) : null];
      
      // Keep only last 30 data points for performance
      const maxPoints = 30;
      if (newLabels.length > maxPoints) {
        newLabels.shift();
        newVoltage.shift();
        newCurrent.shift();
        newPower.shift();
        newShortCircuitEvents.shift();
      }
      
      return {
        labels: newLabels,
        voltage: newVoltage,
        current: newCurrent,
        power: newPower,
        shortCircuitEvents: newShortCircuitEvents
      };
    });
  };

  // Firebase connection
  useEffect(() => {
    let database;
    
    const initFirebase = async () => {
      try {
        const { initializeApp } = await import('firebase/app');
        const { getDatabase, ref, onValue } = await import('firebase/database');
        
        const app = initializeApp(firebaseConfig);
        database = getDatabase(app);
        
        console.log('🔥 Setting up Firebase listener for /latest path...');
        setConnectionStatus('Connecting to Firebase...');
        
        const dataRef = ref(database, 'latest');
        onValue(dataRef, (snapshot) => {
          console.log('🔥 Firebase snapshot received:', snapshot.exists());
          
          if (snapshot.exists()) {
            const data = snapshot.val();
            console.log('🔥 Firebase data:', data);
            
            // Process sensor data with circuit state detection
            const voltage = parseFloat(data.voltage || 0);
            const current = parseFloat(data.current || 0);
            const power = parseFloat(data.power || 0);
            
            // Detect circuit state (matches ESP32 logic exactly)
            const circuitOff = (voltage < 0.5 && Math.abs(current) < 0.001 && power < 0.1);
            const isZeroCurrent = (Math.abs(current) < 0.001);
            
            // Enhanced short circuit detection (matching ESP32 logic)
            // Zero current with voltage present should be detected as short circuit
            const zeroCurrentShortCircuit = (isZeroCurrent && voltage > 1.0);
            const detectedShortCircuit = data.shortCircuit || zeroCurrentShortCircuit;
            
            const newSensorData = {
              voltage: voltage.toFixed(2),
              current: current.toFixed(3),
              power: power.toFixed(2),
              shortCircuit: detectedShortCircuit,
              timestamp: data.timestamp || '--',
              circuitOff: circuitOff,
              isZeroCurrent: isZeroCurrent,
              zeroCurrentShortCircuit: zeroCurrentShortCircuit
            };
            
            setSensorData(newSensorData);
            setConnectionStatus('Connected - Real Data');
            setIsConnected(true);
            updateChartData(newSensorData);
            
            // Trigger alert for any short circuit detection
            if (detectedShortCircuit) {
              setShortCircuitAlert(true);
              setTimeout(() => setShortCircuitAlert(false), 10000);
              
              // Log zero current short circuit events
              if (zeroCurrentShortCircuit) {
                console.log('⚠️ Zero current short circuit detected on website');
                console.log(`Voltage: ${voltage}V, Current: ${current}A`);
                
                // Add to local logs for immediate display (ESP32 will also log to Firebase)
                const localEvent = {
                  id: `local_${Date.now()}`,
                  voltage: voltage.toFixed(2),
                  current: current.toFixed(3),
                  power: power.toFixed(2),
                  timestamp: Math.floor(Date.now() / 1000),
                  date: new Date().toLocaleString(),
                  type: 'Zero Current Detection'
                };
                
                setShortCircuitLogs(prevLogs => [localEvent, ...prevLogs.slice(0, 19)]); // Keep max 20 logs
              }
            }
          } else {
            console.log('🔥 No data found at /latest - waiting for ESP32...');
            setConnectionStatus('Waiting for ESP32 Data');
            setIsConnected(false);
            setSensorData({
              voltage: '--',
              current: '--', 
              power: '--',
              shortCircuit: false,
              timestamp: '--'
            });
          }
        }, (error) => {
          console.error('🔥 Firebase error:', error);
          setConnectionStatus(`Firebase Error: ${error.message}`);
          setIsConnected(false);
        });
        
        // Listen for short circuit events
        const eventsRef = ref(database, 'short_circuit_events');
        onValue(eventsRef, (snapshot) => {
          if (snapshot.exists()) {
            const events = [];
            snapshot.forEach((childSnapshot) => {
              const event = childSnapshot.val();
              events.push({
                id: childSnapshot.key,
                ...event,
                date: new Date(parseInt(event.timestamp) * 1000).toLocaleString()
              });
            });
            setShortCircuitLogs(events.sort((a, b) => b.timestamp - a.timestamp));
          }
        });
        
      } catch (error) {
        console.error('🔥 Firebase initialization error:', error);
        setConnectionStatus(`Firebase Init Failed: ${error.message}`);
        setIsConnected(false);
      }
    };

    initFirebase();
  }, []);

  const formatTimestamp = (timestamp) => {
    if (timestamp === '--') return 'Waiting for data...';
    const date = new Date(parseInt(timestamp) * 1000);
    return `Last update: ${date.toLocaleTimeString()}`;
  };

  // Chart configuration
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#ffffff' }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        ticks: { color: '#ffffff' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' }
      },
      y: {
        ticks: { color: '#ffffff' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' }
      }
    },
    animation: { duration: 1000 }
  };

  return (
    <>
      <Head>
        <title>⚡ Smart Circuit Protection System</title>
        <meta name="description" content="Professional IoT short circuit detection and monitoring system" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
      </Head>

      <div className="header">
        <h1>
          <i className="fas fa-bolt"></i>
          Smart Circuit Protection System
        </h1>
        <div className="status">
          <div className={`status-dot ${!isConnected ? 'disconnected' : ''}`}></div>
          <span>{connectionStatus}</span>
        </div>
      </div>

      <div className="container">
        {shortCircuitAlert && (
          <div className="alert show">
            <i className="fas fa-exclamation-triangle" style={{fontSize: '2rem', animation: 'pulse 1s infinite'}}></i>
            <div>
              <strong style={{fontSize: '1.3rem'}}>⚠️ SHORT CIRCUIT DETECTED!</strong>
              <div style={{fontSize: '1.1rem', marginTop: '0.5rem'}}>
                System protection activated - Immediate attention required
              </div>
            </div>
          </div>
        )}

        <div className="loading" style={{display: sensorData.voltage === '--' ? 'flex' : 'none'}}>
          <div className="spinner"></div>
          <span>Loading sensor data...</span>
        </div>

        <div className="dashboard-grid" style={{display: sensorData.voltage !== '--' ? 'grid' : 'none'}}>
          <div className="card">
            <h3><i className="fas fa-bolt" style={{color: '#00f260'}}></i> Voltage</h3>
            <div className="metric-value voltage">
              {sensorData.voltage}<span className="unit">V</span>
            </div>
            <div className="timestamp">{formatTimestamp(sensorData.timestamp)}</div>
          </div>

          <div className="card">
            <h3><i className="fas fa-tachometer-alt" style={{color: '#fa709a'}}></i> Current</h3>
            <div className="metric-value current">
              {sensorData.current}<span className="unit">A</span>
            </div>
            <div className="timestamp">{formatTimestamp(sensorData.timestamp)}</div>
          </div>

          <div className="card">
            <h3><i className="fas fa-fire" style={{color: '#a8edea'}}></i> Power</h3>
            <div className="metric-value power">
              {sensorData.power}<span className="unit">W</span>
            </div>
            <div className="timestamp">{formatTimestamp(sensorData.timestamp)}</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="chart-container" style={{display: sensorData.voltage !== '--' ? 'block' : 'none'}}>
          <div className="nav-tabs">
            <button 
              className={`tab ${showCharts ? 'active' : ''}`}
              onClick={() => {setShowCharts(true); setShowLogs(false);}}
            >
              <i className="fas fa-chart-line"></i> Real-time Graphs
            </button>
            <button 
              className={`tab ${showLogs ? 'active' : ''}`}
              onClick={() => {setShowCharts(false); setShowLogs(true);}}
            >
              <i className="fas fa-exclamation-triangle"></i> Short Circuit Log
            </button>
          </div>
        </div>

        {/* Real-time Charts */}
        {showCharts && sensorData.voltage !== '--' && (
          <>
            <div className="chart-container">
              <h3><i className="fas fa-bolt" style={{color: '#00f260'}}></i> Voltage Over Time</h3>
              <div className="chart-wrapper">
                <Line
                  data={{
                    labels: chartData.labels,
                    datasets: [{
                      label: 'Voltage (V)',
                      data: chartData.voltage,
                      borderColor: '#00f260',
                      backgroundColor: 'rgba(0, 242, 96, 0.1)',
                      borderWidth: 3,
                      fill: true,
                      tension: 0.4
                    }]
                  }}
                  options={chartOptions}
                />
              </div>
            </div>

            <div className="chart-container">
              <h3><i className="fas fa-tachometer-alt" style={{color: '#fa709a'}}></i> Current Over Time</h3>
              <div className="chart-wrapper">
                <Line
                  data={{
                    labels: chartData.labels,
                    datasets: [
                      {
                        label: 'Current (A)',
                        data: chartData.current,
                        borderColor: '#fa709a',
                        backgroundColor: 'rgba(250, 112, 154, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4
                      },
                      {
                        label: 'Short Circuit Events',
                        data: chartData.shortCircuitEvents,
                        borderColor: '#ff4757',
                        backgroundColor: '#ff4757',
                        pointBackgroundColor: '#ff4757',
                        pointRadius: 8,
                        showLine: false
                      }
                    ]
                  }}
                  options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      tooltip: {
                        ...chartOptions.plugins.tooltip,
                        callbacks: {
                          label: function(context) {
                            if (context.datasetIndex === 1 && context.parsed.y !== null) {
                              return `🚨 SHORT CIRCUIT: ${context.parsed.y}A`;
                            }
                            return `${context.dataset.label}: ${context.parsed.y}A`;
                          }
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>

            <div className="chart-container">
              <h3><i className="fas fa-fire" style={{color: '#a8edea'}}></i> Power Over Time</h3>
              <div className="chart-wrapper">
                <Line
                  data={{
                    labels: chartData.labels,
                    datasets: [{
                      label: 'Power (W)',
                      data: chartData.power,
                      borderColor: '#a8edea',
                      backgroundColor: 'rgba(168, 237, 234, 0.1)',
                      borderWidth: 3,
                      fill: true,
                      tension: 0.4
                    }]
                  }}
                  options={chartOptions}
                />
              </div>
            </div>
          </>
        )}

        {/* Short Circuit Log */}
        {showLogs && (
          <div className="chart-container">
            <h3><i className="fas fa-exclamation-triangle" style={{color: '#ff4757'}}></i> Short Circuit Event Log</h3>
            <div className="log-container">
              {shortCircuitLogs.length > 0 ? (
                <div className="log-list">
                  {shortCircuitLogs.slice(0, 20).map((event, index) => (
                    <div key={event.id} className="log-item">
                      <div className="log-header">
                        <span className="log-severity">🚨 HIGH SEVERITY</span>
                        <span className="log-time">{event.date}</span>
                      </div>
                      <div className="log-details">
                        <div className="log-metric">
                          <strong>Voltage:</strong> {parseFloat(event.voltage).toFixed(2)}V
                        </div>
                        <div className="log-metric">
                          <strong>Current:</strong> {parseFloat(event.current).toFixed(3)}A
                        </div>
                        <div className="log-metric">
                          <strong>Power:</strong> {parseFloat(event.power).toFixed(2)}W
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-logs">
                  <i className="fas fa-check-circle" style={{fontSize: '3rem', color: '#28a745', marginBottom: '1rem'}}></i>
                  <h3>No Short Circuit Events</h3>
                  <p>System is operating normally. No short circuits detected.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* System Status Summary */}
        <div className="chart-container" style={{display: sensorData.voltage !== '--' ? 'block' : 'none'}}>
          <h3><i className="fas fa-heartbeat"></i> System Status</h3>
          <div style={{textAlign: 'center', padding: '2rem'}}>
            <h2 style={{
              color: sensorData.circuitOff ? '#ffd60a' : 
                     sensorData.shortCircuit ? '#ff3068' : 
                     sensorData.zeroCurrentShortCircuit ? '#ff6b35' :
                     '#00ff87'
            }}>
              {sensorData.circuitOff ? '🔌 CIRCUIT OFF' :
               sensorData.zeroCurrentShortCircuit ? '⚠️ ZERO CURRENT SHORT CIRCUIT' :
               sensorData.shortCircuit ? '🚨 SHORT CIRCUIT DETECTED' :
               '✅ SYSTEM NORMAL'}
            </h2>
            <p style={{marginTop: '1rem', fontSize: '1.1rem', opacity: 0.8}}>
              {sensorData.circuitOff ? 'No power detected - Circuit appears to be off' :
               sensorData.zeroCurrentShortCircuit ? 'Current = 0.000A with voltage present - Short circuit detected!' :
               sensorData.shortCircuit ? 'Short circuit condition detected by system' :
               isConnected ? 'Real-time monitoring active - All systems operational' : 
               'Waiting for ESP32 connection'}
            </p>
          </div>
        </div>

        {/* Debug Panel */}
        <div className="chart-container">
          <h3><i className="fas fa-bug"></i> Debug Information</h3>
          <div style={{padding: '1.5rem'}}>
            <div className="debug-info">
              <div className="debug-row">
                <strong>Connection Status:</strong> 
                <span className={`status ${isConnected ? 'connected' : 'disconnected'}`}>
                  {connectionStatus}
                </span>
              </div>
              <div className="debug-row">
                <strong>Data Source:</strong> 
                <span>{isConnected ? '🔗 ESP32 via Firebase' : '⏳ Waiting for ESP32'}</span>
              </div>
              <div className="debug-row">
                <strong>Last Update:</strong> 
                <span>{formatTimestamp(sensorData.timestamp)}</span>
              </div>
              <div className="debug-note">
                💡 <strong>Troubleshooting:</strong><br/>
                • Check if ESP32 is powered and connected to WiFi<br/>
                • Open browser console (F12) for detailed Firebase logs<br/>
                • Verify Firebase database rules allow read access
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
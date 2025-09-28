import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

// Firebase configuration (replace with your actual config)
const firebaseConfig = {
  apiKey: "AIzaSyChry2-Uvu5efQLq3hEzVzvDeE6w0jGOEs",
  authDomain: "smart-circuit-monitor.firebaseapp.com",
  databaseURL: "https://smart-circuit-monitor-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smart-circuit-monitor",
  storageBucket: "smart-circuit-monitor.firebasestorage.app",
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
    timestamp: '--'
  });
  
  const [connectionStatus, setConnectionStatus] = useState('Initializing...');
  const [isConnected, setIsConnected] = useState(false);
  const [shortCircuitAlert, setShortCircuitAlert] = useState(false);

  useEffect(() => {
    let database;
    
    const initFirebase = async () => {
      try {
        // Dynamically import Firebase to avoid SSR issues
        const { initializeApp } = await import('firebase/app');
        const { getDatabase, ref, onValue } = await import('firebase/database');
        
        const app = initializeApp(firebaseConfig);
        database = getDatabase(app);
        
        // Listen for real-time data
        console.log('🔥 Setting up Firebase listener for /latest path...');
        console.log('🔥 Database URL:', firebaseConfig.databaseURL);
        
        const dataRef = ref(database, 'latest');
        
        // Test database connection first
        console.log('🔥 Testing Firebase connection...');
        setConnectionStatus('Connecting to Firebase...');
        
        onValue(dataRef, (snapshot) => {
          console.log('🔥 Firebase snapshot received:', snapshot.exists());
          console.log('🔥 Snapshot key:', snapshot.key);
          console.log('🔥 Full snapshot:', snapshot.val());
          
          if (snapshot.exists()) {
            const data = snapshot.val();
            console.log('🔥 Raw Firebase data:', JSON.stringify(data, null, 2));
            setSensorData({
              voltage: parseFloat(data.voltage || 0).toFixed(2),
              current: parseFloat(data.current || 0).toFixed(3),
              power: parseFloat(data.power || 0).toFixed(2),
              shortCircuit: data.shortCircuit || false,
              timestamp: data.timestamp || '--'
            });
            setConnectionStatus('Connected - Real Data');
            setIsConnected(true);
            
            // Handle short circuit alerts
            if (data.shortCircuit) {
              setShortCircuitAlert(true);
              // Auto-hide alert after 10 seconds
              setTimeout(() => setShortCircuitAlert(false), 10000);
            }
          } else {
            console.log('🔥 No data found at /latest - switching to demo mode');
            setConnectionStatus('No Data Found - Demo Mode');
            setIsConnected(false);
            showDemoData();
          }
        }, (error) => {
          console.error('🔥 Firebase error:', error);
          setConnectionStatus(`Firebase Error: ${error.message}`);
          setIsConnected(false);
          showDemoData();
        });
        
      } catch (error) {
        console.error('🔥 Firebase initialization error:', error);
        console.error('🔥 Error details:', {
          message: error.message,
          code: error.code,
          stack: error.stack
        });
        setConnectionStatus(`Firebase Init Failed: ${error.message} - Demo Mode`);
        setIsConnected(false);
        showDemoData();
      }
    };

    const showDemoData = () => {
      const baseVoltage = 12.0;
      const baseCurrent = 2.1;
      
      // Add realistic fluctuations
      const voltage = (baseVoltage + (Math.random() * 0.4 - 0.2)).toFixed(2);
      const current = (baseCurrent + (Math.random() * 0.3 - 0.15)).toFixed(3);
      
      const demoData = {
        voltage: voltage,
        current: current,
        power: (parseFloat(voltage) * parseFloat(current)).toFixed(2),
        shortCircuit: Math.random() < 0.02, // 2% chance of demo short circuit
        timestamp: Math.floor(Date.now() / 1000).toString()
      };
      
      setSensorData(demoData);
      
      // Update demo data every 2 seconds
      setTimeout(() => {
        if (!isConnected) showDemoData();
      }, 2000);
    };

    initFirebase();
    
    return () => {
      // Cleanup if needed
    };
  }, [isConnected]);

  const formatTimestamp = (timestamp) => {
    if (timestamp === '--') return 'Waiting for data...';
    const date = new Date(parseInt(timestamp) * 1000);
    return `Last update: ${date.toLocaleTimeString()}`;
  };

  return (
    <>
      <Head>
        <title>⚡ Smart Circuit Protection System</title>
        <meta name="description" content="Professional IoT short circuit detection and monitoring system" />
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

        <div className="chart-container" style={{display: sensorData.voltage !== '--' ? 'block' : 'none'}}>
          <h3><i className="fas fa-chart-line"></i> System Status</h3>
          <div style={{textAlign: 'center', padding: '2rem'}}>
            <h2 style={{color: sensorData.shortCircuit ? '#dc3545' : '#28a745'}}>
              {sensorData.shortCircuit ? '🚨 SHORT CIRCUIT DETECTED' : '✅ SYSTEM NORMAL'}
            </h2>
            <p style={{marginTop: '1rem', fontSize: '1.1rem', opacity: 0.8}}>
              {isConnected ? 'Real-time monitoring active' : 'Demo mode - Connect ESP32 for live data'}
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
                <span>{isConnected ? '🔗 ESP32 via Firebase' : '🎭 Demo Simulation'}</span>
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
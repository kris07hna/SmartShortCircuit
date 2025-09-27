// Firebase Configuration
// Replace these with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyD8zedqg48WtCc1F0lSAoF3g4AiSQ5Chvc",
  authDomain: "smartcircuitprotection.firebaseapp.com",
  databaseURL: "https://smartcircuitprotection-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smartcircuitprotection",
  storageBucket: "smartcircuitprotection.firebasestorage.app",
  messagingSenderId: "331410220617",
  appId: "1:331410220617:web:9977160dcdc64b94bc8198"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Global variables
let sensorChart;
let isConnected = false;
let lastShortCircuitAlert = 0;
const MAX_DATA_POINTS = 50;

// Chart data storage
const chartData = {
    labels: [],
    voltage: [],
    current: [],
    power: []
};

// DOM elements
const elements = {
    connectionStatus: document.getElementById('connectionStatus'),
    statusText: document.getElementById('statusText'),
    loadingIndicator: document.getElementById('loadingIndicator'),
    dashboardGrid: document.getElementById('dashboardGrid'),
    chartContainer: document.getElementById('chartContainer'),
    eventsContainer: document.getElementById('eventsContainer'),
    shortCircuitAlert: document.getElementById('shortCircuitAlert'),
    voltageValue: document.getElementById('voltageValue'),
    currentValue: document.getElementById('currentValue'),
    powerValue: document.getElementById('powerValue'),
    eventsList: document.getElementById('eventsList')
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    console.log('Initializing Smart Short Circuit Monitor...');
    
    // Initialize chart
    initializeChart();
    
    // Start listening to Firebase data
    startFirebaseListeners();
    
    // Load short circuit events
    loadShortCircuitEvents();
    
    // Start connection monitoring
    monitorConnection();
}

function initializeChart() {
    const ctx = document.getElementById('sensorChart').getContext('2d');
    
    sensorChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Voltage (V)',
                data: chartData.voltage,
                borderColor: '#28a745',
                backgroundColor: 'rgba(40, 167, 69, 0.1)',
                borderWidth: 2,
                fill: false,
                tension: 0.4,
                yAxisID: 'voltage-axis'
            }, {
                label: 'Current (A)',
                data: chartData.current,
                borderColor: '#fd7e14',
                backgroundColor: 'rgba(253, 126, 20, 0.1)',
                borderWidth: 2,
                fill: false,
                tension: 0.4,
                yAxisID: 'current-axis'
            }, {
                label: 'Power (W)',
                data: chartData.power,
                borderColor: '#6f42c1',
                backgroundColor: 'rgba(111, 66, 193, 0.1)',
                borderWidth: 2,
                fill: false,
                tension: 0.4,
                yAxisID: 'power-axis'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        boxWidth: 20,
                        padding: 15
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Time'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                'voltage-axis': {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Voltage (V)',
                        color: '#28a745'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                    ticks: {
                        color: '#28a745'
                    }
                },
                'current-axis': {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Current (A)',
                        color: '#fd7e14'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                    ticks: {
                        color: '#fd7e14'
                    }
                },
                'power-axis': {
                    type: 'linear',
                    display: false,
                    position: 'right',
                }
            },
            animation: {
                duration: 300
            }
        }
    });
}

function startFirebaseListeners() {
    debugLog('🔥 Starting Firebase listeners...');
    debugLog('Database URL: ' + firebaseConfig.databaseURL);
    
    // Add timeout for initial connection
    let connectionTimeout = setTimeout(() => {
        debugLog('⏰ Firebase connection timeout - showing demo data');
        console.log('Firebase connection timeout - showing demo data');
        showDemoData();
    }, 5000);

    // Monitor connection state
    database.ref('.info/connected').on('value', (snapshot) => {
        const connected = snapshot.val();
        debugLog(`🌐 Firebase connection state: ${connected ? 'Connected' : 'Disconnected'}`);
        if (connected) {
            debugLog('✅ Connected to Firebase Realtime Database');
        } else {
            debugLog('❌ Disconnected from Firebase Realtime Database');
        }
    });

    // Listen for latest sensor data with enhanced debugging
    database.ref('latest').on('value', (snapshot) => {
        clearTimeout(connectionTimeout);
        debugLog('📡 Firebase data event received');
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            debugLog('✅ Data received: ' + JSON.stringify(data));
            updateSensorData(data);
            updateConnectionStatus(true);
        } else {
            debugLog('⚠️ No latest data available - generating demo data');
            console.log('No latest data available - generating demo data');
            showDemoData();
        }
    }, (error) => {
        clearTimeout(connectionTimeout);
        debugLog('❌ Firebase error: ' + error.code + ' - ' + error.message);
        console.error('🔥 Firebase error details:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        // Show error to user
        elements.statusText.textContent = `Error: ${error.message}`;
        
        showDemoData();
        updateConnectionStatus(false);
    });

    // Listen for new sensor data entries for the chart
    database.ref('sensor_data').limitToLast(MAX_DATA_POINTS).on('value', (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            updateChartData(data);
        }
    });

    // Listen for short circuit events
    database.ref('short_circuit_events').limitToLast(10).on('value', (snapshot) => {
        if (snapshot.exists()) {
            const events = snapshot.val();
            displayShortCircuitEvents(events);
        }
    });
}

function updateSensorData(data) {
    if (!data) return;

    // Update metric cards
    elements.voltageValue.innerHTML = `${parseFloat(data.voltage || 0).toFixed(2)}<span class="unit">V</span>`;
    elements.currentValue.innerHTML = `${parseFloat(data.current || 0).toFixed(3)}<span class="unit">A</span>`;
    elements.powerValue.innerHTML = `${parseFloat(data.power || 0).toFixed(2)}<span class="unit">W</span>`;

    // Update timestamp
    const timestamp = data.timestamp ? new Date(parseInt(data.timestamp) * 1000) : new Date();
    const timeStr = timestamp.toLocaleTimeString();
    
    document.getElementById('voltageTime').textContent = `Last update: ${timeStr}`;
    document.getElementById('currentTime').textContent = `Last update: ${timeStr}`;
    document.getElementById('powerTime').textContent = `Last update: ${timeStr}`;

    // Check for short circuit
    if (data.shortCircuit) {
        showShortCircuitAlert();
    } else {
        hideShortCircuitAlert();
    }

    // Show dashboard after first data received
    if (elements.dashboardGrid.style.display === 'none') {
        elements.loadingIndicator.style.display = 'none';
        elements.dashboardGrid.style.display = 'grid';
        elements.chartContainer.style.display = 'block';
        elements.eventsContainer.style.display = 'block';
    }
}

function updateChartData(data) {
    // Clear existing data
    chartData.labels = [];
    chartData.voltage = [];
    chartData.current = [];
    chartData.power = [];

    // Sort data by timestamp
    const sortedEntries = Object.entries(data).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));

    sortedEntries.forEach(([timestamp, reading]) => {
        const date = new Date(parseInt(timestamp) * 1000);
        chartData.labels.push(date.toLocaleTimeString());
        chartData.voltage.push(parseFloat(reading.voltage || 0));
        chartData.current.push(parseFloat(reading.current || 0));
        chartData.power.push(parseFloat(reading.power || 0));
    });

    // Update chart
    if (sensorChart) {
        sensorChart.update('none');
    }
}

function updateConnectionStatus(connected) {
    isConnected = connected;
    elements.connectionStatus.className = connected ? 'status-dot' : 'status-dot disconnected';
    elements.statusText.textContent = connected ? 'Connected' : 'Disconnected';
}

function showShortCircuitAlert() {
    const now = Date.now();
    // Prevent spam alerts (show maximum once every 5 seconds)
    if (now - lastShortCircuitAlert > 5000) {
        elements.shortCircuitAlert.classList.add('show');
        lastShortCircuitAlert = now;
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            hideShortCircuitAlert();
        }, 10000);
        
        // Play alert sound if supported
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance('Short circuit detected');
            utterance.rate = 1.2;
            utterance.pitch = 1.2;
            speechSynthesis.speak(utterance);
        }
    }
}

function hideShortCircuitAlert() {
    elements.shortCircuitAlert.classList.remove('show');
}

function loadShortCircuitEvents() {
    database.ref('short_circuit_events').limitToLast(20).once('value', (snapshot) => {
        if (snapshot.exists()) {
            const events = snapshot.val();
            displayShortCircuitEvents(events);
        } else {
            elements.eventsList.innerHTML = '<div class="loading">No short circuit events recorded</div>';
        }
    }).catch((error) => {
        console.error('Error loading events:', error);
        elements.eventsList.innerHTML = '<div class="loading">Error loading events</div>';
    });
}

function displayShortCircuitEvents(events) {
    const eventsArray = Object.entries(events).sort((a, b) => parseInt(b[0]) - parseInt(a[0]));
    
    if (eventsArray.length === 0) {
        elements.eventsList.innerHTML = '<div class="loading">No short circuit events recorded</div>';
        return;
    }

    const eventsHtml = eventsArray.map(([timestamp, event]) => {
        const date = new Date(parseInt(timestamp) * 1000);
        return `
            <div class="event-item">
                <div class="event-time">
                    <i class="fas fa-exclamation-triangle"></i>
                    ${date.toLocaleString()}
                </div>
                <div class="event-details">
                    <div><strong>Voltage:</strong> ${parseFloat(event.voltage || 0).toFixed(2)}V</div>
                    <div><strong>Current:</strong> ${parseFloat(event.current || 0).toFixed(3)}A</div>
                    <div><strong>Power:</strong> ${parseFloat(event.power || 0).toFixed(2)}W</div>
                    <div><strong>Severity:</strong> ${event.severity || 'HIGH'}</div>
                </div>
            </div>
        `;
    }).join('');

    elements.eventsList.innerHTML = eventsHtml;
}

function monitorConnection() {
    // Monitor Firebase connection status
    const connectedRef = database.ref('.info/connected');
    connectedRef.on('value', (snapshot) => {
        if (snapshot.val() === true) {
            console.log('Connected to Firebase');
        } else {
            console.log('Disconnected from Firebase');
            updateConnectionStatus(false);
        }
    });

    // Periodic connection check
    setInterval(() => {
        if (!isConnected) {
            console.log('Attempting to reconnect...');
            // Try to read latest data to check connection
            database.ref('latest').once('value').then(() => {
                updateConnectionStatus(true);
            }).catch(() => {
                updateConnectionStatus(false);
            });
        }
    }, 10000);
}

// Utility functions
function formatNumber(num, decimals = 2) {
    return parseFloat(num || 0).toFixed(decimals);
}

function formatTimestamp(timestamp) {
    const date = new Date(parseInt(timestamp) * 1000);
    return date.toLocaleString();
}

// Error handling
window.addEventListener('error', (event) => {
    console.error('JavaScript error:', event.error);
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        console.log('Page became visible, refreshing data...');
        // Refresh data when page becomes visible again
        database.ref('latest').once('value').then((snapshot) => {
            if (snapshot.exists()) {
                updateSensorData(snapshot.val());
            }
        });
    }
});

// Debug logging function
let debugVisible = false;

function debugLog(message) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry);
    
    // Create debug panel if it doesn't exist
    let debugPanel = document.getElementById('debugPanel');
    if (!debugPanel) {
        debugPanel = document.createElement('div');
        debugPanel.id = 'debugPanel';
        debugPanel.style.cssText = 'display: none; position: fixed; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.9); color: white; padding: 10px; max-height: 200px; overflow-y: auto; font-family: monospace; font-size: 12px; z-index: 9999;';
        debugPanel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h4 style="margin: 0;">🔍 Debug Log</h4>
                <button onclick="toggleDebug()" style="background: #666; color: white; border: none; padding: 5px 10px; cursor: pointer; border-radius: 3px;">Hide</button>
            </div>
            <div id="debugLog" style="max-height: 150px; overflow-y: auto;"></div>
        `;
        document.body.appendChild(debugPanel);
        
        // Add debug toggle button
        const debugButton = document.createElement('button');
        debugButton.onclick = toggleDebug;
        debugButton.style.cssText = 'position: fixed; bottom: 10px; right: 10px; background: #007bff; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer; z-index: 10000; font-size: 12px;';
        debugButton.textContent = '🔍 Debug';
        document.body.appendChild(debugButton);
    }
    
    const debugLogDiv = document.getElementById('debugLog');
    if (debugLogDiv) {
        debugLogDiv.innerHTML += logEntry + '<br>';
        debugLogDiv.scrollTop = debugLogDiv.scrollHeight;
    }
}

function toggleDebug() {
    debugVisible = !debugVisible;
    const panel = document.getElementById('debugPanel');
    if (panel) {
        panel.style.display = debugVisible ? 'block' : 'none';
    }
}

// Demo data function for testing without ESP32
function showDemoData() {
    const demoData = {
        voltage: 12.5 + (Math.random() * 2 - 1), // 11.5-13.5V
        current: 2.3 + (Math.random() * 1 - 0.5), // 1.8-2.8A
        power: 0,
        shortCircuit: false,
        timestamp: Math.floor(Date.now() / 1000)
    };
    demoData.power = demoData.voltage * demoData.current;
    
    debugLog('🎭 Using demo data: V=' + demoData.voltage.toFixed(2) + 'V, I=' + demoData.current.toFixed(3) + 'A');
    
    updateSensorData(demoData);
    updateConnectionStatus(false, 'Demo Mode');
    
    // Update demo data every 1 second
    setTimeout(() => {
        if (!isConnected) { // Only continue demo if no real connection
            showDemoData();
        }
    }, 1000);
}

// Enhanced connection status update
function updateConnectionStatus(connected, message = null) {
    isConnected = connected;
    elements.connectionStatus.className = connected ? 'status-dot' : 'status-dot disconnected';
    
    let statusText = connected ? 'Connected' : 'Disconnected';
    if (message) {
        statusText += ` (${message})`;
    }
    
    elements.statusText.textContent = statusText;
    
    debugLog(`📶 Connection status: ${statusText}`);
}

debugLog('🚀 Smart Short Circuit Monitor initialized successfully!');
console.log('Smart Short Circuit Monitor initialized successfully!');
# Smart Short Circuit Detection System

## Overview
This is a professional IoT-based short circuit detection system using ESP32, INA219 current sensor, OLED display, and real-time Firebase integration with a web dashboard.

## Features
- Real-time current, voltage, and power monitoring
- Short circuit detection with configurable thresholds
- OLED display showing system status and sensor data
- WiFi connectivity with automatic reconnection
- Firebase Realtime Database integration
- Professional web dashboard with live graphs
- Real-time alerts and notifications
- Event logging with timestamps
- Mobile-responsive design

## Hardware Requirements

### Components Needed:
1. **ESP32 Development Board** (ESP32 DOIT DevKit v1 or similar)
2. **INA219 Current/Power Monitor Sensor**
3. **SSD1306 OLED Display** (128x64, I2C)
4. **Breadboard and Jumper Wires**
5. **Power Supply** (5V/3.3V)

### Wiring Diagram:

#### INA219 Sensor Connections:
```
INA219    ->  ESP32
VCC       ->  3.3V
GND       ->  GND
SCL       ->  GPIO 22 (default I2C SCL)
SDA       ->  GPIO 21 (default I2C SDA)
VIN+      ->  Positive terminal of circuit to monitor
VIN-      ->  Negative terminal of circuit to monitor
```

#### OLED Display Connections:
```
OLED      ->  ESP32
VCC       ->  3.3V
GND       ->  GND
SCL       ->  GPIO 22 (shared with INA219)
SDA       ->  GPIO 21 (shared with INA219)
```

## Software Setup

### 1. ESP32 Configuration

#### Update WiFi Credentials:
In `src/main.cpp`, update these lines:
```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
```

#### Configure Firebase:
```cpp
#define FIREBASE_HOST "your-project-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH "your-database-secret-or-auth-token"
```

#### Adjust Detection Thresholds:
```cpp
const float CURRENT_THRESHOLD = 5.0; // Amperes - adjust based on your application
const float VOLTAGE_DROP_THRESHOLD = 0.5; // Voltage drop threshold
```

### 2. Firebase Setup

1. **Create Firebase Project:**
   - Go to https://console.firebase.google.com/
   - Create a new project
   - Enable Realtime Database
   - Set database rules for read/write access

2. **Database Rules Example:**
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

3. **Get Configuration:**
   - Project Settings > General > Your apps
   - Add web app and copy configuration

### 3. Web Dashboard Setup

#### Update Firebase Configuration:
In `web/app.js`, update the Firebase configuration:
```javascript
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project-id.firebaseapp.com",
    databaseURL: "https://your-project-default-rtdb.firebaseio.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};
```

## Installation Instructions

### 1. PlatformIO Setup:
```bash
# Install PlatformIO if not already installed
pip install platformio

# Navigate to project directory
cd SmartShortCircuit

# Install dependencies (libraries will be auto-installed based on platformio.ini)
pio lib install

# Build the project
pio run

# Upload to ESP32 (connect ESP32 via USB)
pio run --target upload

# Monitor serial output
pio device monitor
```

### 2. Web Dashboard Deployment:
You can serve the web dashboard in several ways:

#### Option A: Local Development Server:
```bash
cd web
python -m http.server 8000
# Access at http://localhost:8000
```

#### Option B: Firebase Hosting:
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Initialize Firebase Hosting
firebase init hosting

# Deploy
firebase deploy --only hosting
```

#### Option C: Any Web Server:
Upload the `web/` directory contents to any web hosting service.

## System Operation

### Startup Sequence:
The ESP32 will display the following sequence on the OLED:

1. **"System Starting"** - Initial boot
2. **"WiFi Connecting..."** - Connecting to WiFi network
3. **"WiFi Connected!"** - WiFi connection established
4. **"INA219 Initializing..."** - Setting up current sensor
5. **"INA219 Sensor ready!"** - Sensor initialization complete
6. **"Cloud Connecting..."** - Connecting to Firebase
7. **"Cloud Connected!"** - Firebase connection established
8. **"READY - System operational"** - System ready for monitoring
9. **"MONITORING"** - Normal operation mode

### Normal Operation:
- Continuous monitoring of current, voltage, and power
- Real-time data upload to Firebase (every 1 second)
- Display updates (every 0.5 seconds)
- Automatic WiFi reconnection if connection lost
- Short circuit detection and alerting

### Web Dashboard Features:
- Real-time sensor data display
- Interactive charts with voltage, current, and power
- Connection status indicator
- Short circuit event logging
- Mobile-responsive design
- Professional UI with animations

## Troubleshooting

### Common Issues:

1. **ESP32 not connecting to WiFi:**
   - Check WiFi credentials
   - Ensure 2.4GHz network (ESP32 doesn't support 5GHz)
   - Check signal strength

2. **INA219 not detected:**
   - Verify I2C wiring (SDA/SCL)
   - Check if address conflict (default: 0x40)
   - Ensure proper power supply

3. **Firebase connection issues:**
   - Verify Firebase configuration
   - Check internet connectivity
   - Ensure database rules allow read/write

4. **Display not working:**
   - Check I2C wiring
   - Verify display address (usually 0x3C)
   - Ensure adequate power supply

5. **False short circuit alerts:**
   - Adjust `CURRENT_THRESHOLD` value
   - Calibrate INA219 for your specific application
   - Check circuit grounding

### Serial Monitor Output:
Use the PlatformIO serial monitor to debug:
```bash
pio device monitor --baud 115200
```

## Customization

### Adjusting Thresholds:
Modify these values in `main.cpp` based on your specific application:
```cpp
const float CURRENT_THRESHOLD = 5.0; // Adjust for your max normal current
const float VOLTAGE_DROP_THRESHOLD = 0.5; // Adjust for acceptable voltage drop
```

### Update Intervals:
```cpp
const unsigned long UPDATE_INTERVAL = 1000; // Firebase update frequency (ms)
const unsigned long DISPLAY_UPDATE_INTERVAL = 500; // Display refresh rate (ms)
```

### INA219 Calibration:
Choose appropriate calibration based on your measurement range:
```cpp
ina219.setCalibration_32V_2A();  // 32V, 2A max
// or
ina219.setCalibration_32V_1A();  // 32V, 1A max
// or
ina219.setCalibration_16V_400mA(); // 16V, 400mA max
```

## Safety Considerations

⚠️ **Important Safety Notes:**
- Always disconnect power when making connections
- Ensure proper current ratings for your application
- Use appropriate fuses and circuit protection
- Test with low-voltage, low-current circuits first
- Monitor the system during initial testing
- Implement additional safety measures for high-power applications

## Support and Maintenance

### Regular Maintenance:
- Monitor Firebase usage and costs
- Update WiFi credentials if network changes
- Calibrate sensors periodically
- Check physical connections regularly

### Expansion Ideas:
- Add email/SMS notifications
- Implement data logging to SD card
- Add multiple sensor support
- Create mobile app
- Add user authentication
- Implement data analytics and trends

## License
This project is provided as-is for educational and professional use. Please ensure compliance with local electrical codes and safety regulations.
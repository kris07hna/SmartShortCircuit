# Quick Setup Guide

## Immediate Steps to Get Started:

### 1. Update WiFi Credentials
Edit `src/main.cpp` lines 15-16:
```cpp
const char* ssid = "YOUR_ACTUAL_WIFI_NAME";
const char* password = "YOUR_ACTUAL_WIFI_PASSWORD";
```

### 2. Firebase Setup (5 minutes)
1. Go to https://console.firebase.google.com/
2. Click "Create a project"
3. Enter project name: "smart-circuit-monitor"
4. Disable Google Analytics (unless needed)
5. Click "Create project"
6. In left menu: "Realtime Database" → "Create Database"
7. Choose location and "Start in test mode"
8. Copy the database URL (looks like: https://smart-circuit-monitor-default-rtdb.firebaseio.com/)

### 3. Update Firebase Configuration
Edit `src/main.cpp` lines 19-20:
```cpp
#define FIREBASE_HOST "smart-circuit-monitor-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH ""  // Leave empty for test mode
```

Edit `web/app.js` lines 3-11:
```javascript
const firebaseConfig = {
    apiKey: "your-api-key",                    // From Firebase Project Settings
    authDomain: "smart-circuit-monitor.firebaseapp.com",
    databaseURL: "https://smart-circuit-monitor-default-rtdb.firebaseio.com",
    projectId: "smart-circuit-monitor",
    storageBucket: "smart-circuit-monitor.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};
```

### 4. Hardware Connections (Physical Setup)
```
ESP32 Pin    →    Component
GPIO 21      →    SDA (both INA219 and OLED)
GPIO 22      →    SCL (both INA219 and OLED)
3.3V         →    VCC (both INA219 and OLED)
GND          →    GND (both INA219 and OLED)

INA219 Additional:
VIN+         →    Positive wire of circuit to monitor
VIN-         →    Negative wire of circuit to monitor
```

### 5. Upload Code
```bash
# In PlatformIO terminal:
pio run --target upload

# Monitor output:
pio device monitor
```

### 6. Test Web Dashboard
```bash
# Navigate to web folder:
cd web

# Start local server:
python -m http.server 8000

# Open browser: http://localhost:8000
```

## Expected Behavior:

### ESP32 Display Sequence:
1. "Smart Short Circuit Detection System - Initializing..."
2. "Status: WiFi - Connecting..."
3. "Status: WiFi - Connected!"
4. "Status: INA219 - Initializing..."
5. "Status: INA219 - Sensor ready!"
6. "Status: Cloud - Connecting..."
7. "Status: Cloud - Connected!"
8. "Status: READY - System operational"
9. "Status: MONITORING" (with live voltage/current/power readings)

### Web Dashboard:
- Should show "Connected" status (green dot)
- Live voltage, current, power readings
- Real-time graph updates
- Short circuit events log (if any occur)

## Troubleshooting:

### Can't upload to ESP32:
- Check USB cable connection
- Press and hold BOOT button while uploading
- Try different USB port

### WiFi not connecting:
- Double-check WiFi name and password
- Ensure 2.4GHz network (not 5GHz)
- Check signal strength

### No sensor readings:
- Verify I2C wiring (SDA=21, SCL=22)
- Check power connections
- Try different I2C address (0x41 instead of 0x40)

### Web dashboard shows "Disconnected":
- Check Firebase configuration
- Verify internet connection
- Check browser console for errors (F12)

## Test Short Circuit Detection:
⚠️ **Start with LOW VOLTAGE/CURRENT for safety**

1. Connect a small resistor circuit (LED + resistor)
2. Monitor normal readings
3. Temporarily short the circuit to test detection
4. Should see "SHORT!" on display and web alert

Need help? Check the full README.md for detailed instructions!
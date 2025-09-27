// Configuration Template for Smart Short Circuit Detection System
// Copy this file and rename to config.h, then update with your actual values

#ifndef CONFIG_H
#define CONFIG_H

// ===== WIFI CONFIGURATION =====
// Replace with your network credentials
#define WIFI_SSID "YOUR_WIFI_NETWORK_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// ===== FIREBASE CONFIGURATION =====
// Get these from your Firebase project settings
#define FIREBASE_HOST "your-project-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH "your-database-secret-or-auth-token"

// ===== SENSOR CONFIGURATION =====
// INA219 I2C Address (default: 0x40)
#define INA219_ADDRESS 0x40

// OLED Display I2C Address (default: 0x3C)
#define OLED_ADDRESS 0x3C

// ===== DETECTION THRESHOLDS =====
// Adjust these values based on your specific application
#define CURRENT_THRESHOLD 5.0          // Amperes - maximum normal current
#define VOLTAGE_DROP_THRESHOLD 0.5     // Volts - minimum acceptable voltage
#define POWER_THRESHOLD 50.0           // Watts - maximum normal power

// ===== TIMING CONFIGURATION =====
#define FIREBASE_UPDATE_INTERVAL 1000    // milliseconds - how often to upload data
#define DISPLAY_UPDATE_INTERVAL 500      // milliseconds - how often to update display
#define SENSOR_READ_INTERVAL 100         // milliseconds - how often to read sensor

// ===== CALIBRATION SETTINGS =====
// Choose the appropriate calibration for your measurement range
// Options: CALIBRATION_32V_2A, CALIBRATION_32V_1A, CALIBRATION_16V_400MA
#define INA219_CALIBRATION CALIBRATION_32V_2A

// Calibration constants (you may need to adjust these after testing)
#define VOLTAGE_OFFSET 0.0     // Voltage correction offset
#define CURRENT_OFFSET 0.0     // Current correction offset

// ===== SYSTEM CONFIGURATION =====
#define SERIAL_BAUD_RATE 115200
#define WIFI_TIMEOUT 30000      // milliseconds - WiFi connection timeout
#define FIREBASE_TIMEOUT 10000  // milliseconds - Firebase connection timeout

// ===== ALERT CONFIGURATION =====
#define ALERT_COOLDOWN 5000     // milliseconds - minimum time between alerts
#define AUTO_ALERT_HIDE 10000   // milliseconds - auto-hide alert after this time

// ===== DEBUG CONFIGURATION =====
#define DEBUG_MODE true         // Set to false to disable debug output
#define DEBUG_SENSOR true       // Set to false to disable sensor debug output
#define DEBUG_WIFI true         // Set to false to disable WiFi debug output
#define DEBUG_FIREBASE true     // Set to false to disable Firebase debug output

#endif // CONFIG_H
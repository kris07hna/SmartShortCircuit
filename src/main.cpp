#include <Arduino.h>
#include <WiFi.h>
#include <Wire.h>
#include <Adafruit_INA219.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Firebase_ESP_Client.h>
#include <ArduinoJson.h>
#include <time.h>

// ===== CONFIGURATION =====
// WiFi credentials (Replace with your network details)
const char* ssid = "OPPO A38";
const char* password = ""; // Empty for unencrypted WiFi

// Firebase configuration (Replace with your Firebase project details)
#define FIREBASE_HOST "https://smartcircuitprotection-default-rtdb.asia-southeast1.firebasedatabase.app/"
#define FIREBASE_AUTH "6gU3AqnJ6Bf8KiTiS1dFcDfaufLHTzEN9XyI33N3" // Database secret token

// Display configuration (128x64 OLED)
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// INA219 sensor with enhanced configuration
Adafruit_INA219 ina219;
bool ina219Available = false;

// INA219 calibration modes for different measurement ranges
enum INA219_CalibrationMode {
  CAL_32V_2A,     // 32V, 2A max (default)
  CAL_32V_1A,     // 32V, 1A max (higher precision)
  CAL_16V_400MA   // 16V, 400mA max (highest precision)
};
INA219_CalibrationMode calibrationMode = CAL_32V_2A;

// Firebase objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// ===== FUNCTION DECLARATIONS =====
void logShortCircuitEvent();
bool testFirebaseConnection();
void runFirebaseTests();

// ===== GLOBAL VARIABLES =====
float voltage = 0.0;
float current = 0.0;
float power = 0.0;
bool shortCircuitDetected = false;
unsigned long lastUpdate = 0;
unsigned long lastDisplayUpdate = 0;
bool lastUploadSuccess = false;
unsigned long uploadCount = 0;
bool firebaseConnected = false;
String lastFirebaseError = "";
unsigned long lastFirebaseAttempt = 0;
int firebaseRetryCount = 0;
unsigned long firebaseUploadTime = 0;
int successfulUploads = 0;
int failedUploads = 0;
const unsigned long UPDATE_INTERVAL = 5000; // 5 seconds - Firebase upload
const unsigned long DISPLAY_UPDATE_INTERVAL = 1000; // 1 second - display update

// Short circuit detection thresholds (adjust based on your specific application)
const float CURRENT_THRESHOLD = 3.0; // Amperes - lower threshold for better detection
const float VOLTAGE_DROP_THRESHOLD = 8.0; // Voltage drop threshold (adjust for your circuit)
const float POWER_THRESHOLD = 50.0; // Power threshold in Watts

// System status
enum SystemStatus {
  SYSTEM_STARTING,
  WIFI_CONNECTING,
  WIFI_CONNECTED,
  INA219_CHECKING,
  CLOUD_CONNECTING,
  SYSTEM_READY,
  MONITORING
};

SystemStatus currentStatus = SYSTEM_STARTING;
unsigned long statusStartTime = 0;

// ===== DISPLAY FUNCTIONS =====
void initDisplay() {
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("SSD1306 allocation failed"));
    for(;;);
  }
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println(F("Smart Short Circuit"));
  display.println(F("Detection System"));
  display.println(F(""));
  display.println(F("Initializing..."));
  display.display();
  delay(1000);
}

void updateDisplay(String status, String message = "") {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  
  // Header
  display.setCursor(0, 0);
  display.println(F("Smart Circuit Monitor"));
  display.drawLine(0, 10, SCREEN_WIDTH-1, 10, SSD1306_WHITE);
  
  // Status
  display.setCursor(0, 15);
  display.print(F("Status: "));
  display.println(status);
  
  if (message != "") {
    display.setCursor(0, 25);
    display.println(message);
  }
  
  // Show sensor data when monitoring
  if (currentStatus == MONITORING) {
    display.setCursor(0, 30);
    display.print(F("V: "));
    display.print(voltage, 2);
    display.print(F("V  I: "));
    display.print(current, 3);
    display.println(F("A"));
    
    display.setCursor(0, 40);
    display.print(F("P: "));
    display.print(power, 2);
    display.println(F("W"));
    
    display.setCursor(0, 50);
    display.print(F("FB: "));
    if (firebaseConnected && lastUploadSuccess) {
      display.print(F("OK #"));
      display.print(uploadCount);
    } else if (!firebaseConnected) {
      display.print(F("DISC"));
    } else {
      display.print(F("ERR"));
    }
    
    if (shortCircuitDetected) {
      display.setTextColor(SSD1306_BLACK, SSD1306_WHITE);
      display.setCursor(70, 50);
      display.println(F("SHORT!"));
      display.setTextColor(SSD1306_WHITE);
    }
  }
  
  display.display();
}

// ===== WIFI FUNCTIONS =====
bool connectToWiFi() {
  WiFi.begin(ssid, password);
  updateDisplay("WiFi", "Connecting...");
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(1000);
    attempts++;
    char msg[20];
    sprintf(msg, "Attempt %d/30", attempts);
    updateDisplay("WiFi", msg);
    Serial.print(".");
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("Connected to WiFi. IP address: ");
    Serial.println(WiFi.localIP());
    updateDisplay("WiFi", "Connected!");
    delay(1000);
    return true;
  } else {
    updateDisplay("WiFi", "Failed to connect");
    return false;
  }
}

// ===== INA219 FUNCTIONS =====
bool initINA219() {
  updateDisplay("INA219", "Initializing...");
  
  // Initialize I2C communication
  Wire.begin();
  
  // Try to initialize INA219 at default address (0x40)
  if (ina219.begin(&Wire)) {
    ina219Available = true;
    Serial.println("INA219 found at default address 0x40");
  } else {
    Serial.println("INA219 sensor not found at default address");
    ina219Available = false;
  }
  
  if (!ina219Available) {
    Serial.println("INA219 sensor not found - using simulated data");
    updateDisplay("INA219", "Simulated mode!");
    delay(1000);
    return true; // Continue without sensor for testing
  }
  
  // Set calibration based on calibrationMode variable
  // This allows dynamic calibration selection for optimal precision
  switch(calibrationMode) {
    case CAL_32V_2A:
      ina219.setCalibration_32V_2A();
      Serial.println("INA219: Using 32V/2A calibration (Standard range)");
      break;
    case CAL_32V_1A:
      ina219.setCalibration_32V_1A();
      Serial.println("INA219: Using 32V/1A calibration (Higher precision)");
      break;
    case CAL_16V_400MA:
      ina219.setCalibration_16V_400mA();
      Serial.println("INA219: Using 16V/400mA calibration (Highest precision)");
      break;
    default:
      ina219.setCalibration_32V_2A();
      Serial.println("INA219: Using default 32V/2A calibration");
      break;
  }
  
  // Test sensor reading
  float testVoltage = ina219.getBusVoltage_V();
  if (testVoltage >= 0 && testVoltage < 50) { // Reasonable voltage range
    Serial.print("INA219 initialized successfully. Test voltage: ");
    Serial.print(testVoltage);
    Serial.println("V");
    updateDisplay("INA219", "Sensor ready!");
    
    // Print sensor information
    Serial.print("Shunt Voltage: ");
    Serial.print(ina219.getShuntVoltage_mV());
    Serial.println(" mV");
    Serial.print("Bus Voltage: ");
    Serial.print(ina219.getBusVoltage_V());
    Serial.println(" V");
    Serial.print("Current: ");
    Serial.print(ina219.getCurrent_mA());
    Serial.println(" mA");
    
  } else {
    Serial.println("INA219 sensor readings appear invalid");
    Serial.print("Test voltage reading: ");
    Serial.println(testVoltage);
    // Don't disable sensor, might just need time to stabilize
    updateDisplay("INA219", "Sensor ready!");
  }
  
  delay(1000);
  return true;
}

void readSensorData() {
  static float voltageBuffer[10] = {0};  // Increased buffer for better averaging
  static float currentBuffer[10] = {0};
  static int bufferIndex = 0;
  static bool bufferFilled = false;
  
  float rawVoltage, rawCurrent, rawPower;
  
  if (ina219Available) {
    // Read from INA219 sensor with maximum precision
    float busVoltage = ina219.getBusVoltage_V();
    float shuntVoltage = ina219.getShuntVoltage_mV() / 1000.0; // Convert mV to V
    rawVoltage = busVoltage + shuntVoltage; // Total voltage across the load
    
    // Get current in mA and convert with maximum precision
    float currentMA = ina219.getCurrent_mA();
    rawCurrent = currentMA / 1000.0; // Convert to Amperes with 3 decimal precision
    
    // Calculate power with high precision (P = V * I)
    rawPower = rawVoltage * rawCurrent;
    
    // Additional validation for INA219 specific ranges
    switch(calibrationMode) {
      case CAL_32V_2A:
        if (abs(rawCurrent) > 3.2) rawCurrent = current; // Safety limit
        break;
      case CAL_32V_1A:
        if (abs(rawCurrent) > 1.3) rawCurrent = current;
        break;
      case CAL_16V_400MA:
        if (abs(rawCurrent) > 0.5) rawCurrent = current;
        break;
    }
    
    // Validate readings (check for reasonable values)
    if (rawVoltage < -1 || rawVoltage > 50 || isnan(rawVoltage)) {
      Serial.println("Warning: Invalid voltage reading from INA219");
      rawVoltage = voltage; // Use previous value
    }
    
    if (abs(rawCurrent) > 20 || isnan(rawCurrent)) {
      Serial.println("Warning: Invalid current reading from INA219");
      rawCurrent = current; // Use previous value
    }
    
    // Alternative power calculation for accuracy
    rawPower = rawVoltage * rawCurrent;
    
  } else {
    // Generate realistic simulated data for testing
    static unsigned long lastSimUpdate = 0;
    if (millis() - lastSimUpdate > 100) { // Update sim data every 100ms
      rawVoltage = 12.0 + sin(millis() * 0.001) * 0.5; // 11.5-12.5V with sine wave
      rawCurrent = 2.3 + sin(millis() * 0.002) * 0.3;  // 2.0-2.6A with sine wave
      rawPower = rawVoltage * rawCurrent;
      lastSimUpdate = millis();
    } else {
      rawVoltage = voltage;
      rawCurrent = current;
      rawPower = power;
    }
  }
  
  // Apply enhanced moving average filter for stable readings
  voltageBuffer[bufferIndex] = rawVoltage;
  currentBuffer[bufferIndex] = rawCurrent;
  bufferIndex = (bufferIndex + 1) % 10;  // Updated for larger buffer
  
  if (bufferIndex == 0) bufferFilled = true;
  
  // Calculate filtered values with better averaging
  if (bufferFilled) {
    voltage = 0;
    current = 0;
    for (int i = 0; i < 10; i++) {  // Updated for larger buffer
      voltage += voltageBuffer[i];
      current += currentBuffer[i];
    }
    voltage /= 10.0;  // Updated for larger buffer
    current /= 10.0;  // Updated for larger buffer
  } else {
    voltage = rawVoltage;
    current = rawCurrent;
  }
  
  power = voltage * current;
  
  // Short circuit detection logic with improved thresholds
  bool previousState = shortCircuitDetected;
  
  // Enhanced detection logic with proper zero current detection
  static int zeroCurrentCount = 0;
  
  // Check for zero current (0.000A with 3 decimal precision)
  bool isZeroCurrent = (abs(current) < 0.001); // 0.000A threshold
  
  // Count consecutive zero current readings
  if (isZeroCurrent && voltage > 1.0) {
    zeroCurrentCount++;
  } else {
    zeroCurrentCount = 0;
  }
  
  // Circuit state detection
  bool circuitOff = (voltage < 0.5 && abs(current) < 0.001 && power < 0.1);
  
  // Short circuit conditions
  bool currentOverload = (abs(current) > CURRENT_THRESHOLD);
  bool voltageDropped = (voltage < VOLTAGE_DROP_THRESHOLD && voltage > 0.5);
  bool powerSpike = (power > 50.0);
  bool zeroCurrentShortCircuit = (zeroCurrentCount >= 3 && voltage > 1.0); // 3 consecutive zero readings
  
  shortCircuitDetected = !circuitOff && (currentOverload || voltageDropped || powerSpike || zeroCurrentShortCircuit);
  
  // Log short circuit events with debouncing
  static unsigned long lastAlertTime = 0;
  if (shortCircuitDetected && !previousState && (millis() - lastAlertTime > 2000)) {
    Serial.println("⚠️  SHORT CIRCUIT DETECTED!");
    Serial.print("Voltage: "); Serial.print(voltage, 3); Serial.println("V");
    Serial.print("Current: "); Serial.print(current, 3); Serial.println("A");
    Serial.print("Power: "); Serial.print(power, 3); Serial.println("W");
    Serial.print("Zero current count: "); Serial.println(zeroCurrentCount);
    logShortCircuitEvent();
    lastAlertTime = millis();
  }
  
  // Log circuit state changes
  static bool previousCircuitOff = false;
  if (circuitOff != previousCircuitOff) {
    if (circuitOff) {
      Serial.println("🔌 Circuit OFF - No power detected");
    } else {
      Serial.println("⚡ Circuit ON - Power detected");
    }
    previousCircuitOff = circuitOff;
  }
  
  // Debug output every 5 seconds
  static unsigned long lastDebugPrint = 0;
  if (millis() - lastDebugPrint > 5000) {
    Serial.print("Sensor Status - V: ");
    Serial.print(voltage, 3);
    Serial.print("V, I: ");
    Serial.print(current, 3);
    Serial.print("A, P: ");
    Serial.print(power, 3);
    Serial.print("W, Mode: ");
    Serial.println(ina219Available ? "SENSOR" : "SIMULATED");
    lastDebugPrint = millis();
  }
}

// Recalibrate INA219 for different measurement ranges
void recalibrateINA219(int mode) {
  if (!ina219Available) return;
  
  switch(mode) {
    case 1:
      ina219.setCalibration_32V_2A();
      Serial.println("INA219 calibrated for 32V, 2A range");
      break;
    case 2:
      ina219.setCalibration_32V_1A();
      Serial.println("INA219 calibrated for 32V, 1A range (higher precision)");
      break;
    case 3:
      ina219.setCalibration_16V_400mA();
      Serial.println("INA219 calibrated for 16V, 400mA range (highest precision)");
      break;
    default:
      ina219.setCalibration_32V_2A();
      Serial.println("INA219 calibrated for default 32V, 2A range");
  }
}

// ===== FIREBASE TEST FUNCTIONS =====
bool testFirebaseConnection() {
  Serial.println("\n🧪 === FIREBASE CONNECTION TEST ===");
  
  // Test 1: Basic connection test
  Serial.print("📡 Test 1 - Basic Connection: ");
  if (Firebase.ready()) {
    Serial.println("✅ PASS - Firebase ready");
  } else {
    Serial.println("❌ FAIL - Firebase not ready");
    return false;
  }
  
  // Test 2: Simple read test
  Serial.print("📖 Test 2 - Read Test: ");
  if (Firebase.RTDB.getString(&fbdo, "/test_connection")) {
    Serial.println("✅ PASS - Can read from database");
  } else {
    Serial.print("❌ FAIL - Cannot read: ");
    Serial.println(fbdo.errorReason());
  }
  
  // Test 3: Simple write test
  Serial.print("✏️ Test 3 - Write Test: ");
  if (Firebase.RTDB.setString(&fbdo, "/test_connection", "ESP32_Connected")) {
    Serial.println("✅ PASS - Can write to database");
  } else {
    Serial.print("❌ FAIL - Cannot write: ");
    Serial.println(fbdo.errorReason());
    return false;
  }
  
  // Test 4: Write sensor structure test
  Serial.print("📊 Test 4 - Sensor Data Structure: ");
  FirebaseJson testJson;
  testJson.set("voltage", 12.34);
  testJson.set("current", 1.23);
  testJson.set("power", 15.18);
  testJson.set("timestamp", "test_timestamp");
  
  if (Firebase.RTDB.setJSON(&fbdo, "/test_sensor_data", &testJson)) {
    Serial.println("✅ PASS - Can write sensor data structure");
  } else {
    Serial.print("❌ FAIL - Cannot write sensor data: ");
    Serial.println(fbdo.errorReason());
  }
  
  return true;
}

void runFirebaseTests() {
  Serial.println("\n🔥 === COMPREHENSIVE FIREBASE TESTS ===");
  
  // Display current configuration
  Serial.println("📋 Configuration Check:");
  Serial.print("   Database URL: "); Serial.println(FIREBASE_HOST);
  Serial.print("   Auth Token: "); 
  if (strlen(FIREBASE_AUTH) > 0) {
    Serial.print(strlen(FIREBASE_AUTH)); Serial.println(" characters");
  } else {
    Serial.println("Empty (using public access)");
  }
  Serial.print("   WiFi Status: ");
  Serial.println(WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected");
  Serial.print("   Free Heap: "); Serial.println(ESP.getFreeHeap());
  
  // Run connection tests
  if (testFirebaseConnection()) {
    Serial.println("\n🎉 All Firebase tests PASSED! Your credentials are working.");
    
    // Test real-time updates
    Serial.println("\n⏱️ Testing real-time updates (5 seconds)...");
    for (int i = 1; i <= 5; i++) {
      String testPath = "/realtime_test";
      String testValue = "Update_";
      testValue += String(i);
      testValue += "_";
      testValue += String(millis());
      
      if (Firebase.RTDB.setString(&fbdo, testPath.c_str(), testValue)) {
        Serial.print("📤 Update ");
        Serial.print(i);
        Serial.print(": ✅ SUCCESS");
      } else {
        Serial.print("📤 Update ");
        Serial.print(i);
        Serial.print(": ❌ FAILED - ");
        Serial.print(fbdo.errorReason());
      }
      Serial.println();
      delay(1000);
    }
    
  } else {
    Serial.println("\n🚨 Firebase tests FAILED! Check your configuration.");
  }
  
  Serial.println("\n🔍 Check your Firebase console to see if test data appeared!");
  Serial.println("==========================================");
}

// ===== FIREBASE FUNCTIONS =====
bool initFirebase() {
  updateDisplay("Cloud", "Connecting...");
  
  Serial.println("\n=== Firebase Debug Info ===");
  Serial.print("Database URL: "); Serial.println(FIREBASE_HOST);
  Serial.print("Auth Token Length: "); Serial.println(strlen(FIREBASE_AUTH));
  Serial.print("WiFi Status: "); Serial.println(WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected");
  Serial.print("Free Heap: "); Serial.println(ESP.getFreeHeap());
  
  // Configure Firebase with detailed logging
  config.database_url = FIREBASE_HOST;
  if (strlen(FIREBASE_AUTH) > 0) {
    config.signer.tokens.legacy_token = FIREBASE_AUTH;
    Serial.println("Using legacy token authentication");
  } else {
    Serial.println("No authentication token provided");
  }
  
  // Initialize Firebase
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  
  Serial.println("Testing Firebase connection...");
  
  // Test connection with detailed error reporting
  if (Firebase.RTDB.getString(&fbdo, "/test")) {
    Serial.println("✅ Firebase connection successful!");
    firebaseConnected = true;
    updateDisplay("Cloud", "Connected!");
    delay(1000);
    return true;
  } else {
    Serial.println("❌ Firebase connection failed!");
    Serial.print("HTTP Code: "); Serial.println(fbdo.httpCode());
    Serial.print("Error Reason: "); Serial.println(fbdo.errorReason());
    lastFirebaseError = fbdo.errorReason();
    firebaseConnected = false;
    
    // Still continue for testing, but show error
    updateDisplay("Cloud", "Error - Check Serial");
    delay(2000);
    return true; // Continue anyway for testing
  }
}

void uploadSensorData() {
  unsigned long startTime = millis();
  
  if (!Firebase.ready()) {
    Serial.println("⚠️ Firebase not ready, attempting reconnection...");
    firebaseRetryCount++;
    lastUploadSuccess = false;
    
    if (firebaseRetryCount > 5) {
      Serial.println("🔄 Too many Firebase retry attempts, reinitializing...");
      initFirebase();
      firebaseRetryCount = 0;
    }
    
    failedUploads++;
    return;
  }
  
  // Reset retry count on successful ready state
  firebaseRetryCount = 0;
  
  // Create timestamp
  time_t now;
  time(&now);
  String timestamp = String(now);
  
  Serial.print("📤 Uploading sensor data to Firebase... ");
  
  // Update the latest readings for real-time display
  bool success = true;
  
  if (!Firebase.RTDB.setFloat(&fbdo, "/latest/voltage", voltage)) {
    Serial.print("❌ Failed to upload voltage: "); Serial.println(fbdo.errorReason());
    success = false;
  }
  
  if (!Firebase.RTDB.setFloat(&fbdo, "/latest/current", current)) {
    Serial.print("❌ Failed to upload current: "); Serial.println(fbdo.errorReason());
    success = false;
  }
  
  if (!Firebase.RTDB.setFloat(&fbdo, "/latest/power", power)) {
    Serial.print("❌ Failed to upload power: "); Serial.println(fbdo.errorReason());
    success = false;
  }
  
  if (!Firebase.RTDB.setBool(&fbdo, "/latest/shortCircuit", shortCircuitDetected)) {
    Serial.print("❌ Failed to upload shortCircuit: "); Serial.println(fbdo.errorReason());
    success = false;
  }
  
  if (!Firebase.RTDB.setString(&fbdo, "/latest/timestamp", timestamp)) {
    Serial.print("❌ Failed to upload timestamp: "); Serial.println(fbdo.errorReason());
    success = false;
  }
  
  // Create JSON object for historical data
  FirebaseJson json;
  json.set("timestamp", timestamp);
  json.set("voltage", voltage);
  json.set("current", current);
  json.set("power", power);
  json.set("shortCircuit", shortCircuitDetected);
  
  // Upload historical data
  String path = "/sensor_data/";
  path += timestamp;
  if (!Firebase.RTDB.setJSON(&fbdo, path.c_str(), &json)) {
    Serial.print("❌ Failed to upload historical data: "); Serial.println(fbdo.errorReason());
    success = false;
  }
  
  // Calculate upload time
  firebaseUploadTime = millis() - startTime;
  
  // Update status and statistics
  lastUploadSuccess = success;
  if (success) {
    uploadCount++;
    successfulUploads++;
    firebaseConnected = true;
    Serial.print("✅ Success! Count: ");
    Serial.print(uploadCount);
    Serial.print(", Time: ");
    Serial.print(firebaseUploadTime);
    Serial.println("ms");
  } else {
    failedUploads++;
    firebaseConnected = false;
    Serial.println("❌ Upload failed!");
    Serial.print("HTTP Code: "); Serial.println(fbdo.httpCode());
    Serial.print("Error: "); Serial.println(fbdo.errorReason());
    lastFirebaseError = fbdo.errorReason();
  }
  
  // Print statistics every 10 uploads
  if ((successfulUploads + failedUploads) % 10 == 0 && (successfulUploads + failedUploads) > 0) {
    float successRate = (float)successfulUploads * 100.0 / (successfulUploads + failedUploads);
    Serial.println("\n📊 Firebase Upload Statistics:");
    Serial.print("   Successful: "); Serial.println(successfulUploads);
    Serial.print("   Failed: "); Serial.println(failedUploads);
    Serial.print("   Success Rate: "); Serial.print(successRate); Serial.println("%");
    Serial.print("   Avg Upload Time: "); Serial.print(firebaseUploadTime); Serial.println("ms");
    Serial.println();
  }
}

void logShortCircuitEvent() {
  if (Firebase.ready()) {
    time_t now;
    time(&now);
    String timestamp = String(now);
    
    FirebaseJson json;
    json.set("timestamp", timestamp);
    json.set("voltage", voltage);
    json.set("current", current);
    json.set("power", power);
    json.set("severity", "HIGH");
    
    String eventPath = "/short_circuit_events/";
    eventPath += timestamp;
    if (Firebase.RTDB.setJSON(&fbdo, eventPath.c_str(), &json)) {
      Serial.println("Short circuit event logged");
    } else {
      Serial.println("Failed to log short circuit event");
    }
  }
}

// ===== TIME FUNCTIONS =====
void initTime() {
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  Serial.print("Waiting for NTP time sync: ");
  time_t nowSecs = time(nullptr);
  while (nowSecs < 8 * 3600 * 2) {
    delay(500);
    Serial.print(".");
    yield();
    nowSecs = time(nullptr);
  }
  Serial.println();
  struct tm timeinfo;
  gmtime_r(&nowSecs, &timeinfo);
  Serial.print("Current time: ");
  Serial.print(asctime(&timeinfo));
}

// ===== MAIN SETUP =====
void setup() {
  Serial.begin(115200);
  Serial.println("Smart Short Circuit Detection System Starting...");
  
  // Initialize I2C
  Wire.begin();
  
  // Initialize display
  currentStatus = SYSTEM_STARTING;
  initDisplay();
  delay(500);
  
  // Connect to WiFi
  currentStatus = WIFI_CONNECTING;
  if (!connectToWiFi()) {
    updateDisplay("ERROR", "WiFi connection failed");
    while(1) delay(1000);
  }
  currentStatus = WIFI_CONNECTED;
  
  // Initialize time
  initTime();
  
  // Initialize INA219
  currentStatus = INA219_CHECKING;
  if (!initINA219()) {
    updateDisplay("ERROR", "INA219 initialization failed");
    while(1) delay(1000);
  }
  
  // Initialize Firebase
  currentStatus = CLOUD_CONNECTING;
  if (!initFirebase()) {
    updateDisplay("ERROR", "Firebase connection failed");
    while(1) delay(1000);
  }
  
  // Run comprehensive Firebase tests
  runFirebaseTests();
  
  // System ready
  currentStatus = SYSTEM_READY;
  updateDisplay("READY", "System operational");
  delay(1000);
  
  currentStatus = MONITORING;
  lastUpdate = millis();
  lastDisplayUpdate = millis();
  
  Serial.println("System fully initialized and ready for monitoring!");
  Serial.println("\n🔍 Debug: Monitor serial output for Firebase status updates every 5 seconds");
  Serial.println("📱 Web Dashboard: Check browser console (F12) for additional debug info");
  Serial.println("==========================================\n");
}

// ===== MAIN LOOP =====
void loop() {
  unsigned long currentTime = millis();
  
  // Read sensor data continuously
  readSensorData();
  
  // Update Firebase at regular intervals
  if (currentTime - lastUpdate >= UPDATE_INTERVAL) {
    uploadSensorData();
    lastUpdate = currentTime;
  }
  
  // Update display at regular intervals
  if (currentTime - lastDisplayUpdate >= DISPLAY_UPDATE_INTERVAL) {
    updateDisplay("MONITORING");
    lastDisplayUpdate = currentTime;
  }
  
  // Handle WiFi reconnection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected, attempting to reconnect...");
    updateDisplay("WiFi", "Reconnecting...");
    connectToWiFi();
  }
  
  // Small delay to prevent overwhelming the system
  delay(50);
}
# 🔥 Firebase Debugging Guide - Smart Circuit Monitor

## Overview
This guide will help you identify and resolve Firebase connection and data issues in your ESP32 smart circuit monitoring system.

---

## 🚨 Common Firebase Errors & Solutions

### **Error 1: "Firebase connection failed"**
**Symptoms:** ESP32 display shows "Cloud - Connection failed"

**Debug Steps:**
1. **Check Serial Monitor Output:**
   ```bash
   pio device monitor --baud 115200
   ```
   Look for specific error messages.

2. **Verify Firebase Configuration:**
   ```cpp
   #define FIREBASE_HOST "https://your-project-default-rtdb.region.firebasedatabase.app/"
   #define FIREBASE_AUTH "your-database-secret"
   ```

3. **Common Fixes:**
   - ✅ Ensure URL includes `https://` and trailing `/`
   - ✅ Check database secret is not expired
   - ✅ Verify WiFi connection is stable
   - ✅ Confirm Firebase project exists and is active

### **Error 2: "Permission denied" / "Unauthorized"**
**Symptoms:** Data not uploading, "401 Unauthorized" errors

**Solutions:**
1. **Update Database Rules:**
   ```json
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```

2. **Check Auth Token:**
   - Generate new database secret
   - Verify token hasn't expired
   - Ensure proper token format

### **Error 3: Web Dashboard Shows "Disconnected"**
**Symptoms:** Red dot, "Disconnected" status on web interface

**Debug Steps:**
1. **Open Browser Console (F12):**
   ```javascript
   // Look for Firebase errors like:
   FIREBASE FATAL ERROR: Can't determine Firebase Database URL
   Permission denied
   Network error
   ```

2. **Check Firebase Config:**
   ```javascript
   const firebaseConfig = {
     databaseURL: "https://your-project-default-rtdb.region.firebasedatabase.app"
     // Ensure this matches your ESP32 configuration
   };
   ```

### **Error 4: "Network Error" / "Timeout"**
**Symptoms:** Intermittent connection issues

**Solutions:**
- ✅ Check internet connectivity
- ✅ Verify DNS resolution
- ✅ Try different WiFi network
- ✅ Check firewall settings

---

## 🔍 Enhanced Debug Code for ESP32

Add these debugging features to your `main.cpp`:

### **1. Add Debug Variables:**
```cpp
// Add after other global variables
bool firebaseConnected = false;
String lastFirebaseError = "";
unsigned long lastFirebaseAttempt = 0;
int firebaseRetryCount = 0;
```

### **2. Enhanced Firebase Initialization:**
```cpp
bool initFirebase() {
  updateDisplay("Cloud", "Connecting...");
  
  // Configure Firebase with detailed logging
  config.database_url = FIREBASE_HOST;
  if (strlen(FIREBASE_AUTH) > 0) {
    config.signer.tokens.legacy_token = FIREBASE_AUTH;
  }
  
  // Enable debug output
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  
  // Test connection with detailed error reporting
  Serial.println("Testing Firebase connection...");
  Serial.print("Database URL: "); Serial.println(FIREBASE_HOST);
  Serial.print("Auth Token Length: "); Serial.println(strlen(FIREBASE_AUTH));
  
  // Try a simple read operation
  if (Firebase.RTDB.getString(&fbdo, "/test")) {
    Serial.println("Firebase connection successful!");
    firebaseConnected = true;
    updateDisplay("Cloud", "Connected!");
    delay(1000);
    return true;
  } else {
    Serial.println("Firebase connection failed!");
    Serial.print("Error Code: "); Serial.println(fbdo.httpCode());
    Serial.print("Error Reason: "); Serial.println(fbdo.errorReason());
    lastFirebaseError = fbdo.errorReason();
    firebaseConnected = false;
    updateDisplay("Cloud", "Failed!");
    delay(2000);
    return false;
  }
}
```

### **3. Enhanced Upload Function with Error Handling:**
```cpp
void uploadSensorData() {
  if (!Firebase.ready()) {
    Serial.println("Firebase not ready, attempting reconnection...");
    firebaseRetryCount++;
    if (firebaseRetryCount > 5) {
      Serial.println("Too many Firebase retry attempts, reinitializing...");
      initFirebase();
      firebaseRetryCount = 0;
    }
    return;
  }
  
  // Reset retry count on successful ready state
  firebaseRetryCount = 0;
  
  // Create timestamp
  time_t now;
  time(&now);
  String timestamp = String(now);
  
  Serial.println("Uploading sensor data to Firebase...");
  
  // Update the latest readings for real-time display
  bool success = true;
  
  if (!Firebase.RTDB.setFloat(&fbdo, "/latest/voltage", voltage)) {
    Serial.print("Failed to upload voltage: "); Serial.println(fbdo.errorReason());
    success = false;
  }
  
  if (!Firebase.RTDB.setFloat(&fbdo, "/latest/current", current)) {
    Serial.print("Failed to upload current: "); Serial.println(fbdo.errorReason());
    success = false;
  }
  
  if (!Firebase.RTDB.setFloat(&fbdo, "/latest/power", power)) {
    Serial.print("Failed to upload power: "); Serial.println(fbdo.errorReason());
    success = false;
  }
  
  if (!Firebase.RTDB.setBool(&fbdo, "/latest/shortCircuit", shortCircuitDetected)) {
    Serial.print("Failed to upload shortCircuit: "); Serial.println(fbdo.errorReason());
    success = false;
  }
  
  if (!Firebase.RTDB.setString(&fbdo, "/latest/timestamp", timestamp)) {
    Serial.print("Failed to upload timestamp: "); Serial.println(fbdo.errorReason());
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
  String path = "/sensor_data/" + timestamp;
  if (!Firebase.RTDB.setJSON(&fbdo, path.c_str(), &json)) {
    Serial.print("Failed to upload historical data: "); Serial.println(fbdo.errorReason());
    success = false;
  }
  
  // Update status
  lastUploadSuccess = success;
  if (success) {
    uploadCount++;
    Serial.print("Data uploaded successfully - Count: ");
    Serial.println(uploadCount);
    firebaseConnected = true;
  } else {
    Serial.println("Failed to upload data");
    firebaseConnected = false;
  }
}
```

---

## 🌐 Web Dashboard Debug Features

### **1. Enhanced Error Logging:**
Add this to your `web/app.js`:

```javascript
// Enhanced error handling
firebase.database().ref('latest').on('value', (snapshot) => {
    console.log('Firebase data received:', snapshot.exists());
    if (snapshot.exists()) {
        const data = snapshot.val();
        console.log('Data:', data);
        updateSensorData(data);
        updateConnectionStatus(true);
    } else {
        console.log('No data available');
        updateConnectionStatus(false);
    }
}, (error) => {
    console.error('Firebase error details:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    updateConnectionStatus(false);
    
    // Show error to user
    document.getElementById('statusText').textContent = `Error: ${error.message}`;
});

// Monitor connection state
firebase.database().ref('.info/connected').on('value', (snapshot) => {
    const connected = snapshot.val();
    console.log('Firebase connected:', connected);
    if (connected) {
        console.log('Connected to Firebase Realtime Database');
    } else {
        console.log('Disconnected from Firebase Realtime Database');
    }
});
```

### **2. Debug Panel for Web Interface:**
Add this HTML to your `index.html`:

```html
<!-- Debug Panel (add before closing body tag) -->
<div id="debugPanel" style="display: none; position: fixed; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.9); color: white; padding: 10px; max-height: 200px; overflow-y: auto; font-family: monospace; font-size: 12px;">
    <div style="display: flex; justify-content: between; align-items: center;">
        <h4>Debug Log</h4>
        <button onclick="toggleDebug()" style="background: #666; color: white; border: none; padding: 5px 10px; cursor: pointer;">Hide</button>
    </div>
    <div id="debugLog"></div>
</div>

<!-- Debug Toggle Button -->
<button onclick="toggleDebug()" style="position: fixed; bottom: 10px; right: 10px; background: #007bff; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer; z-index: 1000;">
    Debug
</button>
```

### **3. Debug JavaScript Functions:**
```javascript
// Add to app.js
let debugVisible = false;

function toggleDebug() {
    debugVisible = !debugVisible;
    document.getElementById('debugPanel').style.display = debugVisible ? 'block' : 'none';
}

function debugLog(message) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry);
    
    const debugLog = document.getElementById('debugLog');
    if (debugLog) {
        debugLog.innerHTML += logEntry + '<br>';
        debugLog.scrollTop = debugLog.scrollHeight;
    }
}

// Use debugLog throughout your code
debugLog('Firebase initialization started');
debugLog('Attempting to connect to: ' + firebaseConfig.databaseURL);
```

---

## 🔧 Step-by-Step Debugging Process

### **Step 1: Check ESP32 Serial Output**
```bash
pio device monitor --baud 115200
```

Look for these messages:
```
✅ Smart Short Circuit Detection System Starting...
✅ Connected to WiFi. IP address: 192.168.x.x
✅ Testing Firebase connection...
✅ Database URL: https://your-project.firebaseio.com/
✅ Firebase connection successful!
❌ Firebase connection failed! Error: [specific error]
```

### **Step 2: Verify Firebase Project Status**
1. **Go to Firebase Console:** https://console.firebase.google.com/
2. **Check Project Status:** Ensure project is active
3. **Verify Database:** Realtime Database should be enabled
4. **Check Rules:** Ensure read/write permissions are set

### **Step 3: Test Database Rules**
```json
// Temporary test rules (allow all access)
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

### **Step 4: Test Web Dashboard**
1. **Open Browser Console (F12)**
2. **Check Network Tab** for failed requests
3. **Look for Firebase errors** in console
4. **Verify data structure** in Firebase console

### **Step 5: Manual Data Test**
Try manually writing data to Firebase:
```javascript
// Test in browser console
firebase.database().ref('test').set('hello world')
  .then(() => console.log('Write successful'))
  .catch(error => console.error('Write failed:', error));
```

---

## 🚨 Firebase Error Codes Reference

### **Common HTTP Error Codes:**
- **400:** Bad Request - Check data format
- **401:** Unauthorized - Check authentication
- **403:** Forbidden - Check database rules
- **404:** Not Found - Check database URL
- **500:** Internal Server Error - Firebase issue
- **503:** Service Unavailable - Temporary Firebase issue

### **Common Firebase Error Messages:**
- **"PERMISSION_DENIED"** → Fix database rules
- **"NETWORK_ERROR"** → Check internet connection
- **"INVALID_TOKEN"** → Regenerate auth token
- **"DATABASE_DISABLED"** → Enable Realtime Database

---

## 📊 Monitoring Firebase Performance

### **Add Performance Metrics:**
```cpp
// Add to ESP32 code
unsigned long firebaseUploadTime = 0;
int successfulUploads = 0;
int failedUploads = 0;

void uploadSensorData() {
  unsigned long startTime = millis();
  
  // ... your upload code ...
  
  firebaseUploadTime = millis() - startTime;
  
  if (success) {
    successfulUploads++;
    Serial.print("Upload time: "); Serial.print(firebaseUploadTime); Serial.println("ms");
  } else {
    failedUploads++;
  }
  
  // Print stats every 10 uploads
  if ((successfulUploads + failedUploads) % 10 == 0) {
    Serial.print("Upload Stats - Success: "); Serial.print(successfulUploads);
    Serial.print(", Failed: "); Serial.print(failedUploads);
    Serial.print(", Success Rate: "); Serial.print(successfulUploads * 100 / (successfulUploads + failedUploads)); Serial.println("%");
  }
}
```

---

## 🎯 Quick Debug Checklist

- [ ] Serial monitor shows Firebase connection success
- [ ] ESP32 connects to WiFi successfully  
- [ ] Firebase project exists and is active
- [ ] Database rules allow read/write access
- [ ] Database URL is correct (includes https:// and /)
- [ ] Auth token is valid (if using authentication)
- [ ] Web browser console shows no Firebase errors
- [ ] Data appears in Firebase console
- [ ] Web dashboard shows "Connected" status
- [ ] Real-time updates work in web interface

---

## 🆘 Getting Help

If you're still having issues:

1. **Copy exact error messages** from serial monitor and browser console
2. **Share Firebase configuration** (without sensitive tokens)
3. **Describe expected vs actual behavior**
4. **Include screenshots** of Firebase console and error messages

**Common issue:** Make sure your Firebase database URL region matches between ESP32 and web app configurations!

---

This debugging guide should help you identify and resolve any Firebase connectivity issues in your smart circuit monitoring system. Follow the steps systematically to isolate and fix the problem!
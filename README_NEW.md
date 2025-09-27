# ⚡ Smart Circuit Protection System

> **Professional IoT Short Circuit Detection & Real-time Monitoring**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/kris07hna/SmartShortCircuit)
[![Firebase](https://img.shields.io/badge/Firebase-Realtime%20Database-orange)](https://firebase.google.com/)
[![ESP32](https://img.shields.io/badge/ESP32-IoT%20Platform-blue)](https://espressif.com/)

## 🎯 **Live Demo**
🌐 **Deploy your own in 2 minutes with Vercel!**

---

## ✨ **Key Features**

### 🔒 **Smart Protection**
- **Zero current detection** - Triggers alert when current = 0.000A with voltage present
- **Real-time monitoring** with 0.001A precision
- **Advanced filtering** for stable readings
- **Intelligent alerts** with debouncing

### 📊 **Beautiful Dashboard** 
- **Glassmorphism UI** with gradient animations
- **Real-time charts** and live metrics
- **Mobile responsive** design
- **Global access** via Vercel hosting

### 🛠️ **IoT Integration**
- **ESP32 + INA219** precision sensing
- **Firebase Realtime Database** 
- **OLED status display**
- **WiFi auto-reconnection**

---

## 🚀 **Quick Deploy**

### **1. Clone & Push to GitHub:**
```bash
git clone https://github.com/kris07hna/SmartShortCircuit.git
cd SmartShortCircuit
git remote set-url origin https://github.com/YOUR_USERNAME/smart-circuit-protection.git
git push -u origin master
```

### **2. Deploy to Vercel:**
1. Go to [vercel.com](https://vercel.com)
2. Click "Import Project" 
3. Select your GitHub repo
4. Deploy! ✨

**Result:** Live at `https://your-project-name.vercel.app`

---

## ⚙️ **Hardware Setup**

### **Components:**
- ESP32 Development Board
- INA219 Current Sensor  
- SSD1306 OLED Display
- Jumper wires

### **Wiring:**
```
ESP32 → Component
GPIO 21 → SDA (INA219 & OLED)
GPIO 22 → SCL (INA219 & OLED) 
3.3V → VCC (both sensors)
GND → GND (both sensors)

INA219 only:
VIN+ → Circuit positive
VIN- → Circuit negative
```

---

## 📱 **Software Setup**

### **1. Firebase:**
- Create project at [console.firebase.google.com](https://console.firebase.google.com)
- Enable Realtime Database
- Update configs in `src/main.cpp` and `web/app.js`

### **2. ESP32:**
```bash
# Install PlatformIO
pip install platformio

# Build & Upload
pio run --target upload --environment esp32doit-devkit-v1

# Monitor
pio device monitor --baud 115200
```

### **3. WiFi Config:**
Update in `src/main.cpp`:
```cpp
const char* ssid = "YOUR_WIFI_NAME";
const char* password = "";  // Empty for open networks
```

---

## 🎨 **Dashboard Preview**

The new UI features:
- **Glassmorphism design** with blur effects
- **Gradient animations** and smooth transitions  
- **Real-time status indicators**
- **Professional color scheme**
- **Mobile-first responsive layout**

---

## 🔧 **Configuration**

### **Short Circuit Detection:**
```cpp
// Zero current with voltage = Short Circuit  
bool zeroCurrentWithVoltage = (abs(current) < 0.001 && voltage > 1.0);
```

### **Thresholds:**
```cpp
const float CURRENT_THRESHOLD = 3.0;     // Amperes
const float VOLTAGE_DROP_THRESHOLD = 8.0; // Volts
```

---

## 📚 **Documentation**

- **[Firebase Setup Guide](FIREBASE_SETUP_GUIDE.md)** - Complete Firebase configuration
- **[Debug Guide](FIREBASE_DEBUG_GUIDE.md)** - Troubleshooting tools  
- **[Hardware Guide](INA219_PRECISION_GUIDE.md)** - Sensor calibration
- **[Vercel Deploy](VERCEL_DEPLOYMENT.md)** - Production deployment

---

## 🤝 **Contributing**

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)  
5. Open Pull Request

---

## 📄 **License**

MIT License - see [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ for electrical safety and IoT innovation**

⭐ **Star this repo if it helped you!** ⭐

</div>
# 🌍 Autonomous GPS-Based Navigation Bot

An ESP32-powered autonomous ground robot capable of navigating using real-time GPS data. Designed for terrain-based path tracking using smart control logic, this bot is an integration of **Mechatronics**, **IoT**, and **Embedded Systems** principles.

---

## 📌 Project Overview

This project demonstrates the design and implementation of a **GPS-guided autonomous bot** using the ESP32 microcontroller. The bot fetches GPS coordinates using a Ublox NEO-M8N module and navigates accordingly by controlling DC motors through an L298N driver. Power regulation and protection circuits ensure stable operation during movement.

---

## 🧩 Components Used

| Component                     | Description                                      |
|------------------------------|--------------------------------------------------|
| **ESP32**                    | Microcontroller with Wi-Fi & Bluetooth           |
| **Ublox NEO-M8N GPS Module** | High-accuracy GPS for location tracking          |
| **L298N Motor Driver**       | Controls dual 7.4V DC motors                     |
| **2x 18650 Battery Pack**    | Power source (~7.4V output)                      |
| **AMS1117 3.3V Regulator**   | Converts voltage for ESP32 and GPS               |
| **SparkFun MOSFET Controller** | Power control for high current loads         |
| **Ceramic Capacitors**       | Decoupling and noise reduction                   |
| **Diodes**                   | Reverse current protection                       |
| **Fuse**                     | Overcurrent protection                           |

---

## 🔌 Circuit Highlights

- **ESP32 ↔ GPS** via Serial (TX/RX)
- **ESP32 GPIOs → L298N** for directional motor control
- **Power management** via AMS1117 + MOSFET + fuse circuit
- **Dual motor outputs** with diode protection
- **Battery-driven**, portable and optimized for low power

---

## 🧠 Functional Features

- Real-time **GPS reading** & parsing (latitude/longitude)
- Autonomous **path control** logic based on geolocation
- Onboard **motor direction control**
- Custom **power & safety design**
- Multiple Bots **In Ease and Autonomous Integrations**
- Embedded-friendly modular wiring

---

## 🚀 How It Works

1. ESP32 reads coordinates from the NEO-M8N GPS module.
2. Based on location data, it calculates direction and turns motors.
3. L298N controls left/right DC motors to move toward destination.
4. Power flows through regulated circuits for stable performance.
5. Reverse polarity & overcurrent protection ensures circuit health.

---

## 💾 Folder Structure
GeoLocation/
├── images/ # Circuit & bot photos
├── videos/ # Demo run or build process
├── firmware/ # Arduino or ESP32 code
├── documentation/ # Circuit diagrams & PDF notes
└── README.md # Project description


---

## 🔧 Tools & Software

- **Arduino IDE / PlatformIO**
- **Fritzing** (for circuit design)
- **Tinkercad / EasyEDA** (optional simulation)
- **Git / GitHub** (version control)
- **Notion or Google Docs** (documentation)
- **VS CODE** (Code Editor)

---

## 📽 Demo Video
 
> `Coming Soon...`

---

## 📎 Future Enhancements

- Add obstacle detection using ultrasonic sensors  
- Implement route optimization via GPS waypoint mapping  
- Integrate Bluetooth/WiFi for remote override or tracking  
- Use MPU6050/IMU for stability control

---

## ✨ Credits

- Project by: **Vivek Kanjariya**,   **Pratham Madhu**,   **Nakum Dhruv**,   **Xitij Maheta**
- Microcontroller logic, hardware design, and power systems built from scratch.
- Doesn't Includes any Bootstrap and Copyrights.

---

## 📬 Contact

Got feedback or ideas?  
Reach out: [kanjariyavivek295@gmail.com] : Author
LinkedIn: [linkedin.com/in/vivek-kanjariya/](https://www.linkedin.com/in/vivek-kanjariya/)

---

> *Open-source, educational project. Feel free to fork, contribute, or extend!*


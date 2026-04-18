# 🚨 AI Emergency Response Assistant (A.E.R.A)

A production-ready, full-stack AI-powered emergency decision support system designed to provide real-time guidance during critical scenarios such as floods, fires, and disasters.

---

## 🌐 Live Demo
👉 https://aera-dashboard-z64hnw2z6a-uc.a.run.app

---

## 🧠 Overview

A.E.R.A combines **AI decision intelligence + real-time geospatial mapping** to deliver actionable emergency guidance.

The system integrates:
- Google Maps (live location + routing)
- Gemini AI (decision engine)
- Real-time dashboard UI
- Resilient fallback mode (no API dependency)

---

## 🚀 Key Features

### 🔥 Real-Time Geospatial Intelligence
- Live user location tracking using `navigator.geolocation`
- Google Maps integration for route visualization
- Dynamic evacuation route generation (polyline rendering)

---

### 🤖 AI Decision Engine (Gemini)
- Structured output:
  - Risk Level
  - Recommended Action
  - Reasoning
  - Confidence
- Context-aware responses using system state
- Adaptive emergency guidance
- **AI-Map Sync:** AI responses automatically trigger map actions (ROUTE / SHELTER / SOS)

---

### 🧠 Context Engine (Smart Logic)
- Tracks:
  - User intent
  - Hazard level
  - Previous actions
- Enables memory-based and adaptive responses

---

### 🧪 System Validation Layer
- Built-in testing indicators:
  - ✔ Flood scenario handling
  - ✔ Fire scenario handling
  - ✔ Shelter detection
  - ✔ Route generation
  - ✔ API fallback verification

---

### 🛡️ Resilient Fallback Mode
- Works even without API keys
- Switches to simulation mode automatically
- No user-facing errors

---

### ♿ Accessibility & UI
- ARIA labels for all interactive elements
- Clean 3-panel dashboard layout
- Real-time alerts, logs, and telemetry

---

## 🧪 Test Scenarios

### 🌊 Flood Scenario
- Trigger: "Escalate Flood"
- Input: "I am trapped"
- Output: Critical emergency guidance with evacuation instructions

---

### 🔥 Fire Scenario
- Trigger: "Expand Fire"
- Output: AI shifts logic to fire safety guidance with hazard awareness

---

### ⚙️ Fallback Mode
- Remove API keys
- System continues functioning without breaking UI

---

## 🧱 Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express
- **APIs:**
  - Google Maps API
  - Gemini AI API
- **Deployment:** Google Cloud Run

---

## 🔐 Security

- API keys stored securely via `.env`
- `.gitignore` prevents sensitive data exposure

---

## 📦 Installation

```bash
git clone https://github.com/tanishq4220/AI-Emergency-Response-Assistant
cd AI-Emergency-Response-Assistant
npm install
node server.js
```

Open `http://localhost:3000` in your browser.

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory:

```env
GOOGLE_MAPS_API_KEY=your_google_maps_key
GEMINI_API_KEY=your_gemini_api_key
```

If keys are not provided, the system automatically enters **offline simulation mode**.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│              A.E.R.A Dashboard              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Cognition│  │  Google  │  │Situation │  │
│  │    AI    │  │   Maps   │  │Awareness │  │
│  │  (Chat)  │  │ (Routes) │  │(Analytics│  │
│  └──────────┘  └──────────┘  └──────────┘  │
│         ↕              ↕                    │
│       Gemini AI    Maps API                 │
│         ↕              ↕                    │
│         Node.js + Express Backend           │
└─────────────────────────────────────────────┘
```

---

*Powered by Google Maps & Gemini AI | Real-time Emergency Intelligence System*

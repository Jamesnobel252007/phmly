# PHMLY

> **Your people. Your purpose. Your space.**

PHMLY is a friendship-first, dark-mode private group application organized around four distinct room types:

1. **Conversation Room**: Real-time group messaging with emoji reactions, reply quoting, image attachments, and voice-note recording/playback.
2. **Buddies Room**: A learning progress feed where friends share daily wins, reflections, voice notes, and encouraging discussions.
3. **Project Vault Room**: A shared resource hub with search, category filtering (Documents, Images, Videos, Links), multi-selection, and **client-side ZIP packaging & bulk download**.
4. **Goal Tracker Room**: Daily grind goal setting with real-time peer visibility, culturally expressive Tamil-English leaderboards (*"Naantha ipo ooroda top la irukura"*, *"Vaalthukal vaalthukal"*, *"Choplangii ta bro"*), and the empty-achievement state (*"NOTITU poiruchu THAMBI 😭"*).

---

## 🎨 Brand Design System

- **Deep Forest Black (`#0A100D`)**: Primary screen canvas and dark background.
- **Pine Charcoal (`#141D17`)**: Cards, bubbles, input fields, navigation surfaces.
- **Golden Rush (`#F5A623`)**: Primary actions, active highlights, top tier rankings, important icons.
- **Amber Glow (`#E08E1B`)**: Secondary actions, goal streaks, celebratory highlights.
- **Forest Cream (`#F4F6F4`)**: Headings, messages, primary typography.
- **Muted Moss Gray (`#8A9A8F`)**: Subtext, timestamps, inactive icons.

---

## 🚀 How to Run the Application

### Development Mode
```bash
npm run dev
```
Open your browser at `http://localhost:5173`.

### Production Build & Preview
```bash
npm run build
npm run preview
```
Open your browser at `http://localhost:4173`.

---

## 📦 Tech Stack

- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom design tokens
- **Icons**: Lucide React
- **ZIP Packaging**: JSZip (client-side in-memory multi-file bulk download)
- **Audio & Media**: Web MediaRecorder / Canvas snapshot capture + WebRTC camera stream
- **Storage**: Centralized LocalStorage persistence with defensive fallback handling


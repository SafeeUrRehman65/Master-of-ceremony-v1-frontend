# Master of Ceremony v1 – Frontend

This is the **frontend** for the *Master of Ceremony v1* project, built with **React** + **Vite**.  
It provides a sleek UI for the Master of Ceremony application (backend assumed separate), handling real-time audio/visual effects and speaker interactions.

---

## 🚀 Tech Stack

- **React** – UI framework  
- **Vite** – Fast development build tool  
- **Framer Motion** – Animations for dynamic UI elements  
- **Tailwind CSS** – Utility-first styling  
- **JavaScript (ESNext)** – Modern JS syntax  
- **Audio/Canvas APIs** – For visualizations and interactive effects  

---

## 🧭 Features

- Real-time animated visualization of audio input (canvas + Web Audio API)  
- Gradient animations using chosen color palettes for dynamic UI ambiance  
- Speaker selection dropdown UI  
- Responsive design with modern styling (glassmorphism, blur effects)  
- Organized structure for future feature extension  

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v16 or later recommended)  
- npm or yarn  

### Installation

1. **Clone the repo:**
   ```bash
   git clone https://github.com/SafeeUrRehman65/Master-of-ceremony-v1-frontend.git
   cd Master-of-ceremony-v1-frontend
   ```
2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **⚙️ Environment Variables (`.env`)**

The **Master of Ceremony v1 – Frontend** requires the server's WebSocket URL to connect to the backend server in real time.
---

## 📁 Example `.env.example`

```bash
VITE_BACKEND_WEBSOCKET_URL="<YOUR_SERVER_WEBSOCKET_URL_HERE>"
```
**🧠 Usage**
1. **Copy the example file:**
```bash
cp .env.example .env
```
2. **Open .env and replace the placeholder with your backend WebSocket URL if you have a local deployement. Example:**
```bash
VITE_BACKEND_WEBSOCKET_URL="ws://localhost:${PORT}$/ws"
``` 
Or if deployed:

```bash
VITE_BACKEND_WEBSOCKET_URL="wss://your-domain.com/ws"
```

**Note:** Your Backend websocket url will be derived from the url on which your server is live!

4. **Run the development server:**
   ```bash
   npm run dev
   # or
   yarn dev

Open http://localhost:5173 or (default Vite port) in your browser.

5. **Build for production:**
   ```bash
   npm run build
   # or
   yarn build


### ✅ Contributing

1. **Fork the repository**

2. **Create a feature branch:**
   ```bash
   git checkout -b feature/my-feature

3. **Commit your changes and push:**
   ```bash
   git push origin feature/my-feature

4. **Open a Pull Request**



### 📁 Project Structure
```bash
/
├─ public/               
├─ src/                  
├─ .gitignore  
├─ vite.config.js        
├─ package.json  
└─ README.md




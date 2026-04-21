<p align="center">
  <img src="public/logo.png" width="200" alt="BrandPulse AI Logo">
</p>

# BrandPulse AI

> **Transform the black box of AI search into your active war room.**

BrandPulse AI is an advanced monitoring and strategy platform designed for the new era of acquisition. As AI search engines (ChatGPT, Perplexity, Gemini, Copilot) become major traffic drivers, brands can no longer afford to "fly blind." We provide the visibility and actionable insights needed to ensure your brand is cited, recommended, and dominant in AI-generated answers.

This project was built for the **PeecAI MCP contest**.

---

## 📉 What does it solve?

AI search engines are now a major acquisition channel, and it's an exciting time for brands. While there's no way for brands to know if they're being recommended, cited, or ignored, the potential is there for incredible growth. 

Marketing teams were either flying blind or spending hours manually prompting every AI engine to check how their brand appears. **BrandPulse AI** is the key to unlocking the hidden potential in your business. It transforms the black box into an active war room, constantly monitoring your Peec data, spotting gaps before they escalate, and providing your team with clear, actionable insights.

## 🛠️ How does it work?

BrandPulse integrates with the **Peec MCP** and deploys an orchestrated **OpenRouter** agent across five intelligent screens:

*   **Overview Screen**: Automatically generates a "Monday morning briefing" by calling `get_brand_report` with a date dimension and diffing the past two weeks. The AI writes the headline, and automated charts justify it.
*   **Competitor Radar**: Gathers and analyzes data on brand and model-level market share. It spots competitor strategies (like Salesforce's CRM comparison pages) that are gaining traction in AI citations.
*   **Gap Audit**: Calls `get_domain_report` to identify topics where competitors are cited but you are not. It generates ready-to-assign content briefs specific enough to paste directly into Jira.
*   **AI Chat**: Provides a "personal analyst" for the whole team. Type questions in plain language, and the agent determines which MCP tools to call, fetches live data, and answers in-context.
*   **Urgency Alerts**: A background cron diffs snapshots and fires urgency-classified alerts to the appropriate teams.

### 🧠 Intelligence Layer
Utilizes **OpenRouter** for model orchestration:
*   **Claude 3 Haiku**: Manages cost-effective background tasks and quick analysis.
*   **Claude 3.5 Sonnet**: Handles high-value projects and complex strategic reasoning.
*(Model roles can be seamlessly switched via environment variables)*

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18+) & **pnpm**
- **Docker** & **Docker Compose** (recommended)
- **OpenRouter API Key**
- **Peec AI API Access**

### Setup
1. **Clone the repository**:
   ```bash
   git clone https://github.com/Lucy-Janssens/BrandPulse.git
   cd BrandPulse
   ```

2. **Configure Environment Variables**:
   Copy the example env file and fill in your keys:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add:
   - `VITE_OPENROUTER_API_KEY`: Your OpenRouter key.
   - `MONGO_URI`: `mongodb://mongo:27017/brandpulse` (if using Docker).

### Running with Docker (Recommended)
This starts the MongoDB database, the Express API, and the Vite frontend:
```bash
docker-compose up --build
```
The app will be available at [http://localhost:5173](http://localhost:5173).

### Running Locally (Manual)
1. **Start MongoDB** (ensure it's running on port 27017).
2. **Setup Backend**:
   ```bash
   cd api
   pnpm install
   node server.js
   ```
3. **Setup Frontend**:
   ```bash
   cd ..
   pnpm install
   pnpm dev
   ```

### Production Deployment
For local network deployment using pre-built images:
```bash
chmod +x deploy.sh
./deploy.sh
```
This script pulls the latest image from GHCR and starts the stack on **Port 80**.

---


## 🏗️ Architecture
- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Express.js + Mongoose
- **Database**: MongoDB
- **AI Orchestration**: OpenRouter SDK + MCP (Model Context Protocol)

---

<p align="center">Made with ❤️ for the PeecAI MCP Contest</p>

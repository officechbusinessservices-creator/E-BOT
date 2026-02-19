# 🤖 Singularity Bot

A multi-agent AI crew powered by [CrewAI](https://github.com/joaomdmoura/crewAI), deployable for free on [Render](https://render.com).

## Agents

| Agent | Role |
|-------|------|
| **Devin X** | Elite Software Architect — writes production-ready, self-healing code |
| **Claude Wordsmith** | Master Wordsmith — writes high-impact, anti-fluff copy |

---

## 🚀 Local Development

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Set your OpenAI API key
```bash
export OPENAI_API_KEY=sk-your-key-here
```

### 3. Run the API server
```bash
uvicorn api:app --reload
```

### 4. Test it
```bash
curl -X POST http://localhost:8000/run \
  -H "Content-Type: application/json" \
  -d '{"user_input": "Build a web scraper"}'
```

---

## ☁️ Deploy to Render (Free)

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → **New +** → **Web Service**
3. Connect your GitHub repository
4. Use these settings:

| Setting | Value |
|---------|-------|
| **Runtime** | Python |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn api:app --host 0.0.0.0 --port $PORT` |

5. Add your environment variable:
   - Key: `OPENAI_API_KEY`
   - Value: `sk-your-key-here`

6. Click **Deploy** — your bot will be live at `https://your-app.onrender.com` 🎉

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Health check |
| `POST` | `/run` | Run the crew with a user input |

### Example Request
```json
POST /run
{
  "user_input": "Build a Python web scraper for news headlines"
}
```

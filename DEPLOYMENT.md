# Deployment Guide for E-BOT

This guide helps you deploy the E-BOT application to Render.

## Prerequisites

- A Render account (https://render.com)
- Your OpenAI API key

## Deployment Steps

### Option 1: Using render.yaml (Recommended)

The repository includes a `render.yaml` configuration file that automatically sets up your service.

1. Go to https://render.com/dashboard
2. Click "New" → "Blueprint"
3. Connect your GitHub repository: `officechbusinessservices-creator/E-BOT`
4. Render will automatically detect the `render.yaml` file
5. Add your environment variables (see below)
6. Click "Apply" to deploy

### Option 2: Manual Web Service Setup

If you prefer to set up manually:

1. Go to https://render.com/dashboard
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure the following settings:

   **Basic Settings:**
   - **Name:** e-bot-x0ot (or your preferred name)
   - **Runtime:** Python 3
   - **Region:** Choose closest to your users
   - **Branch:** main (or your preferred branch)
   - **Root Directory:** (leave empty - files are in root)

   **Build & Deploy:**
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app`

   **Environment Variables:**
   Click "Add Environment Variable" and add:
   - **Key:** `PYTHON_VERSION` → **Value:** `3.12.7`
   - **Key:** `PORT` → **Value:** `10000`
   - **Key:** `OPENAI_API_KEY` → **Value:** `your-openai-api-key-here`

5. Click "Create Web Service"

## Important Configuration Notes

### Python Version
- **Recommended:** Python 3.12.7
- **Avoid:** Python 3.14+ (causes tiktoken build failures)
- Set via `PYTHON_VERSION` environment variable

### Start Command
The correct start command is:
```
gunicorn app:app
```

This tells Gunicorn to:
- Load the `app.py` file
- Use the `app` Flask instance inside it

**Common Mistakes:**
- ❌ `gunicorn your_application.wsgi` (Django syntax, not Flask)
- ❌ `python app.py` (doesn't use Gunicorn for production)
- ✅ `gunicorn app:app` (correct for this Flask application)

### Dependencies Fixed

The following dependency issues have been resolved in `requirements.txt`:

1. **NumPy Version:** Downgraded from `2.2.3` to `1.26.4`
   - Reason: NumPy 2.x has compatibility issues with LangChain and other dependencies

2. **tiktoken:** Added with version constraint `>=0.7.0`
   - Required by OpenAI and LangChain libraries for tokenization

3. **Gunicorn:** Added version `23.0.0`
   - Production-ready WSGI server for Flask applications

### Environment Variables

Required environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `PYTHON_VERSION` | Python runtime version | `3.12.7` |
| `OPENAI_API_KEY` | Your OpenAI API key | `sk-...` |
| `PORT` | Port to run on (auto-set by Render) | `10000` |

### File System Notes

Render uses a read-only file system after deployment. If you need to write files:
- Use `/tmp` directory for temporary files
- Consider using external storage (S3, etc.) for persistent files

## Troubleshooting

### Build Fails with "ResolutionImpossible" Error
**Solution:** Ensure `requirements.txt` has:
- `numpy==1.26.4` (not 2.x)
- `tiktoken>=0.7.0`

### Start Command Error
**Solution:** Use `gunicorn app:app` not `gunicorn your_application.wsgi`

### tiktoken Build Failure
**Solution:** Set `PYTHON_VERSION=3.12.7` environment variable (avoid Python 3.14+)

### Read-only File System Error
**Solution:** Write files to `/tmp` directory instead of project root

## Testing Locally

Before deploying, test locally:

```bash
# Install dependencies
pip install -r requirements.txt

# Run with Gunicorn (production-like)
gunicorn app:app --bind 0.0.0.0:5000

# Or run with Flask dev server
python app.py
```

Access at: http://localhost:5000

## Health Check

After deployment, verify your service:
1. Check the Render dashboard for "Live" status
2. Visit your service URL (e.g., `https://e-bot.onrender.com`)
3. Test the chat API endpoint: POST to `/api/chat`

Example curl test:
```bash
curl -X POST https://your-service.onrender.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello OMNI-PRIME!"}'
```

## Monitoring

- **Logs:** Available in Render dashboard under "Logs" tab
- **Metrics:** Check "Metrics" tab for CPU, memory, and response times
- **Alerts:** Set up in Render dashboard for downtime notifications

## Scaling

To handle more traffic:
1. Upgrade from Free tier to Starter or higher
2. Adjust instance count in Render dashboard
3. Consider adding Redis for caching
4. Add load balancing for multiple instances

## Support

For deployment issues:
- Check Render status: https://status.render.com
- Render docs: https://render.com/docs
- GitHub issues: https://github.com/officechbusinessservices-creator/E-BOT/issues

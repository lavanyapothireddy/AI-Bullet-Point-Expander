# AI Form Type Detector

Classify form documents (tax, medical, insurance, contracts, etc.) from text or uploaded files using TF-IDF + Naive Bayes, with a FastAPI backend and React frontend.

---

## Project Structure

```
ai-form-detector/
├── backend/
│   ├── app.py              # FastAPI application
│   ├── form_detector.py    # ML model wrapper
│   ├── ocr_utils.py        # Image/PDF text extraction
│   ├── train_model.py      # Model training script
│   ├── requirements.txt
│   ├── Procfile            # For Render deployment
│   ├── dataset/
│   │   └── forms_dataset.csv   # Your training data (text, label columns)
│   └── model/
│       └── form_classifier.pkl # Generated after training
└── frontend/
    ├── package.json
    └── src/
        ├── App.js
        ├── components/
        │   ├── UploadForm.js
        │   └── UploadForm.css
        └── services/
            └── api.js
```

---

## Local Setup

### Backend

```bash
cd backend
pip install -r requirements.txt

# Install Tesseract OCR (for image support)
# Ubuntu/Debian:
sudo apt-get install tesseract-ocr
# macOS:
brew install tesseract

# Train the model (put your dataset at dataset/forms_dataset.csv first)
python train_model.py

# Run the server
uvicorn app:app --reload
```

The API will be available at `http://localhost:8000`

### Frontend

```bash
cd frontend
npm install
npm start
```

The app will be available at `http://localhost:3000`

---

## Dataset Format

Your `dataset/forms_dataset.csv` must have these columns:

| text | label |
|------|-------|
| Employee name, Date of birth... | Employment Form |
| Patient name, Diagnosis... | Medical Form |
| Taxable income, Deductions... | Tax Form |

---

## Deploying to Render

### Step 1 — Deploy the Backend (Web Service)

1. Push your `backend/` folder to a GitHub repo
2. Go to [render.com](https://render.com) → **New → Web Service**
3. Connect your repo
4. Set these options:
   - **Root Directory**: `backend`
   - **Environment**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`
5. Click **Create Web Service**
6. Copy the deployed URL (e.g. `https://your-backend.onrender.com`)

> ⚠️ Make sure `model/form_classifier.pkl` is committed to your repo **after training**, or add a build step to train it.

### Step 2 — Deploy the Frontend (Static Site)

1. Push your `frontend/` folder to GitHub (can be same repo)
2. Go to Render → **New → Static Site**
3. Connect your repo
4. Set these options:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `build`
5. Add an **Environment Variable**:
   - Key: `REACT_APP_API_URL`
   - Value: `https://your-backend.onrender.com` (from Step 1)
6. Click **Create Static Site**

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| POST | `/detect-text` | Detect form type from pasted text |
| POST | `/detect-file` | Upload PNG/JPG/PDF for OCR + detection |

### POST /detect-text

**Request:**
```json
{ "text": "Patient name: John Doe, Diagnosis: ..." }
```

**Response:**
```json
{
  "form_type": "Medical Form",
  "confidence": 94.32,
  "top_predictions": [
    { "form_type": "Medical Form", "confidence": 94.32 },
    { "form_type": "Insurance Form", "confidence": 4.12 },
    { "form_type": "Tax Form", "confidence": 1.56 }
  ]
}
```

### POST /detect-file

**Request:** multipart/form-data with `file` field

**Response:**
```json
{
  "extracted_text": "...",
  "prediction": {
    "form_type": "Tax Form",
    "confidence": 88.71,
    "top_predictions": [...]
  }
}
```

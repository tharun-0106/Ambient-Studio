import os
from typing import Dict, Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="Ambient AI Studio API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TRACKS = ["rain", "thunder", "forest", "ocean", "fire", "cafe", "wind", "crickets", "binaural", "lofi"]

CURATED_PRESETS = {
    "focus": {
        "title": "Deep Focus",
        "description": "Steady rain, distant cafe murmur, and 10Hz alpha entrainment for coding & studying.",
        "values": {"rain": 0.55, "cafe": 0.35, "binaural": 0.3},
    },
    "storm": {
        "title": "Stormy Night",
        "description": "Heavy rainfall, rolling thunder, and gusting winds outside the window.",
        "values": {"rain": 0.65, "thunder": 0.45, "wind": 0.35},
    },
    "cozy": {
        "title": "Cozy Cabin Hearth",
        "description": "Snapping fireplace embers with gentle rain tapping on glass.",
        "values": {"fire": 0.65, "rain": 0.40, "forest": 0.25},
    },
    "ocean": {
        "title": "Midnight Shoreline",
        "description": "Slow rhythmic ocean tides and peaceful nocturnal crickets.",
        "values": {"ocean": 0.60, "wind": 0.25, "crickets": 0.35},
    },
    "cafe": {
        "title": "Coffee & Code",
        "description": "Warm coffee shop atmosphere paired with chill electric piano chords.",
        "values": {"cafe": 0.60, "lofi": 0.45, "rain": 0.25},
    },
    "sleep": {
        "title": "Peaceful Sleep",
        "description": "Gentle evening rain, distant thunder rumble, and tranquil crickets.",
        "values": {"rain": 0.55, "thunder": 0.15, "crickets": 0.45},
    },
}

class MixRequest(BaseModel):
    prompt: str = Field(default="", max_length=500)

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "ambient-ai-studio"}

@app.post("/api/mix")
def generate_mix(request: MixRequest):
    prompt = request.prompt.lower().strip()
    
    # Check for optional Gemini API key
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        try:
            import google.generativeai as genai
            import json
            genai.configure(api_key=gemini_key)
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(
                f"You are an ambient sound engineer. Given user prompt '{prompt}', produce a JSON object with: "
                f"'title': short name, 'description': short atmosphere explanation, "
                f"'values': object with keys from {TRACKS} mapped to volume float 0.0 to 0.8. Return ONLY raw JSON."
            )
            data = json.loads(response.text.strip('```json').strip('```').strip())
            return data
        except Exception:
            pass  # Fallback to local intelligent mapper

    # Local intelligent mood mapping fallback
    vols = {t: 0.0 for t in TRACKS}
    
    if any(k in prompt for k in ["rain", "storm", "pour", "water"]):
        vols["rain"] = 0.65
    if any(k in prompt for k in ["thunder", "lightning", "stormy", "dark"]):
        vols["thunder"] = 0.45
    if any(k in prompt for k in ["forest", "trees", "nature", "woods", "bird"]):
        vols["forest"] = 0.50
    if any(k in prompt for k in ["ocean", "sea", "beach", "waves"]):
        vols["ocean"] = 0.60
    if any(k in prompt for k in ["fire", "hearth", "cabin", "cozy", "warm"]):
        vols["fire"] = 0.65
    if any(k in prompt for k in ["cafe", "coffee", "study", "work", "people", "bar"]):
        vols["cafe"] = 0.55
    if any(k in prompt for k in ["wind", "mountain", "breeze", "cold"]):
        vols["wind"] = 0.40
    if any(k in prompt for k in ["night", "cricket", "summer", "sleep", "bed"]):
        vols["crickets"] = 0.45
    if any(k in prompt for k in ["focus", "deep", "code", "study", "alpha", "brain"]):
        vols["binaural"] = 0.35
    if any(k in prompt for k in ["piano", "lofi", "chill", "music", "beat"]):
        vols["lofi"] = 0.40

    if not any(v > 0 for v in vols.values()):
        return CURATED_PRESETS["focus"]

    return {
        "title": "Custom AI Mix",
        "description": f"Tailored ambient soundscape for '{prompt}'.",
        "values": vols
    }

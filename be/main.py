"""
TechNest AI Backend
Connects user prompts to OpenAI GPT-4o and returns generated content ideas.

Workflow: user enters prompt → GPT-4o receives prompt → GPT-4o returns answer
"""

import os
import json
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI

app = Flask(__name__)

# Configure CORS:
# - Use CORS_ORIGINS env var (comma-separated) if set.
# - Otherwise, default to the Vite dev server origin.
_cors_origins_env = os.environ.get("CORS_ORIGINS")
if _cors_origins_env:
    _cors_origins = [
        origin.strip()
        for origin in _cors_origins_env.split(",")
        if origin.strip()
    ]
else:
    _cors_origins = ["http://localhost:5173"]

CORS(
    app,
    resources={r"/api/*": {"origins": _cors_origins}},
)

# Initialise OpenAI client – set OPENAI_API_KEY in your environment
_api_key = os.environ.get("OPENAI_API_KEY", "")
if not _api_key:
    print(
        "WARNING: OPENAI_API_KEY is not set. AI generation will fail until it is provided.",
        file=sys.stderr,
    )
client = OpenAI(api_key=_api_key)

SYSTEM_PROMPT = """You are TechNest's AI content strategist. Given a user's content topic and optional preferences, generate 4 creative content ideas optimised for social media.

Return ONLY a valid JSON object (no markdown, no extra text) with this exact structure:
{
  "ideas": [
    {
      "id": "unique-string",
      "type": "Reel" | "Carousel" | "Photo" | "Thread" | "Short",
      "title": "Catchy content title",
      "hook": "One-sentence hook that grabs attention",
      "platforms": ["TikTok", "Instagram"],
      "bestTime": "Best posting time window",
      "estimatedReach": "e.g. 10K – 30K"
    }
  ]
}

Rules:
- Make ideas specific to the topic provided
- Vary the content types across the 4 ideas
- Keep hooks punchy and platform-native
- Choose platforms that suit each content type"""


@app.route("/api/generate", methods=["POST"])
def generate():
    """
    POST /api/generate
    Body: { "topic": str, "niche": str, "audience": str, "goal": str, "tone": str }
    Returns: { "ideas": [...] }
    """
    if not _api_key:
        return jsonify({"error": "OPENAI_API_KEY is not configured on the server"}), 503

    data = request.get_json(silent=True) or {}

    topic = (data.get("topic") or "").strip()
    if not topic:
        return jsonify({"error": "topic is required"}), 400

    niche = data.get("niche", "")
    audience = data.get("audience", "")
    goal = data.get("goal", "")
    tone = data.get("tone", "default")

    # Build context string from optional fields
    context_parts = [f"Topic: {topic}"]
    if niche:
        context_parts.append(f"Niche: {niche}")
    if audience:
        context_parts.append(f"Target audience: {audience}")
    if goal:
        context_parts.append(f"Goal: {goal}")
    if tone and tone != "default":
        context_parts.append(f"Tone: {tone}")

    user_message = "\n".join(context_parts)

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.8,
            max_tokens=1200,
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content or "{}"
        payload = json.loads(raw)
        ideas = payload.get("ideas", [])

        # Validate shape: must be a list of dicts
        if not isinstance(ideas, list) or any(not isinstance(item, dict) for item in ideas):
            app.logger.warning("AI response JSON had unexpected shape: %r", ideas)
            return (
                jsonify({"error": "AI response was not a JSON array of idea objects"}),
                502,
            )

        return jsonify({"ideas": ideas})

    except json.JSONDecodeError:
        return jsonify({"error": "Failed to parse AI response as JSON"}), 502
    except Exception as e:  # noqa: BLE001
        app.logger.error("Unexpected error in /api/generate: %s", e)
        return jsonify({"error": "An unexpected error occurred. Please try again."}), 500


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)

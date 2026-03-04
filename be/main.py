"""
TechNest AI Backend
Connects user prompts to OpenAI GPT-4o and returns generated content ideas.
Also handles email/password auth and Google OAuth backed by Supabase PostgreSQL.

Workflow: user enters prompt → GPT-4o receives prompt → GPT-4o returns answer
"""

import os
import json
import sys
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
import psycopg2
import psycopg2.errors
from authlib.integrations.flask_client import OAuth
from flask import Flask, request, jsonify, redirect
from flask_cors import CORS
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Flask session secret (required by authlib for OAuth state)
app.secret_key = os.getenv("FLASK_SECRET_KEY")

# Configure CORS:
# - Use CORS_ORIGINS env var (comma-separated) if set.
# - Otherwise, default to the Vite dev server origin.
_cors_origins_env = os.getenv("CORS_ORIGINS")
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
    supports_credentials=True,
)

# ── OpenAI ──────────────────────────────────────────────────────────────────
# Initialise OpenAI client – set OPENAI_API_KEY in your environment
_api_key = os.getenv("OPENAI_API_KEY")
if not _api_key:
    print(
        "WARNING: OPENAI_API_KEY is not set. AI generation will fail until it is provided.",
        file=sys.stderr,
    )
client = OpenAI(api_key=_api_key)

# ── Database ─────────────────────────────────────────────────────────────────
_database_url = os.getenv("DATABASE_URL")
if not _database_url:
    print(
        "WARNING: DATABASE_URL is not set. Auth endpoints will fail until it is provided.",
        file=sys.stderr,
    )


def get_db():
    """Open a new psycopg2 connection using DATABASE_URL."""
    return psycopg2.connect(
        user=os.getenv('user'), 
        password=os.getenv('password'), 
        host=os.getenv('host'), 
        port=os.getenv('port'), 
        database=os.getenv('database')
    )


# ── JWT ───────────────────────────────────────────────────────────────────────
_jwt_secret = os.getenv("JWT_SECRET")
_JWT_ALGORITHM = "HS256"
_JWT_EXPIRY_DAYS = 7


def make_token(email: str) -> str:
    payload = {
        "sub": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=_JWT_EXPIRY_DAYS),
    }
    return jwt.encode(payload, _jwt_secret, algorithm=_JWT_ALGORITHM)


# ── Google OAuth ──────────────────────────────────────────────────────────────
oauth = OAuth(app)
google = oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

# ── AI prompt ────────────────────────────────────────────────────────────────
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


# ── Auth endpoints ────────────────────────────────────────────────────────────

@app.route("/api/auth/signup", methods=["POST"])
def signup():
    """
    POST /api/auth/signup
    Body: { "email": str, "password": str }
    Returns: { "token": str, "email": str }
    """
    if not _database_url:
        return jsonify({"error": "Database is not configured on the server"}), 503

    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400
    # if len(password) < 8:
    #     return jsonify({"error": "Password must be at least 8 characters"}), 400

    # hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    conn = get_db()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO user_data (email, password) VALUES (%s, %s)",
                    (email, password),
                )
        return jsonify({"token": make_token(email), "email": email}), 201
    except psycopg2.errors.UniqueViolation:
        return jsonify({"error": "An account with this email already exists"}), 409
    except Exception as e:  # noqa: BLE001
        app.logger.error("Signup error: %s", e)
        return jsonify({"error": "An unexpected error occurred"}), 500
    finally:
        conn.close()


@app.route("/api/auth/signin", methods=["POST"])
def signin():
    """
    POST /api/auth/signin
    Body: { "email": str, "password": str }
    Returns: { "token": str, "email": str }
    """
    if not _database_url:
        return jsonify({"error": "Database is not configured on the server"}), 503

    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT password FROM user_data WHERE email = %s",
                (email,),
            )
            row = cur.fetchone()

        if not row or not row[0]:
            return jsonify({"error": "Invalid email or password"}), 401

        stored_hash = row[0]
        if not bcrypt.checkpw(password.encode(), stored_hash.encode()):
            return jsonify({"error": "Invalid email or password"}), 401

        return jsonify({"token": make_token(email), "email": email})
    except Exception as e:  # noqa: BLE001
        app.logger.error("Signin error: %s", e)
        return jsonify({"error": "An unexpected error occurred"}), 500
    finally:
        conn.close()


@app.route("/api/auth/google")
def google_login():
    """Redirect browser to Google's OAuth consent screen."""
    frontend_url = os.getenv("FRONTEND_URL")
    # The callback must be routable through the same origin as this request so
    # that the session cookie (holding OAuth state) is sent back correctly.
    redirect_uri = f"{frontend_url}/api/auth/google/callback"
    return google.authorize_redirect(redirect_uri)


@app.route("/api/auth/google/callback")
def google_callback():
    """Handle Google OAuth callback, upsert user, return JWT to frontend."""
    frontend_url = os.getenv("FRONTEND_URL")
    frontend_base = os.getenv("FRONTEND_BASE")

    if not _database_url:
        return redirect(f"{frontend_url}{frontend_base}/auth?error=db_not_configured")

    try:
        token = google.authorize_access_token()
        user_info = token.get("userinfo") or {}
        google_id = user_info.get("sub", "")
        email = (user_info.get("email") or "").lower()

        if not email or not google_id:
            return redirect(f"{frontend_url}{frontend_base}/auth?error=oauth_missing_info")

        conn = get_db()
        try:
            with conn:
                with conn.cursor() as cur:
                    # Check if account already linked to this Google ID
                    cur.execute(
                        "SELECT email FROM user_data WHERE google_id = %s",
                        (google_id,),
                    )
                    row = cur.fetchone()
                    if row:
                        email = row[0]
                    else:
                        # Check if email exists (link Google to existing account)
                        cur.execute(
                            "SELECT email FROM user_data WHERE email = %s",
                            (email,),
                        )
                        if cur.fetchone():
                            cur.execute(
                                "UPDATE user_data SET google_id = %s WHERE email = %s",
                                (google_id, email),
                            )
                        else:
                            # New user via Google (no password set)
                            cur.execute(
                                "INSERT INTO user_data (email, google_id) VALUES (%s, %s)",
                                (email, google_id),
                            )
        finally:
            conn.close()

        jwt_token = make_token(email)
        return redirect(
            f"{frontend_url}{frontend_base}/auth/callback"
            f"?token={jwt_token}&email={email}"
        )
    except Exception as e:  # noqa: BLE001
        app.logger.error("Google OAuth callback error: %s", e)
        return redirect(f"{frontend_url}{frontend_base}/auth?error=oauth_failed")


# ── AI generation ─────────────────────────────────────────────────────────────

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
    jsonify(data), 503
    # topic = (data.get("topic") or "").strip()
    # if not topic:
    #     return jsonify({"error": "topic is required"}), 400

    # niche = data.get("niche", "")
    # audience = data.get("audience", "")
    # goal = data.get("goal", "")
    # tone = data.get("tone", "default")

    # # Build context string from optional fields
    # context_parts = [f"Topic: {topic}"]
    # if niche:
    #     context_parts.append(f"Niche: {niche}")
    # if audience:
    #     context_parts.append(f"Target audience: {audience}")
    # if goal:
    #     context_parts.append(f"Goal: {goal}")
    # if tone and tone != "default":
    #     context_parts.append(f"Tone: {tone}")

    user_message = data

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


# ── Health ────────────────────────────────────────────────────────────────────

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    port = int(os.getenv("PORT"))
    debug = os.getenv("FLASK_DEBUG").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)
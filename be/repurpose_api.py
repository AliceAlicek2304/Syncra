import json
import os
from http import HTTPStatus
from typing import Any, Dict, List

from flask import Flask, jsonify, request
from openai import OpenAI


def load_env_file() -> None:
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if not os.path.exists(env_path):
        return
    with open(env_path, "r", encoding="utf-8") as file:
        for raw_line in file:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"')
            if key:
                os.environ[key] = value


VALID_TYPES = {"POST", "THREAD", "CAROUSEL", "INSIGHT", "TIP", "QUOTE"}
VALID_PLATFORMS = {"LinkedIn", "X", "Instagram", "Newsletter"}
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

app = Flask(__name__)
load_env_file()


def build_prompt(source_text: str, platforms: List[str], tone: str, length: str, extract_atoms: bool) -> str:
    platform_list = ", ".join(platforms)
    tone_instruction = "adaptive and balanced tone" if tone == "default" else f"{tone} tone"
    length_instruction = {"short": "short form", "medium": "medium form", "long": "long form"}.get(length, "medium form")
    extract_instruction = (
        "Prioritize atom types INSIGHT, TIP, QUOTE when possible."
        if extract_atoms
        else "Prioritize full post formats like POST, THREAD, CAROUSEL when possible."
    )

    return f"""You are a helpful chatbot.
Create content aiming at platforms like {platform_list} with a {tone_instruction} and make sure it is {length_instruction}.
Here is the content: {source_text}

Return STRICT JSON ONLY.
No markdown, no explanation, no code fence.
Return this exact shape:
{{
  "atoms": [
    {{
      "id": "string",
      "type": "POST|THREAD|CAROUSEL|INSIGHT|TIP|QUOTE",
      "title": "optional string",
      "content": "non-empty string",
      "platform": "LinkedIn|X|Instagram|Newsletter",
      "suggestedHashtags": ["string"],
      "suggestedCTA": "optional string"
    }}
  ]
}}
Rules:
- atoms count is minimum 2 and maximum 3
- every atom platform must be one of selected platforms: {platform_list}
- every content must be non-empty
- suggestedHashtags must be array of strings
- {extract_instruction}
"""


def validate_atoms(payload: Dict[str, Any], selected_platforms: List[str]) -> List[Dict[str, Any]]:
    atoms = payload.get("atoms")
    if not isinstance(atoms, list):
        raise ValueError("AI response must contain an atoms array.")
    if len(atoms) < 2 or len(atoms) > 3:
        raise ValueError("AI response must contain 2 to 3 atoms.")

    validated: List[Dict[str, Any]] = []
    selected_set = set(selected_platforms)
    for atom in atoms:
        if not isinstance(atom, dict):
            raise ValueError("Each atom must be an object.")

        atom_id = atom.get("id")
        atom_type = atom.get("type")
        platform = atom.get("platform")
        content = atom.get("content")
        hashtags = atom.get("suggestedHashtags")
        title = atom.get("title")
        cta = atom.get("suggestedCTA")

        if not isinstance(atom_id, str) or not atom_id.strip():
            raise ValueError("Each atom must have non-empty id.")
        if atom_type not in VALID_TYPES:
            raise ValueError(f"Invalid atom type: {atom_type}")
        if platform not in VALID_PLATFORMS:
            raise ValueError(f"Invalid platform: {platform}")
        if platform not in selected_set:
            raise ValueError(f"Atom platform not selected: {platform}")
        if not isinstance(content, str) or not content.strip():
            raise ValueError("Each atom must have non-empty content.")
        if not isinstance(hashtags, list) or any(not isinstance(tag, str) for tag in hashtags):
            raise ValueError("suggestedHashtags must be array of strings.")
        if title is not None and not isinstance(title, str):
            raise ValueError("title must be a string when provided.")
        if cta is not None and not isinstance(cta, str):
            raise ValueError("suggestedCTA must be a string when provided.")

        validated.append(atom)

    return validated


def call_openai(prompt: str, model: str, api_key: str) -> str:
    client = OpenAI(base_url=OPENROUTER_BASE_URL, api_key=api_key)
    try:
        completion = client.chat.completions.create(
            model=model,
            temperature=0.3,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": "You are a helpful assistant that returns strict JSON only."},
                {"role": "user", "content": prompt},
            ],
        )
    except Exception as exc:
        raise RuntimeError(f"OpenRouter request failed: {exc}") from exc

    content = completion.choices[0].message.content or ""

    if not isinstance(content, str) or not content.strip():
        raise RuntimeError("OpenRouter returned empty content.")

    return content


@app.after_request
def add_cors_headers(response):  # type: ignore[override]
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    return response


@app.route("/api/v1/repurpose/generate", methods=["POST", "OPTIONS"])
def generate_repurpose():
    if request.method == "OPTIONS":
        return ("", HTTPStatus.NO_CONTENT)

    body = request.get_json(silent=True) or {}
    source_text = str(body.get("sourceText", "")).strip()
    platforms = body.get("platforms") or []
    tone = str(body.get("tone", "default"))
    length = str(body.get("length", "medium"))
    extract_atoms = bool(body.get("extractAtoms", False))
    prompt = str(body.get("prompt", "")).strip()

    if not source_text:
        return ("sourceText is required.", HTTPStatus.BAD_REQUEST)
    if not isinstance(platforms, list) or len(platforms) == 0:
        return ("platforms must contain at least one platform.", HTTPStatus.BAD_REQUEST)
    for platform in platforms:
        if platform not in VALID_PLATFORMS:
            return (f"Unsupported platform: {platform}", HTTPStatus.BAD_REQUEST)

    if not prompt:
        prompt = build_prompt(source_text, platforms, tone, length, extract_atoms)

    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        return ("OPENAI_API_KEY is missing in be/.env", HTTPStatus.INTERNAL_SERVER_ERROR)
    model = os.getenv("OPENAI_MODEL", "openai/gpt-5-nano").strip() or "openai/gpt-5-nano"

    try:
        content = call_openai(prompt, model, api_key)
    except RuntimeError as exc:
        return (str(exc), HTTPStatus.BAD_GATEWAY)

    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        return ("OpenAI response is not valid JSON.", HTTPStatus.BAD_GATEWAY)

    try:
        atoms = validate_atoms(parsed, platforms)
    except ValueError as exc:
        return (str(exc), HTTPStatus.BAD_GATEWAY)

    return jsonify({"atoms": atoms})


if __name__ == "__main__":
    load_env_file()
    app.run(host="0.0.0.0", port=int(os.getenv("REPURPOSE_API_PORT", "5260")), debug=True)

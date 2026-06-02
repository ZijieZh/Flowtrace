"""Compute pattern features from accumulated dream history.

Run with the working folder as the current working directory.
Reads dream_history.json. Writes pattern_analysis.json.
PDF rendering is left to the executor (e.g., reuse generate_report's render.py).
"""

import json
from collections import Counter
from pathlib import Path
from statistics import mean

WORKING = Path.cwd()
MIN_DREAMS = 3


def main():
    history_path = WORKING / "dream_history.json"
    if not history_path.exists():
        write_placeholder("No history file present. Run analysis a few times first.")
        return

    history = json.loads(history_path.read_text())
    if len(history) < MIN_DREAMS:
        write_placeholder(
            f"Only {len(history)} dream(s) recorded. "
            f"Need at least {MIN_DREAMS} to surface patterns."
        )
        return

    intensities = [
        e["emotion_intensity"] for e in history if e.get("emotion_intensity") is not None
    ]
    symbol_counter = Counter(s for e in history for s in e.get("key_symbols", []))

    output = {
        "dream_count": len(history),
        "date_range": {
            "earliest": history[0].get("timestamp"),
            "latest": history[-1].get("timestamp"),
        },
        "symbol_frequency": symbol_counter.most_common(),
        "emotion_trend": (
            {
                "mean": round(mean(intensities), 2),
                "max": max(intensities),
                "min": min(intensities),
            }
            if intensities
            else None
        ),
        "top_dream_types": Counter(
            e.get("dream_type") for e in history if e.get("dream_type")
        ).most_common(3),
    }

    out_path = WORKING / "pattern_analysis.json"
    out_path.write_text(json.dumps(output, indent=2, ensure_ascii=False))
    print(f"wrote {out_path.name} with {output['dream_count']} dreams analyzed")


def write_placeholder(message):
    out_path = WORKING / "pattern_analysis.json"
    out_path.write_text(
        json.dumps({"status": "insufficient_data", "message": message}, indent=2)
    )
    print(message)


if __name__ == "__main__":
    main()

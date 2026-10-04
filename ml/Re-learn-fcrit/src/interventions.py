import json
import os
import sys
from pathlib import Path
from typing import Dict, Any, Optional

sys.path.insert(0, '.')
from dotenv import load_dotenv

load_dotenv()

_BASE_DIR = Path(__file__).resolve().parent.parent
_CARDS_CACHE = None

def _load_cards():
    global _CARDS_CACHE
    if _CARDS_CACHE is None:
        cards_path = str(_BASE_DIR / 'data' / 'cards.json')
        if os.path.exists(cards_path):
            with open(cards_path, 'r', encoding='utf-8') as f:
                _CARDS_CACHE = json.load(f)
        else:
            _CARDS_CACHE = []
    return _CARDS_CACHE

def get_intervention(misconception_label: str) -> Optional[Dict[str, Any]]:
    """
    Retrieves the targeted pedagogical intervention card for a given misconception.
    
    Args:
        misconception_label: Label string (e.g. 'M01', 'M03', 'M06')
        
    Returns:
        Dict with keys: id, title, belief, why_wrong, counterexample, intervention_type
    """
    cards = _load_cards()
    card = next((c for c in cards if c.get('id') == misconception_label), None)
    if not card:
        return None
        
    return {
        "id": card.get("id"),
        "title": card.get("title"),
        "belief": card.get("belief"),
        "why_wrong": card.get("why_wrong"),
        "counterexample": card.get("counterexample"),
        "intervention_type": card.get("intervention_type", "predict-then-reveal")
    }

def get_trap_item(misconception_label: str) -> Optional[Dict[str, Any]]:
    """
    Retrieves the near-transfer trap item question for a given misconception.
    
    Args:
        misconception_label: Label string (e.g. 'M01', 'M05')
        
    Returns:
        Dict with keys: problem_id, statement, options, correct_index
    """
    cards = _load_cards()
    card = next((c for c in cards if c.get('id') == misconception_label), None)
    if not card or 'trap_item' not in card:
        return None
        
    trap = card['trap_item']
    options_raw = trap.get('options', [])
    options_text = [opt.get('text') for opt in options_raw]
    correct_idx = next((i for i, opt in enumerate(options_raw) if opt.get('correct')), 0)

    return {
        "misconception_id": misconception_label,
        "problem_id": trap.get("problem_id"),
        "statement": trap.get("statement"),
        "options": options_text,
        "correct_index": correct_idx
    }

def personalise(code: str, misconception_label: str) -> str:
    """
    Generates a 2-sentence personalized explanation using Gemini API based on the student's exact code.
    Falls back to a clear static explanation if the API call fails or Gemini is offline.
    """
    intervention = get_intervention(misconception_label)
    if not intervention:
        return "Your code contains a logical error. Review your loop bounds and return statements carefully."

    fallback_text = (
        f"Notice how your code is affected by misconception '{intervention['title']}'. "
        f"{intervention['why_wrong']} For example: {intervention['counterexample']}"
    )

    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        return fallback_text

    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        
        prompt = f"""
You are an encouraging, expert Python programming tutor.
The student submitted this code:
```python
{code}
```
They have demonstrated misconception {misconception_label}: "{intervention['title']}".
Belief: {intervention['belief']}
Why wrong: {intervention['why_wrong']}

In 2 short, friendly, supportive sentences, explain to the student why their specific code line is causing this issue and how to fix it. Do not give away the full final solution code directly.
"""
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        if response and response.text:
            return response.text.strip()
    except Exception:
        pass

    return fallback_text

if __name__ == '__main__':
    # Self-test interventions module
    print("Testing get_intervention('M01'):")
    interv = get_intervention('M01')
    print(json.dumps(interv, indent=2))
    
    print("\nTesting get_trap_item('M01'):")
    trap = get_trap_item('M01')
    print(json.dumps(trap, indent=2))

    print("\nTesting personalise() on M01 code:")
    sample_code = "def sum_to_n(n):\n    total = 0\n    for i in range(n):\n        total += i\n    return total"
    advice = personalise(sample_code, 'M01')
    print("Gemini Advice:", advice)

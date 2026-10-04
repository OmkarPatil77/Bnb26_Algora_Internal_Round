import json
import os
import sys
from pathlib import Path
from typing import Dict, Any, Optional, List

sys.path.insert(0, '.')

_BASE_DIR = Path(__file__).resolve().parent.parent
_CARDS_CACHE = None

def _load_cards() -> List[Dict[str, Any]]:
    global _CARDS_CACHE
    if _CARDS_CACHE is None:
        cards_path = str(_BASE_DIR / 'data' / 'cards.json')
        if os.path.exists(cards_path):
            with open(cards_path, 'r', encoding='utf-8') as f:
                _CARDS_CACHE = json.load(f)
        else:
            _CARDS_CACHE = []
    return _CARDS_CACHE

def get_probe(misconception_label: str) -> Optional[Dict[str, Any]]:
    """
    Retrieves the diagnostic probe question for a given misconception label (e.g. M01 or M02).
    
    Args:
        misconception_label: Misconception ID string (e.g. 'M01', 'M02')
        
    Returns:
        Dict containing question text, options array, and target misconception ID, or None if not found.
    """
    cards = _load_cards()
    for card in cards:
        if card.get('id') == misconception_label:
            probe = card.get('probe')
            if probe:
                return {
                    "misconception_id": misconception_label,
                    "title": card.get('title'),
                    "question": probe.get('question'),
                    "options": [opt.get('text') for opt in probe.get('options', [])]
                }
    return None

def evaluate_probe_answer(misconception_label: str, selected_option_index: int, current_top2: List[Dict[str, float]]) -> Dict[str, Any]:
    """
    Applies posterior probability update based on student's diagnostic probe answer.
    
    Args:
        misconception_label: Primary predicted misconception (e.g. 'M01' or 'M02')
        selected_option_index: Index of option selected by student (0-indexed)
        current_top2: List of top2 probability dicts [{'label': str, 'probability': float}]
        
    Returns:
        Dict with updated predicted_label, updated_top2, and updated_confidence.
    """
    cards = _load_cards()
    card = next((c for c in cards if c.get('id') == misconception_label), None)
    
    if not card or 'probe' not in card:
        return {
            "predicted_label": misconception_label,
            "confidence": current_top2[0]['probability'] if current_top2 else 1.0,
            "updated_top2": current_top2,
            "updated": False
        }
        
    options = card['probe'].get('options', [])
    if selected_option_index < 0 or selected_option_index >= len(options):
        return {
            "predicted_label": misconception_label,
            "confidence": current_top2[0]['probability'] if current_top2 else 1.0,
            "updated_top2": current_top2,
            "updated": False
        }
        
    chosen_option = options[selected_option_index]
    posterior = chosen_option.get('posterior', {})
    
    # If posterior update specified in card
    if posterior:
        # Build updated top2 array
        updated_top2 = []
        for item in current_top2:
            lbl = item['label']
            new_p = posterior.get(lbl, item['probability'])
            updated_top2.append({"label": lbl, "probability": float(round(new_p, 4))})
            
        # Re-sort descending
        updated_top2.sort(key=lambda x: x['probability'], reverse=True)
        top1 = updated_top2[0]
        
        return {
            "predicted_label": top1['label'],
            "confidence": top1['probability'],
            "updated_top2": updated_top2,
            "updated": True
        }

    return {
        "predicted_label": misconception_label,
        "confidence": current_top2[0]['probability'] if current_top2 else 1.0,
        "updated_top2": current_top2,
        "updated": False
    }

if __name__ == '__main__':
    # Self-test probe retrieval & evaluation
    print("Testing get_probe('M01'):")
    probe = get_probe('M01')
    print(json.dumps(probe, indent=2))
    
    print("\nTesting evaluate_probe_answer with option index 1 (student picked '1'):")
    top2_init = [{"label": "M01", "probability": 0.52}, {"label": "M02", "probability": 0.48}]
    eval_res = evaluate_probe_answer('M01', 1, top2_init)
    print(json.dumps(eval_res, indent=2))

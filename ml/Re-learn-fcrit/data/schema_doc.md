# Re:Learn — Dataset Sample JSON Schema Specification

Every verified code sample stored in dataset files (`train.jsonl`, `val.jsonl`, `test.jsonl`, `overlap_set.jsonl`) MUST strictly follow this JSON schema:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "CodeSample",
  "type": "object",
  "required": [
    "id",
    "problem_id",
    "code",
    "label",
    "tests",
    "actual",
    "passed"
  ],
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique identifier for the sample (e.g. sum_to_n_001)"
    },
    "problem_id": {
      "type": "string",
      "description": "Identifier linking to a problem in problems.json (e.g. sum_to_n, average)"
    },
    "problem": {
      "type": "string",
      "description": "Optional copy of the problem description statement"
    },
    "code": {
      "type": "string",
      "description": "The Python source code snippet under test"
    },
    "label": {
      "type": "string",
      "enum": ["M01", "M02", "M03", "M04", "M05", "M06", "M07", "NONE"],
      "description": "Ground truth misconception label or NONE for correct implementation"
    },
    "tests": {
      "type": "object",
      "required": ["inputs", "expected"],
      "properties": {
        "inputs": {
          "type": "array",
          "description": "List of input argument tuples passed to the function"
        },
        "expected": {
          "type": "array",
          "description": "List of expected output values matching each input tuple"
        }
      }
    },
    "actual": {
      "type": "array",
      "description": "List of actual returned values computed dynamically by the Sandbox"
    },
    "passed": {
      "type": "array",
      "items": { "type": "boolean" },
      "description": "List of boolean values indicating pass/fail state for each test case"
    },
    "source": {
      "type": "string",
      "enum": ["verified_dataset", "hand_written", "gemini_generated"],
      "description": "Origin of the code sample"
    }
  }
}
```

#!/usr/bin/env python3
import json
import sys
import subprocess

SESSION_ID = "4bba5049-8581-40bd-aa30-d43775911da5"
BROOKE_EMAIL = "blevine379@gmail.com"

# Get all participants for the session
session_details = subprocess.run(['curl', '-s', f'http://localhost:3001/api/supabase-test/session/{SESSION_ID}/details'], capture_output=True, text=True)
session_data = json.loads(session_details.stdout)
participants = session_data.get('participants', [])
brooke = next((p for p in participants if p.get('email') == BROOKE_EMAIL), None)
if not brooke:
    print("Brooke not found in participants for this session.")
    sys.exit(1)
brooke_id = brooke['id']

# Get all responses for this session
all_responses = subprocess.run(['curl', '-s', f'http://localhost:3001/api/supabase-test/session/{SESSION_ID}/responses'], capture_output=True, text=True)
try:
    responses_data = json.loads(all_responses.stdout)
except Exception as e:
    print("Could not parse responses for session.")
    sys.exit(1)

# Filter for Brooke's Val di Suga scores in this session
val_di_suga_scores = [
    r['answer_json']
    for r in responses_data
    if r['participant_id'] == brooke_id and r.get('slides', {}).get('payload_json', {}).get('wine_name') == 'Val di Suga Rosso di Montalcino' and r.get('slides', {}).get('payload_json', {}).get('question_type') == 'scale'
    and isinstance(r['answer_json'], (int, float))
]

print("Brooke's Val di Suga scores for this session:", val_di_suga_scores)
if val_di_suga_scores:
    print("Average:", sum(val_di_suga_scores) / len(val_di_suga_scores))
else:
    print("No scores found for Brooke for Val di Suga in this session.") 
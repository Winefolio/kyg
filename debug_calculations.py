#!/usr/bin/env python3
import json
import sys
import requests

# Get the session details
response = requests.get("http://localhost:3001/api/supabase-test/session/4bba5049-8581-40bd-aa30-d43775911da5/details")
data = response.json()

print("=== DETAILED CALCULATION BREAKDOWN ===")
print(f"Brooke participant ID: {data.get('brookeParticipantId')}")
print()

for wine in data['wines']:
    print(f"WINE: {wine['wineName']}")
    print(f"  Brooke Score: {wine['brookeScore']}")
    print(f"  Group Average: {wine['groupAverage']}")
    print(f"  Total Participants: {wine['totalParticipants']}")
    print()

# Now let's get the raw data to see how Brooke's scores are calculated
print("=== RAW DATA ANALYSIS ===")
brooke_response = requests.get("http://localhost:3001/api/supabase-test/brooke")
brooke_data = brooke_response.json()

print("Brooke's wine data from the main endpoint:")
for wine_name, wine_data in brooke_data['wineMap'].items():
    print(f"Wine: {wine_name}")
    print(f"  Scores: {wine_data['scores']}")
    print(f"  Average Score: {wine_data['averageScore']}")
    print(f"  Total Ratings: {wine_data['totalRatings']}")
    print() 
import requests
import json
import sys

print("\n==================================================")
print("📡 SENTINEL AI - STREAM MONITOR (FRONTEND MOCK)")
print("==================================================\n")

url = "http://localhost:3001/sse"
print(f"🔌 Connecting to live stream at: {url}")
print("👉 INSTRUCTION: Keep this script running, go to your browser, and click 'Analyze PR'!\n")

try:
    # Establish a real-time streaming line to the backend server
    response = requests.get(url, stream=True, timeout=60)
    print("✅ Connected to streaming core! Awaiting backend data transmission...\n")
    
    for line in response.iter_lines():
        if line:
            decoded_line = line.decode('utf-8').strip()
            
            # Intercept data lines coming down the pipe
            if decoded_line.startswith("data:"):
                raw_json_str = decoded_line.replace("data:", "", 1).strip()
                print("📥 INTERCEPTED BROADCAST PACKET:")
                print("-" * 60)
                try:
                    # Pretty-print the exact JSON structure to inspect the contract mapping
                    parsed_json = json.loads(raw_json_str)
                    print(json.dumps(parsed_json, indent=2))
                except json.JSONDecodeError:
                    print(f"Raw Stream Text: {raw_json_str}")
                print("-" * 60 + "\n")
            else:
                print(f"⚙️ [SSE Protocol]: {decoded_line}")
                
except KeyboardInterrupt:
    print("\n🔌 Stream monitor closed by user.")
except Exception as e:
    print(f"\n❌ Failed to maintain stream link: {e}")
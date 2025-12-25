from http.server import BaseHTTPRequestHandler
import os
import json
import google.generativeai as genai

# Configure Gemini
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # 1. Setup Headers (CORS for local testing and production)
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST,OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

        # 2. Parse Input Data (Goals, Logs, Journal)
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)

        goals = data.get('goals', [])
        logs = data.get('logs', [])
        journal = data.get('journal', {})

        # 3. Construct the Prompt for Gemini
        prompt = f"""
        You are a wise, encouraging, and strict accountability partner.
        Analyze this user's week and give a 3-sentence summary.

        CONTEXT:
        - The user has these goals: {json.dumps(goals)}
        - Recent activity logs: {json.dumps(logs)}
        - Journal entries: {json.dumps(journal)}

        TASK:
        1. Acknowledge one win.
        2. Point out one missing habit or area to improve (be gentle but firm).
        3. End with a short motivating quote or scripture (since they have Faith goals).

        Keep it under 100 words. Speak directly to "Sogo".
        """

        try:
            # 4. Call Gemini
            model = genai.GenerativeModel('gemini-1.5-flash')
            response = model.generate_content(prompt)

            # 5. Return Result
            self.wfile.write(json.dumps({
                "insight": response.text
            }).encode('utf-8'))

        except Exception as e:
            self.wfile.write(json.dumps({
                "error": str(e)
            }).encode('utf-8'))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
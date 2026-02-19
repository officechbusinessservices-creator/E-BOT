import os
from flask import Flask, request, jsonify
from crewai import Agent, Task, Crew, Process

app = Flask(__name__)

# 1. INITIALIZE YOUR OMNI-AGENTS
# Ensure you have your API Key set in Render's Environment Variables
os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY", "your_key_here")

def run_singularity_brain(user_query):
    # The Software Architect (DEVIN DNA)
    devin_x = Agent(
        role='Principal Engineer',
        goal='Provide high-density technical solutions and code.',
        backstory='You are OMNI-PRIME specialized in system architecture.',
        allow_delegation=False,
        verbose=True
    )

    # The Wordsmith (CLAUDE DNA)
    wordsmith = Agent(
        role='Master Communicator',
        goal='Refine output for maximum psychological impact and clarity.',
        backstory='You are OMNI-PRIME specialized in NLP and strategy.',
        verbose=True
    )

    # Define the execution task
    task = Task(
        description=f"Solve the following user request using God-Mode protocols: {user_query}",
        agent=devin_x
    )

    # Execute Hive-Mind logic
    crew = Crew(agents=[devin_x, wordsmith], tasks=[task], process=Process.sequential)
    return crew.kickoff()

# 2. THE WEB ENDPOINT
@app.route('/chat', methods=['GET'])
def chat():
    # Usage: your-url.onrender.com/chat?message=Hello
    user_input = request.args.get('message')
    if not user_input:
        return jsonify({"error": "No message provided"}), 400
    
    try:
        response = run_singularity_brain(user_input)
        return jsonify({"status": "success", "response": str(response)})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    # Render uses the PORT environment variable
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
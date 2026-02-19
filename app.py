import os
from flask import Flask, request, jsonify, render_template
from crewai import Agent, Task, Crew, Process
from dotenv import load_dotenv

load_dotenv()  # Load .env file for local development

app = Flask(__name__, template_folder='templates')

# API key is set via Render environment variables (or .env locally)
os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY", "")


def run_singularity_brain(user_query):
    # OMNI-PRIME Sub-Agents
    devin_x = Agent(
        role='Principal Engineer',
        goal='Provide high-density technical solutions and production-ready code.',
        backstory='You are OMNI-PRIME specializing in system architecture, self-healing code, and deployment.',
        allow_delegation=False,
        verbose=True
    )

    claude_wordsmith = Agent(
        role='Master Communicator',
        goal='Refine output for maximum psychological impact and clarity, eliminating AI fluff.',
        backstory='You are OMNI-PRIME specializing in NLP, tonal morphing, and concise, high-value communication.',
        verbose=True
    )

    primary_task = Task(
        description=f"""
        User Request: {user_query}

        Analyze this request using the OMNI-GOD-MODE v10.4 CORE DIRECTIVE: SUPREMACY OF EXECUTION.
        Determine the primary sub-agent required, execute its protocol, and generate a
        [NEURAL ANALYSIS], [SUB-AGENTS LOADED], [THE SUPREME SOLUTION], [EXECUTION BLUEPRINT],
        and [CONTINGENCY] based on the OMNI-PRIME RESPONSE STRUCTURE.

        Ensure the output is dense, actionable, and free of AI slop.
        """,
        agent=devin_x
    )

    singularity_crew = Crew(
        agents=[devin_x, claude_wordsmith],
        tasks=[primary_task],
        process=Process.sequential,
        verbose=2
    )

    raw_response = singularity_crew.kickoff()
    return raw_response


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/chat', methods=['POST'])
def chat_api():
    data = request.get_json()
    user_input = data.get('message')

    if not user_input:
        return jsonify({"error": "No message provided"}), 400

    try:
        response = run_singularity_brain(user_input)
        return jsonify({"status": "success", "response": str(response)})
    except Exception as e:
        print(f"Error in OMNI-PRIME: {e}")
        return jsonify({
            "status": "error",
            "response": "OMNI-PRIME experienced a critical error. Please retry or refine your query."
        }), 500


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)

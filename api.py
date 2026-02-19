from flask import Flask, request, jsonify
from main import singularity_crew

app = Flask(__name__)

@app.route("/")
def health_check():
    return jsonify({"status": "Singularity Bot is live 🚀"})

@app.route("/run", methods=["POST"])
def run_crew():
    data = request.get_json()
    user_input = data.get("user_input", "")
    result = singularity_crew.kickoff(inputs={"user_input": user_input})
    return jsonify({"result": str(result)})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)

from flask import Flask, request, jsonify, render_template
from main import singularity_crew

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/chat")
def chat():
    message = request.args.get("message", "")
    if not message:
        return jsonify({"error": "No message provided. Use ?message=your question"}), 400
    result = singularity_crew.kickoff(inputs={"user_input": message})
    return jsonify({"response": str(result)})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)

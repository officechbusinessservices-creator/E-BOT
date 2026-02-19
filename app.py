from flask import Flask, render_template, request

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    user_message = request.form['message']
    # Insert logic to handle the user's message and generate a response
    return {'response': 'Your response here'}

if __name__ == '__main__':
    app.run(debug=True)
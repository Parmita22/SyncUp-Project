from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import logging
from Chatbot import get_response, train_model_and_save

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.DEBUG)

INTENTS_FILENAME = os.path.join(os.path.dirname(__file__), 'intents.json')

def update_intents_file(data):
    try:
        with open(INTENTS_FILENAME, 'w') as intents_file:
            json.dump(data, intents_file, indent=4)
        return True, None
    except Exception as e:
        return False, str(e)

@app.route('/api/save_intents', methods=['GET', 'POST'])
def save_intents():
    if request.method == 'POST':
        try:
            data = request.json
            logging.debug(f"Received data for saving intents: {data}")
            success, error = update_intents_file(data)
            if success:
                # Train the model and save it
                train_model_and_save()
                return jsonify({'message': 'Intents data saved successfully'}), 200
            else:
                return jsonify({'error': error}), 500
        except Exception as e:
            logging.error(f"Error saving intents: {e}")
            return jsonify({'error': str(e)}), 500
    elif request.method == 'GET':
        try:
            with open(INTENTS_FILENAME, 'r') as intents_file:
                data = json.load(intents_file)
            logging.debug(f"Sending intents data: {data}")
            return jsonify(data), 200
        except Exception as e:
            logging.error(f"Error reading intents file: {e}")
            return jsonify({'error': str(e)}), 500

@app.route('/api/chatbot', methods=['GET', 'POST'])
def chatbot():
    try:
        if request.method == 'GET':
            user_input = request.args.get('user_input', '')
            topic = request.args.get('topic', '') 
        elif request.method == 'POST':
            data = request.get_json()
            logging.debug(f"Received data for chatbot: {data}")
            user_input = data.get('user_input', '')
            topic = data.get('topic', '') 
        else:
            return jsonify({'message': 'Unsupported request method'}), 400

        if not user_input:
            return jsonify({'error': 'user_input is required'}), 400

        chatbot_response = get_response(user_input, topic)
        logging.debug(f"Chatbot response: {chatbot_response}")
        return jsonify({'message': chatbot_response})
    except Exception as e:
        logging.error(f"Error in chatbot endpoint: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)

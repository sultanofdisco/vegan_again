from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import json
import logging

load_dotenv()

# 로깅 설정 (보안: 에러 상세 정보는 로그에만 기록)
logging.basicConfig(
    filename='app.log',
    level=logging.ERROR,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False
app.config['JSONIFY_MIMETYPE'] = 'application/json; charset=utf-8'
CORS(app)

from routes.search import search_bp
app.register_blueprint(search_bp, url_prefix='/api')

from routes.bookmarks import bookmarks_bp
app.register_blueprint(bookmarks_bp, url_prefix='/api/users')

from routes.location import location_bp
app.register_blueprint(location_bp, url_prefix='/api/users')

@app.route('/')
def home():
    return app.response_class(
        response=json.dumps({
            "message": "비건어게인 백엔드 서버가 실행중입니다.",
            "status": "running"
        }, ensure_ascii=False),
        status=200,
        mimetype='application/json; charset=utf-8'
    )

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "error": "요청하신 API를 찾을 수 없습니다.",
        "status": 404
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        "error": "서버 내부 오류가 발생했습니다.",
        "status": 500
    }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
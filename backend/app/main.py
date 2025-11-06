import json
import os
from flask import Flask, jsonify  # pyright: ignore[reportMissingImports]
from flask_cors import CORS  # pyright: ignore[reportMissingModuleSource]
from dotenv import load_dotenv  # pyright: ignore[reportMissingImports]
load_dotenv()
import os
import logging



logging.basicConfig(
    filename='app.log',
    level=logging.ERROR,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)


from app.auth import auth_bp
from app.config import SECRET_KEY

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False
app.config['JSONIFY_MIMETYPE'] = 'application/json; charset=utf-8'
CORS(app, resources={r"/api/*": {"origins": os.getenv('FRONTEND_ORIGIN', 'http://localhost:5173')}}, supports_credentials=True)
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = False

# 세션을 위한 secret key 설정
app.config['SECRET_KEY'] = SECRET_KEY

# Blueprint 등록
app.register_blueprint(auth_bp)

from app.routes.search import search_bp
app.register_blueprint(search_bp, url_prefix='/api')

from app.routes.bookmarks import bookmarks_bp
app.register_blueprint(bookmarks_bp, url_prefix='/api/users')

from app.routes.location import location_bp
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
    return jsonify({  # pyright: ignore[reportUndefinedVariable]
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

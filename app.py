"""
シンプルなTodo REST API (Flask)
Claude + GitHub CI/CD デモ用サンプルアプリ
"""
from flask import Flask, jsonify, request

app = Flask(__name__)

# インメモリDB
todos = []
_next_id = 1


def _new_id():
    global _next_id
    current = _next_id
    _next_id += 1
    return current


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


@app.get("/todos")
def list_todos():
    return jsonify(todos)


@app.post("/todos")
def create_todo():
    body = request.get_json(silent=True) or {}
    title = body.get("title", "").strip()
    if not title:
        return jsonify({"error": "title is required"}), 400
    todo = {"id": _new_id(), "title": title, "done": False}
    todos.append(todo)
    return jsonify(todo), 201


@app.get("/todos/<int:todo_id>")
def get_todo(todo_id):
    todo = next((t for t in todos if t["id"] == todo_id), None)
    if todo is None:
        return jsonify({"error": "not found"}), 404
    return jsonify(todo)


@app.patch("/todos/<int:todo_id>")
def update_todo(todo_id):
    todo = next((t for t in todos if t["id"] == todo_id), None)
    if todo is None:
        return jsonify({"error": "not found"}), 404
    body = request.get_json(silent=True) or {}
    if "title" in body:
        todo["title"] = body["title"].strip() or todo["title"]
    if "done" in body:
        todo["done"] = bool(body["done"])
    return jsonify(todo)


@app.delete("/todos/<int:todo_id>")
def delete_todo(todo_id):
    global todos
    before = len(todos)
    todos = [t for t in todos if t["id"] != todo_id]
    if len(todos) == before:
        return jsonify({"error": "not found"}), 404
    return "", 204


if __name__ == "__main__":
    app.run(debug=True)

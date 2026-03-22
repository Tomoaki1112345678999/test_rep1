import pytest
from app import app, todos


@pytest.fixture(autouse=True)
def reset_state():
    """各テスト前にDB・IDをリセット"""
    todos.clear()
    import app as app_module
    app_module._next_id = 1
    yield


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.get_json()["status"] == "ok"


def test_list_todos_empty(client):
    r = client.get("/todos")
    assert r.status_code == 200
    assert r.get_json() == []


def test_create_todo(client):
    r = client.post("/todos", json={"title": "買い物"})
    assert r.status_code == 201
    data = r.get_json()
    assert data["title"] == "買い物"
    assert data["done"] is False
    assert "id" in data


def test_create_todo_missing_title(client):
    r = client.post("/todos", json={})
    assert r.status_code == 400


def test_get_todo(client):
    client.post("/todos", json={"title": "読書"})
    r = client.get("/todos/1")
    assert r.status_code == 200
    assert r.get_json()["title"] == "読書"


def test_get_todo_not_found(client):
    r = client.get("/todos/999")
    assert r.status_code == 404


def test_update_todo(client):
    client.post("/todos", json={"title": "運動"})
    r = client.patch("/todos/1", json={"done": True})
    assert r.status_code == 200
    assert r.get_json()["done"] is True


def test_delete_todo(client):
    client.post("/todos", json={"title": "料理"})
    r = client.delete("/todos/1")
    assert r.status_code == 204
    assert client.get("/todos/1").status_code == 404


def test_delete_todo_not_found(client):
    r = client.delete("/todos/999")
    assert r.status_code == 404

#!/usr/bin/env python3
"""
Claude Issue トリアージスクリプト
新しいIssueをClaudeが分析し、ラベル付けとウェルカムコメントを投稿する

必要な環境変数:
  ANTHROPIC_API_KEY  - Anthropic APIキー
  GITHUB_TOKEN       - GitHub Actions トークン
  GITHUB_REPOSITORY  - リポジトリ (例: owner/repo)
  ISSUE_NUMBER       - Issue番号
"""
import os
import sys
import json
import anthropic
from github import Github, GithubException

AVAILABLE_LABELS = {
    "bug": "バグ報告",
    "enhancement": "機能追加・改善要望",
    "question": "質問",
    "documentation": "ドキュメント関連",
    "good first issue": "初心者向け",
    "help wanted": "助けが必要",
    "duplicate": "重複",
    "wontfix": "対応しない",
}

SYSTEM_PROMPT = """あなたはGitHubプロジェクトのメンテナーです。
Issueを分析して以下のJSONを返してください（他のテキストは不要）:

{
  "labels": ["ラベル名のリスト"],
  "priority": "high|medium|low",
  "summary": "Issue内容の1行要約（日本語）",
  "response": "投稿するウェルカムコメント（日本語・Markdown）"
}

利用可能なラベル: bug, enhancement, question, documentation, good first issue, help wanted, duplicate, wontfix

responseには以下を含めてください:
- 報告・リクエストへの感謝
- 内容の簡単な確認・理解
- 次のステップや期待するアクション
- 必要な場合は追加情報のリクエスト"""


def triage_with_claude(title: str, body: str) -> dict:
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    user_message = f"""## Issue情報
**タイトル**: {title}
**本文**:
{body or "(本文なし)"}

このIssueをトリアージしてJSONで返してください。"""

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    text = response.content[0].text.strip()
    # JSONブロック抽出
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[1].split("```")[0].strip()

    return json.loads(text)


def ensure_labels_exist(repo, label_names: list[str]):
    """存在しないラベルをリポジトリに作成する"""
    existing = {lb.name for lb in repo.get_labels()}
    colors = {
        "bug": "d73a4a",
        "enhancement": "a2eeef",
        "question": "d876e3",
        "documentation": "0075ca",
        "good first issue": "7057ff",
        "help wanted": "008672",
        "duplicate": "cfd3d7",
        "wontfix": "ffffff",
    }
    for name in label_names:
        if name not in existing:
            try:
                repo.create_label(
                    name=name,
                    color=colors.get(name, "ededed"),
                    description=AVAILABLE_LABELS.get(name, ""),
                )
                print(f"ラベル作成: {name}")
            except GithubException:
                pass  # 競合などは無視


def main():
    required_vars = ["ANTHROPIC_API_KEY", "GITHUB_TOKEN", "GITHUB_REPOSITORY", "ISSUE_NUMBER"]
    for var in required_vars:
        if not os.environ.get(var):
            print(f"ERROR: 環境変数 {var} が設定されていません")
            sys.exit(1)

    repo_name = os.environ["GITHUB_REPOSITORY"]
    issue_number = int(os.environ["ISSUE_NUMBER"])

    gh = Github(os.environ["GITHUB_TOKEN"])
    repo = gh.get_repo(repo_name)
    issue = repo.get_issue(issue_number)

    print(f"Issue #{issue_number}: {issue.title} をトリアージ中...")

    result = triage_with_claude(issue.title, issue.body or "")
    print(f"分析結果: {result}")

    # ラベルを作成してから付与
    labels = [l for l in result.get("labels", []) if l in AVAILABLE_LABELS]
    if labels:
        ensure_labels_exist(repo, labels)
        issue.add_to_labels(*labels)
        print(f"ラベル付与: {labels}")

    # ウェルカムコメント投稿
    priority_badge = {"high": "🔴 高", "medium": "🟡 中", "low": "🟢 低"}.get(
        result.get("priority", "medium"), "🟡 中"
    )
    comment = (
        f"## 🤖 Claude による自動トリアージ\n\n"
        f"**優先度**: {priority_badge}\n"
        f"**概要**: {result.get('summary', '')}\n\n"
        f"---\n\n"
        f"{result.get('response', 'ご報告ありがとうございます。')}\n\n"
        f"---\n*このコメントはClaude (claude-opus-4-6) が自動生成しました*"
    )
    issue.create_comment(comment)
    print("トリアージコメントを投稿しました")


if __name__ == "__main__":
    main()

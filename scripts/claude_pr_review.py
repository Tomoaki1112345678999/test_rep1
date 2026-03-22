#!/usr/bin/env python3
"""
Claude PR レビュースクリプト
GitHub Actions から呼び出され、PRのdiffをClaudeがレビューしてコメントを投稿する

必要な環境変数:
  ANTHROPIC_API_KEY  - Anthropic APIキー
  GITHUB_TOKEN       - GitHub Actions トークン
  GITHUB_REPOSITORY  - リポジトリ (例: owner/repo)
  PR_NUMBER          - PR番号
"""
import os
import sys
import anthropic
from github import Github

SYSTEM_PROMPT = """あなたは経験豊富なシニアソフトウェアエンジニアです。
PRのdiffをレビューして、以下の観点でフィードバックを日本語で提供してください：

1. **バグ・ロジックの問題**: 明らかな誤りや潜在的なバグ
2. **セキュリティ**: SQLインジェクション・XSS・認証不備など
3. **コード品質**: 可読性・保守性・重複コード
4. **パフォーマンス**: 明らかに非効率な処理
5. **良い点**: 積極的に評価すべき実装

重要度を 🔴 重大 / 🟡 改善推奨 / 🟢 提案 で示してください。
diffがない・軽微な変更の場合は「問題なし」と簡潔に回答してください。"""


def get_pr_diff(repo, pr_number: int) -> str:
    pr = repo.get_pull(pr_number)
    files = pr.get_files()
    diff_parts = []
    for f in files:
        diff_parts.append(f"### {f.filename} ({f.status})")
        if f.patch:
            diff_parts.append(f"```diff\n{f.patch}\n```")
    return "\n\n".join(diff_parts) if diff_parts else "変更ファイルなし"


def review_with_claude(diff: str, pr_title: str, pr_body: str) -> str:
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    user_message = f"""## PR情報
**タイトル**: {pr_title}
**説明**: {pr_body or "(説明なし)"}

## 変更内容 (diff)
{diff}

上記のPRをレビューしてください。"""

    with client.messages.stream(
        model="claude-opus-4-6",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    ) as stream:
        return stream.get_final_message().content[0].text


def post_review_comment(repo, pr_number: int, review: str):
    pr = repo.get_pull(pr_number)
    body = f"## 🤖 Claude コードレビュー\n\n{review}\n\n---\n*このレビューはClaude (claude-opus-4-6) が自動生成しました*"
    pr.create_issue_comment(body)
    print("レビューコメントを投稿しました")


def main():
    required_vars = ["ANTHROPIC_API_KEY", "GITHUB_TOKEN", "GITHUB_REPOSITORY", "PR_NUMBER"]
    for var in required_vars:
        if not os.environ.get(var):
            print(f"ERROR: 環境変数 {var} が設定されていません")
            sys.exit(1)

    repo_name = os.environ["GITHUB_REPOSITORY"]
    pr_number = int(os.environ["PR_NUMBER"])

    gh = Github(os.environ["GITHUB_TOKEN"])
    repo = gh.get_repo(repo_name)
    pr = repo.get_pull(pr_number)

    print(f"PR #{pr_number}: {pr.title} をレビュー中...")
    diff = get_pr_diff(repo, pr_number)
    print(f"diff取得完了 ({len(diff)} 文字)")

    review = review_with_claude(diff, pr.title, pr.body or "")
    print("Claude レビュー完了")

    post_review_comment(repo, pr_number, review)


if __name__ == "__main__":
    main()

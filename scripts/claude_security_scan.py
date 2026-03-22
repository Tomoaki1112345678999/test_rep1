#!/usr/bin/env python3
"""
Claude セキュリティスキャンスクリプト
プッシュされたコードをClaudeがセキュリティ観点でレビューし、
問題があればPRコメントまたは標準出力に報告する

必要な環境変数:
  ANTHROPIC_API_KEY  - Anthropic APIキー
  GITHUB_TOKEN       - GitHub Actionsトークン（PR時のみ必要）
  GITHUB_REPOSITORY  - リポジトリ (例: owner/repo)
  PR_NUMBER          - PR番号（オプション、なければstdout出力）
  SCAN_PATHS         - スキャン対象パス（カンマ区切り、デフォルト: "."）
"""
import os
import sys
import glob
import anthropic

EXTENSIONS = {".py", ".js", ".ts", ".go", ".rb", ".php", ".java"}

SYSTEM_PROMPT = """あなたはセキュリティ専門のコードレビュアーです。
提供されたコードをOWASP Top 10を中心にセキュリティ観点で分析してください。

以下の形式で報告してください：

## セキュリティスキャン結果

### 🔴 重大な問題 (即座に修正が必要)
- ファイル名:行番号 - 問題の説明と修正方法

### 🟡 中程度の問題 (早期対応を推奨)
- ファイル名:行番号 - 問題の説明と修正方法

### 🟢 軽微な問題・改善提案
- ファイル名:行番号 - 問題の説明

### ✅ 良い実装
- 確認できたセキュリティ対策

問題がない場合: `✅ セキュリティ上の問題は検出されませんでした` と記載してください。

チェック観点:
- SQLインジェクション
- XSS (クロスサイトスクリプティング)
- コマンドインジェクション
- パストラバーサル
- 認証・認可の不備
- 機密情報のハードコード (APIキー・パスワード等)
- 安全でない依存関係の使用
- 不適切なエラーハンドリング（スタックトレースの漏洩等）"""


def collect_source_files(scan_paths: list[str]) -> dict[str, str]:
    """スキャン対象ファイルの内容を収集する"""
    files = {}
    skip_dirs = {".git", "node_modules", "__pycache__", ".venv", "venv", "dist", "build"}

    for base_path in scan_paths:
        for root, dirs, filenames in os.walk(base_path):
            # スキップするディレクトリを除外
            dirs[:] = [d for d in dirs if d not in skip_dirs]
            for fname in filenames:
                ext = os.path.splitext(fname)[1].lower()
                if ext not in EXTENSIONS:
                    continue
                full_path = os.path.join(root, fname)
                try:
                    with open(full_path, encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                    if content.strip():
                        files[full_path] = content
                except OSError:
                    pass
    return files


def scan_with_claude(source_files: dict[str, str]) -> str:
    if not source_files:
        return "✅ スキャン対象のソースファイルが見つかりませんでした"

    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    # ファイル内容を結合（大きすぎる場合は最初の部分のみ）
    parts = []
    total_chars = 0
    max_chars = 80000  # コンテキスト制限への配慮

    for path, content in source_files.items():
        snippet = f"### {path}\n```\n{content[:3000]}\n```"
        if total_chars + len(snippet) > max_chars:
            parts.append(f"### {path}\n*(ファイルが大きすぎるため省略)*")
            break
        parts.append(snippet)
        total_chars += len(snippet)

    code_content = "\n\n".join(parts)
    file_count = len(source_files)

    user_message = f"""以下の{file_count}個のファイルをセキュリティ観点でスキャンしてください。

{code_content}"""

    with client.messages.stream(
        model="claude-opus-4-6",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    ) as stream:
        return stream.get_final_message().content[0].text


def post_to_pr(report: str):
    """PRにセキュリティスキャン結果をコメントする"""
    from github import Github

    repo_name = os.environ["GITHUB_REPOSITORY"]
    pr_number = int(os.environ["PR_NUMBER"])
    gh = Github(os.environ["GITHUB_TOKEN"])
    repo = gh.get_repo(repo_name)
    pr = repo.get_pull(pr_number)

    body = (
        f"## 🔒 Claude セキュリティスキャン結果\n\n"
        f"{report}\n\n"
        f"---\n*このスキャンはClaude (claude-opus-4-6) が自動実行しました*"
    )
    pr.create_issue_comment(body)
    print("セキュリティスキャン結果をPRに投稿しました")


def main():
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("ERROR: ANTHROPIC_API_KEY が設定されていません")
        sys.exit(1)

    scan_paths_str = os.environ.get("SCAN_PATHS", ".")
    scan_paths = [p.strip() for p in scan_paths_str.split(",") if p.strip()]

    print(f"スキャン対象: {scan_paths}")
    source_files = collect_source_files(scan_paths)
    print(f"{len(source_files)} ファイルを検出")

    report = scan_with_claude(source_files)
    print("\n--- セキュリティスキャン結果 ---")
    print(report)
    print("--- ここまで ---\n")

    # PRがある場合はPRにコメント投稿
    if os.environ.get("PR_NUMBER") and os.environ.get("GITHUB_TOKEN"):
        post_to_pr(report)

    # 重大な問題がある場合はexit code 1を返す
    if "🔴 重大な問題" in report and "なし" not in report:
        print("WARNING: 重大なセキュリティ問題が検出されました")
        sys.exit(1)


if __name__ == "__main__":
    main()

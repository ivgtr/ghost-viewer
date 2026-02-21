# ghost-viewer

伺か（ukagaka）ゴーストの NAR ファイルをブラウザ上で展開・可視化し、会話パターンをツリー構造として分析する SPA ツール。

**Stack**: TypeScript / React 19 / Vite 6 / Zustand / React Flow / JSZip / CodeMirror 6 / Tailwind CSS 4 / Vitest / Biome

## Principles

- 破壊的変更を厭わない。後方互換性のためのマイグレーションコードは不要
- DRY 原則と単一責任の原則を最優先し、コードをシンプルに保つ
- 品質に拘る。動けばよいではなく、正しく・簡潔に書く

## Commands

```bash
pnpm run dev               # 開発サーバー起動
pnpm run build             # プロダクションビルド
pnpm run test              # テスト全実行
pnpm run test -- path      # 単一テストファイル実行
pnpm run lint              # lint + format チェック
pnpm run lint:fix          # lint + format 自動修正
```

## Code Style

### 言語規約
- ESM（import/export）のみ使用。CJS（require）は禁止
- 型定義は `interface` を優先。ユニオン型やマップ型が必要な場合のみ `type` を使用
- import 順序: 1) React/外部ライブラリ → 2) `@/`エイリアスの内部モジュール → 3) 相対パス → 4) 型インポート（`type` キーワード付き）
- ファイル名: コンポーネントは PascalCase（`FileTree.tsx`）、それ以外は kebab-case（`sakura-script.ts`）
- 変数・関数名: camelCase。型・インターフェース名: PascalCase。定数: UPPER_SNAKE_CASE

### プロジェクトパターン
- 状態管理: Zustand ストア（`src/stores/`）。コンポーネント外（Worker コールバック等）からも操作可能
- ビジネスロジック: `src/lib/` に React 非依存で配置。コンポーネントにロジックを書かない
- 解析処理: Web Worker（`src/workers/`）でオフメインスレッド実行。メインスレッド ↔ Worker 間は postMessage
- ディレクトリ配置:
  - `src/components/` — React UI コンポーネント（機能ごとにサブディレクトリ）
  - `src/lib/` — ビジネスロジック（nar/, parsers/, sakura-script/, analyzers/）
  - `src/stores/` — Zustand ストア
  - `src/types/` — 共有型定義
  - `src/workers/` — Web Worker
  - `tests/` — テストファイル

## Testing

- フレームワーク: Vitest
- テストファイル: `tests/` ディレクトリ配下に `*.test.ts` で配置
- 新しいモジュール（`src/lib/` 配下）には必ずユニットテストを作成する
- アサーション: Vitest 組み込みの `expect` を使用
- テストが失敗した場合、テストコードではなく実装を修正する

## Git / Workflow

- ブランチ命名: `feature/タスク名`（例: `feature/project-scaffolding`）
- コミットメッセージ: 英語で記述。形式: `type: description`（例: `feat: add NAR file validation`）
  - type: feat / fix / refactor / test / docs / chore
- 実装前に `.docs/ROADMAP.md` を確認し、次のタスクと依存関係を把握する
- タスク詳細は `.docs/tasks/XXX-task-name.md` を参照する
- ROADMAP のタスク完了時、チェックボックスを `[x]` に更新する

## Architecture Pointers

詳細は `.docs/ARCHITECTURE.md` を参照。

- **UI層 ↔ ロジック層の境界**: 状態変更はストアアクション経由で行う。ビュー変換（副作用のない純粋関数）は `src/lib/` から直接 import して `useMemo` 等で使用可
- **Worker 境界**: 解析処理（パーサー・トークナイザー）は Worker 内で実行。入力は ArrayBuffer、出力は JSON シリアライズ可能なオブジェクト

## Tool Usage

- Bash ツールで `#` コメントをコマンド内に含めない。説明は `description` パラメータに記載する（改行を含むコマンドはセキュリティプロンプトが発生するため）
- ファイル読み取りは `Read`、ファイル検索は `Glob`、内容検索は `Grep` を使い、`cat` / `find` / `grep` の Bash 実行は避ける

## Do NOT

- `any` 型を使用しない。`unknown` + 型ガードで対処する
- `console.log` をコミットしない（デバッグ用は作業中のみ）
- `dangerouslySetInnerHTML` / `innerHTML` を使用しない（XSS 防止）
- 既存のテストを削除・スキップ（`.skip` / `.only`）しない
- `.docs/ROADMAP.md` に記載のない機能を勝手に追加しない
- 外部 API への通信を追加しない（クライアントサイド完結）
- `<object>` / `<embed>` / `<iframe>` タグを使用しない
- サーバーへのデータ送信処理を実装しない

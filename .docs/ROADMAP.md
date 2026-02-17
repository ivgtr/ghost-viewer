# ROADMAP.md

## 1. Project Overview

ghost-viewer は、伺か（ukagaka）ゴーストの NAR ファイルをブラウザ上で展開・可視化する SPA ツールである。SHIORI 言語（YAYA / Satori / Kawari）で記述された会話スクリプトをカタログ化し、会話パターンや分岐構造のインサイトを得ることを目的とする。技術スタックは TypeScript / React / Vite / Zustand / JSZip / CodeMirror 6 / Tailwind CSS で構成され、GitHub Pages にデプロイする。

---

## 2. Development Workflow

プロジェクト全体を通じて以下の開発フローを守る：

1. **タスク計画** — ROADMAP.md を確認し、次に着手すべきタスクを選ぶ（依存関係とPhase順を尊重）
2. **ブランチ作成** — `feature/タスク名` でブランチを切る（例: `feature/project-scaffolding`）
3. **実装** — `tasks/` 配下の計画ファイルに従って実装する
4. **検証** — ビルド（`npm run build`）・リント（`npx biome check`）・テスト（`npx vitest run`）をすべてパス
5. **レビュー** — 差分を確認し、コミット・main へマージ
6. **ステータス更新** — ROADMAP.md の該当タスクのチェックボックスを `[x]` に更新

---

## 3. Milestones

### Phase 1: Foundation ✅ Complete
目標: プロジェクトの土台を構築し、NARファイルの読み込みからファイルツリー表示までの開発ループを確立する

**実装済みモジュール:**
- `src/lib/nar/` — NAR バリデーション・展開・ファイルツリー構築
- `src/lib/encoding/` — UTF-8 / Shift_JIS / EUC-JP 自動判別
- `src/stores/` — ghost-store, file-tree-store, file-content-store, parse-store
- `src/components/file-tree/` — DropZone, FileTree, FileTreeNode, FileTreeIcon
- `src/components/script-viewer/` — TextViewer（行番号付きプレーンテキスト表示）
- `src/components/common/` — Layout（3ペイン）

- [x] **プロジェクト初期化** [S] — Vite + React + TypeScript scaffolding、Tailwind CSS 4.x、Biome 設定、Vitest 設定、基本的な App.tsx
- [x] **GitHub Actions デプロイ設定** [S] — deploy.yml ワークフロー、404.html SPA リダイレクト、dependabot.yml
  - 依存: プロジェクト初期化
- [x] **共有型定義** [S] — NarFile, FileTreeNode, ShioriType, ParseResult 等の型定義ファイル（`src/types/`）
- [x] **Zustand ストア定義** [S] — fileTreeStore, parseStore, ghostStore の初期実装
  - 依存: 共有型定義
- [x] **3ペインレイアウト** [M] — リサイズ可能なスプリッター付きの左・中央・右ペインレイアウト
  - 依存: プロジェクト初期化
- [x] **DropZone + NARバリデーション** [M] — ドラッグ&ドロップ / ファイル選択 UI、サイズ・エントリ数・パストラバーサル検証
  - 依存: 共有型定義
- [x] **JSZip展開 + 仮想ファイルツリー構築** [M] — NAR を JSZip で展開し、メモリ上のファイルツリーを構築してストアに格納
  - 依存: Zustand ストア定義, DropZone + NARバリデーション
- [x] **ファイルツリーコンポーネント** [M] — 左ペインにディレクトリ構造をツリー表示、折りたたみ、ファイル種類別アイコン
  - 依存: JSZip展開 + 仮想ファイルツリー構築, 3ペインレイアウト
- [x] **テキストファイルビューアー** [S] — 中央ペインでプレーンテキスト表示、行番号付き、エンコーディング自動判別（Shift_JIS / EUC-JP / UTF-8）
  - 依存: ファイルツリーコンポーネント

### Phase 2: Parsing Engine ✅ Complete
目標: SHIORI言語のパースとSakuraScriptのトークナイズを実装し、会話データの構造化を実現する

**対象ディレクトリ:** `src/lib/parsers/`, `src/lib/sakura-script/`, `src/workers/`
**未インストール依存:** なし（純粋な TypeScript ロジック）

- [x] **descript.txt パーサー** [S] — key=value 形式のメタ情報抽出、ゴースト名・作者・キャラクター名の取得
- [x] **SHIORI言語自動判別** [S] — 同梱 DLL 名と .dic ファイルパターンから YAYA / Satori / Kawari を推定
  - 依存: descript.txt パーサー
- [x] **SakuraScript トークナイザー** [M] — SakuraScript タグ（`\0`, `\1`, `\s[]`, `\q[]`, `\![raise]` 等）をトークン配列に分解
- [x] **Web Worker 解析基盤** [M] — Worker の定義、メインスレッドとの postMessage 通信、プログレス通知、タイムアウト制御
- [x] **YAYA 辞書パーサー** [L] — 関数定義・変数・制御構文のパース、ランダム選択（複数 Return 文）の検出、イベント抽出
  - 依存: SakuraScript トークナイザー, Web Worker 解析基盤
- [x] **Satori 辞書パーサー** [M] — キーワードトリガーと応答パターンのペア抽出、文字コード処理
  - 依存: SakuraScript トークナイザー, Web Worker 解析基盤

### Phase 3: Conversation Catalog ✅ Complete
目標: NAR 内の全 .dic を一括パースし、会話カタログとして一覧表示する。イベント検索とダイアログバリエーション閲覧を提供する

**対象ディレクトリ:** `src/components/catalog/`, `src/stores/`, `src/lib/analyzers/`, `src/lib/workers/`
**未インストール依存:** なし

- [x] **全 .dic 一括パース** [L] — NAR 読み込み完了時に全 .dic を自動パース、統合 `DicFunction[]` を構築
  - 依存: Web Worker 解析基盤, YAYA 辞書パーサー, Satori 辞書パーサー
- [x] **会話カタログ構築** [M] — 統合された `DicFunction[]` を `buildCatalogEntries` でカタログ化。同名関数マージ・プレビュー生成・ダイアログ数カウント
  - 依存: 全 .dic 一括パース
- [x] **会話カタログ UI** [M] — 中央ペインにイベント一覧表示、検索バー、選択状態管理
  - 依存: 会話カタログ構築

### Phase 4: Conversation Preview — 3/4
目標: 選択したイベントの会話内容をプレビューし、choice ボタンでインタラクティブに探索する

**対象ディレクトリ:** `src/components/conversation-preview/`
**未インストール依存:** なし

- [x] **会話プレビューパネル** [M] — イベント選択時に右ペインで会話内容を再現表示
  - 依存: 会話カタログ UI
- [x] **パスナビゲーション** [M] — choice ボタンクリックによるイベント遷移で会話パスを探索
  - 依存: 会話プレビューパネル
- [ ] **サーフェスサムネイル** [S] — `\s[N]` に対応する surface 画像を表示
  - 依存: 会話プレビューパネル
- [ ] **ソースコードジャンプ** [S] — イベントから .dic ファイル・行番号へジャンプ
  - 依存: 会話プレビューパネル
- [ ] **YAYA 変数の可視化** [S] — `%(...)` 式をトークナイザーで認識し、会話プレビューで視覚的に区別表示
  - 依存: 会話プレビューパネル
- [ ] **会話カタログのカテゴリ分類** [S] — イベントを「ランダムトーク」「起動・終了」等のカテゴリでグルーピング表示
  - 依存: 会話カタログ UI

### Phase 5: Extension — 0/6
目標: 対応 SHIORI の拡張と、分析・比較・可視化機能の強化

- [ ] **Kawari 辞書パーサー** [M] — エントリーベースの key/value 解析、バージョン差異への対応
  - 依存: SakuraScript トークナイザー, Web Worker 解析基盤
- [ ] **CodeMirror 6 統合** [M] — 右ペイン補助機能としてのコードビュー、行番号表示、基本的なテキスト検索
  - 依存: ソースコードジャンプ
- [ ] **SakuraScript シンタックスハイライト定義** [M] — CodeMirror 用カスタム言語定義、キャラ切替 / サーフェス / 選択肢 / イベントの色分け
  - 依存: CodeMirror 6 統合
- [ ] **検索・フィルター** [M] — テキスト全文検索、高度なフィルタリング
  - 依存: 会話カタログ UI
- [ ] **統計ダッシュボード** [M] — SHIORI 種別、ファイル統計、会話パターン統計の表示
  - 依存: 全 .dic 一括パース
- [ ] **サーフェス使用頻度ヒートマップ** [M] — どの表情がどの頻度で使われるかの可視化
  - 依存: サーフェスサムネイル

---

## 4. Task Detail Convention

各タスクの詳細計画は `.docs/tasks/XXX-task-name.md` に記述する。ファイル名の `XXX` は ROADMAP のタスク順序に対応する連番（例: `001-project-scaffolding.md`）。

### テンプレート

```markdown
# Task: [タスク名]

## 目的
このタスクで達成すること

## 実装ステップ
1. ...
2. ...
3. ...

## 完了条件
- [ ] ビルドが通る
- [ ] テストが通る
- [ ] lint エラーがない

## 関連ファイル
- src/...
- tests/...

## 注意点・制約
- ...
```

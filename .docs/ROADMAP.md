# ROADMAP.md

## 1. Project Overview

ghost-viewer は、伺か（ukagaka）ゴーストの NAR ファイルをブラウザ上で展開・可視化する SPA ツールである。SHIORI 言語（YAYA / Satori）で記述された会話スクリプトをカタログ化し、会話パターンや分岐構造のインサイトを得ることを目的とする。技術スタックは TypeScript / React / Vite / Zustand / JSZip / CodeMirror 6 / Tailwind CSS で構成され、GitHub Pages にデプロイする。

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
- [x] **SHIORI言語自動判別** [S] — 同梱 DLL 名と .dic ファイルパターンから YAYA / Satori を推定（Kawari は現行方針で unknown 扱い）
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

### Phase 4: Conversation Preview ✅ Complete
目標: 選択したイベントの会話内容をプレビューし、choice ボタンでインタラクティブに探索する

**対象ディレクトリ:** `src/components/conversation-preview/`
**未インストール依存:** なし

- [x] **会話プレビューパネル** [M] — イベント選択時に右ペインで会話内容を再現表示
  - 依存: 会話カタログ UI
- [x] **パスナビゲーション** [M] — choice ボタンクリックによるイベント遷移で会話パスを探索
  - 依存: 会話プレビューパネル
- ~~**サーフェスサムネイル** [S]~~ — Phase 6「ゴースト表示」に吸収。会話連動サーフェス切替として再設計
- [x] **ソースコードジャンプ** [S] — イベントから .dic ファイル・行番号へジャンプ
  - 依存: 会話プレビューパネル
- [x] **YAYA 変数の可視化** [S] — `%(...)` 式をトークナイザーで認識し、会話プレビューで視覚的に区別表示
  - 依存: 会話プレビューパネル
- [x] **会話カタログのカテゴリ分類** [S] — イベントを「ランダムトーク」「起動・終了」等のカテゴリでグルーピング表示
  - 依存: 会話カタログ UI

### Phase 5: AST Parser Architecture ✅ Complete
目標: 現代的なコンパイラ設計に基づく AST ベースのパーサーパイプラインを導入し、完全なシンボル解決を実現する

**対象ディレクトリ:** `src/lib/parsers/`
**設計方針:** Lexer → Parser → AST → Semantic Analyzer の多段パイプライン、Visitor パターンによる AST 走査、シンボルテーブルによるスコープ管理

- [x] **共通 AST 型定義** [M] — `core/ast.ts` に BaseNode, Program, FunctionDef, VariableDecl, Identifier, StringLiteral 等の共通 AST ノード型を定義
  - 依存: なし
- [x] **シンボルテーブル + スコープ管理** [M] — `core/symbol-table.ts` に Symbol, Scope インターフェース、スコープチェーン、シンボル登録・検索ロジックを実装
  - 依存: 共通 AST 型定義
- [x] **Visitor パターン基盤** [S] — `core/visitor.ts` に AST Visitor インターフェース、トラバーサルユーティリティを定義
  - 依存: 共通 AST 型定義
- [x] **YAYA AST パーサー** [L] — `yaya/parser.ts` で再帰下降パーサーを実装、トークン列から YAYA 固有 AST を生成
  - 依存: 共通 AST 型定義
- [x] **YAYA 意味解析・シンボル解決** [L] — `yaya/semantic.ts` で関数定義・変数宣言・変数参照のシンボル登録と解決、スコープチェーン構築
  - 依存: YAYA AST パーサー, シンボルテーブル + スコープ管理, Visitor パターン基盤
- [x] **Satori AST パーサー** [M] — `satori/parser.ts` で Satori 固有構文（イベントブロック、単語群）の AST 生成
  - 依存: 共通 AST 型定義
- [x] **Satori 意味解析** [M] — `satori/semantic.ts` でイベント名、$(変数) 参照のシンボル解決
  - 依存: Satori AST パーサー, シンボルテーブル + スコープ管理
- [x] **Kawari AST パーサー** [M] — `kawari/parser.ts` でエントリーベース構文の AST 生成（履歴項目。現行は非対応、将来は Phase 8 で再対応）
  - 依存: 共通 AST 型定義

### Phase 6: Extension — 4/8
目標: 対応 SHIORI の拡張と、分析・比較・可視化機能の強化

- [x] **Satori Lexer/Parser 分離** [S] — YAYA と同様の Lexer/Parser 2層構造にリファクタリング、ブロックコメント対応
  - 依存: Satori 辞書パーサー
- [x] **Worker 解析リクエスト単一路化** [S] — `WorkerRequest` の `type: "parse"` を廃止し、解析リクエストを SHIORI ごとの明示バッチ API に統一
  - 依存: Web Worker 解析基盤, 全 .dic 一括パース, Satori 辞書パーサー
- [x] **Kawari 意味解析** [M] — `kawari/semantic.ts` でエントリ名、${変数} 参照のシンボル解決（履歴項目。現行は非対応、将来は Phase 8 で再対応）
  - 依存: Kawari AST パーサー, シンボルテーブル + スコープ管理
- [ ] **CodeMirror 6 統合** [M] — 右ペイン補助機能としてのコードビュー、行番号表示、基本的なテキスト検索
  - 依存: ソースコードジャンプ
  - 詳細: `.docs/tasks/020-codemirror-6-integration.md`
- [ ] **SakuraScript シンタックスハイライト定義** [M] — CodeMirror 用カスタム言語定義、キャラ切替 / サーフェス / 選択肢 / イベントの色分け
  - 依存: CodeMirror 6 統合
  - 詳細: `.docs/tasks/021-sakura-script-syntax-highlight.md`
- [ ] **検索・フィルター** [M] — テキスト全文検索、高度なフィルタリング
  - 依存: 会話カタログ UI
  - 詳細: `.docs/tasks/022-search-and-filter.md`
- [ ] **統計ダッシュボード** [M] — SHIORI 種別、ファイル統計、会話パターン統計の表示
  - 依存: 全 .dic 一括パース
  - 詳細: `.docs/tasks/023-statistics-dashboard.md`
- [x] **Legacy Kawari検出時の案内表示** [S] — kawari.ini 等で旧Kawariを検出した場合、会話カタログ中央に「Kawari は対応予定です」を表示
  - 依存: SHIORI言語自動判別, 会話カタログ UI

### Phase 7: Ghost Display & Layout — 4/9
目標: レイアウト拡張（最大3レーン）を導入しつつ、NAR 内の surface 画像を会話と連動表示できるゴーストビューアーを実装する

- [x] **3レーンスロットレイアウト基盤** [M] — 最大3レーンの設定駆動スロット化を導入し、右レーンを上下分割（初期50/50、可変）する。右上は `会話/コード` 切替維持、右下は画像ビューアー常設
  - 依存: 3ペインレイアウト, 会話プレビューパネル, ソースコードジャンプ
  - 詳細: `.docs/tasks/024-lane-slot-layout-architecture.md`
- [x] **サーフェス画像抽出** [M] — shell ディレクトリの `surface*.png` を収集し、`shell/master` 優先で初期シェルを自動選択する
  - 依存: JSZip展開 + 仮想ファイルツリー構築
  - 詳細: `.docs/tasks/025-surface-asset-extraction.md`
- [x] **surfaces*.txt コア解析** [M] — `surface` / `surface.append` / `surface.alias` と複数 `surfaces*.txt` の連結読み込みを実装する
  - 依存: サーフェス画像抽出
  - 詳細: `.docs/tasks/026-surfaces-parser-core.md`
- [x] **ゴースト表示パネル** [M] — さくら/けろを1セットとして重ね表示し、UKADOC準拠の位置解決（shell優先・`kero左/sakura右` フォールバック）と通知オーバーレイを備えた右下パネルを実装する
  - 依存: 3レーンスロットレイアウト基盤, surfaces*.txt コア解析
  - 詳細: `.docs/tasks/027-ghost-display-panel.md`
- [ ] **会話連動サーフェス切替** [M] — イベント/バリアント選択時の自動同期と、会話内 `\\s[N]` クリック同期を実装する。未解決時は直前維持 + 通知
  - 依存: ゴースト表示パネル, 会話プレビューパネル
  - 詳細: `.docs/tasks/028-conversation-surface-sync.md`
- [ ] **サーフェスサムネイルブラウザ** [M] — 上段に会話関連 surface、下段に全 surface を表示し、クリックで表示 surface を切り替える
  - 依存: 会話連動サーフェス切替
  - 詳細: `.docs/tasks/029-surface-thumbnail-browser.md`
- [ ] **surfaces*.txt フル準拠解析** [L] — コア未対応構文（`animation` / `interval` / `pattern` 等）を段階的に実装し、診断を整備する
  - 依存: surfaces*.txt コア解析
  - 詳細: `.docs/tasks/030-surfaces-parser-full-compliance.md`
- [ ] **サーフェス合成レンダラー** [L] — `element` 重ね合わせや補助画像を Canvas で合成し、最終 surface を描画する
  - 依存: surfaces*.txt フル準拠解析, ゴースト表示パネル
  - 詳細: `.docs/tasks/031-surface-composition-renderer.md`
- [ ] **サーフェス使用頻度ヒートマップ** [M] — どの表情がどの頻度で使われるかをイベント内/全体で可視化する
  - 依存: サーフェス画像抽出, 会話連動サーフェス切替
  - 詳細: `.docs/tasks/032-surface-usage-heatmap.md`

### Phase 8: Legacy Kawari Re-support — 0/2
目標: Legacy Kawari（KAWARI.kdt/7.x）を段階的に再対応し、YAYA / Satori と同等の解析導線へ復帰する

- [ ] **Stage 1: Legacy Kawari 互換基盤** [M] — `dot_sakura.nar` を代表ケースとして互換コーパスを固定し、`kawari.ini` と `shiori.dll` 署名（`KAWARI.kdt/`）での判定、`dict : ...` 行の辞書収集（`\` 区切り・相対パス解決・重複除外）を実装
  - 依存: SHIORI言語自動判別, 全 .dic 一括パース
  - 詳細: `.docs/tasks/033-legacy-kawari-stage1.md`
- [ ] **Stage 2: Legacy Kawari パーサー本体復帰** [L] — Kawari AST/意味解析を再導入し、厳格運用（重複名・未解決参照は error）で診断を出しつつ解析継続、Worker/Store/型（`ShioriType`, `parse-kawari-batch`）を復帰
  - 依存: Stage 1: Legacy Kawari 互換基盤, Web Worker 解析基盤, シンボルテーブル + スコープ管理
  - 詳細: `.docs/tasks/034-legacy-kawari-stage2.md`

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

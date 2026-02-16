# ghost-viewer

**— 伺かゴースト会話パターン分析ビューア —**

計画書 / Planning Document

| 項目 | 内容 |
|------|------|
| Project | sasayaka |
| Author | ivgtr |
| Date | 2026-02-16 |
| Version | 1.0 |

---

## ① 背景と目的

### 背景

sasayakaは伺か（ukagaka）にインスパイアされたデスクトップAIコンパニオンアプリケーションであり、NARファイルからゴーストの人格を要約する機能を有している。しかし、現状では人格要約の品質に偏りがあり、改善の方向性を検討するためのNARファイルの俯瞰的な分析が必要となっている。

NARファイル（Nanika Archive）は実質的にZIPアーカイブであり、内部にゴーストのダイアログスクリプト（.dicファイル）、シェル画像、設定ファイルなどを含む。会話パターンは主にSHIORI言語（YAYA、Satori、Kawari等）で記述され、イベント駆動型のロジックで会話が生成される。

### 目的

- NARファイルの内部構造をブラウザ上で展開・可視化する
- 会話パターンをブランチ（ツリー）構造で表示し、分岐を確認できるようにする
- 人格要約処理の改善に必要なデータインサイトを得るための分析ツールを作る
- SHIORI言語の種類（YAYA / Satori / Kawari）に依存しない統一的な解析アプローチの検討

### スコープ

| 項目 | 内容 |
|------|------|
| プロダクト名 | ghost-viewer |
| ターゲット | sasayaka開発者（自分自身）、伺かゴースト作者 |
| 技術スタック | TypeScript / React / Vite / Web Workers |
| デプロイ形態 | SPA（GitHub Pages） |
| 対象ファイル | .nar / .zip（伺かゴーストアーカイブ） |

---

## ② NARファイル構造分析

### ディレクトリ構造

NARファイルは以下の構造を持つZIPアーカイブである：

| パス | 種類 | 説明 |
|------|------|------|
| `ghost/master/descript.txt` | 設定 | ゴーストのメタ情報（名前、作者等） |
| `ghost/master/*.dic` | スクリプト | SHIORI辞書ファイル（会話ロジック） |
| `ghost/master/shiori.dll` | バイナリ | SHIORIエンジン本体 |
| `shell/master/descript.txt` | 設定 | シェルのメタ情報 |
| `shell/master/surface*.png` | 画像 | キャラクターのサーフェス画像 |
| `shell/master/surfaces.txt` | 設定 | サーフェス定義とアニメーション |
| `install.txt` | 設定 | インストール情報 |

### 主要な.dicファイルと役割

YAYA/AYAテンプレートの一般的な構成：

| ファイル名 | 役割 | 人格要約への重要度 |
|-----------|------|-------------------|
| `aitalk.dic` | ランダム会話（アイトーク） | ★★★ 最重要：人格の核心 |
| `bootend.dic` | 起動・終了時のダイアログ | ★★ 第一印象・別れ際の言葉 |
| `menu.dic` | メニュー操作 | ★ 操作時の口調 |
| `mouse.dic` | マウス反応 | ★★ タッチへの反応パターン |
| `nameteach.dic` | 名前入力・記憶 | ★ ユーザーとの関係性 |
| `commu.dic` | ゴースト間通信 | ★ 対外的な性格 |
| `word.dic` | エンベロープ語彙 | ★★ 語彙・口調の特徴 |
| `anchor.dic` | アンカーワード | ★ 関心事のキーワード |
| `etc.dic` | その他イベント | ★ 特定状況への反応 |

### SakuraScriptの会話パターン

会話スクリプトは SakuraScript で記述され、以下の要素がブランチの分岐ポイントとなる：

- `\0` / `\1` — キャラクター切り替え（メインキャラ / サブキャラ）
- `\s[N]` — サーフェス（表情）切り替え
- `\q[label,ID]` — 選択肢（ユーザー選択による分岐）
- `\![raise,EventName]` — イベント呼び出し（別の会話フローへの遷移）
- `\_a[ID]...\_a` — アンカー（クリック可能なリンク）
- `\w` / `\x` — ウェイト（表示タイミング制御）
- `\n` — 改行
- `\e` — スクリプト終端

---

## ③ 機能要件

### F1: NARファイルのドラッグ&ドロップ展開

- ブラウザ上でのドラッグ&ドロップまたはファイル選択による.nar/.zipの取り込み
- JSZipでクライアントサイドで完結する展開処理（サーバー不要）
- 展開後、ファイルツリーをサイドバーに表示

### F2: ファイルツリービュー

- ディレクトリ構造のツリー表示（折りたたみ可能）
- ファイル種類別のアイコン表示（.dic / .txt / .png / .dll）
- ファイルサイズ・エンコーディングの表示
- ファイルクリックでビューアーへの表示切り替え

### F3: スクリプトビューアー

- .dicファイルのシンタックスハイライト表示
- SakuraScriptタグの色分け（キャラ切替 / サーフェス / 選択肢 / イベント）
- 行番号表示、検索機能
- サーフェス画像のインラインプレビュー（`\s[N]`に対応する画像の表示）

### F4: 会話ブランチビューアー（コア機能）

このビューアーの最も重要な機能。会話フローをツリー構造として可視化する。

- 関数・イベント単位でのノード表示
- `\q`（選択肢）による分岐をブランチとして描画
- `\![raise]`によるイベント遷移をリンクとして表現
- ノードの展開・折りたたみ・ズーム・パン
- ノード内のダイアログプレビュー（SakuraScriptを読みやすくレンダリング）
- キャラクター切り替え（`\0`/`\1`）の視覚的な区別
- サーフェス切り替えの表情プレビュー表示

### F5: ゴーストメタ情報ダッシュボード

- `descript.txt`からのメタ情報抽出（ゴースト名、作者、キャラクター名等）
- SHIORI言語の自動判別（YAYA / Satori / Kawari）
- ファイル統計（.dicファイル数、総行数、サーフェス数）
- 会話パターンの統計（イベント数、選択肢数、推定会話量）

### F6: 分析・フィルター機能

- イベント名でのフィルタリング（OnBoot, OnClose, OnAiTalk等）
- テキスト検索（会話内容の全文検索）
- サーフェス使用頻度の可視化（どの表情がよく使われるか）
- 会話の深さ・複雑さのヒートマップ表示

---

## ④ 技術設計

### アーキテクチャ構成

| レイヤー | ライブラリ / 技術 | 説明 |
|---------|------------------|------|
| UIフレームワーク | React + TypeScript | コンポーネントベースの構築 |
| ビルドツール | Vite | 高速なビルドとHMR |
| ZIP展開 | JSZip | クライアントサイドでのNAR展開 |
| ツリー描画 | React Flow / D3.js | ブランチノードの可視化 |
| コードエディタ | CodeMirror 6 | .dicファイルのシンタックスハイライト |
| スタイリング | Tailwind CSS | ユーティリティファーストのUI |
| 解析エンジン | Web Workers | SHIORIパース処理のオフメインスレッド化 |

### 解析パイプライン

NARファイルの解析は以下のパイプラインで処理する：

1. **NARファイル取り込み**：JSZipでZIP展開、ファイルツリー構築
2. **SHIORI判別**：同梱DLLの名前と.dicファイルのパターンから言語を推定
3. **辞書パース**：SHIORI言語別のパーサーで関数・イベントを抽出
4. **SakuraScript解析**：タグをトークン化し、会話フローを構造化
5. **ブランチ構築**：`\q`と`\![raise]`からツリーノードを生成
6. **レンダリング**：React Flowでノードグラフを表示

### SHIORI言語別解析戦略

品質の偏りを改善するために、SHIORI言語ごとに異なる解析戦略を採用する：

| SHIORI | 解析アプローチ | 課題ポイント |
|--------|---------------|-------------|
| YAYA | C風の構文解析。関数定義・変数・制御構文をパース。ランダム選択は複数のReturn文から検出 | ネストした関数呼び出しの追跡。変数展開が完全にはできない |
| Satori | パターンマッチングベース。キーワードトリガーと応答パターンのペアを抽出 | 日本語固有の文字コード処理。特殊な変数展開構文 |
| Kawari | エントリーベース。キーとバリューのペアを解析。ミドルウェアの存在も考慮 | バージョンによる構文差異が大きい |
| 不明 | SakuraScriptレベルの解析のみ。ダイアログ文字列の直接抽出 | 構造化された情報が少なくなる |

---

## ⑤ UIデザイン構成

### レイアウト

画面は3ペインのレイアウトを採用し、リサイズ可能なスプリッターで分割する：

- **左ペイン（約240px）**：ファイルツリー + ゴーストメタ情報
- **中央ペイン（フレキシブル）**：ブランチビューアー（React Flowキャンバス）
- **右ペイン（約400px）**：スクリプトビューアー / ディテールパネル

### ブランチノードのデザイン

各ノードは以下の情報を含むカード型のUIとする：

- **ノードヘッダー**：イベント名 / 関数名（例：OnBoot, RandomTalk）
- **ダイアログプレビュー**：SakuraScriptを解釈した会話テキストの拝読
- **キャラクターラベル**：`\0` / `\1` による話者の色分け
- **サーフェスサムネイル**：使用される表情の小さなプレビュー
- **接続ハンドル**：選択肢分岐やイベント遷移の接続ポイント

### カラースキーム

| 要素 | カラー | 用途 | コード |
|------|--------|------|--------|
| メインキャラ (`\0`) | ブルー系 | 主話者のダイアログ | `#2196F3` |
| サブキャラ (`\1`) | グリーン系 | サブ話者のダイアログ | `#4CAF50` |
| 選択肢 (`\q`) | オレンジ系 | ユーザー選択の分岐点 | `#FF9800` |
| イベント遷移 | パープル系 | raiseによるフロー遷移 | `#9C27B0` |

---

## ⑥ デプロイ設計（GitHub Actions + GitHub Pages）

### 概要

GitHub Pagesへの自動デプロイをGitHub Actionsで構成する。mainブランチへのpush時にビルドとデプロイを実行する。Viteの出力を直接GitHub Pages Artifactとしてアップロードする公式アクション（`actions/deploy-pages`）を使用する。

### ワークフロー定義

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          BASE_URL: /${{ github.event.repository.name }}/

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Vite設定

GitHub Pages用のベースパスを環境変数から設定する：

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_URL || "/",
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
```

### リポジトリ設定

GitHub Pages のソースを **GitHub Actions** に変更する必要がある：

1. リポジトリの Settings → Pages を開く
2. Source を **GitHub Actions** に変更する
3. mainブランチへのpushで自動デプロイが開始される

### デプロイフロー図

```
push to main
  │
  ▼
GitHub Actions trigger
  │
  ├─ checkout
  ├─ setup node 20
  ├─ npm ci
  ├─ npm run build (with BASE_URL)
  ├─ upload pages artifact (dist/)
  │
  ▼
deploy job
  │
  ├─ deploy-pages
  │
  ▼
https://<user>.github.io/<repo>/
```

### 補足：SPAルーティング対応

GitHub PagesはSPA用のサーバーサイドルーティングに対応していないため、404.htmlにリダイレクトスクリプトを配置する：

```html
<!-- public/404.html -->
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <script>
      // SPA redirect: convert path to query string and redirect to index
      const path = window.location.pathname;
      const repo = "/<REPO_NAME>";
      if (path !== repo && path !== repo + "/") {
        const route = path.replace(repo, "");
        window.location.replace(
          repo + "/?route=" + encodeURIComponent(route)
        );
      }
    </script>
  </head>
</html>
```

---

## ⑦ 開発計画

### Phase 1: 基盤構築（約2-3日）

- Vite + React + TypeScriptのプロジェクトセットアップ
- GitHub Actions デプロイワークフロー設定
- JSZipによるNARファイルのドラッグ&ドロップ展開
- ファイルツリービューの実装
- テキストファイルの基本表示ビューアー

### Phase 2: 解析エンジン（約3-5日）

- `descript.txt`パーサーの実装
- SHIORI言語自動判別ロジック
- SakuraScriptトークナイザーの実装
- YAYA辞書パーサー（最優先）の実装
- Satoriパーサーの実装

### Phase 3: ブランチビューアー（約3-5日）

- React Flowの導入とノードレイアウトアルゴリズム
- カスタムノードコンポーネントの実装
- `\q`分岐・`\![raise]`遷移のエッジ描画
- ノードクリックでのディテールパネル連携

### Phase 4: ポリッシュ・分析機能（約2-3日）

- CodeMirror 6によるシンタックスハイライト
- サーフェスプレビューの実装
- 統計ダッシュボード
- 検索・フィルター機能

### Phase 5: 拡張（任意）

- Kawariパーサーの追加
- 複数NARファイルの比較ビュー
- 解析結果のJSONエクスポート（sasayaka本体へのフィードバック用）
- 人格要約プロンプトのテスト・プレビュー機能

---

## ⑧ sasayakaの人格要約改善への接続

### 現状の課題仮説

人格要約の品質の偏りは以下の原因が考えられる。本ビューアーで検証することで、どの問題が支配的かを判断する：

1. **SHIORI言語依存**：YAYAは解析しやすいが、Satori/Kawariはパターンが異なる
2. **ダイアログ密度の差**：ゴーストによって会話量に10倍以上の差がある
3. **構造の複雑さ**：分岐が深いゴーストではコンテキストが失われる
4. **エンコーディング問題**：Shift_JISとUTF-8の混在で文字化けが発生

### ビューアーからのフィードバックループ

本ビューアーの分析結果をsasayaka本体の改善に接続する流れ：

1. ビューアーで複数のNARファイルを展開・分析
2. 品質の偏りが発生するパターンを特定（SHIORI種別、会話構造の複雑さ、エンコーディング）
3. 解析結果をJSONでエクスポートし、sasayakaの要約プロンプトの改善に活用
4. ビューアー上で要約プロンプトのテスト実行（A/Bテスト）ができると理想的

### 改善アプローチの候補

ビューアーの分析結果を踏まえ、以下の改善アプローチが検討可能：

| アプローチ | 概要 | ビューアーで検証すること |
|-----------|------|------------------------|
| A: 解析強化 | SHIORI別パーサーの精度向上。構文解析を深くし、より正確なダイアログ抽出を行う | どのSHIORIで抽出漏れが多いか、どの構文パターンが未対応か |
| B: プロンプト改善 | LLMへの入力プロンプトを改善。構造化したデータをより効果的に伝える | 同じNARでプロンプトを変えた場合の要約品質の差 |
| C: 前処理追加 | 解析前にエンコーディング統一、ノイズ除去、ダイアログの正規化を行う | Shift_JIS/UTF-8混在の頻度、ノイズ行のパターン |
| D: ハイブリッド | A+B+Cの組み合わせ。解析精度とプロンプトの両方を改善 | 各要因の寄与度を定量的に把握 |

---

## ⑨ セキュリティ設計

NARファイルをブラウザで展開・レンダリングする性質上、以下のセキュリティリスクへの対策を設計段階から組み込む。

### Zip Bomb / Zip Slip 対策

NARファイルは実質ZIPアーカイブであり、悪意ある細工が可能な攻撃ベクトルとなる。

| 脅威 | 内容 | 対策 |
|------|------|------|
| Zip Bomb（圧縮爆弾） | 展開後に数GBに膨張するアーカイブによるメモリ枯渇 | JSZipでエントリを列挙した段階で展開後サイズの合計を算出し、上限（例：200MB）を超える場合は展開を中断。エントリ数の上限（例：5,000件）も設定 |
| Zip Slip（パストラバーサル） | `../../etc/passwd`のようなパスを持つエントリでサンドボックス外にアクセス | すべてのエントリパスを正規化し、`..`を含むパスや絶対パスを持つエントリを拒否。展開先をメモリ上の仮想ファイルツリーに限定 |
| Nested Zip | NAR内にさらにZIPが含まれる再帰的展開による資源消費 | 再帰展開を行わない。ネストされたアーカイブはバイナリファイルとして扱い展開しない |

実装例：

```typescript
const MAX_UNCOMPRESSED_SIZE = 200 * 1024 * 1024; // 200MB
const MAX_ENTRIES = 5000;

async function validateNar(zip: JSZip): Promise<boolean> {
  const entries = Object.values(zip.files);
  if (entries.length > MAX_ENTRIES) {
    throw new Error(`Entry count ${entries.length} exceeds limit`);
  }

  let totalSize = 0;
  for (const entry of entries) {
    // パストラバーサル検証
    const normalized = entry.name.normalize("NFC");
    if (normalized.includes("..") || normalized.startsWith("/")) {
      throw new Error(`Unsafe path detected: ${entry.name}`);
    }
    // サイズ検証（_data.uncompressedSizeがある場合）
    totalSize += (entry as any)._data?.uncompressedSize ?? 0;
  }

  if (totalSize > MAX_UNCOMPRESSED_SIZE) {
    throw new Error(`Uncompressed size ${totalSize} exceeds limit`);
  }
  return true;
}
```

### XSS（クロスサイトスクリプティング）対策

SakuraScriptをHTMLとしてレンダリングする際が最大のXSSリスクとなる。

- **`innerHTML`/`dangerouslySetInnerHTML`の使用を禁止**。すべてのダイアログテキストはReactのJSX経由でテキストノードとして挿入する
- SakuraScriptのパース結果は構造化データ（トークン配列）として保持し、各トークンを専用のReactコンポーネントでレンダリングする
- `<script>`、`onerror`、`javascript:`等の危険なパターンはパース段階でサニタイズまたは除去する
- CodeMirror 6のスクリプトビューアーはテキストとして表示するため、XSSリスクは低い

```typescript
// ❌ 危険：生HTMLの挿入
<div dangerouslySetInnerHTML={{ __html: parsedScript }} />

// ✅ 安全：構造化データのレンダリング
{tokens.map((token, i) => (
  <DialogToken key={i} type={token.type} value={token.text} />
))}
```

### ファイル偽装検証

NARファイル内の画像ファイルが実際には異なるファイル形式である可能性に対応する。

- 画像ファイルはマジックバイト（先頭数バイト）で実際のフォーマットを検証する
  - PNG: `89 50 4E 47`
  - JPEG: `FF D8 FF`
  - BMP: `42 4D`
- マジックバイトが一致しないファイルは画像として表示しない
- 画像の表示には`<img>`タグとBlob URLのみを使用し、`<object>`、`<embed>`、`<iframe>`を使わない
- SVGファイルはスクリプト実行が可能なため、画像としてではなくテキストとして表示する

### メモリ枯渇対策

| 対策 | 実装方針 |
|------|---------|
| ファイルサイズ上限 | ドロップ時に`File.size`をチェック。NARファイル自体を100MBに制限 |
| Web Worker分離 | 解析処理をWeb Workerで実行し、メインスレッドのクラッシュを防止 |
| 逐次処理 | 大量の.dicファイルは一括展開せず、選択時にオンデマンドで読み込み |
| タイムアウト | 解析処理に30秒のタイムアウトを設け、無限ループ的な処理を防止 |

### Content Security Policy（CSP）

GitHub Pages上でのCSPを`index.html`のmetaタグで設定する：

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob:;
  worker-src 'self' blob:;
  connect-src 'self';
  object-src 'none';
  frame-src 'none';
  base-uri 'self';
">
```

- `object-src 'none'`と`frame-src 'none'`でプラグインやiframeによる攻撃を遮断
- `img-src blob:`でBlob URLによるサーフェス画像の表示を許可
- `worker-src blob:`でインラインWeb Workerの生成を許可
- 外部CDNへの接続は行わないため`connect-src`は`'self'`のみ

### 外部URLの取り扱い

SakuraScript内に外部URL（`http://`、`https://`）が記述されている場合がある。

- URLはテキストとして表示するのみ。`<a>`タグでのリンク化は行わない
- 画像URLの自動プリフェッチは行わない
- ネットワーク更新URL（`updates2.dau`等に記載）も参照表示のみとする
- ユーザーがURLをコピーしたい場合はクリックでクリップボードにコピーする方式とする

### 依存パッケージの管理

| 対策 | 実装方針 |
|------|---------|
| lockfileの固定 | `package-lock.json`をGitにコミットし、`npm ci`でインストール |
| Dependabot | `.github/dependabot.yml`を配置し、セキュリティアップデートの自動PR生成を有効化 |
| CI監査 | GitHub Actionsのビルドジョブに`npm audit --audit-level=high`を追加 |
| 最小依存 | ランタイム依存を最小限に保つ。JSZip、React Flow、CodeMirrorを主要依存とし不要なパッケージを入れない |

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 10
```

デプロイワークフローにも監査ステップを追加：

```yaml
      - name: Security audit
        run: npm audit --audit-level=high
```

---

## ⑩ 備考

### 技術的なリスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| 大規模NARファイルのパフォーマンス | UIのフリーズ、メモリ不足 | Web Workersで解析をオフメインスレッド化。逐次レンダリング |
| 文字エンコーディングの多様性 | 文字化けによる解析失敗 | TextDecoderでShift_JIS/EUC-JP/UTF-8を自動判別 |
| SHIORI言語の網羅率 | 未対応言語のゴーストが解析できない | フォールバックとしてSakuraScriptレベルの解析を常に提供 |
| React Flowのノード数上限 | 会話が多いゴーストで描画が重くなる | バーチャルスクロール、遅延レンダリングの導入 |

### 参考リソース

- UKADOC Project: ukagakadreamteam.github.io/ukadoc/
- Ukagaka Dream Team Wiki: ukagakadreamteam.com/wiki/
- YAYA Fundamentals: zichqec.github.io/YAYA_Fundamentals/
- SakuraScriptリファレンス: ashido.com/ukagaka/scripting.html
- React Flow: reactflow.dev
- JSZip: stuk.github.io/jszip/
- CodeMirror 6: codemirror.net

---

*End of Document*

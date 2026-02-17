# ghost-viewer

https://ivgtr.github.io/ghost-viewer/

伺か（ukagaka）ゴーストの NAR ファイルをブラウザ上で展開・可視化し、会話パターンをツリー構造として表示する。

YAYA / Satori / Kawari の SHIORI 言語に対応中。

## Setup

```bash
pnpm install
```

## Development

```bash
pnpm dev          # 開発サーバー起動
pnpm build        # プロダクションビルド
pnpm test         # テスト実行
pnpm lint         # lint + format チェック
pnpm lint:fix     # lint + format 自動修正
```

## Project Structure

```
src/
├── components/   # React UI コンポーネント
├── lib/          # ビジネスロジック（React 非依存）
├── stores/       # Zustand ストア
├── types/        # 共有型定義
└── workers/      # Web Worker
tests/            # テストファイル
```

## License

[MIT](./LICENSE)

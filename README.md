# 97-things-every-programmer-should-know

『プログラマが知るべき97のこと』のエッセイを [HonKit](https://github.com/honkit/honkit) でサイトにして公開するリポジトリです。サイトの説明と本文のライセンスは [book/README.md](book/README.md) にあります。

## 構成

- `book/` — HonKit のプロジェクト。本文（`things/`）、目次（`SUMMARY.md`）、npm の設定を置く
- `book/scripts/import-wikisource.mjs` — 日本語版ウィキソースから本文を取り込むスクリプト
- `compose.yaml` — 開発用コンテナの定義
- `.github/workflows/deploy.yml` — GitHub Pages へのデプロイ

## 開発

開発は Docker コンテナの中で行います。ホストに Node.js は要りません。

```sh
# プレビュー（http://localhost:4000）
docker compose up

# ビルド（book/_book に出力）
docker compose run --rm book npm run build

# ウィキソースから本文を取り込み直す
docker compose run --rm book npm run import
```

`book/things/` と `book/SUMMARY.md` は取り込みスクリプトの生成物です。手で編集せず、スクリプトを直して再生成します。

依存パッケージを変えたときは、イメージとボリュームを作り直します。

```sh
docker compose down --volumes
docker compose build
```

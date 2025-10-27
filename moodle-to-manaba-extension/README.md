# Moodle to manaba Timetable Extension

Moodle のコースリストを manaba スタイルの時間割表示に変換する Chrome 拡張機能です。

## 概要

この拡張機能は、Moodle のマイページで動作し、コースカードからコース詳細を取得して時間割情報を解析し、manaba スタイルの時間割テーブルとして表示します。

## 機能

- **自動検出**: MutationObserver で Moodle のコースカード動的読み込みを検出
- **スケジュール解析**: コース詳細ページから曜日・時限・教室情報を抽出
- **時間割表示**: manaba のテーブルスタイルで 7 時限 ×6 曜日の時間割を生成
- **教室情報**: 時限と教室情報の表示
- **範囲時限対応**: `金1(1-2)`のような範囲時限を複数セルに展開

## インストール方法

### ユーザー向け（推奨）

詳しいインストール方法は [INSTALL.md](../INSTALL.md) をご覧ください。

**簡単な手順:**

1. [Releases](https://github.com/is0692vs/moodle-to-manaba-R/releases)から最新版の zip ファイルをダウンロード
2. zip ファイルを展開（解凍）
3. Chrome で `chrome://extensions/` を開き、デベロッパーモードを ON
4. 「パッケージ化されていない拡張機能を読み込む」で展開したフォルダを選択

### 開発者向け

1. このリポジトリをクローン: `git clone https://github.com/is0692vs/moodle-to-manaba-R.git`
2. Chrome で `chrome://extensions/` を開き、デベロッパーモードを ON
3. 「パッケージ化されていない拡張機能を読み込む」で `moodle-to-manaba-extension` ディレクトリを選択
4. Moodle のマイページにアクセスして動作確認

## ディレクトリ構成

```
moodle-to-manaba-extension/
├── manifest.json           # 拡張機能設定（Manifest V3）
├── src/
│   ├── content.js         # メインロジック（MutationObserver、コース処理）
│   ├── parser.js          # スケジュール解析機能
│   ├── tableGenerator.js  # manabaテーブル生成
│   └── styles.css         # manabaスタイルのCSS
├── icons/                 # 拡張機能アイコン
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md             # このファイル
```

## 技術仕様

- **Manifest Version**: 3
- **対象サイト**: `https://your-university-moodle.edu/my/*`
- **動作方式**: Content Script
- **スケジュール解析**: 正規表現による曜日・時限パターンマッチング
- **テーブル構造**: 7 時限 ×6 曜日（manaba 互換）

## Phase 1 MVP 実装状況

- [x] プロジェクトセットアップと Manifest V3 設定
- [x] MutationObserver 実装（動的コースカード検出）
- [x] コース情報取得と fetch 処理
- [x] 時間割情報パース（正規表現、範囲時限展開）
- [x] manaba スタイルテーブル生成
- [x] UI 置換と manaba スタイリング
- [x] 基本アイコンと README

## テスト観点

- 曜日・時限・教室が正しくマッピングされること
- 同じ曜日・時限に複数コースがある場合の重複表示
- 時間割情報がないコースは表示されないこと
- 範囲時限（`1-2`形式）の正しい展開
- MutationObserver による動的コースカード検出

## 既知の制約（Phase 1）

- 基本的なエラーハンドリングのみ実装
- 大量のコースがある場合のパフォーマンス最適化は未実装
- ネットワーク遅延時の詳細なローディング表示は簡易版
- キャッシュ機能は実装済み（メモリ内、セッション限定）

## 対応サイト

デフォルトでは全ての HTTPS サイトで動作しますが、主に Moodle のマイページでの使用を想定しています。

## リリース方法（開発者向け）

1. `manifest.json` のバージョンを更新
2. 変更をコミット: `git commit -am "Bump version to X.X.X"`
3. タグを作成: `git tag vX.X.X`
4. タグをプッシュ: `git push origin vX.X.X`
5. GitHub Actions が自動的に zip ファイルを作成してリリースページに公開します

## 今後の改善予定

- 詳細なエラーハンドリングとユーザーフィードバック
- パフォーマンス最適化（バッチ処理、並列処理）
- 永続化キャッシュ（ローカルストレージ）
- ユーザー設定（表示設定、フィルタリング）
- Chrome Web Store での公開

## ライセンス

このプロジェクトのライセンスについては [LICENSE](../LICENSE) をご覧ください。

## 貢献

バグ報告や機能リクエストは [Issues](https://github.com/is0692vs/moodle-to-manaba-R/issues) でお願いします。

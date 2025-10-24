# Moodle to manaba Timetable Extension (Phase 1 MVP)

Moodleのコースリストをmanabaスタイルの時間割表示に変換するChrome拡張機能です。

## 概要

この拡張機能は、Moodleのマイページで動作し、コースカードからコース詳細を取得して時間割情報を解析し、manabaスタイルの時間割テーブルとして表示します。

## 機能

- **自動検出**: MutationObserverでMoodleのコースカード動的読み込みを検出
- **スケジュール解析**: コース詳細ページから曜日・時限・教室情報を抽出
- **時間割表示**: manabaのテーブルスタイルで7時限×6曜日の時間割を生成
- **教室情報**: 時限と教室情報の表示
- **範囲時限対応**: `金1(1-2)`のような範囲時限を複数セルに展開

## インストール方法

1. Chrome拡張機能の開発者モードを有効にする (`chrome://extensions/`)
2. 「パッケージ化されていない拡張機能を読み込む」でこのディレクトリを読み込む
3. Moodleのマイページ（`https://moodle.ritsumei.ac.jp/my/` または `https://lms.ritsumei.ac.jp/my/`）にアクセス
4. コース一覧がmanabaスタイルの時間割テーブルに置き換わることを確認

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
- **対象サイト**: `https://moodle.ritsumei.ac.jp/my/*`, `https://lms.ritsumei.ac.jp/my/*`
- **動作方式**: Content Script
- **スケジュール解析**: 正規表現による曜日・時限パターンマッチング
- **テーブル構造**: 7時限×6曜日（manaba互換）

## Phase 1 MVP実装状況

- [x] プロジェクトセットアップとManifest V3設定
- [x] MutationObserver実装（動的コースカード検出）
- [x] コース情報取得とfetch処理
- [x] 時間割情報パース（正規表現、範囲時限展開）
- [x] manabaスタイルテーブル生成
- [x] UI置換とmanabaスタイリング
- [x] 基本アイコンとREADME

## テスト観点

- 曜日・時限・教室が正しくマッピングされること
- 同じ曜日・時限に複数コースがある場合の重複表示
- 時間割情報がないコースは表示されないこと
- 範囲時限（`1-2`形式）の正しい展開
- MutationObserverによる動的コースカード検出

## 既知の制約（Phase 1）

- 基本的なエラーハンドリングのみ実装
- 大量のコースがある場合のパフォーマンス最適化は未実装
- ネットワーク遅延時の詳細なローディング表示は簡易版
- キャッシュ機能は実装済み（メモリ内、セッション限定）

## 今後の改善予定（Phase 2/3）

- 詳細なエラーハンドリングとユーザーフィードバック
- パフォーマンス最適化（バッチ処理、並列処理）
- 永続化キャッシュ（ローカルストレージ）
- ユーザー設定（表示設定、フィルタリング）

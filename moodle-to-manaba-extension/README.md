# Moodle to manaba Timetable (Phase 1 MVP)

Chrome 拡張のコンテンツスクリプトで Moodle のマイコース画面を manaba 風の時間割に置き換えます。Phase 1 では DOM 監視・詳細ページのパース・テーブル生成の最小機能のみを実装しています。

## ディレクトリ構成

```
moodle-to-manaba-extension/
├── manifest.json
├── src/
│   ├── content.js          // MutationObserver と統合エントリ
│   ├── parser.js           // Moodle コース詳細の時間割抽出
│   ├── tableGenerator.js   // manaba 風テーブル DOM ビルド
│   └── styles.css          // 基本スタイル
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

アイコン画像は未同梱のため、Chrome ウェブストア掲載用や開発用途にあわせて任意の PNG を配置してください。

## セットアップ

1. `chrome://extensions/` で「デベロッパーモード」を有効化します。
2. 「パッケージ化されていない拡張機能を読み込む」で本ディレクトリ (`moodle-to-manaba-extension`) を指定します。
3. Moodle マイページ (`https://moodle.ritsumei.ac.jp/my/` または `https://lms.ritsumei.ac.jp/my/`) にアクセスします。
4. コース一覧が manaba 風の時間割テーブルに置き換わることを確認します。

## テスト観点

- 追加された `manaba` テーブルに曜日・時限・教室が正しくマッピングされること。
- 同曜日同時限の複数コースがセル内でスタック表示されること。
- 時間割情報が存在しないコースはスキップされること。
- フェッチ失敗時にステータスメッセージを表示し、ページ全体が壊れないこと。

## 既知の制限

- 範囲時限 (例: `1-2`) は期間内の各時限に展開しますが、教室情報が 1 コマ目のみに記載されている場合は同じ値を共有します。
- コースカードのフィルター切替を連続で行った場合の再描画は簡易対応です。必要に応じて Phase 2/3 で改善してください。
- ネットワーク遅延が大きい環境ではコース詳細のフェッチに時間がかかります。ローディング表示のみでスケジューリング調整は未実装です。

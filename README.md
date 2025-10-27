# Moodle to manaba Timetable Extension

Moodle のコースリストを manaba スタイルのビジュアルな時間割表に変換する Chrome 拡張機能です。

![Version](https://img.shields.io/badge/version-0.2.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 📋 概要

Moodle のマイページに表示されるコースリストを、視覚的にわかりやすい manaba 形式の時間割表に自動変換します。曜日と時限が一目でわかり、学習スケジュールの管理が簡単になります。

## ✨ 主な機能

- 🔄 **自動変換**: Moodle マイページにアクセスするだけで自動的に時間割表示
- 📅 **manaba 風デザイン**: 見慣れた manaba スタイルのテーブルレイアウト
- 📍 **教室情報表示**: 各授業の教室情報も同時に表示
- ⏰ **範囲時限対応**: 「1-2 時限」のような連続コマにも対応
- 💾 **キャッシュ機能**: 一度取得した情報はキャッシュして高速表示

## 🚀 インストール

### 一般ユーザー向け

1. **[Releases](https://github.com/is0692vs/moodle-to-manaba-R/releases)** ページから最新版の `moodle-to-manaba-extension-vX.X.X.zip` をダウンロード
2. zip ファイルを任意の場所に展開
3. Chrome で `chrome://extensions/` を開く
4. 右上の「デベロッパーモード」を ON にする
5. 「パッケージ化されていない拡張機能を読み込む」をクリック
6. 展開したフォルダを選択

詳しくは **[INSTALL.md](./INSTALL.md)** をご覧ください。

### 開発者向け

```bash
git clone https://github.com/is0692vs/moodle-to-manaba-R.git
cd moodle-to-manaba-R/moodle-to-manaba-extension
```

その後、Chrome の `chrome://extensions/` から「パッケージ化されていない拡張機能を読み込む」で `moodle-to-manaba-extension` ディレクトリを選択してください。

## 📖 使い方

1. 拡張機能をインストール後、Moodle のマイページにアクセス
2. 自動的にコースリストが時間割表に変換されます
3. 各セルにはコース名、教室名が表示されます

## 🏗️ プロジェクト構成

```
moodle-to-manaba-R/
├── moodle-to-manaba-extension/    # 拡張機能本体
│   ├── manifest.json              # 拡張機能設定
│   ├── popup.html/js              # ポップアップUI
│   ├── src/                       # メインコード
│   │   ├── content.js            # コンテンツスクリプト
│   │   ├── parser.js             # スケジュール解析
│   │   ├── tableGenerator.js    # テーブル生成
│   │   └── styles.css            # スタイル
│   └── icons/                    # アイコン画像
├── data/                         # テストデータ
├── reports/                      # 開発レポート
├── INSTALL.md                    # インストールガイド
└── README.md                     # このファイル
```

## 🔧 技術仕様

- **対応ブラウザ**: Chrome, Edge, Brave など（Chromium 系）
- **Manifest Version**: 3
- **主要技術**: Vanilla JavaScript, CSS3
- **解析方法**: 正規表現によるパターンマッチング
- **監視**: MutationObserver による動的コンテンツ対応

## 📝 開発

### リリース手順

1. `moodle-to-manaba-extension/manifest.json` のバージョンを更新
2. 変更をコミット
3. タグを作成してプッシュ:
   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```
4. GitHub Actions が自動的に zip ファイルを作成してリリース

### テスト

テストデータは `data/` ディレクトリに格納されています。詳細は `moodle-to-manaba-extension/TESTING.md` を参照してください。

## 🐛 トラブルシューティング

問題が発生した場合は [INSTALL.md](./INSTALL.md) のトラブルシューティングセクションを確認してください。

## 🤝 貢献

バグ報告、機能リクエスト、プルリクエストを歓迎します！

- **Issue**: [GitHub Issues](https://github.com/is0692vs/moodle-to-manaba-R/issues)
- **Pull Request**: フォークして PR を送ってください

## 📜 ライセンス

このプロジェクトは [MIT License](./LICENSE) の下で公開されています。

## 🗺️ ロードマップ

- [ ] パフォーマンス最適化
- [ ] エラーハンドリングの改善
- [ ] ユーザー設定機能（表示カスタマイズ）
- [ ] Chrome Web Store での公開
- [ ] 他の LMS（Learning Management System）への対応

## 📧 お問い合わせ

質問や提案がある場合は、[Issues](https://github.com/is0692vs/moodle-to-manaba-R/issues) でお気軽にご連絡ください。

---

Made with ❤️ for better learning experience

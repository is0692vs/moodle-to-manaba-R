# Phase 1 MVP テスト手順

## 方法1: ローカルデモテスト（推奨）

実際のMoodleアカウントがない場合、まずローカルでテストできます。

### ステップ 1: Chrome拡張機能をインストール

1. **Chromeブラウザを開く**
2. **アドレスバーに `chrome://extensions/` と入力**
3. **右上の「デベロッパーモード」をONにする**
4. **「パッケージ化されていない拡張機能を読み込む」をクリック**
5. **以下のフォルダを選択:**
   ```
   /Users/hirokimukai/Cloudprojects/moodle-to-manaba-R/moodle-to-manaba-extension
   ```

### ステップ 2: ローカルデモでテスト

1. **デモページを開く**
   ```
   file:///Users/hirokimukai/Cloudprojects/moodle-to-manaba-R/moodle-to-manaba-extension/demo/test-moodle.html
   ```
   
   または Finderで `demo/test-moodle.html` をダブルクリック

2. **開発者ツールを開く（F12キー）**
3. **Consoleタブを選択**
4. **以下の動作を確認:**
   - 1秒後にコースカードが表示される
   - 数秒後にコースカードが非表示になる
   - manabaスタイルの時間割テーブルが表示される
   - コンソールに `[M2M]` で始まるログが出力される

## 方法2: 実際のMoodleでテスト

### 前提条件
- 立命館大学のMoodleアカウント
- コースに登録済み

### ステップ 1: Chrome拡張機能をインストール（上記と同じ）

### ステップ 2: Moodleにアクセス

1. **以下のURLにアクセス:**
   ```
   https://moodle.ritsumei.ac.jp/my/
   または
   https://lms.ritsumei.ac.jp/my/
   ```

2. **ログインしてマイページを表示**

3. **開発者ツールでログを確認（F12 → Console）**

## 期待される動作

### 正常ケース
```
1. ページ読み込み
2. 「manabaスタイルの時間割を生成しています…」メッセージ
3. 元のMoodleコースカードが非表示
4. manabaスタイルの7×6時間割テーブル表示
5. 各コースが正しい曜日・時限に配置
```

### 確認ポイント

- [ ] **テーブル構造**: 7時限×6曜日（月〜土）
- [ ] **コース配置**: 正しい曜日・時限に表示
- [ ] **教室情報**: 「曜日時限:教室名」形式で表示
- [ ] **範囲時限**: `金1(1-2)` → 金曜1限・2限両方に表示
- [ ] **クリック動作**: コース名クリックで遷移

## トラブルシューティング

### 拡張機能が動作しない場合

1. **manifest.jsonエラー**
   ```
   chrome://extensions/ で「エラー」が表示されていないか確認
   ```

2. **ページURL確認**
   ```
   デモページ: file:/// で始まるローカルファイル
   実際のMoodle: https://moodle.ritsumei.ac.jp/my/ または https://lms.ritsumei.ac.jp/my/
   ```

3. **開発者ツールでエラー確認**
   ```
   F12 → Console → エラーメッセージを確認
   Network → fetchエラーを確認
   ```

### よくある問題

**Q: デモページで動作しない**
- A: ファイルパスが正しいか確認、ブラウザでローカルファイル読み込みを許可

**Q: 実際のMoodleで動作しない**  
- A: ログイン状態、コース登録状況、ネットワーク接続を確認

**Q: テーブルが表示されない**
- A: コンソールログで `[M2M]` メッセージを確認、エラーがないかチェック

## デバッグ情報

### コンソールログの見方
```
[M2M] Found X course cards     # コースカード検出
[M2M] Processing course: ...   # コース処理中
[M2M] Parsed schedule: ...     # スケジュール解析結果
[M2M] Generated timetable      # テーブル生成完了
```

### DOM要素の確認
```javascript
// 開発者ツールのConsoleで実行
document.querySelector('#manaba-timetable-wrapper')  // テーブルコンテナ
document.querySelector('table.stdlist.manaba-timetable')  // 時間割テーブル
document.querySelector('[data-manaba-hidden="true"]')  // 非表示にされた元のコース
```

## 完了基準

- [ ] Chrome拡張機能が正しく読み込まれる
- [ ] デモページまたは実際のMoodleで時間割テーブルが表示される
- [ ] コースが適切な曜日・時限に配置される
- [ ] 教室情報が正しく表示される
- [ ] コンソールエラーがない
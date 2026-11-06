# MAVStackchan スライド: アウトラインと台本

作成日: 2026-10-25

**元にした資料**
- `direction-win.md`（Win 側: 機体の仕様、Phase、安全設計、スライドモードの操作）
- `direction-wsl.md`（WSL 側: HUD 連携、MAVLink の経路、起動手順）

**方針**
- 対象は「MAVLink 連携」と「reveal.js 連携」の 2 つです。ほかの話（状態音、設定画面、位置の方針）は付録に回すか、省きます。
- スライドの文字と台本は、日本語で書きます（2026-10-25 に決定）。書式は `en-2/index.html` と同じです。
- 発表時間は未定です。下の時間は仮の配分（合計 9:10）です。**[要確認]**
- 事実には出典を書きました。出典は `direction-win.md`、`direction-wsl.md`、`en-2/hud.js`、`en-2/stackchan-bridge.js`、`telemetry.py` のいずれかです。
- 「HUD」は、WSL の `hud.js`（デッキ上の HUD）を指します（`direction-win.md` の (C)）。**[要確認]**

---

## 構成（一覧）

| # | スライド | 仮の時間 | 主な内容 | 出典 |
|---|---|---|---|---|
| 1 | タイトル | 0:20 | 何の話か | - |
| 2 | 全体像 | 0:40 | 3 本の経路（MAVLink / スライド / HUD） | direction-wsl 0、1 |
| 3 | 何ができているか | 0:40 | Phase 1〜5 の状態 | direction-win 2 |
| 4 | MAVLink: 姿勢を送る | 0:50 | IMU → ATTITUDE 20Hz、水平の取り直し | direction-win 3 |
| 5 | MAVLink: ARM とモードの安全設計 | 0:50 | 状態遷移、リンク切断で DISARM | direction-win 4 |
| 6 | MAVLink: 頭部を動かす | 0:40 | スティック → サーボ、500ms の無入力で中立 | direction-win 5 |
| 7 | MAVLink → HUD | 0:50 | telemetry.py → serve.py → hud.js の流れ | direction-wsl 2.3、2.4 |
| 8 | HUD のデモ | 0:40 | 実際の表示（ライブまたは録画） | direction-wsl 2.6 |
| 9 | reveal.js 連携: 構成 | 0:40 | ブラウザ ↔ `ws://<ip>/servo-ws` | direction-win 6、stackchan-bridge.js |
| 10 | 撫でで操作する | 0:50 | 前後の撫で、頭上のタップ | direction-win 6 |
| 11 | スライドごとの指定 | 0:50 | `data-stackchan-*` 属性 | stackchan-bridge.js |
| 12 | 注意点 | 0:30 | 手動操作中の動き、https と ws:// | direction-win 6、direction-wsl 2.7 |
| 13 | 課題と次のステップ | 0:30 | ヨーのずれ、ネットワーク、表情 | direction-win 10、direction-wsl 2.4 |
| 14 | まとめ | 0:20 | 3 行まとめ | direction-win 11 |
| 15 | 質疑 | - | QR またはリンク | - |

合計: 9:10（仮）**[要確認]**。発表時間が決まったら、この配分を直します。（2026-10-25 訂正: 以前の「6:00」は足し算の誤りでした。各スライドの時間の合計は 9:10 です。）

---

## 各スライドの台本

### 1. タイトル（0:20）

**スライド**
> MAVStackchan
> Stack-chan as a MAVLink vehicle — MAVLink and reveal.js

**台本**
> Stack-chan を、ドローンの地上局ソフトから「機体」として見えるようにしました。
> 今日は、MAVLink との連携と、reveal.js との連携を紹介します。

---

### 2. 全体像（0:40）

**スライド**: 3 本の経路の図
- (1) Stack-chan ⇄ Wi-Fi / MAVLink(UDP) ⇄ 地上局（QGC）
- (2) ブラウザ（reveal.js）⇄ `ws://<ip>/servo-ws` ⇄ Stack-chan
- (3) Stack-chan → `telemetry.py` → `serve.py` → `hud.js`（デッキ上の HUD）

**台本**
> 経路は 3 つあります。
> 1 つ目は、Stack-chan が MAVLink で地上局に状態を送る経路です。
> 2 つ目は、発表資料のブラウザが、Stack-chan に直接 WebSocket でつながる経路です。
> 3 つ目は、同じ MAVLink を PC で受けて、スライドの上に HUD として重ねる経路です。

**補足（発表者用）**
- (1): `direction-win.md` 1、2 章
- (2): `direction-win.md` 6 章、`en-2/stackchan-bridge.js`
- (3): `direction-wsl.md` 2.3、2.4

---

### 3. 何ができているか（0:40）

**スライド**: 状態の表（`direction-win.md` 2 章の表）

| Phase | 内容 | 状態 |
|---|---|---|
| 1 | Wi-Fi UDP、HEARTBEAT、GCS 検知 | 実機確認済み |
| 2 | IMU 姿勢（ATTITUDE 20Hz）と HUD 表示 | 実機確認済み |
| 3 | ARM / DISARM、HOLD / MANUAL | 実機確認済み |
| 4 | バーチャルスティックで頭部を動かす | 実装済み（**[要確認]**） |
| 5 | 表情・音声との統合 | 一部実装（スライドモード・状態音） |

**台本**
> Phase 1 から 3 までは、実機で確認しています。
> Phase 4 は、頭部をスティックで動かす部分です。
> Phase 5 は、今回は一部だけです。

**補足**: Phase 4 の確認状況は、発表前に確定させてください（`direction-win.md` 0 章）。

---

### 4. MAVLink: 姿勢を送る（0:50）

**スライド**
- BMI270 IMU、100Hz で読む
- 相補フィルタで roll / pitch を推定
- ATTITUDE を 20Hz で送る
- 注記: 「ヨーは磁気補正なしのためドリフトする」

**台本**
> 内蔵の IMU を 100Hz で読み、相補フィルタで傾きを推定しています。
> それを ATTITUDE として 20Hz で地上局に送っています。
> 起動直後の 2 秒間は、機体を水平に置いて静止させます。その姿勢を 0 度として扱います。
> ロールは、HUD で見ると左右が逆だったので、符号を反転しています。
> ヨーは磁気補正が無いので、時間とともにずれます。これは正直に残っている課題です。

**補足**: 水平の取り直しは、QGC の Vehicle Setup > Sensors の「Level horizon」（約 2 秒、ARM 中は不可）。（`direction-win.md` 3 章）

---

### 5. MAVLink: ARM とモードの安全設計（0:50）

**スライド**: 状態遷移の図（HOLD / MANUAL × DISARMED / ARMED）
- 起動直後: HOLD、DISARMED
- ARM はリンクが生きている間だけ受け付ける
- リンク切断 → 自動で DISARM
- 再接続しても、自動では ARM しない

**台本**
> 状態は、モードと ARM 状態の 2 つです。起動直後は HOLD で DISARMED です。
> ARM は、地上局とのリンクが生きているときだけ受け付けます。
> リンクが切れたら、自動で DISARM します。再接続しても、自動では ARM しません。
> 機体を勝手に動かさないための設計です。

---

### 6. MAVLink: 頭部を動かす（0:40）

**スライド**: スティック → 頭部の対応図
- x → チルト、y → パン（符号は反転）
- 動くのは、ARM 中かつ MANUAL のときだけ
- 500ms 入力が無ければ中立に戻す（**[要確認]**: デフォルト値）
- 可動範囲は設定ファイルの上下限を超えない

**台本**
> 地上局のバーチャルスティックの入力を、頭部サーボの角度に変えています。
> 動くのは、ARM 中で、かつ MANUAL のときだけです。
> 入力が 500 ミリ秒届かなければ、中立に戻します。
> 可動範囲は、設定ファイルの上下限を超えません。
> 注意点が 1 つあります。Y 軸は、中立の 90 度から 0 度から 90 度までしか動きません。両側に振るには、設定を変える必要があります。

**補足**: 「500ms」と「Y 軸の範囲」は `direction-win.md` の記載です。機体での値は、このセッションでは確認していません。

---

### 7. MAVLink → HUD（0:50）

**スライド**: 流れの図
`Stack-chan` → (MAVLink UDP) → `telemetry.py` → (POST /api/telemetry) → `serve.py` → (GET, 100ms) → `hud.js`

表: HUD に出る値と、もとの MAVLink
- 傾き、方位: `ATTITUDE`
- モード、アーム: `HEARTBEAT`（アームは `SAFETY_ARMED` フラグ）
- 位置: `GLOBAL_POSITION_INT`
- 速度、高度: `VFR_HUD`

**台本**
> Stack-chan が送る MAVLink は、もともと地上局用です。
> PC の `telemetry.py` が同じ MAVLink を受けて、最新の値を `serve.py` に送ります。
> デッキの HUD は、そこから 100 ミリ秒ごとに値を読んで、表示を更新します。
> 3 秒以上値が来なければ、HUD は NO LINK になります。

**補足（発表者用）**
- `telemetry.py` は、位置（`GLOBAL_POSITION_INT`）を受けるまで POST しません。Stackchan が位置を送る前提です（`direction-wsl.md` 2.3）。
- 送信元の混在（Mission Planner や QGC と同じポート）は、送信元の system ID で分けます（`direction-wsl.md` 2.5）。
- ネットワーク（WSL2 の NAT では UDP が届かない）は、スライドには入れません。付録にあります。

---

### 8. HUD のデモ（0:40）

**スライド**: HUD を重ねたデッキの画面（ライブ、または録画）

**台本**
> ここで、実際の表示を見てみます。
> （デモ）機体を傾けると、姿勢の表示が追いかけます。
> 方位は磁気補正が無いので、ゆっくりずれていくのが分かります。

**補足**
- 録画を使う場合は、スライドに「録画」と書きます。
- 機体が無いときは、`?demo` で模擬の機体を表示できます。その場合は、スライドに「シミュレーション（DEMO）」と書きます（`direction-wsl.md` 2.6）。
- 方位のずれは、デモで見せるかどうか決めてください。**[要確認]**

---

### 9. reveal.js 連携: 構成（0:40）

**スライド**: 構成図
- ブラウザ（reveal.js + `stackchan-bridge.js`）
- ⇄ `ws://<ip>/servo-ws`（WebSocket）
- ⇄ Stack-chan
- 注記: スライド操作は PC のサーバーを挟まない

**台本**
> 発表資料は reveal.js で作っています。
> ブラウザが、Stack-chan に直接 WebSocket でつながります。
> スライド操作だけなら、PC のサーバーは挟みません。
> つなぐ先は、URL の `sc` で指定します。一度指定すれば、次回から覚えています。

**補足**: `?sc=<ip>` は `localStorage`（`stackchan-host`）に保存されます（`stackchan-bridge.js`）。

---

### 10. 撫でで操作する（0:50）

**スライド**: 操作の一覧
- 頭を前から後ろへ撫でる → 次のスライド
- 後ろから前へ撫でる → 前のスライド
- 頭上 2 回タップ → 挨拶
- 頭上 3 回タップ → うなずき
- 頭上 4 回タップ → 一回転

**台本**
> 頭を撫でると、スライドが進みます。
> 2 回タップすると挨拶、3 回でうなずき、4 回で一回転します。
> 発表者は、手元で何も押さなくて済みます。

**補足**: 操作の一覧は `direction-win.md` 6 章。WSL 側で受けるのは `control` の `next` / `prev` だけです（`stackchan-bridge.js`）。挨拶などの動作は機体側の処理です。

---

### 11. スライドごとの指定（0:50）

**スライド**: 属性の例（コード）
```html
<section data-stackchan-motion="nod"
         data-stackchan-led='{"pattern":"breath","color":"#0078C8","speed":5}'>
```
- `data-stackchan-motion`: nod / shake / spin / none
- `data-stackchan-led`: LED の色とパターン（次のスライドまで保持）
- タイトル: 見出し（または `data-stackchan-title`）を、吹き出しに出す（40 文字まで）

**台本**
> スライドごとに、動きと LED を HTML の属性で指定できます。
> 発表者が設定画面をいじる必要はありません。
> 吹き出しには、そのスライドの見出しが出ます。

**補足**
- 表情（`data-stackchan-expression`）は、このスライドでは扱いません。WSL 側の bridge は送っていないためです（`direction-wsl.md` 2.2）。**[要確認]**
- 「手動で操作している間は、スライドによる首の動きは行わない」ことは、12 のスライドで話します。

---

### 12. 注意点（0:30）

**スライド**
- 手動で操作している間は、スライドによる首の動きを止める
- https のページからは ws:// に接続できない
- HUD は `serve.py` 経由で開く（file:// では動かない）

**台本**
> 注意点が 3 つあります。
> 手で操作している間は、スライドの首の動きは止まります。
> 公開された https のページからは、機体につながりません。その場合は、PC でローカル配信します。
> HUD を使うなら、PC の `serve.py` 経由で開きます。

**補足**: 1 つ目は `direction-win.md` 6 章。2 つ目は同じく 6 章。3 つ目は `direction-wsl.md` 2.7。

---

### 13. 課題と次のステップ（0:30）

**スライド**
- ヨーのドリフト（磁気補正なし）
- Stack-chan の MAVLink を WSL に届ける（WSL2 のネットワーク）
- 表情の送り方（機体側か、WSL 側か）
- カメラ映像の HUD は保留（内蔵カメラは前方を映さない）

**台本**
> 残っている課題は 4 つです。
> ヨーのずれ、WSL へのネットワーク、表情の扱いです。
> カメラ映像の HUD は、内蔵カメラが前方を向かないので、いまは保留にしています。

---

### 14. まとめ（0:20）

**スライド**: 3 行まとめ
1. 姿勢と状態は、MAVLink で地上局と HUD に出る
2. ARM と頭部の動きは、安全のために条件を絞っている
3. 頭を撫でてスライドを進め、動きと LED が連動する

**台本**
> まとめます。
> 姿勢と状態は、MAVLink で地上局に出て、スライドの HUD にも出ます。
> ARM と頭部の動きは、安全のために条件を絞っています。
> 頭を撫でると、スライドが進み、動きと LED も連動します。

---

### 15. 質疑

**スライド**: 連絡先、リンク、QR（`direction-win.md` の資料に合わせて作成）

**台本**
> ご質問があれば、お願いします。

---

## 付録（時間が余ったときや、質問用）

- **ネットワーク**: WSL2 の NAT では、Stack-chan からの UDP が届きません。ミラーモードか、ポート転送が必要です（`direction-wsl.md` 2.4）。
- **状態音**: 接続、切断、ARM、モード変更で 1 回鳴ります。音は仮のビープ音です（`direction-win.md` 7 章）。
- **設定画面**: 機体の右上隅をタップして開きます（`direction-win.md` 8 章）。
- **位置**: 位置は、スマホが最後に報告した値を使います。機体の位置とは一致しません（`direction-win.md` 9 章）。
- **Wi-Fi**: SSID は、機体では入力できず、候補から選びます（`direction-win.md` 8 章）。

---

## 未確認の事項（台本に影響するもの）

1. 発表時間と言語（英語か日本語か）。
2. 発表で使う HUD（WSL の `hud.js` か、QGC の姿勢 HUD か）。
3. Stackchan の MAVLink の送信先、heartbeat の type、mode 名。
4. 表情（`expression`）を機体側で循環させるか、WSL から送るか。
5. Phase 4 の実機確認状況。
6. 500ms と Y 軸の範囲の値（機体での確認）。

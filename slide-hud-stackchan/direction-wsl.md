# WSL 側の作業指示（スライドモード・HUD 連携）

Win 側の台本は `direction-win.md`（この同じフォルダ）です。このファイルは、WSL 側で不足している作業だけを書いています。すでにある資産は重複して書きません。

作成日: 2026-10-25

---

## 0. 前提

- 新しいデッキは `slide-hud-stackchan/index.html` に作ります。`en-2/` と同じ深さなので、`../api/telemetry`・`../api/state` の相対パスがそのまま使えます。
- 「HUD」は、この作業では **`en-2/hud.js` の HUD ウィジェット**（地図 + 姿勢・速度・高度・モード・アーム状態）を指します。Win 側の (A) QGC の姿勢 HUD とは別物です。下の 2.3 で、Stackchan の MAVLink を hud.js に流す案を書いています。**[要確認]**: 発表で使う HUD がどちらか、発表者に確認してください。
- 地上局（GCS）は、Win 側の台本では QGC です。hud.js へ流すデータは、WSL の `telemetry.py` が受けます。`telemetry.py` は Mission Planner の UDP を前提に作られています。

---

## 1. 既にあるもの（再利用する）

| 資産 | 場所 | 役割 |
|---|---|---|
| `stackchan-bridge.js` | `en-2/` | reveal.js プラグイン。`?sc=<ip>` で `ws://<ip>/servo-ws` に接続。スライド変更を送信、頭の撫でで next/prev を受信 |
| `hud.js` / `hud.css` | `en-2/` | HUD ウィジェット。`?hud` / `?hud=compact` / `?hud=top` / `?demo` / `?ghost` / `?edit` で表示を切り替え |
| `serve.py` | `apdc2026-arivia/` | 静的配信、`/api/state`（スライド同期）、`/api/telemetry`（HUD 用） |
| `telemetry.py` | `apdc2026-arivia/` | UDP 14551 で MAVLink を受け、`/api/telemetry` に POST |

`stackchan-bridge.js` が送るもの（確認済み）:

- `slide`: `indexh`、`indexv`、`title`（40 文字まで）、`motion`（`data-stackchan-motion`）、`led`（`data-stackchan-led`）
- `ping`: 10 秒ごと（ファームは 90 秒無通信で切断）
- 受信: `control` の `next` / `prev`
- 1 フレーム 420 バイト以内に収めるため、タイトルを削ります
- 切断時は 1 秒から 5 秒の間隔で再接続します

---

## 2. 不足している作業（WSL 側 TODO）

### 2.1 新デッキの作成（必須）

- `en-2/index.html` を雛形にして `slide-hud-stackchan/index.html` を作ります。
- 読み込むもの: reveal.js、Leaflet（CSS と JS）、`hud.css`、`stackchan-bridge.js`、`hud.js`。`stackchan-bridge.js` は `en-2/` のものを参照するか、コピーします。**[要確認]**: 共通化するかどうか（前回の方針 A / B を参照）。
- `theme.js` を読み、CSS 変数（`--box`、`--line`、`--sunk`、`--accent`、`--accent2`、`--muted`）が定義されていることを確認します。
- `<section>` に `data-stackchan-motion`、`data-stackchan-led` を付けます。HUD を隠す区間だけ `data-hud="off"` を付けます（それ以外は HUD が表示されます）。

### 2.2 `data-stackchan-expression` の対応（Win 台本と不一致）

- `direction-win.md` の 6 章は、`data-stackchan-expression` と「6 枚ごとの表情循環」を書いています。しかし `stackchan-bridge.js` は表情を送っていません。
- 対応案: `stackchan-bridge.js` の `sendSlide()` に次の 1 行を足します。

  ```js
  if (el && el.dataset.stackchanExpression) msg.expression = el.dataset.stackchanExpression;
  ```

- ただし、ファームが `expression` を受け取るかどうかは Win 側で確認が必要です。「6 枚ごとの循環」を機体側でやっているなら、WSL 側は何もしなくてよいです。**[要確認]**

### 2.3 HUD へ Stackchan の MAVLink を流す（今回の中心）

`telemetry.py` は次のメッセージを読みます。Stackchan が同じメッセージを送れば、そのまま hud.js に出ます。

| hud.js の表示 | MAVLink | Stackchan の対応（Win 側台本の該当箇所） |
|---|---|---|
| 傾き（roll / pitch） | `ATTITUDE` | Phase 2（20Hz）。符号は Win 側で反転済み |
| 方位 | `ATTITUDE`（yaw） | Phase 2。ただし磁気補正なしでドリフト |
| モード | `HEARTBEAT`（`mode_string_v10`） | Phase 3（HOLD / MANUAL） |
| アーム | `HEARTBEAT`（`SAFETY_ARMED` フラグ） | Phase 3（ARM / DISARM） |
| 位置 | `GLOBAL_POSITION_INT` | 位置（Worker 経由のスマホ位置）。**送らないと `telemetry.py` は POST しません** |
| 速度・高度 | `VFR_HUD` | 高度は 0 を送る予定（Win 台本 9 章） |
| 電池 | `SYS_STATUS` | 未定。送らなければ `--` のまま |
| 電波 | `RADIO_STATUS` | 未定。送らなければ `--` のまま |

確認が必要な点（Win 側と合わせる）:

- **モード名**: `mavutil.mode_string_v10` は、autopilot の種類によって名前の表を切り替えます。Stackchan が HOLD / MANUAL をどの autopilot type と custom_mode で送るか決めてください。合わない場合、hud.js の MODE 欄は `--` か誤った名前になります。
- **アームフラグ**: `base_mode` の `MAV_MODE_FLAG_SAFETY_ARMED` を立てて送る必要があります。
- **送信元の混在**: Mission Planner や QGC と Stackchan が同じ 14551 に送ると、値が混ざります。`telemetry.py` で `msg.get_srcSystem()` を見て、1 台だけ採用するように直すのが安全です。**[要確認]**: 採用する機体の system ID。

### 2.4 Stackchan の MAVLink を WSL に届ける（最大のリスク）

- `telemetry.py` は WSL で `0.0.0.0:14551` を待ちます。Stackchan が Wi-Fi 越しに送る先は **Windows の LAN IP** です。
- WSL2 の既定（NAT）では、LAN からの UDP が WSL に届きません。次のどちらかで解決します。
  - **A. ミラーモード**: `%UserProfile%\.wslconfig` に `networkingMode=mirrored` を書き、WSL を再起動します。
  - **B. ポート転送**: Windows で `netsh interface portproxy` を設定します（UDP の転送は設定が面倒です）。
- 別案: Windows 側で `mavproxy` や `mavlink-router` を動かし、14551 を WSL に複製します。Win 側と相談してください。**[要確認]**
- 発表当日に詰まりやすいので、事前に「Stackchan → WSL の telemetry.py」まで 1 回通してください。

### 2.5 `telemetry.py` の小さな修正（送信元と起動メッセージ）

- 送信元フィルタ（2.3 の項目）。
- 起動時に、受信中の system ID と mode 名を 1 行で表示する（デバッグ用）。**[要確認]**: 追加するかどうか。

### 2.6 デモ用のフォールバック

- Stackchan が無い、または MAVLink が届かない場合でも、`?demo` で hud.js は模擬の機体を表示します（ラベルは DEMO）。台本の HUD 部分はこれで見せられます。
- 発表では **`?demo` を使うときは、スライドで「シミュレーション」と明示** してください。

### 2.7 URL と起動手順（発表者用）

- 起動: `apdc2026-arivia/` で `python3 serve.py`（既定 8000 番）。`telemetry.py` も同じ場所で別ターミナルから起動します。
- 開く URL の例: `http://localhost:8000/slide-hud-stackchan/index.html?sc=<Stackchan の IP>&hud=compact`
- `?sc=` は `localStorage`（`stackchan-host`）に残ります。一度開けば次回は省略できます。
- `?hud` の指定（`compact` / `top`）は URL に毎回付けます（保存されません）。
- 位置の調整（`?edit`）と保存のリセット（`?reset`）は、リハーサルで決めてから発表用 URL に戻します。
- **file:// で開かない**: HUD は `/api/telemetry` を読むので、`serve.py` 経由が必要です。`direction-win.md` 6 章の「ローカルに保存して開く」は、HUD を使うなら成立しません。

---

## 3. 順番（WSL 側）

1. `slide-hud-stackchan/index.html` を作り、reveal.js と hud.js と bridge を読み込む（2.1）
2. `?demo` で HUD の表示とスライドの切り替えを確認（2.6）
3. `?sc=<IP>` で Stackchan に接続し、撫でで next/prev、スライド変更で motion と LED が動くか確認（1）
4. 表情を送るか決める（2.2）。Win 側と合わせる
5. Stackchan の MAVLink を WSL で受ける（2.4）→ `telemetry.py` の送信元フィルタ（2.5）
6. hud.js に姿勢・モード・アームが出るか確認（2.3）。方位のドリフトを記録する
7. 発表用 URL を決め、リハーサル（2.7）

---

## 4. 未確認（この作業では確認できていないこと）

- Stackchan 側の WebSocket 仕様（`expression` を受けるか）。Win 側のソースが WSL にないため、確認できていません。
- Stackchan の MAVLink の送信先（IP とポート）、heartbeat の type、custom_mode の割り当て。
- 2.4 のネットワーク構成（ミラーモードが使えるか、Windows の LAN 設定）。
- hud.js の表示（傾きの向き、方位の見え方）は、実際に機体を傾けて確認するまで未確認です。

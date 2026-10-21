# apdc2026-arivia

Slides for "Arivia: Water-Surface Drone Shows with ArduPilot" (ArduPilot DevConf 2026, Ottawa).

- English: `en-2/index.html` (`en/` redirects here; the old 8-slide English/Japanese decks are kept on the branch `archive/en-ja-8slides`)
  - Speaker view (en-2): press `S` for the reveal.js speaker view, or open `en-2/presenter.html` (script-first page: the whole script fits on screen, timer, next slide title; it follows and controls the slides window). Both are generated from `speaker-notes2.md` in claw-io-hub (`build_speaker_view.py`).
  - Phone / tablet script (Fold7 over USB): see [Fold7 で台本を追従表示する](#fold7-で台本を追従表示する) below.

- Links page (the QR code on the last slide points here): `links/index.html` — code branch, ArduPilot issue #9352, slides, GitHub, X, YouTube, email. The QR image is `en-2/qr-links.svg`.

Built with reveal.js (CDN). Serve over HTTP (`python3 serve.py`, or `python3 -m http.server` without the phone sync) so the embedded YouTube videos play.

- Themes: pick one on the top page, or add `?theme=night` (default) / `dracula` / `moon` / `sky` etc. to a slide URL; the choice is remembered in the browser.

## Fold7 で台本を追従表示する

PC のスライドを進めると、USB 接続した Fold7 の台本（`presenter.html`）も同じスライドに追従します。台本は追従のみで、Fold7 からはスライドを操作しません。

仕組み: `serve.py`（WSL）が配信し、スライドが切り替わるたびに現在の番号を `/api/state` に保存します。Fold7 の台本はその番号を 0.4 秒ごとに取得します。

### 初回の準備（Windows）
1. adb（Android platform-tools）を Windows に入れます。
   ```powershell
   winget install Google.PlatformTools
   ```
   見つからない場合は、Google公式の zip（https://developer.android.com/tools/releases/platform-tools ）を `C:\platform-tools` などに展開します。
2. Fold7 で開発者モードを有効にし、「USB デバッグ」をオンにします（設定 → 携帯電話情報 → ビルド番号を7回タップ）。
3. USB で接続し、画面の「USB デバッグを許可しますか？」で許可します。
4. `adb devices` で Fold7 が `device` と表示されることを確認します。何も出ない場合は、ケーブル（データ通信対応か）、USB 接続モード（「ファイル転送」）、デバイスマネージャーの表示（Samsung USB Driver の要否）を確認してください。

### 毎回の手順
1. **WSL** で配信サーバーを起動します（発表中は止めないでください）。
   ```bash
   cd ~/GitHub/claw-io-hub/drafts/20261014_apdc-arivia-talk/apdc2026-arivia
   python3 serve.py
   ```
2. **Windows（PowerShell）** で転送を設定します。USB を抜き差ししたら、この行をもう一度実行してください。
   ```powershell
   adb reverse tcp:8000 tcp:8000
   adb reverse --list
   ```
   `--list` に `tcp:8000` が出ればOKです。
3. **PC のブラウザ** でスライドを開きます。`file://` では同期されないので、必ず次の URL から開いてください。
   ```
   http://localhost:8000/en-2/index.html
   ```
4. **Fold7 の Chrome** で台本を開きます。
   ```
   http://localhost:8000/en-2/presenter.html
   ```
   発表中はスリープしないように、開発者向けオプションの「スリープモードにしない」をオンにしてください。

### 動作確認
- PC のスライドを1枚進めて、Fold7 の台本も同じ番号になるか確認します。
- WSL で `curl -s localhost:8000/api/state` を実行すると、現在の番号（`{"h": N}`）が見られます。スライドを進めて値が変われば、PC 側の送信は動いています。

### うまくいかないとき
| 症状 | 確認すること |
|---|---|
| Fold7 に「このサイトにアクセスできません」 | `adb devices` で接続されているか、`adb reverse --list` に `tcp:8000` があるか。なければ `adb reverse tcp:8000 tcp:8000` を再実行。WSL で `curl -s localhost:8000/api/state` が返るか（返らなければ `serve.py` を起動） |
| Fold7 は開くが追従しない | PC のスライドを進めて `curl` の番号が変わるか。変わらない場合は PC 側のページが古い版です。`serve.py` を Ctrl + C で止めて起動し直し、スライドを開き直してください（Ctrl + Shift + R でも可） |
| PC のスライドで番号が変わらない | アドレスバーが `http://localhost:8000/en-2/index.html` か（`file://` ではないか）。シークレットウィンドウで動くなら、通常ウィンドウのキャッシュが原因です。`serve.py` を再起動してから開き直してください |
| Fold7 の台本だけ古い | Chrome でタブを閉じてから開き直してください |

`serve.py` は `127.0.0.1:8000` で待ち受けます。WSL2 の localhost 転送が効かない環境では、`adb reverse` は通っていても表示できないことがあります。その場合は `serve.py` の待ち受けアドレスを変える必要があります。

## Fold7 で台本を無線（LAN）で表示する

USB が不安定なときは、同じネットワークの IP アドレスで開きます。adb は要りません。PC と Fold7 を同じネットワーク（例: Fold7 のテザリング）につなぎます。

Windows の IP を `ipconfig` で確認します（例: `192.168.3.38`）。WSL は NAT 方式なので、Windows から WSL へ転送が必要です。

1. **WSL で待ち受け先を LAN に変えて起動**（`--host 0.0.0.0` が必要です）
   ```bash
   python3 serve.py --host 0.0.0.0
   ```
   表示が `serving ... on http://0.0.0.0:8000/` になっていることを確認します。
2. **Windows（PowerShell、管理者）で 8000 番を WSL へ転送**
   ```powershell
   netsh interface portproxy add v4tov4 listenport=8000 listenaddress=0.0.0.0 connectport=8000 connectaddress=<WSLのIP>
   ```
   `<WSLのIP>` は WSL で `hostname -I` の先頭の値です（例: `172.19.92.194`）。
3. **Windows（PowerShell、管理者）でファイアウォールを許可**（初回のみ）
   ```powershell
   New-NetFirewallRule -DisplayName "apdc deck 8000" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow
   ```
4. **確認（PowerShell）**
   ```powershell
   Test-NetConnection 192.168.3.38 -Port 8000
   ```
   `TcpTestSucceeded : True` なら、Fold7 から開けます。
5. **Fold7 の Chrome で開く**
   ```
   http://192.168.3.38:8000/en-2/presenter.html
   ```

**注意**
- WSL を再起動すると、WSL の IP が変わります。その場合は手順 2 の転送を作り直してください（古い設定は `netsh interface portproxy delete v4tov4 listenport=8000 listenaddress=0.0.0.0` で消せます）。
- 発表が終わったら、転送を消してください。
- `serve.py` を LAN に公開すると、同じネットワークの誰でもスライドの番号を変えられます。信頼できる回線（テザリングなど）だけで使ってください。
- `portproxy` に `192.168.3.38:50021` の設定が別にある場合は、そのままにしてください（この手順とは無関係です）。

## HUD ウィジェット（地図・姿勢・速度・高度）

**起動する URL（計器を右下、半透明で表示）**
```
http://localhost:8000/en-2/?hud=compact&ghost=0.5
```
- 機体のデータを使うときは、この URL のまま開きます（接続アイコンが緑なら受信中）。
- 模擬データで動きを確認するときは、末尾に `&demo=force` を付けます。
- 右上に出すときは `?hud=top` に変えます。
- **位置と大きさの調整**: `&edit` を付けて開くと、計器をドラッグで動かせます。右下の角（オレンジの三角）をドラッグすると大きさが変わります。ダブルクリックで初期の位置と大きさに戻ります。位置と大きさは、そのブラウザに保存されます。調整が終わったら `&edit` を外してください（外すと、操作を受け付けなくなります）。`&reset` を付けると、保存を消せます。

スライドの右下に表示される小さな HUD です。**既定では表示しません**（`?hud`、`?hud=compact`、`?hud=top`、`?demo` のいずれかを URL に付けたときだけ、右下か右上に出ます）。`en-2/hud.js` と `en-2/hud.css` で作られ、テレメトリは `serve.py` の `/api/telemetry` から 0.1 秒ごとに取得します。

- **地図つき**: `?hud` を付けると、地図・姿勢・速度・高度を表示します。
- **デモ表示**: 機体がつながっていなくても動きを確認できます。`http://localhost:8000/en-2/index.html?demo` で開くと、模擬データを「DEMO」と表示します。
- **計器だけ（地図なし）**: `?hud=compact` で右下、`?hud=top` で右上に、地図と速度・高度を隠した幅 220px の計器を表示します。姿勢計（緑が地面、青が空）とコンパス（方位、赤い N）を並べ、下にモード、アーム、バッテリー、電波（RSSI）、接続状態を出します（`http://localhost:8000/en-2/index.html?hud=top&demo`）。`&ghost` を足すと、計器全体（文字を含む）が薄くなり、背景のように見えます（`?hud=top&ghost&demo`）。濃さは `&ghost=0.3`（薄い）から `&ghost=0.7`（濃い）のように指定でき、既定は 0.5 です。
- **非表示**: 写真や動画と重なるスライドの `<section>` に `data-hud="off"` を付けると、そのスライドでは隠れます。
- **テレメトリの形式**: `POST /api/telemetry` に次のキーを JSON で送ります。`lat`, `lon`（度）、`alt`（m）、`spd`（m/s）、`hdg`（度）、`roll`, `pitch`（度）、`mode`（文字列）、`armed`（真偽値）、`batt`（%）、`rssi`（電波の強さ %、任意）。サーバーが受信時刻 `t` を付けます。3 秒以上届かないと接続アイコン（コンセント）が赤になります。計器の下部は、電池（残量の色と数値）、電波（4 本の棒と数値）、接続（コンセントの色）のアイコンで表示します。
- **実機・SITL の値を流す**: `telemetry.py` が Mission Planner の UDP 出力（14551）を受けて、`serve.py` に送ります。
  1. WSL に pymavlink を入れます（初回のみ）: `pip3 install pymavlink`
  2. Mission Planner の Advanced Tools（`Ctrl + F`）→ MAVLink の転送を Outbound、UDP、送り先 `127.0.0.1` ポート `14551`、Write access はオフで接続します。
  3. `serve.py` と同じ WSL で、`python3 telemetry.py` を実行します（既定は `--listen 14551`、`--server http://localhost:8000`）。受信数が表示されれば、Mission Planner からのデータが届いています。
  4. HUD を `?hud=compact` などで開くと、機体の値が出ます（`&demo` は外す）。機体の接続が切れると 3 秒後に接続アイコンが赤になります。
- **注意**: 地図のタイルは OpenStreetMap から読み込むので、インターネットに接続している必要があります。

# apdc2026-arivia

Slides for "Arivia: Water-Surface Drone Shows with ArduPilot" (ArduPilot DevConf 2026, Ottawa).

- English: `en-2/index.html` (`en/` redirects here; the old 8-slide English/Japanese decks are kept on the branch `archive/en-ja-8slides`)
  - Speaker view (en-2): press `S` for the reveal.js speaker view, or open `en-2/presenter.html` (script-first page: the whole script fits on screen, timer, next slide title; it follows and controls the slides window). Both are generated from `speaker-notes2.md` in claw-io-hub (`build_speaker_view.py`).
  - Phone / tablet script (Fold7 over USB): see [Fold7 で台本を追従表示する](#fold7-で台本を追従表示する) below.

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

## HUD ウィジェット（地図・姿勢・速度・高度）

スライドの右下に常に表示される小さな HUD です。`en-2/hud.js` と `en-2/hud.css` で作られ、テレメトリは `serve.py` の `/api/telemetry` から 0.1 秒ごとに取得します。

- **デモ表示**: 機体がつながっていなくても動きを確認できます。`http://localhost:8000/en-2/index.html?demo` で開くと、模擬データを「DEMO」と表示します。
- **計器だけ（地図なし）**: `?hud=compact` で右下、`?hud=top` で右上に、地図と速度・高度を隠した幅 220px の計器を表示します。姿勢計（緑が地面、青が空）とコンパス（方位、赤い N）を並べ、下にモード、アーム、バッテリー、電波（RSSI）、接続状態を出します（`http://localhost:8000/en-2/index.html?hud=top&demo`）。`&ghost` を足すと、計器全体（文字を含む）が薄くなり、背景のように見えます（`?hud=top&ghost&demo`）。濃さは `&ghost=0.3`（薄い）から `&ghost=0.7`（濃い）のように指定でき、既定は 0.5 です。
- **非表示**: 写真や動画と重なるスライドの `<section>` に `data-hud="off"` を付けると、そのスライドでは隠れます。
- **テレメトリの形式**: `POST /api/telemetry` に次のキーを JSON で送ります。`lat`, `lon`（度）、`alt`（m）、`spd`（m/s）、`hdg`（度）、`roll`, `pitch`（度）、`mode`（文字列）、`armed`（真偽値）、`batt`（%）、`rssi`（電波の強さ %、任意）。サーバーが受信時刻 `t` を付けます。3 秒以上届かないと接続アイコン（コンセント）が赤になります。計器の下部は、電池（残量の色と数値）、電波（4 本の棒と数値）、接続（コンセントの色）のアイコンで表示します。
- **実機・SITL の値を流す**: `telemetry.py` が Mission Planner の UDP 出力（14551）を受けて、`serve.py` に送ります。
  1. Windows に pymavlink を入れます: `pip install pymavlink`
  2. Mission Planner の Advanced Tools（`Ctrl + F`）→ MAVLink の転送を Outbound、UDP、送り先 `127.0.0.1` ポート `14551`、Write access はオフで接続します。
  3. `serve.py` を WSL で起動したまま、Windows で `python telemetry.py` を実行します（既定は `--listen 14551`、`--server http://localhost:8000`）。
  4. HUD を `?hud=compact` などで開くと、機体の値が出ます（`&demo` は外す）。機体の接続が切れると 3 秒後に接続アイコンが赤になります。
- **注意**: 地図のタイルは OpenStreetMap から読み込むので、インターネットに接続している必要があります。

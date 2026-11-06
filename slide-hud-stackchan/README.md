# slide-hud-stackchan: 起動手順

発表用デッキ（`index.html`）を、Stack-chan（HermesLLM ファーム）と連携して開くための手順です。

## 1. 事前の確認（機体側）

- Stack-chan の**スライドモードが ON** か確認する（設定 > Main > `Slide mode: ON` > Save）。既定は OFF です。
- Stack-chan の **IP を確認する**。画面の設定、または Web 設定ページ（`http://<IP>/`）で確認します。
  - `http://<IP>/` で設定ページが出ない場合、IP が違います。ページは開かず、IP を探し直してください。

## 2. 起動コマンド（WSL、`apdc2026-arivia/` で実行）

```bash
cd /home/ardupilot/GitHub/claw-io-hub/drafts/20261014_apdc-arivia-talk/apdc2026-arivia
python3 serve.py
```

- 既定はポート 8000、待ち受けは `127.0.0.1` です。
- HUD に実機の値を出す場合だけ、別のターミナルで次も起動します（pymavlink が必要）。

```bash
cd /home/ardupilot/GitHub/claw-io-hub/drafts/20261014_apdc-arivia-talk/apdc2026-arivia
python3 telemetry.py
```

- `telemetry.py` は、MAVLink（UDP 14551）が届いているときだけ HUD に値を出します。Stack-chan の動きだけを確かめるなら、起動しなくて構いません。

## 3. 開く URL（Windows のブラウザ）

Stack-chan に接続する（HUD なし）:

```
http://localhost:8000/slide-hud-stackchan/index.html?sc=<Stack-chan の IP>
```

カードの位置を動かす（`?edit`、位置を決めたら外す）:

```
http://localhost:8000/slide-hud-stackchan/index.html?edit&sc=<Stack-chan の IP>
```

HUD も出す（右下に小さく表示）:

```
http://localhost:8000/slide-hud-stackchan/index.html?sc=<Stack-chan の IP>&hud=compact
```

- `<Stack-chan の IP>` は、手順 1 で確認した IP に置き換えます。
- `?sc=` は、いったん開くとブラウザに保存されます。次回は省いても動きます。

## 4. 動作確認

1. ブラウザで開き、キーボードの → キーでスライドを進める。
2. Stack-chan が表情と動きを変えれば成功です。
3. 反応しない場合:
   - ブラウザのデベロッパーツールのコンソールに `[stackchan] connected <IP>` が出ているか確認する。
   - Stack-chan のシリアルモニタに `Slide changed: h=… mode=1` が出ているか確認する（`mode=0` ならスライドモードが OFF）。

## 5. 補足

- `file://` で開くと、HUD と端末間の同期は動きません。Stack-chan の操作だけなら動きます。
- `serve.py --host 0.0.0.0` にすると、LAN 上の別の端末から開けます。その場合、誰でもスライドを切り替えられるので注意してください。

## 6. このフォルダのファイル

| ファイル | 役割 |
|---|---|
| `index.html` | 発表デッキ本体（15 枚） |
| `stackchan-card.js` / `stackchan-card.css` | 画面左下に、表情・動き・LED を毎回表示するカード |
| `direction-win.md` / `direction-wsl.md` | 台本と作業指示 |
| `outline.md` | アウトラインと台本 |

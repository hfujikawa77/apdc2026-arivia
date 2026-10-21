#!/usr/bin/env python3
"""Relay MAVLink telemetry from Mission Planner (UDP Outbound) to the HUD widget.

usage: python telemetry.py [--listen 14551] [--server http://localhost:8000]

Run it in WSL, next to serve.py (pip3 install pymavlink). Mission Planner sends the MAVLink
stream to UDP <listen> on 127.0.0.1; this script keeps the latest values and POSTs them to
serve.py (/api/telemetry), which the HUD (en-2/hud.js) polls.
Nothing is posted while the MAVLink stream is silent, so the HUD shows NO LINK when the link drops.
"""
import argparse, json, math, time, urllib.request
from pymavlink import mavutil

MIN_INTERVAL = 0.05  # seconds between POSTs (20 Hz)


def post(url, data):
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'),
                                 headers={'Content-Type': 'application/json'}, method='POST')
    urllib.request.urlopen(req, timeout=1).close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--listen', type=int, default=14551, help='UDP port Mission Planner sends to')
    ap.add_argument('--server', default='http://localhost:8000', help='serve.py address')
    a = ap.parse_args()

    conn = mavutil.mavlink_connection(f'udpin:0.0.0.0:{a.listen}')
    url = a.server.rstrip('/') + '/api/telemetry'
    tele = {'roll': 0, 'pitch': 0, 'hdg': 0, 'spd': 0, 'alt': 0,
            'batt': None, 'rssi': None, 'mode': '--', 'armed': False}
    last_post = 0.0
    last_report = time.time()
    counts = {}  # messages received per type, reset every report
    posted = 0
    failing = False
    print(f'listening on UDP {a.listen}, posting to {url} (Ctrl+C to stop)')

    while True:
        msg = conn.recv_match(blocking=True)
        if msg is None:
            continue
        t = msg.get_type()
        counts[t] = counts.get(t, 0) + 1
        if time.time() - last_report >= 5:  # rates per type, so a slow stream is visible
            secs = time.time() - last_report
            rates = ' '.join(f'{k}={v / secs:.1f}/s' for k, v in sorted(counts.items()))
            print(f'posted {posted / secs:.1f}/s | {rates}')
            counts, posted, last_report = {}, 0, time.time()
        if t == 'HEARTBEAT':
            if msg.type == mavutil.mavlink.MAV_TYPE_GCS:
                continue
            tele['mode'] = mavutil.mode_string_v10(msg)
            tele['armed'] = bool(msg.base_mode & mavutil.mavlink.MAV_MODE_FLAG_SAFETY_ARMED)
        elif t == 'ATTITUDE':
            tele['roll'] = math.degrees(msg.roll)
            tele['pitch'] = math.degrees(msg.pitch)
            tele['hdg'] = math.degrees(msg.yaw) % 360  # yaw follows the vehicle's turns directly
        elif t == 'VFR_HUD':
            tele['spd'] = msg.groundspeed
            tele['alt'] = msg.alt
        elif t == 'GLOBAL_POSITION_INT':
            tele['lat'] = msg.lat / 1e7
            tele['lon'] = msg.lon / 1e7
        elif t == 'SYS_STATUS':
            if msg.battery_remaining >= 0:
                tele['batt'] = msg.battery_remaining
        elif t == 'RADIO_STATUS':
            tele['rssi'] = min(100, round(msg.rssi * 100 / 254))  # SiK radio reports 0-254
        else:
            continue

        now = time.time()
        if 'lat' not in tele or now - last_post < MIN_INTERVAL:
            continue
        try:
            post(url, tele)
            posted += 1
            if failing:
                print('serve.py reachable again')
                failing = False
        except OSError as e:
            if not failing:
                print(f'post failed (is serve.py running?): {e}')
                failing = True
        last_post = now


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        pass

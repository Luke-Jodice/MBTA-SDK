#!/usr/bin/env python3
"""Fill null stop IDs in public/stations.json from MBTA GTFS (stops.txt).

For each parent station (place-*), uses the lexicographically smallest numeric
child platform stop_id (location_type=0). Stops with no GTFS parent (e.g.
retired place-buwst) stay null."""

from __future__ import annotations

import csv
import io
import json
import sys
import urllib.request
import zipfile
from pathlib import Path

GTFS_URL = "https://cdn.mbta.com/MBTA_GTFS.zip"
REPO_ROOT = Path(__file__).resolve().parents[1]
STATIONS_PATH = REPO_ROOT / "public" / "stations.json"


def load_min_platform_id_by_parent() -> dict[str, str]:
    raw = urllib.request.urlopen(GTFS_URL, timeout=120).read()
    z = zipfile.ZipFile(io.BytesIO(raw))
    text = z.read("stops.txt").decode("utf-8")
    reader = csv.DictReader(text.splitlines())
    by_parent: dict[str, list[str]] = {}
    for row in reader:
        if row.get("location_type") != "0":
            continue
        sid = (row.get("stop_id") or "").strip()
        if not sid.isdigit():
            continue
        par = (row.get("parent_station") or "").strip()
        if not par.startswith("place-"):
            continue
        by_parent.setdefault(par, []).append(sid)
    return {p: min(sids, key=int) for p, sids in by_parent.items()}


def main() -> int:
    min_child = load_min_platform_id_by_parent()
    data = json.loads(STATIONS_PATH.read_text())
    filled = 0
    for row in data:
        if row.get("id") is not None:
            continue
        ls = row.get("line_short")
        if not ls or not isinstance(ls, str):
            continue
        nid = min_child.get(ls)
        if nid:
            row["id"] = nid
            filled += 1
    STATIONS_PATH.write_text(json.dumps(data, indent=2) + "\n")
    remaining = sum(1 for r in data if r.get("id") is None)
    print(f"Filled {filled} stop id(s); {remaining} row(s) still null.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

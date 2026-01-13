#!/usr/bin/env python3
import argparse
import json
import re
import unicodedata
from pathlib import Path
from typing import Dict, List, Tuple


def normalize_name(value: str) -> str:
    value = value.strip().lower()
    value = unicodedata.normalize("NFKD", value)
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    value = re.sub(r"[^\w\s-]", " ", value)
    value = value.replace("-", " ")
    value = re.sub(r"\s+", " ", value).strip()
    return value


def score_area(area: dict) -> int:
    score = 0
    if area.get("wikidata"):
        score += 2
    if area.get("wikipedia"):
        score += 1
    if area.get("admin_level") == "10":
        score += 1
    return score


def dedupe_city_areas(areas: List[dict]) -> Tuple[List[dict], List[dict]]:
    kept_by_key: Dict[str, dict] = {}
    duplicates: List[dict] = []

    for area in areas:
        name = area.get("name") or ""
        key = normalize_name(name)
        if not key:
            duplicates.append({**area, "duplicate_of": None, "reason": "empty_name"})
            continue
        existing = kept_by_key.get(key)
        if not existing:
            kept_by_key[key] = area
            continue
        # Prefer the entry with the higher score, keep the other as duplicate.
        if score_area(area) > score_area(existing):
            duplicates.append({**existing, "duplicate_of": area.get("id")})
            kept_by_key[key] = area
        else:
            duplicates.append({**area, "duplicate_of": existing.get("id")})

    # Preserve deterministic order by name
    kept = list(kept_by_key.values())
    kept.sort(key=lambda item: (item.get("name") or "").lower())
    return kept, duplicates


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--input",
        default="data/exports/areas_by_city.json",
        help="Input areas_by_city JSON",
    )
    parser.add_argument(
        "--out",
        default="data/exports/areas_by_city.normalized.json",
        help="Output normalized areas_by_city JSON",
    )
    parser.add_argument(
        "--dupes",
        default="data/exports/areas_by_city.duplicates.json",
        help="Output duplicates report JSON",
    )
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    input_path = (repo_root / args.input).resolve()
    out_path = (repo_root / args.out).resolve()
    dupes_path = (repo_root / args.dupes).resolve()

    with input_path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    normalized: Dict[str, List[dict]] = {}
    duplicates: Dict[str, List[dict]] = {}

    for city_id, areas in data.items():
        if not isinstance(areas, list):
            continue
        kept, dupes = dedupe_city_areas(areas)
        normalized[city_id] = kept
        if dupes:
            duplicates[city_id] = dupes

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(normalized, f, ensure_ascii=False, indent=2)
    with dupes_path.open("w", encoding="utf-8") as f:
        json.dump(duplicates, f, ensure_ascii=False, indent=2)

    total_in = sum(len(v) for v in data.values() if isinstance(v, list))
    total_out = sum(len(v) for v in normalized.values() if isinstance(v, list))
    total_dupes = sum(len(v) for v in duplicates.values() if isinstance(v, list))
    print(f"Input areas: {total_in}")
    print(f"Normalized areas: {total_out}")
    print(f"Duplicates: {total_dupes}")
    print(f"Wrote: {out_path}")
    print(f"Wrote: {dupes_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

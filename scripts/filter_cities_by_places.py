#!/usr/bin/env python3
import argparse
import json
from pathlib import Path
from typing import Dict, List, Set


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--cities",
        default="data/exports/cities.json",
        help="Input cities JSON",
    )
    parser.add_argument(
        "--places",
        default="data/exports/places_by_city.best.json",
        help="Input places_by_city JSON",
    )
    parser.add_argument(
        "--out",
        default="data/exports/cities.filtered.json",
        help="Output filtered cities JSON",
    )
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    cities_path = (repo_root / args.cities).resolve()
    places_path = (repo_root / args.places).resolve()
    out_path = (repo_root / args.out).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)

    cities = load_json(cities_path)
    places_by_city: Dict[str, List[dict]] = load_json(places_path)

    valid_city_ids: Set[str] = set()
    for city_id, places in places_by_city.items():
        if city_id == "_unassigned":
            continue
        if isinstance(places, list) and len(places) > 0:
            valid_city_ids.add(str(city_id))

    filtered = [city for city in cities if str(city.get("id")) in valid_city_ids]
    filtered.sort(key=lambda c: (c.get("name") or "").lower())

    with out_path.open("w", encoding="utf-8") as f:
        json.dump(filtered, f, ensure_ascii=False, indent=2)

    print(f"Input cities: {len(cities)}")
    print(f"Filtered cities: {len(filtered)}")
    print(f"Wrote: {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

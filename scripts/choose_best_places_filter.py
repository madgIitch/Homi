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


def bbox_area(entry: dict) -> float:
    bbox = entry.get("bbox") or {}
    try:
        return max(0.0, (bbox["max_lon"] - bbox["min_lon"]) * (bbox["max_lat"] - bbox["min_lat"]))
    except KeyError:
        return 0.0


def quality_score(entry: dict) -> float:
    score = 0.0
    if entry.get("wikidata"):
        score += 2.0
    if entry.get("wikipedia"):
        score += 2.0
    if entry.get("admin_level"):
        score += 1.0
    if bbox_area(entry) > 0:
        score += 2.0
    return score


PLACE_PRIORITY = {
    "suburb": 1.0,
    "neighbourhood": 0.8,
    "quarter": 0.6,
}


STRATEGIES = {
    "metadata": {"wikidata": 4.0, "wikipedia": 3.0, "admin_level": 2.0, "bbox": 1.0, "place": 1.0},
    "geometry": {"wikidata": 1.0, "wikipedia": 1.0, "admin_level": 2.0, "bbox": 4.0, "place": 0.5},
    "place": {"wikidata": 2.0, "wikipedia": 1.0, "admin_level": 1.0, "bbox": 1.0, "place": 4.0},
    "balanced": {"wikidata": 2.0, "wikipedia": 2.0, "admin_level": 1.0, "bbox": 2.0, "place": 2.0},
}


def score_entry(entry: dict, weights: dict) -> float:
    score = 0.0
    if entry.get("wikidata"):
        score += weights["wikidata"]
    if entry.get("wikipedia"):
        score += weights["wikipedia"]
    if entry.get("admin_level"):
        score += weights["admin_level"]
    if bbox_area(entry) > 0:
        score += weights["bbox"]
    score += weights["place"] * PLACE_PRIORITY.get(entry.get("place"), 0.0)
    return score


def choose_best_entry(entries: List[dict], weights: dict) -> dict:
    def key(entry: dict) -> Tuple[float, float, int, int, str]:
        return (
            score_entry(entry, weights),
            bbox_area(entry),
            1 if entry.get("wikidata") else 0,
            1 if entry.get("wikipedia") else 0,
            entry.get("id") or "",
        )

    return max(entries, key=key)


def apply_strategy(data: dict, weights: dict) -> Dict[str, List[dict]]:
    output: Dict[str, List[dict]] = {}
    for city_id, entries in data.items():
        if not isinstance(entries, list):
            continue
        groups: Dict[str, List[dict]] = {}
        for entry in entries:
            name = entry.get("name") or ""
            norm = normalize_name(name)
            if not norm:
                norm = f"__empty__{entry.get('id') or id(entry)}"
            groups.setdefault(norm, []).append(entry)

        chosen = [choose_best_entry(group, weights) for group in groups.values()]
        chosen.sort(key=lambda item: (item.get("name") or "").lower())
        output[city_id] = chosen
    return output


def summarize(data: Dict[str, List[dict]]) -> dict:
    total = 0
    with_wikidata = 0
    with_wikipedia = 0
    with_admin_level = 0
    with_polygon = 0
    total_quality = 0.0

    for entries in data.values():
        if not isinstance(entries, list):
            continue
        for entry in entries:
            total += 1
            if entry.get("wikidata"):
                with_wikidata += 1
            if entry.get("wikipedia"):
                with_wikipedia += 1
            if entry.get("admin_level"):
                with_admin_level += 1
            if bbox_area(entry) > 0:
                with_polygon += 1
            total_quality += quality_score(entry)

    return {
        "total": total,
        "with_wikidata": with_wikidata,
        "with_wikipedia": with_wikipedia,
        "with_admin_level": with_admin_level,
        "with_polygon": with_polygon,
        "total_quality": total_quality,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--input",
        default="data/exports/places_by_city.json",
        help="Input places_by_city JSON",
    )
    parser.add_argument(
        "--out",
        default="data/exports/places_by_city.best.json",
        help="Output JSON for the best strategy",
    )
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    input_path = (repo_root / args.input).resolve()
    out_path = (repo_root / args.out).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)

    with input_path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    # Evaluate multiple strategies and keep the best overall dataset.
    results = {}
    for name, weights in STRATEGIES.items():
        filtered = apply_strategy(data, weights)
        metrics = summarize(filtered)
        results[name] = (metrics, filtered)

    def rank(item: Tuple[str, Tuple[dict, dict]]) -> Tuple[float, int, int, int, int]:
        metrics = item[1][0]
        return (
            metrics["total_quality"],
            metrics["with_wikidata"],
            metrics["with_wikipedia"],
            metrics["with_admin_level"],
            metrics["with_polygon"],
        )

    best_name, (best_metrics, best_data) = max(results.items(), key=rank)

    with out_path.open("w", encoding="utf-8") as f:
        json.dump(best_data, f, ensure_ascii=False, indent=2)

    print("Best strategy:", best_name)
    print("Metrics:", best_metrics)
    print("Wrote:", out_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

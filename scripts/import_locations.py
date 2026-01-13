#!/usr/bin/env python3
import argparse
import base64
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List

import requests


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def chunked(items: List[Dict[str, Any]], size: int):
    for i in range(0, len(items), size):
        yield items[i : i + size]


def normalize_supabase_url(url: str) -> str:
    url = url.rstrip("/")
    if "/functions/v1" in url:
        url = url.split("/functions/v1")[0]
    if "/rest/v1" in url:
        url = url.split("/rest/v1")[0]
    return url


def post_batch(url: str, headers: Dict[str, str], batch: List[Dict[str, Any]]):
    resp = requests.post(url, headers=headers, json=batch)
    if not resp.ok:
        raise RuntimeError(f"{resp.status_code} {resp.text} ({url})")


def decode_role_from_jwt(token: str) -> str | None:
    parts = token.split(".")
    if len(parts) < 2:
        return None
    payload = parts[1]
    padding = "=" * (-len(payload) % 4)
    try:
        decoded = base64.urlsafe_b64decode(payload + padding)
        data = json.loads(decoded.decode("utf-8"))
        return data.get("role")
    except Exception:
        return None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cities", default="data/exports/cities.filtered.json")
    parser.add_argument("--places", default="data/exports/places_by_city.best.json")
    parser.add_argument("--batch-size", type=int, default=500)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--upsert", action="store_true")
    parser.add_argument(
        "--allow-non-service",
        action="store_true",
        help="Skip role check (not recommended)",
    )
    args = parser.parse_args()

    supabase_url = os.environ.get("SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not service_key:
        print("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        return 1
    role = decode_role_from_jwt(service_key)
    if role and role != "service_role" and not args.allow_non_service:
        print(
            f"Service key role is '{role}', not 'service_role'. "
            "Use the service role key or pass --allow-non-service to continue.",
            file=sys.stderr,
        )
        return 1

    repo_root = Path(__file__).resolve().parent.parent
    cities_path = (repo_root / args.cities).resolve()
    places_path = (repo_root / args.places).resolve()

    cities = load_json(cities_path)
    places_by_city = load_json(places_path)

    city_fields = {
        "id",
        "name",
        "ref_ine",
        "ine_municipio",
        "wikidata",
        "wikipedia",
        "centroid",
        "bbox",
    }
    place_fields = {
        "id",
        "city_id",
        "name",
        "place",
        "admin_level",
        "ref_ine",
        "wikidata",
        "wikipedia",
        "population",
        "population_date",
        "name_es",
        "name_eu",
        "centroid",
        "bbox",
    }

    cities = [{k: c.get(k) for k in city_fields} for c in cities]

    places: List[Dict[str, Any]] = []
    for city_id, items in places_by_city.items():
        if city_id == "_unassigned":
            continue
        if not isinstance(items, list):
            continue
        for item in items:
            places.append({k: item.get(k) for k in place_fields})

    prefer_header = "return=minimal"
    if args.upsert:
        prefer_header = "resolution=merge-duplicates,return=minimal"

    headers = {
        "Content-Type": "application/json",
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Prefer": prefer_header,
    }

    base_url = normalize_supabase_url(supabase_url)
    cities_url = f"{base_url}/rest/v1/cities"
    places_url = f"{base_url}/rest/v1/city_places"
    if args.upsert:
        cities_url = f"{cities_url}?on_conflict=id"
        places_url = f"{places_url}?on_conflict=id"

    print(f"Cities: {len(cities)}")
    print(f"Places: {len(places)}")
    if args.dry_run:
        print("Dry run enabled, exiting without uploads.")
        return 0

    for batch in chunked(cities, args.batch_size):
        post_batch(cities_url, headers, batch)

    for batch in chunked(places, args.batch_size):
        post_batch(places_url, headers, batch)

    print("Import complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

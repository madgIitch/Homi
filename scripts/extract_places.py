#!/usr/bin/env python3
import argparse
import json
import math
from collections import Counter
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

try:
    from shapely.geometry import Point as ShPoint
    from shapely.geometry import shape
    from shapely.prepared import prep

    HAS_SHAPELY = True
except Exception:
    HAS_SHAPELY = False
    ShPoint = None
    shape = None
    prep = None

Point = Tuple[float, float]
BBox = Tuple[float, float, float, float]


def slugify(value: str) -> str:
    out = []
    for ch in value.strip().lower():
        if ch.isalnum():
            out.append(ch)
        elif ch in {" ", "-", "/"}:
            out.append("_")
    slug = "".join(out)
    while "__" in slug:
        slug = slug.replace("__", "_")
    return slug.strip("_") or "unknown"


def get_prop(props: dict, key: str):
    if key in props:
        return props.get(key)
    tags = props.get("tags")
    if isinstance(tags, dict):
        return tags.get(key)
    return None


def unique_items(items: List[str]) -> List[str]:
    seen = set()
    out = []
    for item in items:
        if item in seen:
            continue
        seen.add(item)
        out.append(item)
    return out


def collect_candidates(
    grid: Dict[Tuple[int, int], List[str]],
    cy: int,
    cx: int,
    radius: int,
) -> List[str]:
    candidates: List[str] = []
    for dy in range(-radius, radius + 1):
        for dx in range(-radius, radius + 1):
            candidates.extend(grid.get((cy + dy, cx + dx), []))
    return unique_items(candidates)


def iter_points(geom: dict) -> Iterable[Point]:
    geom_type = geom.get("type")
    coords = geom.get("coordinates")
    if not coords:
        return
    if geom_type == "Point":
        yield tuple(coords)
    elif geom_type == "MultiPoint":
        for pt in coords:
            yield tuple(pt)
    elif geom_type == "LineString":
        for pt in coords:
            yield tuple(pt)
    elif geom_type == "MultiLineString":
        for line in coords:
            for pt in line:
                yield tuple(pt)
    elif geom_type == "Polygon":
        for ring in coords:
            for pt in ring:
                yield tuple(pt)
    elif geom_type == "MultiPolygon":
        for poly in coords:
            for ring in poly:
                for pt in ring:
                    yield tuple(pt)


def outer_rings(geom: dict) -> List[List[Point]]:
    geom_type = geom.get("type")
    coords = geom.get("coordinates")
    if not coords:
        return []
    if geom_type == "Polygon":
        return [list(map(tuple, coords[0]))] if coords else []
    if geom_type == "MultiPolygon":
        rings = []
        for poly in coords:
            if poly and poly[0]:
                rings.append(list(map(tuple, poly[0])))
        return rings
    return []


def compute_bbox(points: Iterable[Point]) -> Optional[BBox]:
    min_lon = min_lat = math.inf
    max_lon = max_lat = -math.inf
    count = 0
    for lon, lat in points:
        count += 1
        min_lon = min(min_lon, lon)
        min_lat = min(min_lat, lat)
        max_lon = max(max_lon, lon)
        max_lat = max(max_lat, lat)
    if count == 0:
        return None
    return (min_lon, min_lat, max_lon, max_lat)


def centroid(points: Iterable[Point]) -> Optional[Point]:
    sx = sy = 0.0
    count = 0
    for lon, lat in points:
        sx += lon
        sy += lat
        count += 1
    if count == 0:
        return None
    return (sx / count, sy / count)


def point_on_segment(p: Point, a: Point, b: Point, eps: float = 1e-9) -> bool:
    (x, y), (x1, y1), (x2, y2) = p, a, b
    cross = (y - y1) * (x2 - x1) - (x - x1) * (y2 - y1)
    if abs(cross) > eps:
        return False
    dot = (x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)
    if dot < -eps:
        return False
    sq_len = (x2 - x1) ** 2 + (y2 - y1) ** 2
    return dot <= sq_len + eps


def point_in_ring(p: Point, ring: List[Point]) -> bool:
    x, y = p
    inside = False
    n = len(ring)
    if n < 3:
        return False
    for i in range(n):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % n]
        if point_on_segment(p, (x1, y1), (x2, y2)):
            return True
        if (y1 > y) != (y2 > y):
            x_intersect = (x2 - x1) * (y - y1) / (y2 - y1 + 0.0) + x1
            if x_intersect > x:
                inside = not inside
    return inside


def point_in_polygons(p: Point, rings: List[List[Point]]) -> bool:
    for ring in rings:
        if point_in_ring(p, ring):
            return True
    return False


def cell_id(lat: float, lon: float, cell_size: float) -> Tuple[int, int]:
    return (int(math.floor(lat / cell_size)), int(math.floor(lon / cell_size)))


def cells_for_bbox(bbox: BBox, cell_size: float) -> Iterable[Tuple[int, int]]:
    min_lon, min_lat, max_lon, max_lat = bbox
    min_cy = int(math.floor(min_lat / cell_size))
    max_cy = int(math.floor(max_lat / cell_size))
    min_cx = int(math.floor(min_lon / cell_size))
    max_cx = int(math.floor(max_lon / cell_size))
    for cy in range(min_cy, max_cy + 1):
        for cx in range(min_cx, max_cx + 1):
            yield (cy, cx)


def build_city_index(
    city_geojson: dict, cell_size: float, use_shapely: bool
) -> Tuple[Dict[str, dict], Dict[Tuple[int, int], List[str]]]:
    features = city_geojson.get("features") or []
    city_polygons: Dict[str, dict] = {}
    for feat in features:
        props = feat.get("properties") or {}
        if get_prop(props, "boundary") != "administrative":
            continue
        if str(get_prop(props, "admin_level")) != "8":
            continue
        name = get_prop(props, "name") or get_prop(props, "name:es")
        if not name:
            continue
        geom = feat.get("geometry") or {}
        if use_shapely and HAS_SHAPELY:
            try:
                city_shape = shape(geom)
            except Exception:
                continue
            if city_shape.is_empty:
                continue
            bbox = city_shape.bounds
            center_point = city_shape.representative_point()
            center = (center_point.x, center_point.y)
        else:
            rings = outer_rings(geom)
            if not rings:
                continue
            bbox = compute_bbox(iter_points(geom))
            center = centroid(iter_points(geom))
            if not bbox or not center:
                continue
        city_id = str(
            get_prop(props, "ine:municipio")
            or get_prop(props, "ref:ine")
            or slugify(name)
        )
        bbox_area = (bbox[2] - bbox[0]) * (bbox[3] - bbox[1])
        existing = city_polygons.get(city_id)
        if existing and bbox_area <= existing["bbox_area"]:
            continue
        if use_shapely and HAS_SHAPELY:
            city_polygons[city_id] = {
                "name": name,
                "prepared": prep(city_shape),
                "bbox": bbox,
                "centroid": center,
                "bbox_area": bbox_area,
            }
        else:
            city_polygons[city_id] = {
                "name": name,
                "rings": rings,
                "bbox": bbox,
                "centroid": center,
                "bbox_area": bbox_area,
            }

    grid: Dict[Tuple[int, int], List[str]] = {}
    for city_id, city_info in city_polygons.items():
        for cell in cells_for_bbox(city_info["bbox"], cell_size):
            grid.setdefault(cell, []).append(city_id)
    return city_polygons, grid


def extract_places_by_city(
    features: List[dict],
    include_types: Optional[set],
    city_polygons: Dict[str, dict],
    grid: Dict[Tuple[int, int], List[str]],
    cell_size: float,
    use_shapely: bool,
    candidate_radius: int,
    fallback_radius: int,
    allow_nearest: bool,
) -> Dict[str, List[dict]]:
    places_by_city: Dict[str, List[dict]] = {}
    unassigned: List[dict] = []
    for idx, feat in enumerate(features):
        props = feat.get("properties") or {}
        place = get_prop(props, "place")
        if not place:
            continue
        if include_types and place not in include_types:
            continue
        name = (
            get_prop(props, "name")
            or get_prop(props, "name:es")
            or get_prop(props, "name:eu")
            or get_prop(props, "alt_name")
            or get_prop(props, "official_name")
        )
        if not name:
            continue
        geom = feat.get("geometry") or {}
        pts = list(iter_points(geom))
        if not pts:
            continue
        center = centroid(pts)
        bbox = compute_bbox(pts)
        if not center or not bbox:
            continue
        place_id = f"{slugify(name)}-{place}-{idx}"
        entry = {
            "id": place_id,
            "name": name,
            "place": place,
            "admin_level": get_prop(props, "admin_level"),
            "ref_ine": get_prop(props, "ref:ine"),
            "wikidata": get_prop(props, "wikidata"),
            "wikipedia": get_prop(props, "wikipedia"),
            "population": get_prop(props, "population"),
            "population_date": get_prop(props, "population:date"),
            "name_es": get_prop(props, "name:es"),
            "name_eu": get_prop(props, "name:eu"),
            "bbox": {
                "min_lon": bbox[0],
                "min_lat": bbox[1],
                "max_lon": bbox[2],
                "max_lat": bbox[3],
            },
            "centroid": {"lon": center[0], "lat": center[1]},
        }

        def try_match(candidates: List[str]) -> Optional[str]:
            if use_shapely and HAS_SHAPELY:
                point = ShPoint(center[0], center[1])
                for city_id in candidates:
                    city_info = city_polygons[city_id]
                    if city_info["prepared"].covers(point):
                        return city_id
                return None
            for city_id in candidates:
                city_info = city_polygons[city_id]
                if point_in_polygons(center, city_info["rings"]):
                    return city_id
            return None

        cy, cx = cell_id(center[1], center[0], cell_size)
        candidates = collect_candidates(grid, cy, cx, candidate_radius)
        matched_city = try_match(candidates)

        if not matched_city and fallback_radius > candidate_radius:
            candidates = collect_candidates(grid, cy, cx, fallback_radius)
            matched_city = try_match(candidates)

        if not matched_city and allow_nearest and candidates:
            best_city = None
            best_dist = None
            for city_id in candidates:
                city_center = city_polygons[city_id]["centroid"]
                dist = (center[0] - city_center[0]) ** 2 + (
                    center[1] - city_center[1]
                ) ** 2
                if best_dist is None or dist < best_dist:
                    best_dist = dist
                    best_city = city_id
            matched_city = best_city

        if matched_city:
            entry_with_city = dict(entry)
            entry_with_city["city_id"] = matched_city
            entry_with_city["city_name"] = city_polygons[matched_city]["name"]
            places_by_city.setdefault(matched_city, []).append(entry_with_city)
        else:
            entry_with_city = dict(entry)
            entry_with_city["city_id"] = None
            entry_with_city["city_name"] = None
            unassigned.append(entry_with_city)

    for city_id, items in places_by_city.items():
        items.sort(key=lambda item: item["name"])
    if unassigned:
        places_by_city["_unassigned"] = unassigned
    return places_by_city


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--input",
        default="data/geojson/spain-places.geojson",
        help="Path to input places GeoJSON",
    )
    parser.add_argument(
        "--cities",
        default="data/geojson/spain-cities-areas.geojson",
        help="Path to GeoJSON with admin_level=8 city polygons",
    )
    parser.add_argument(
        "--out",
        default="data/exports/places_by_city.json",
        help="Output JSON file (grouped by city)",
    )
    parser.add_argument(
        "--types",
        default="neighbourhood,suburb,quarter",
        help="Comma-separated place types to include (empty = all)",
    )
    parser.add_argument(
        "--cell-size",
        type=float,
        default=0.25,
        help="Grid cell size in degrees for spatial index",
    )
    parser.add_argument(
        "--candidate-radius",
        type=int,
        default=1,
        help="Grid radius for initial candidate search",
    )
    parser.add_argument(
        "--fallback-radius",
        type=int,
        default=2,
        help="Grid radius to retry before nearest fallback",
    )
    parser.add_argument(
        "--no-nearest",
        action="store_true",
        help="Disable nearest fallback when no polygon match is found",
    )
    parser.add_argument(
        "--no-shapely",
        action="store_true",
        help="Disable shapely join even if installed",
    )
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    input_path = (repo_root / args.input).resolve()
    cities_path = (repo_root / args.cities).resolve()
    out_path = (repo_root / args.out).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)

    with input_path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    with cities_path.open("r", encoding="utf-8") as f:
        city_data = json.load(f)

    features = data.get("features") or []
    include_types = None
    if args.types.strip():
        include_types = {t.strip() for t in args.types.split(",") if t.strip()}

    use_shapely = HAS_SHAPELY and not args.no_shapely
    if not use_shapely and not args.no_shapely:
        print("Shapely not available, using manual point-in-polygon.")

    city_polygons, grid = build_city_index(city_data, args.cell_size, use_shapely)
    places_by_city = extract_places_by_city(
        features,
        include_types,
        city_polygons,
        grid,
        args.cell_size,
        use_shapely=use_shapely,
        candidate_radius=args.candidate_radius,
        fallback_radius=args.fallback_radius,
        allow_nearest=not args.no_nearest,
    )

    with out_path.open("w", encoding="utf-8") as f:
        json.dump(places_by_city, f, ensure_ascii=False, indent=2)

    counts = Counter(
        p["place"]
        for items in places_by_city.values()
        for p in items
        if isinstance(items, list)
    )
    total_places = sum(
        len(items) for items in places_by_city.values() if isinstance(items, list)
    )
    print(f"Wrote {out_path} ({total_places} places grouped)")
    print("Place counts:", dict(counts.most_common(10)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

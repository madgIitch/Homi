#!/usr/bin/env python3
import argparse
import json
import math
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
BBox = Tuple[float, float, float, float]  # min_lon, min_lat, max_lon, max_lat


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
    # Rings are only outer rings. If point is in any outer ring, treat as inside.
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


def load_geojson(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def build_cities(
    features: List[dict], use_shapely: bool
) -> Tuple[List[dict], Dict[str, dict], Dict[str, dict]]:
    cities_by_id: Dict[str, dict] = {}
    city_polygons: Dict[str, dict] = {}
    for idx, feat in enumerate(features):
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
                # Skip cities without polygon rings for spatial join
                continue
            bbox = compute_bbox(iter_points(geom))
            center = centroid(iter_points(geom))
            if not bbox or not center:
                continue
        ine_municipio = get_prop(props, "ine:municipio")
        ref_ine = get_prop(props, "ref:ine")
        city_id = str(ine_municipio or ref_ine or slugify(name))
        bbox_area = (bbox[2] - bbox[0]) * (bbox[3] - bbox[1])
        existing = cities_by_id.get(city_id)
        if existing:
            if bbox_area <= existing["bbox_area"]:
                continue
        city_entry = {
            "id": city_id,
            "name": name,
            "admin_level": "8",
            "ref_ine": ref_ine,
            "ine_municipio": ine_municipio,
            "wikidata": get_prop(props, "wikidata"),
            "wikipedia": get_prop(props, "wikipedia"),
            "bbox": {
                "min_lon": bbox[0],
                "min_lat": bbox[1],
                "max_lon": bbox[2],
                "max_lat": bbox[3],
            },
            "centroid": {"lon": center[0], "lat": center[1]},
            "bbox_area": bbox_area,
        }
        cities_by_id[city_id] = city_entry
        if use_shapely and HAS_SHAPELY:
            city_polygons[city_id] = {
                "prepared": prep(city_shape),
                "bbox": bbox,
                "centroid": center,
                "bbox_area": bbox_area,
            }
        else:
            city_polygons[city_id] = {
                "rings": rings,
                "bbox": bbox,
                "centroid": center,
                "bbox_area": bbox_area,
            }

    cities = []
    for city in cities_by_id.values():
        city = dict(city)
        city.pop("bbox_area", None)
        cities.append(city)
    cities.sort(key=lambda c: c["name"])
    return cities, cities_by_id, city_polygons


def build_city_grid(city_polygons: Dict[str, dict], cell_size: float) -> Dict[Tuple[int, int], List[str]]:
    grid: Dict[Tuple[int, int], List[str]] = {}
    for city_id, city_info in city_polygons.items():
        bbox = city_info["bbox"]
        for cell in cells_for_bbox(bbox, cell_size):
            grid.setdefault(cell, []).append(city_id)
    return grid


def extract_areas(
    features: List[dict],
    city_polygons: Dict[str, dict],
    grid: Dict[Tuple[int, int], List[str]],
    cell_size: float,
    admin_level: str,
    include_place: Optional[set] = None,
    use_shapely: bool = True,
    candidate_radius: int = 1,
    fallback_radius: int = 2,
    allow_nearest: bool = True,
) -> Dict[str, List[dict]]:
    areas_by_city: Dict[str, List[dict]] = {}
    unknown_areas: List[dict] = []

    for idx, feat in enumerate(features):
        props = feat.get("properties") or {}
        if get_prop(props, "boundary") != "administrative":
            continue
        if str(get_prop(props, "admin_level")) != admin_level:
            continue
        name = get_prop(props, "name") or get_prop(props, "name:es")
        if not name:
            continue
        place = get_prop(props, "place")
        if include_place and place not in include_place:
            continue

        geom = feat.get("geometry") or {}
        pts = list(iter_points(geom))
        if not pts:
            continue
        center = centroid(pts)
        bbox = compute_bbox(pts)
        if not center or not bbox:
            continue

        area_id = f"{slugify(name)}-{admin_level}-{idx}"
        area_entry = {
            "id": area_id,
            "name": name,
            "admin_level": admin_level,
            "place": place,
            "wikidata": get_prop(props, "wikidata"),
            "wikipedia": get_prop(props, "wikipedia"),
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
            area_entry["city_id"] = matched_city
            areas_by_city.setdefault(matched_city, []).append(area_entry)
        else:
            area_entry["city_id"] = None
            unknown_areas.append(area_entry)

    if unknown_areas:
        areas_by_city["_unassigned"] = unknown_areas
    return areas_by_city


def extract(
    data: dict,
    cell_size: float = 0.25,
    include_place: Optional[set] = None,
    use_shapely: bool = True,
    candidate_radius: int = 1,
    fallback_radius: int = 2,
    allow_nearest: bool = True,
) -> Tuple[List[dict], Dict[str, Dict[str, List[dict]]]]:
    features = data.get("features") or []
    cities, _, city_polygons = build_cities(features, use_shapely)
    grid = build_city_grid(city_polygons, cell_size)

    areas_by_level = {}
    for level in ("10", "9"):
        areas_by_level[level] = extract_areas(
            features,
            city_polygons,
            grid,
            cell_size,
            admin_level=level,
            include_place=include_place,
            use_shapely=use_shapely,
            candidate_radius=candidate_radius,
            fallback_radius=fallback_radius,
            allow_nearest=allow_nearest,
        )

    return cities, areas_by_level


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--input",
        default="data/geojson/spain-cities-areas.geojson",
        help="Path to input GeoJSON",
    )
    parser.add_argument(
        "--out-dir",
        default="data/exports",
        help="Output directory for JSON files",
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
    parser.add_argument(
        "--filter-place",
        action="store_true",
        help="Filter areas by place types (neighbourhood/suburb/quarter/borough/civil_parish)",
    )
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    input_path = (repo_root / args.input).resolve()
    out_dir = (repo_root / args.out_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    data = load_geojson(input_path)
    place_filter = None
    if args.filter_place:
        place_filter = {
            "neighbourhood",
            "suburb",
            "quarter",
            "borough",
            "civil_parish",
        }
    use_shapely = HAS_SHAPELY and not args.no_shapely
    if not use_shapely and not args.no_shapely:
        print("Shapely not available, using manual point-in-polygon.")

    cities, areas_by_level = extract(
        data,
        cell_size=args.cell_size,
        include_place=place_filter,
        use_shapely=use_shapely,
        candidate_radius=args.candidate_radius,
        fallback_radius=args.fallback_radius,
        allow_nearest=not args.no_nearest,
    )

    cities_path = out_dir / "cities.json"
    areas_path = out_dir / "areas_by_city.json"
    areas_level9_path = out_dir / "areas_level9_by_city.json"

    with cities_path.open("w", encoding="utf-8") as f:
        json.dump(cities, f, ensure_ascii=True, indent=2)
    with areas_path.open("w", encoding="utf-8") as f:
        combined = dict(areas_by_level["10"])
        for city_id, entries in areas_by_level["9"].items():
            if city_id == "_unassigned":
                combined.setdefault(city_id, []).extend(entries)
                continue
            combined.setdefault(city_id, []).extend(entries)
        json.dump(combined, f, ensure_ascii=True, indent=2)
    with areas_level9_path.open("w", encoding="utf-8") as f:
        json.dump(areas_by_level["9"], f, ensure_ascii=True, indent=2)

    print(f"Wrote {cities_path} ({len(cities)} cities)")
    total_level10 = sum(
        len(v) for v in areas_by_level["10"].values() if isinstance(v, list)
    )
    total_level9 = sum(
        len(v) for v in areas_by_level["9"].values() if isinstance(v, list)
    )
    print(f"Wrote {areas_path} ({total_level10} areas)")
    print(f"Wrote {areas_level9_path} ({total_level9} areas)")
    if "_unassigned" in areas_by_level["10"]:
        print(f"Unassigned level 10 areas: {len(areas_by_level['10']['_unassigned'])}")
    if "_unassigned" in areas_by_level["9"]:
        print(f"Unassigned level 9 areas: {len(areas_by_level['9']['_unassigned'])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

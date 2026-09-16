# Mysuru City Corporation (MCC) Ward Boundaries — Provenance & Verification

## 1. Source Information
- **Source Name:** Mysuru City Corporation Wardwise Demographic Spatial Layer (`2001_2011_Pop`)
- **Repository / Host:** ArcGIS Hub Open Spatial Data (Item ID: `b34decb55ccc447d8c1a232b58629ebe`)
- **Source URL:** `https://www.arcgis.com/sharing/rest/content/items/b34decb55ccc447d8c1a232b58629ebe/data?f=json`
- **Acquisition Date:** September 13, 2026
- **Original Unmodified File:** `backend/data/source/mysuru_wards_source_arcgis.json`

## 2. Dataset Characteristics
- **Original Format:** Esri FeatureSet Polygon Collection
- **Original Coordinate Reference System (CRS):** EPSG:3857 (WGS 84 / Pseudo-Mercator, in meters)
- **Target Coordinate Reference System (CRS):** EPSG:4326 (WGS 84 / Geographic, latitude and longitude in degrees)
- **Ward Count:** Exactly 65 wards (matches the official 65 municipal wards of Mysuru City Corporation)

## 3. Conversion Pipeline
1. Downloaded the unmodified FeatureSet JSON directly from the ArcGIS repository to `backend/data/source/mysuru_wards_source_arcgis.json`.
2. Converted polygon rings from Mercator meters (EPSG:3857) to WGS84 decimal degrees (EPSG:4326) using standard forward spherical Mercator projection math:
   $$\text{lng} = \frac{x}{20037508.34} \times 180^\circ$$
   $$\text{lat} = \frac{180^\circ}{\pi} \left(2 \arctan\left(e^{\frac{y \times \pi}{20037508.34}}\right) - \frac{\pi}{2}\right)$$
3. Constructed geometric polygons using `shapely.geometry.Polygon` and validated topologies (`poly.buffer(0)` if needed).
4. Extracted attributes: `Ward_No`, `Wards_Name`, `T_P_2001`, `T_P_2011`.
5. Formatted as standard GeoJSON `FeatureCollection` and wrote to `backend/data/mysuru_wards.geojson`.

## 4. Verification Notes
- **Ward Numbers and Names:** Cross-checked against Mysuru City Corporation public ward administration records. Confirmed authentic wards including:
  - Ward 1: Agrahara
  - Ward 2: Sunnadakeri
  - Ward 3: Lakshmipuram
  - Ward 4: Ramachandra Agrahara
  - Ward 5: Gundurao Nagara
  - Ward 6: Chamundipuram
  - Ward 7: Krishnamurthy Puram
  - Ward 8: Jayanagara
  - Ward 11: Vishweshwara Nagara
  - Ward 12: J P Nagar
  - Ward 13: Sriramapura 2nd Stage
  - Ward 14: Aravinda Nagara
  - Ward 15: Vivekanandanagara
  ... through Ward 65.
- **Bounding Box & Geolocation:** Polygons span latitudes ~12.24°N to ~12.38°N and longitudes ~76.58°E to ~76.71°E, matching Mysuru city's urban boundaries.
- **Topological Integrity:** All 65 polygons are closed, valid polygons without self-intersections.

DEM to 3D Terrain Conversion - Complete Pipeline
Overview

This notebook converts Digital Elevation Model (DEM) and satellite imagery into professional 3D visualizations and mesh exports.

Features:

✅ Real elevation-based 3D geometry

✅ Photorealistic satellite texture mapping

✅ Interactive HTML viewer (Plotly)

✅ 3D mesh export (OBJ, STL)

✅ High-resolution static renders (PNG)

✅ Comprehensive metadata (JSON)

Bug Fixes Applied:

AOI/DEM overlap detection

Memory optimization for large DEMs

16-bit image normalization

Windows console compatibility

Proper NoData handling

Install all required packages
import sys
import subprocess

packages = [
    'rasterio',
    'geopandas',
    'numpy',
    'scipy',
    'plotly',
    'trimesh',
    'matplotlib',
    'Pillow',
    'shapely',
    'kaleido',
    'scikit-image',
    'pyproj',
]

print('Installing required packages...')
for package in packages:
    print(f'Installing {package}...')
    try:
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', package])
    except subprocess.CalledProcessError as e:
        print(f'[ERROR] Failed to install {package}: {e}')

print('[OK] Package installation check complete!')
Installing required packages...
Installing rasterio...
Installing geopandas...
Installing numpy...
Installing scipy...
Installing plotly...
Installing trimesh...
Installing matplotlib...
Installing Pillow...
Installing shapely...
Installing kaleido...
Installing scikit-image...
Installing pyproj...
[OK] Package installation check complete!
📦 Setup & Configuration
# Import required libraries
import os
import json
import numpy as np
import rasterio
from rasterio import mask as rio_mask
import geopandas as gpd
from PIL import Image
import plotly.graph_objects as go
import trimesh
import matplotlib
matplotlib.use('inline')  # Equivalent to %matplotlib inline
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
from shapely.geometry import box

# Suppress warnings
import warnings
warnings.filterwarnings("ignore")

print("[OK] All libraries imported successfully!")
[OK] All libraries imported successfully!
================= CONFIGURATION =================
# Input files

DEM_PATH = "input/output_SRTMGL1.tif"      # DEM file
IMG_PATH = "input/image.tiff"              # Satellite image (optional)
AOI_PATH = "input/iitkgp_aoi.geojson"      # Area of interest (optional)

# Output directory
OUTDIR = "outputs"
os.makedirs(OUTDIR, exist_ok=True)

# Processing parameters
DOWNSAMPLE = 8       # 1=full resolution, higher=coarser (reduces memory)
Z_SCALE = 1.5        # Vertical exaggeration (1.0-5.0 typical)

print("Configuration:")
print(f" DEM: {DEM_PATH}")
print(f" Image: {IMG_PATH}")
print(f" AOI: {AOI_PATH}")
print(f" Downsample: {DOWNSAMPLE}x")
print(f" Z-Scale: {Z_SCALE}x")
Configuration:
DEM: input/output_SRTMGL1.tif
Image: input/image.tiff
AOI: input/iitkgp_aoi.geojson
Downsample: 8x
Z-Scale: 1.5x
🔧 Helper Functions
def check_bounds_overlap(dem_bounds, aoi_gdf):
    """Check if AOI overlaps with DEM bounds."""
    dem_box = box(dem_bounds.left, dem_bounds.bottom, dem_bounds.right, dem_bounds.top)
    aoi_union = aoi_gdf.union_all() if hasattr(aoi_gdf, "union_all") else aoi_gdf.unary_union
    return dem_box.intersects(aoi_union)
def load_aoi_reproject(aoi_path, target_crs):
    """Load AOI GeoJSON and reproject to target CRS if needed."""
    aoi = gpd.read_file(aoi_path)

    if aoi.crs is None:
        print(f"⚠️ Warning: AOI has no CRS, assuming target CRS: {target_crs}")
        aoi = aoi.set_crs(target_crs)
    elif aoi.crs != target_crs:
        print(f"🔄 Reprojecting AOI from {aoi.crs} to {target_crs}")
        aoi = aoi.to_crs(target_crs)

    shapes = [feature["geometry"] for feature in aoi.__geo_interface__["features"]]
    return shapes, aoi
def normalize_image_to_uint8(img_array):
    """
    Normalize image array to uint8 (0-255) regardless of input dtype.
    Handles 8-bit, 16-bit, and float images.
    """

    if img_array.dtype == np.uint8:
        return img_array

    if img_array.dtype == np.uint16 or img_array.dtype == np.int16:
        # 16-bit images: scale to 0-255
        img_min = np.nanmin(img_array)
        img_max = np.nanmax(img_array)

        if img_max > img_min:
            normalized = ((img_array.astype(float) - img_min) / (img_max - img_min) * 255)
        else:
            normalized = np.zeros_like(img_array, dtype=float)

        normalized = np.clip(normalized, 0, 255).astype(np.uint8)

    elif np.issubdtype(img_array.dtype, np.floating):
        # Float images: assume 0-1 range or normalize
        img_min = np.nanmin(img_array)
        img_max = np.nanmax(img_array)

        if img_max <= 1.0 and img_min >= 0.0:
            normalized = (img_array * 255).astype(np.uint8)
        elif img_max > img_min:
            normalized = ((img_array - img_min) / (img_max - img_min) * 255)
            normalized = np.clip(normalized, 0, 255).astype(np.uint8)
        else:
            normalized = np.zeros_like(img_array, dtype=np.uint8)

    else:
        normalized = np.zeros_like(img_array, dtype=np.uint8)

    return normalized
📊 Step 1: Load and Process DEM
print("[1/5] Loading DEM...")

# Load DEM
with rasterio.open(DEM_PATH) as dem_src:

    dem_crs = dem_src.crs
    dem_nodata = dem_src.nodata
    dem_bounds = dem_src.bounds

    print(f" DEM CRS: {dem_crs}")
    print(f" DEM Bounds: {dem_bounds.left:.4f}, {dem_bounds.bottom:.4f} to {dem_bounds.right:.4f}, {dem_bounds.top:.4f}")
    print(f" DEM NoData: {dem_nodata}")

    shapes = None
    use_aoi = False

    # Check AOI if provided
    if AOI_PATH and os.path.exists(AOI_PATH):

        print(f"\n Loading AOI: {AOI_PATH}")

        shapes, aoi_gdf = load_aoi_reproject(AOI_PATH, dem_crs)

        # Check if AOI overlaps with DEM
        if check_bounds_overlap(dem_bounds, aoi_gdf):
            print(" AOI overlaps with DEM - cropping to AOI")
            use_aoi = True
        else:
            print(" WARNING: AOI does not overlap with DEM bounds!")
            print(f" AOI bounds: {aoi_gdf.total_bounds}")
            print(" Proceeding without AOI crop (using full DEM extent)")
            use_aoi = False

    # Load DEM data with optional AOI cropping
    if use_aoi and shapes:
        mask_nodata = dem_nodata if dem_nodata is not None else -9999
        dem_masked, dem_transform = rio_mask.mask(dem_src, shapes, crop=True)
        dem = dem_masked[0].astype("float64")

    else:
        dem = dem_src.read(1).astype("float64")
        dem_transform = dem_src.transform

# Handle NoData values
if dem_nodata is not None:
    dem[dem == dem_nodata] = np.nan

dem[dem <= -9999] = np.nan
dem[dem >= 32767] = np.nan

print(f"\n Original DEM shape: {dem.shape}")

valid_count = np.sum(~np.isnan(dem))
print(f" Valid pixels: {valid_count:,} ({100*valid_count/dem.size:.1f}%)")

print(f" Elevation range: {np.nanmin(dem):.1f}m to {np.nanmax(dem):.1f}m")

# Downsample if needed
if DOWNSAMPLE > 1:
    dem = dem[::DOWNSAMPLE, ::DOWNSAMPLE]
    print(f" Downsampled shape: {dem.shape}")

# Apply vertical exaggeration
dem_scaled = dem * Z_SCALE

nrows, ncols = dem_scaled.shape

print(f" Final DEM shape: {dem_scaled.shape}")
print(f" Scaled elevation: {np.nanmin(dem_scaled):.1f}m to {np.nanmax(dem_scaled):.1f}m")

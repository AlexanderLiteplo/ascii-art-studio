terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Enable required APIs
resource "google_project_service" "storage_api" {
  service            = "storage.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "compute_api" {
  service            = "compute.googleapis.com"
  disable_on_destroy = false
}

# Create a GCS bucket for static website hosting
resource "google_storage_bucket" "website" {
  name          = var.bucket_name
  location      = var.region
  force_destroy = true

  uniform_bucket_level_access = true

  website {
    main_page_suffix = "index-simple.html"
    not_found_page   = "index-simple.html"
  }

  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD"]
    response_header = ["*"]
    max_age_seconds = 3600
  }
}

# Make bucket publicly readable
resource "google_storage_bucket_iam_member" "public_read" {
  bucket = google_storage_bucket.website.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# Upload website files
resource "google_storage_bucket_object" "index_simple" {
  name   = "index-simple.html"
  bucket = google_storage_bucket.website.name
  source = "../index-simple.html"
  content_type = "text/html"
}

resource "google_storage_bucket_object" "index" {
  name   = "index.html"
  bucket = google_storage_bucket.website.name
  source = "../index.html"
  content_type = "text/html"
}

resource "google_storage_bucket_object" "main_js" {
  name   = "main.js"
  bucket = google_storage_bucket.website.name
  source = "../main.js"
  content_type = "application/javascript"
}

resource "google_storage_bucket_object" "readme" {
  name   = "README.md"
  bucket = google_storage_bucket.website.name
  source = "../README.md"
  content_type = "text/markdown"
}

# Reserve a static external IP address
resource "google_compute_global_address" "website_ip" {
  name = "${var.website_name}-ip"
}

# Create a backend bucket
resource "google_compute_backend_bucket" "website_backend" {
  name        = "${var.website_name}-backend"
  bucket_name = google_storage_bucket.website.name
  enable_cdn  = true
}

# Create URL map
resource "google_compute_url_map" "website_url_map" {
  name            = "${var.website_name}-url-map"
  default_service = google_compute_backend_bucket.website_backend.id
}

# Create HTTP proxy
resource "google_compute_target_http_proxy" "website_http_proxy" {
  name    = "${var.website_name}-http-proxy"
  url_map = google_compute_url_map.website_url_map.id
}

# Create forwarding rule
resource "google_compute_global_forwarding_rule" "website_forwarding_rule" {
  name       = "${var.website_name}-forwarding-rule"
  target     = google_compute_target_http_proxy.website_http_proxy.id
  port_range = "80"
  ip_address = google_compute_global_address.website_ip.address
}

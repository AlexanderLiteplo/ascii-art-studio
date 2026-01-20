output "website_url" {
  description = "URL of the deployed website"
  value       = "http://${google_compute_global_address.website_ip.address}"
}

output "bucket_url" {
  description = "Direct GCS bucket URL"
  value       = "https://storage.googleapis.com/${google_storage_bucket.website.name}/index-simple.html"
}

output "ip_address" {
  description = "External IP address"
  value       = google_compute_global_address.website_ip.address
}

output "bucket_name" {
  description = "GCS bucket name"
  value       = google_storage_bucket.website.name
}

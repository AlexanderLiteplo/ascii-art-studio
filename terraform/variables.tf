variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "bucket_name" {
  description = "Name of the GCS bucket for website hosting"
  type        = string
}

variable "website_name" {
  description = "Name of the website (used for resource naming)"
  type        = string
  default     = "ascii-art-studio"
}

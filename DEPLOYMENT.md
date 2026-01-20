# Deployment Guide

This guide walks you through deploying ASCII Art Studio to Google Cloud Platform.

## Prerequisites

- Google Cloud Platform account
- GitHub account
- `gcloud` CLI installed
- `terraform` installed

## Quick Deploy

### 1. Set up GCP Project

```bash
# Set your project ID
export GCP_PROJECT_ID="your-project-id"

# Login to gcloud
gcloud auth login
gcloud config set project $GCP_PROJECT_ID

# Enable required APIs
gcloud services enable storage.googleapis.com compute.googleapis.com
```

### 2. Create GCS Bucket

```bash
# Create a unique bucket name
export BUCKET_NAME="ascii-art-studio-$(date +%s)"

# Create bucket
gsutil mb -p $GCP_PROJECT_ID -c STANDARD -l us-central1 gs://$BUCKET_NAME
```

### 3. Deploy with Terraform

```bash
cd terraform

# Initialize Terraform
terraform init

# Create terraform.tfvars
cat > terraform.tfvars <<EOF
project_id   = "$GCP_PROJECT_ID"
bucket_name  = "$BUCKET_NAME"
region       = "us-central1"
website_name = "ascii-art-studio"
EOF

# Plan the deployment
terraform plan

# Apply the infrastructure
terraform apply -auto-approve

# Get the website URL
terraform output website_url
```

### 4. Manual Deploy (Alternative)

If you prefer to skip Terraform:

```bash
# Upload files
gsutil -m cp -r index-simple.html gs://$BUCKET_NAME/
gsutil -m cp -r index.html gs://$BUCKET_NAME/
gsutil -m cp -r main.js gs://$BUCKET_NAME/

# Make bucket public
gsutil iam ch allUsers:objectViewer gs://$BUCKET_NAME

# Set website configuration
gsutil web set -m index-simple.html -e index-simple.html gs://$BUCKET_NAME

# Get URL
echo "https://storage.googleapis.com/$BUCKET_NAME/index-simple.html"
```

## GitHub Actions CI/CD Setup

### 1. Create Service Account

```bash
# Create service account
gcloud iam service-accounts create github-actions \
    --display-name="GitHub Actions Deploy"

# Grant storage admin role
gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
    --member="serviceAccount:github-actions@$GCP_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

# Create key
gcloud iam service-accounts keys create github-actions-key.json \
    --iam-account=github-actions@$GCP_PROJECT_ID.iam.gserviceaccount.com
```

### 2. Add GitHub Secrets

Add these secrets to your GitHub repository (Settings → Secrets → Actions):

- `GCP_PROJECT_ID`: Your GCP project ID
- `GCP_SA_KEY`: Contents of `github-actions-key.json`
- `BUCKET_NAME`: Your bucket name

### 3. Push to Deploy

```bash
git push origin main
```

Every push to main will automatically deploy to GCS!

## URLs

- **Bucket URL**: `https://storage.googleapis.com/$BUCKET_NAME/index-simple.html`
- **Load Balancer URL**: `http://<IP_ADDRESS>` (from Terraform output)

## Cleanup

To destroy all infrastructure:

```bash
cd terraform
terraform destroy -auto-approve
```

Or manually:

```bash
gsutil -m rm -r gs://$BUCKET_NAME
```

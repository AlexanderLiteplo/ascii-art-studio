# Deployment Information

## 🎉 Live Website

**Website Name**: ASCII Art Studio

**Live URL**: https://storage.googleapis.com/ascii-art-studio-1768949800/index-simple.html

**GitHub Repository**: https://github.com/AlexanderLiteplo/ascii-art-studio

## Deployment Details

- **Hosting Platform**: Google Cloud Storage
- **GCP Project**: cracked-445422
- **Bucket Name**: ascii-art-studio-1768949800
- **Region**: us-central1
- **Deploy Date**: 2026-01-20

## Features

- Convert images to ASCII art with real-time preview
- Multiple detail levels (1-270) for ultra-fine grain
- Auto-scaling font for optimal display
- Auto-generate 5 GIF animation variations:
  - Detail Sweep
  - Brightness Pulse
  - Contrast Wave
  - Rainbow Cycle
  - Combo Effect
- Custom color picker with HSV sphere
- Multiple ASCII character sets
- Video to ASCII conversion support

## CI/CD

GitHub Actions is configured for automatic deployment on push to main branch.

## Infrastructure

Terraform scripts are available in the `/terraform` directory for:
- Google Cloud Storage bucket
- Load balancer setup
- CDN configuration
- Public access configuration

## GIF Generation Fix

Fixed the gifenc library integration - GIF generation now works correctly by properly accessing the window.gifenc namespace.

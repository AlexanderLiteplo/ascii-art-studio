# WebGPU ASCII Art & Dithering Processor

A high-performance web-based tool that applies real-time ASCII art and dithering effects to video and images at 60fps using WebGPU. No external libraries required.

## Features

- **Real-time Processing**: Maintains 60fps on any resolution using GPU acceleration
- **Multiple Effect Modes**:
  - ASCII Art: Convert images/video to ASCII-style character patterns
  - Dithering: Apply classic Bayer matrix dithering effects
  - Combined: Both effects applied simultaneously
- **Live Video Support**: Process webcam feeds or video files in real-time
- **Adjustable Parameters**:
  - ASCII character density (4-64)
  - Character size (4-32 pixels)
  - Dither intensity (0-100%)
  - Dither matrix size (2x2, 4x4, 8x8)
  - Brightness and contrast controls
- **Zero Dependencies**: Pure JavaScript, HTML, CSS - no npm packages needed
- **Open Source**: MIT Licensed, free to use and modify

## Browser Compatibility

### Supported Browsers
- **Chrome/Edge**: Version 113+ (April 2023+)
- **Opera**: Version 99+ (May 2023+)

### WebGPU Support
WebGPU is a cutting-edge graphics API. Check current browser support:
- Visit: https://caniuse.com/webgpu
- Or test directly: Open the tool and check for compatibility message

### Firefox/Safari
- **Firefox**: WebGPU support is in development (expected 2026)
- **Safari**: WebGPU support planned but not yet available
- For these browsers, consider using Chrome/Edge as an alternative

## Setup Instructions

### Quick Start (No Build Required)

1. **Download the files**:
   ```bash
   cd ascii-video-processor
   ```

2. **Start a local server** (required for security reasons):

   **Option A - Using Python** (most systems have this):
   ```bash
   # Python 3
   python3 -m http.server 8000

   # Python 2
   python -m SimpleHTTPServer 8000
   ```

   **Option B - Using Node.js**:
   ```bash
   # Install http-server globally (one-time)
   npm install -g http-server

   # Run server
   http-server -p 8000
   ```

   **Option C - Using PHP**:
   ```bash
   php -S localhost:8000
   ```

3. **Open in browser**:
   - Navigate to: `http://localhost:8000`
   - Ensure you're using Chrome or Edge 113+

4. **Start processing**:
   - Click "Load Image" to process a static image
   - Click "Load Video" to process a video file
   - Click "Start Webcam" to process live camera feed

## Usage Guide

### Loading Media

1. **Images**:
   - Click "Load Image" button
   - Select any image file (JPG, PNG, GIF, WebP)
   - Image will be processed instantly with current settings

2. **Videos**:
   - Click "Load Video" button
   - Select video file (MP4, WebM, etc.)
   - Video will loop and process in real-time

3. **Webcam**:
   - Click "Start Webcam" button
   - Grant camera permissions when prompted
   - Live feed will process at 60fps
   - Click "Stop" to end webcam capture

### Effect Modes

Switch between three processing modes:

- **ASCII Art**: Converts image to character-density based art
- **Dithering**: Applies Bayer matrix dithering for retro pixelated look
- **Combined**: Applies both effects for unique artistic results

### Adjusting Parameters

#### ASCII Settings
- **Character Density** (4-64): Controls how many brightness levels are represented
  - Lower values: Simpler, blockier appearance
  - Higher values: More detailed, smoother gradients

- **Character Size** (4-32px): Size of each ASCII "character" block
  - Lower values: More detail, smaller patterns
  - Higher values: Larger, more visible patterns

#### Dithering Settings
- **Dither Intensity** (0-1): Strength of the dithering effect
  - 0: No dithering (original colors)
  - 0.5: Balanced effect
  - 1: Full dithering (stark black/white patterns)

- **Dither Matrix Size** (2/4/8): Size of the Bayer matrix pattern
  - 2x2: Simple, large patterns
  - 4x4: Classic dithering look
  - 8x8: Fine, detailed patterns

#### Color Adjustments
- **Brightness** (0.1-2.0): Adjust overall image brightness
- **Contrast** (0.5-2.0): Adjust contrast levels

### Performance

- **FPS Counter**: Top-right corner shows real-time frame rate
- **Target**: 60fps for smooth real-time processing
- **Performance Tips**:
  - Lower resolutions process faster
  - Smaller character sizes are more computationally intensive
  - Webcam typically runs at native camera resolution (720p or 1080p)

## Technical Details

### Architecture

- **WebGPU Pipeline**: Uses compute shaders (WGSL) for GPU-accelerated processing
- **Zero-Copy Rendering**: Direct texture sampling for maximum performance
- **Adaptive Sizing**: Automatically scales large images to maintain performance
- **RequestAnimationFrame Loop**: Synchronized with display refresh rate for smooth 60fps

### WGSL Shaders

The tool uses custom WebGPU Shading Language (WGSL) shaders:

- **ASCII Effect**:
  - Divides image into cells based on character size
  - Samples average luminance per cell
  - Maps brightness to character density patterns
  - Applies pattern as multiplicative mask

- **Dithering Effect**:
  - Implements Bayer matrix ordered dithering
  - Supports 2x2, 4x4, and 8x8 matrix sizes
  - Applies threshold comparison for quantization
  - Blends with original based on intensity parameter

### Performance Characteristics

- **GPU Memory**: Minimal - single source texture + small uniform buffer
- **Bandwidth**: Efficient - single texture sample per pixel
- **Compute**: O(1) per pixel - fully parallel GPU execution
- **Latency**: <1ms per frame on modern GPUs

## Troubleshooting

### "WebGPU is not supported"
- **Solution**: Update to Chrome/Edge 113 or newer
- Alternative: Check chrome://flags and enable WebGPU if disabled

### "Failed to get WebGPU adapter"
- **Cause**: GPU drivers out of date or WebGPU disabled
- **Solution**:
  1. Update graphics drivers
  2. Restart browser
  3. Check chrome://gpu for WebGPU status

### Webcam not working
- **Check**: Camera permissions granted to browser
- **Check**: No other application using the camera
- **Try**: Refresh page and grant permissions again

### Low FPS (below 60)
- **Possible causes**:
  - Very high resolution video (4K+)
  - Integrated GPU with limited power
  - Too small character size (more GPU work)
- **Solutions**:
  - Use lower resolution source
  - Increase character size
  - Lower dither matrix size

### File not loading (CORS errors)
- **Cause**: Opening index.html directly as file:// protocol
- **Solution**: Must use local web server (see Setup Instructions above)

## Development

### File Structure
```
ascii-video-processor/
├── index.html          # UI and layout
├── main.js             # WebGPU processor and application logic
└── README.md           # This file
```

### Customization

#### Adding New Effects
Edit the `getShaderCode()` method in `main.js` to add custom WGSL shader effects:

```javascript
// Example: Add a new mode
if (uniforms.mode < 2.5) {
    // Your custom effect here
    let customEffect = yourFunction(color);
    return vec4f(customEffect, 1.0);
}
```

#### Changing ASCII Characters
Modify the `getASCIIChar()` function in the shader to use different character density mappings.

#### Adjusting UI
Edit `index.html` for layout changes and `main.js` event handlers for new controls.

## License

MIT License - Free to use, modify, and distribute.

## Credits

Built with WebGPU API and WGSL shaders. No external libraries used.

## Future Enhancements

Potential features for community contributions:
- Export processed video to file
- Additional dithering algorithms (Floyd-Steinberg, Atkinson)
- Custom ASCII character sets
- Color ASCII art mode
- Edge detection effects
- Multi-pass shader effects
- Screenshot capture functionality

## Support

For issues or questions:
1. Check browser compatibility first
2. Verify local server is running
3. Check browser console for error messages
4. Ensure graphics drivers are up to date

---

**Note**: This tool runs entirely in your browser. No data is uploaded to any server. All processing happens locally on your GPU.

// WebGPU ASCII Art & Dithering Processor
// Real-time 60fps video processing without external libraries

class WebGPUProcessor {
    constructor() {
        this.canvas = document.getElementById('renderCanvas');
        this.device = null;
        this.context = null;
        this.pipeline = null;
        this.bindGroup = null;
        this.sourceTexture = null;
        this.sampler = null;
        this.uniformBuffer = null;
        this.animationId = null;
        this.videoElement = null;
        this.webcamStream = null;

        // Effect parameters
        this.params = {
            asciiDensity: 16,
            charSize: 8,
            ditherIntensity: 0.5,
            ditherSize: 4,
            brightness: 1.0,
            contrast: 1.0,
            mode: 0 // 0=ASCII, 1=Dither, 2=Combined
        };

        // FPS tracking
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.fps = 0;
    }

    async init() {
        // Check WebGPU support
        if (!navigator.gpu) {
            this.showError('WebGPU is not supported in this browser. Please use Chrome/Edge 113+ or enable WebGPU flag.');
            return false;
        }

        try {
            // Request adapter and device
            const adapter = await navigator.gpu.requestAdapter();
            if (!adapter) {
                this.showError('Failed to get WebGPU adapter');
                return false;
            }

            this.device = await adapter.requestDevice();

            // Configure canvas context
            this.context = this.canvas.getContext('webgpu');
            const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

            this.context.configure({
                device: this.device,
                format: presentationFormat,
                alphaMode: 'opaque'
            });

            // Create sampler
            this.sampler = this.device.createSampler({
                magFilter: 'linear',
                minFilter: 'linear',
            });

            // Create uniform buffer
            this.uniformBuffer = this.device.createBuffer({
                size: 64, // 16 floats
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            });

            // Create render pipeline
            await this.createPipeline(presentationFormat);

            this.showInfo('WebGPU initialized successfully! Load media to start processing.');
            return true;
        } catch (error) {
            this.showError(`WebGPU initialization failed: ${error.message}`);
            return false;
        }
    }

    async createPipeline(format) {
        const shaderModule = this.device.createShaderModule({
            code: this.getShaderCode()
        });

        const pipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [
                this.device.createBindGroupLayout({
                    entries: [
                        {
                            binding: 0,
                            visibility: GPUShaderStage.FRAGMENT,
                            sampler: {}
                        },
                        {
                            binding: 1,
                            visibility: GPUShaderStage.FRAGMENT,
                            texture: {}
                        },
                        {
                            binding: 2,
                            visibility: GPUShaderStage.FRAGMENT,
                            buffer: { type: 'uniform' }
                        }
                    ]
                })
            ]
        });

        this.pipeline = await this.device.createRenderPipelineAsync({
            layout: pipelineLayout,
            vertex: {
                module: shaderModule,
                entryPoint: 'vertexMain',
            },
            fragment: {
                module: shaderModule,
                entryPoint: 'fragmentMain',
                targets: [{
                    format: format,
                }],
            },
            primitive: {
                topology: 'triangle-strip',
            },
        });
    }

    getShaderCode() {
        return `
struct Uniforms {
    resolution: vec2f,
    asciiDensity: f32,
    charSize: f32,
    ditherIntensity: f32,
    ditherSize: f32,
    brightness: f32,
    contrast: f32,
    mode: f32,
    time: f32,
}

@group(0) @binding(0) var mySampler: sampler;
@group(0) @binding(1) var myTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) texCoord: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var output: VertexOutput;

    // Full-screen quad
    var pos = array<vec2f, 4>(
        vec2f(-1.0, -1.0),
        vec2f(1.0, -1.0),
        vec2f(-1.0, 1.0),
        vec2f(1.0, 1.0)
    );

    var uv = array<vec2f, 4>(
        vec2f(0.0, 1.0),
        vec2f(1.0, 1.0),
        vec2f(0.0, 0.0),
        vec2f(1.0, 0.0)
    );

    output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
    output.texCoord = uv[vertexIndex];

    return output;
}

// ASCII character density map (brightness to character)
fn getASCIIChar(brightness: f32) -> f32 {
    // Map brightness to different density levels
    let chars = 12.0; // Number of character densities
    return floor(brightness * chars) / chars;
}

// Bayer matrix dithering
fn bayerMatrix(x: i32, y: i32, size: i32) -> f32 {
    if (size == 2) {
        let matrix = array<f32, 4>(
            0.0, 2.0,
            3.0, 1.0
        );
        let idx = (y % 2) * 2 + (x % 2);
        return matrix[idx] / 4.0;
    } else if (size == 4) {
        let matrix = array<f32, 16>(
            0.0, 8.0, 2.0, 10.0,
            12.0, 4.0, 14.0, 6.0,
            3.0, 11.0, 1.0, 9.0,
            15.0, 7.0, 13.0, 5.0
        );
        let idx = (y % 4) * 4 + (x % 4);
        return matrix[idx] / 16.0;
    } else {
        // 8x8 Bayer matrix
        let matrix = array<f32, 64>(
            0.0, 32.0, 8.0, 40.0, 2.0, 34.0, 10.0, 42.0,
            48.0, 16.0, 56.0, 24.0, 50.0, 18.0, 58.0, 26.0,
            12.0, 44.0, 4.0, 36.0, 14.0, 46.0, 6.0, 38.0,
            60.0, 28.0, 52.0, 20.0, 62.0, 30.0, 54.0, 22.0,
            3.0, 35.0, 11.0, 43.0, 1.0, 33.0, 9.0, 41.0,
            51.0, 19.0, 59.0, 27.0, 49.0, 17.0, 57.0, 25.0,
            15.0, 47.0, 7.0, 39.0, 13.0, 45.0, 5.0, 37.0,
            63.0, 31.0, 55.0, 23.0, 61.0, 29.0, 53.0, 21.0
        );
        let idx = (y % 8) * 8 + (x % 8);
        return matrix[idx] / 64.0;
    }
}

// RGB to luminance
fn getLuminance(color: vec3f) -> f32 {
    return dot(color, vec3f(0.299, 0.587, 0.114));
}

// Apply contrast and brightness
fn adjustColor(color: vec3f, brightness: f32, contrast: f32) -> vec3f {
    var adjusted = color * brightness;
    adjusted = (adjusted - 0.5) * contrast + 0.5;
    return clamp(adjusted, vec3f(0.0), vec3f(1.0));
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let pixelCoord = input.texCoord * uniforms.resolution;

    // Mode 0: ASCII Art
    if (uniforms.mode < 0.5) {
        // Calculate cell position
        let cellSize = uniforms.charSize;
        let cellCoord = floor(pixelCoord / cellSize) * cellSize;
        let cellUV = cellCoord / uniforms.resolution;

        // Sample the cell center for average color
        let centerUV = (cellCoord + vec2f(cellSize * 0.5)) / uniforms.resolution;
        var color = textureSample(myTexture, mySampler, centerUV).rgb;
        color = adjustColor(color, uniforms.brightness, uniforms.contrast);

        // Calculate brightness
        let luminance = getLuminance(color);

        // Get ASCII character density
        let charDensity = getASCIIChar(luminance);

        // Calculate position within cell
        let posInCell = (pixelCoord - cellCoord) / cellSize;

        // Create character pattern
        let pattern = step(0.5 - charDensity * 0.4, length(posInCell - vec2f(0.5)));

        // Add some variation for different characters
        let charVariation = fract(sin(dot(cellCoord, vec2f(12.9898, 78.233))) * 43758.5453);
        let finalPattern = mix(pattern, 1.0 - pattern, step(0.7, charVariation) * 0.3);

        return vec4f(color * finalPattern, 1.0);
    }

    // Mode 1: Dithering
    else if (uniforms.mode < 1.5) {
        var color = textureSample(myTexture, mySampler, input.texCoord).rgb;
        color = adjustColor(color, uniforms.brightness, uniforms.contrast);

        let ditherSize = i32(uniforms.ditherSize);
        let threshold = bayerMatrix(i32(pixelCoord.x), i32(pixelCoord.y), ditherSize);

        // Apply dithering with intensity control
        let dithered = step(threshold * uniforms.ditherIntensity, color);
        let finalColor = mix(color, dithered, uniforms.ditherIntensity);

        return vec4f(finalColor, 1.0);
    }

    // Mode 2: Combined ASCII + Dithering
    else {
        // First apply ASCII effect
        let cellSize = uniforms.charSize;
        let cellCoord = floor(pixelCoord / cellSize) * cellSize;
        let centerUV = (cellCoord + vec2f(cellSize * 0.5)) / uniforms.resolution;
        var color = textureSample(myTexture, mySampler, centerUV).rgb;
        color = adjustColor(color, uniforms.brightness, uniforms.contrast);

        let luminance = getLuminance(color);
        let charDensity = getASCIIChar(luminance);
        let posInCell = (pixelCoord - cellCoord) / cellSize;
        let pattern = step(0.5 - charDensity * 0.4, length(posInCell - vec2f(0.5)));

        color = color * pattern;

        // Then apply dithering
        let ditherSize = i32(uniforms.ditherSize);
        let threshold = bayerMatrix(i32(pixelCoord.x), i32(pixelCoord.y), ditherSize);
        let dithered = step(threshold * uniforms.ditherIntensity * 0.5, color);
        let finalColor = mix(color, dithered, uniforms.ditherIntensity * 0.7);

        return vec4f(finalColor, 1.0);
    }
}
`;
    }

    updateUniforms() {
        const uniformData = new Float32Array([
            this.canvas.width, this.canvas.height,
            this.params.asciiDensity,
            this.params.charSize,
            this.params.ditherIntensity,
            this.params.ditherSize,
            this.params.brightness,
            this.params.contrast,
            this.params.mode,
            performance.now() / 1000.0,
            0, 0, 0, 0, 0, 0 // padding
        ]);

        this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);
    }

    async loadImage(file) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                this.resizeCanvas(img.width, img.height);
                this.updateSourceTexture(img);
                this.render();
                resolve();
            };
            img.src = URL.createObjectURL(file);
        });
    }

    async loadVideo(file) {
        this.stopPlayback();

        this.videoElement = document.createElement('video');
        this.videoElement.src = URL.createObjectURL(file);
        this.videoElement.loop = true;
        this.videoElement.muted = true;

        this.videoElement.onloadedmetadata = () => {
            this.resizeCanvas(this.videoElement.videoWidth, this.videoElement.videoHeight);
            this.videoElement.play();
            this.startRenderLoop();
        };
    }

    async startWebcam() {
        this.stopPlayback();

        try {
            this.webcamStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720 }
            });

            this.videoElement = document.createElement('video');
            this.videoElement.srcObject = this.webcamStream;
            this.videoElement.autoplay = true;

            this.videoElement.onloadedmetadata = () => {
                this.resizeCanvas(this.videoElement.videoWidth, this.videoElement.videoHeight);
                this.startRenderLoop();
            };
        } catch (error) {
            this.showError(`Webcam access failed: ${error.message}`);
        }
    }

    stopPlayback() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        if (this.videoElement) {
            this.videoElement.pause();
            this.videoElement = null;
        }

        if (this.webcamStream) {
            this.webcamStream.getTracks().forEach(track => track.stop());
            this.webcamStream = null;
        }
    }

    resizeCanvas(width, height) {
        // Maintain aspect ratio while limiting max size
        const maxWidth = 1920;
        const maxHeight = 1080;

        let newWidth = width;
        let newHeight = height;

        if (width > maxWidth) {
            newWidth = maxWidth;
            newHeight = (height * maxWidth) / width;
        }

        if (newHeight > maxHeight) {
            newHeight = maxHeight;
            newWidth = (width * maxHeight) / height;
        }

        this.canvas.width = newWidth;
        this.canvas.height = newHeight;
    }

    updateSourceTexture(source) {
        // Create or recreate texture if size changed
        if (this.sourceTexture) {
            this.sourceTexture.destroy();
        }

        this.sourceTexture = this.device.createTexture({
            size: [source.width || this.canvas.width, source.height || this.canvas.height],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING |
                   GPUTextureUsage.COPY_DST |
                   GPUTextureUsage.RENDER_ATTACHMENT,
        });

        // Copy source to texture
        this.device.queue.copyExternalImageToTexture(
            { source: source },
            { texture: this.sourceTexture },
            [source.width || this.canvas.width, source.height || this.canvas.height]
        );

        // Update bind group
        this.bindGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: this.sampler },
                { binding: 1, resource: this.sourceTexture.createView() },
                { binding: 2, resource: { buffer: this.uniformBuffer } }
            ],
        });
    }

    render() {
        if (this.videoElement && this.videoElement.readyState >= this.videoElement.HAVE_CURRENT_DATA) {
            this.updateSourceTexture(this.videoElement);
        }

        this.updateUniforms();

        const commandEncoder = this.device.createCommandEncoder();
        const textureView = this.context.getCurrentTexture().createView();

        const renderPass = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: textureView,
                clearValue: { r: 0, g: 0, b: 0, a: 1 },
                loadOp: 'clear',
                storeOp: 'store',
            }],
        });

        renderPass.setPipeline(this.pipeline);
        renderPass.setBindGroup(0, this.bindGroup);
        renderPass.draw(4);
        renderPass.end();

        this.device.queue.submit([commandEncoder.finish()]);

        // Update FPS counter
        this.frameCount++;
        const currentTime = performance.now();
        if (currentTime - this.lastTime >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
            document.getElementById('fpsCounter').textContent = `FPS: ${this.fps}`;
            this.frameCount = 0;
            this.lastTime = currentTime;
        }
    }

    startRenderLoop() {
        const loop = () => {
            this.render();
            this.animationId = requestAnimationFrame(loop);
        };
        loop();
    }

    showError(message) {
        const infoBox = document.getElementById('infoBox');
        infoBox.textContent = message;
        infoBox.className = 'info error';
    }

    showInfo(message) {
        const infoBox = document.getElementById('infoBox');
        infoBox.textContent = message;
        infoBox.className = 'info';
    }
}

// Initialize application
const processor = new WebGPUProcessor();

// Wait for DOM to load
window.addEventListener('DOMContentLoaded', async () => {
    const success = await processor.init();

    if (!success) return;

    // Button handlers
    document.getElementById('loadImageBtn').addEventListener('click', () => {
        document.getElementById('imageInput').click();
    });

    document.getElementById('loadVideoBtn').addEventListener('click', () => {
        document.getElementById('videoInput').click();
    });

    document.getElementById('startWebcamBtn').addEventListener('click', async () => {
        await processor.startWebcam();
        document.getElementById('stopBtn').disabled = false;
        document.getElementById('startWebcamBtn').disabled = true;
    });

    document.getElementById('stopBtn').addEventListener('click', () => {
        processor.stopPlayback();
        document.getElementById('stopBtn').disabled = true;
        document.getElementById('startWebcamBtn').disabled = false;
    });

    // File input handlers
    document.getElementById('imageInput').addEventListener('change', async (e) => {
        if (e.target.files.length > 0) {
            await processor.loadImage(e.target.files[0]);
            document.getElementById('stopBtn').disabled = true;
        }
    });

    document.getElementById('videoInput').addEventListener('change', async (e) => {
        if (e.target.files.length > 0) {
            await processor.loadVideo(e.target.files[0]);
            document.getElementById('stopBtn').disabled = false;
        }
    });

    // Mode selector handlers
    document.getElementById('asciiMode').addEventListener('click', (e) => {
        processor.params.mode = 0;
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
    });

    document.getElementById('ditherMode').addEventListener('click', (e) => {
        processor.params.mode = 1;
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
    });

    document.getElementById('combinedMode').addEventListener('click', (e) => {
        processor.params.mode = 2;
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
    });

    // Parameter sliders
    const sliders = [
        { id: 'asciiDensity', param: 'asciiDensity', display: 'asciiDensityValue' },
        { id: 'charSize', param: 'charSize', display: 'charSizeValue' },
        { id: 'ditherIntensity', param: 'ditherIntensity', display: 'ditherIntensityValue' },
        { id: 'ditherSize', param: 'ditherSize', display: 'ditherSizeValue' },
        { id: 'brightness', param: 'brightness', display: 'brightnessValue' },
        { id: 'contrast', param: 'contrast', display: 'contrastValue' }
    ];

    sliders.forEach(({ id, param, display }) => {
        const slider = document.getElementById(id);
        const valueDisplay = document.getElementById(display);

        slider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            processor.params[param] = value;
            valueDisplay.textContent = value.toFixed(id === 'ditherIntensity' || id === 'brightness' || id === 'contrast' ? 2 : 0);
        });
    });
});

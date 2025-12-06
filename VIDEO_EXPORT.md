# FFmpeg.wasm Video Export

## Overview

Your storytime app now uses **FFmpeg.wasm** for video generation - a completely free, browser-based solution that generates professional MP4 videos with zero server costs.

## How It Works

### 1. **Client-Side Processing**
- FFmpeg runs entirely in the user's browser using WebAssembly
- No server required, no API costs
- User's device does the processing

### 2. **Video Generation Pipeline**

```
Scene Images → FFmpeg.wasm → MP4 Video → Supabase Storage → Download
```

**Steps:**
1. Load scene background images
2. FFmpeg creates video from images (with specified duration per scene)
3. Optional: Add audio tracks (narration/dialogue)
4. Generate final MP4 file
5. Upload to Supabase Storage
6. Automatically download to user's device

### 3. **Cost Breakdown**

| Component | Cost |
|-----------|------|
| FFmpeg Processing | **$0** (runs in browser) |
| Bandwidth (30MB one-time) | **$0** (CDN served) |
| Supabase Storage | ~$0.021/GB/month |
| Total per 1000 videos | **~$2** (storage only) |

Compare to alternatives:
- Remotion: $75 per 1000 videos
- Server FFmpeg: $20-50/month server costs

## Features

### Current Implementation

✅ **Scene-based video generation**
- Each scene = 1 image + duration
- Automatic scaling to 1280x720
- Background color padding
- 30 FPS output

✅ **Progress tracking**
- Real-time progress bar
- Stage indicators (loading, preparing, encoding, finalizing)
- Percentage complete

✅ **Automatic upload**
- Saves to Supabase `video-exports` bucket
- Records in `video_exports` table
- Generates public URL

✅ **Automatic download**
- Downloads MP4 to user's device
- Filename based on story title

### Next Steps (Easy to Add)

🔜 **Audio support**
- Add narration per scene
- Character dialogue
- Background music
- Perfect audio sync

🔜 **Transitions**
- Fade between scenes
- Slide transitions
- Dissolve effects

🔜 **Character animations**
- Add character sprites on top of backgrounds
- Simple movements (slide in, bounce, etc.)
- Expression changes

🔜 **Text overlays**
- Scene titles
- Dialogue subtitles
- Credits

## Usage

### From Preview Page

```tsx
// User clicks "Export Video" button
// Progress bar shows status
// Video automatically downloads when complete
```

### Programmatic Usage

```typescript
import { getFFmpegGenerator } from '@/lib/video/ffmpeg-generator';

const generator = getFFmpegGenerator();

// Simple video (images only)
const videoBlob = await generator.generateSimpleVideo(
  [
    { imageUrl: 'scene1.png', duration: 5 },
    { imageUrl: 'scene2.png', duration: 3 },
  ],
  (progress) => {
    console.log(`${progress.stage}: ${progress.progress}%`);
  }
);

// Advanced video (with audio)
const videoBlob = await generator.generateVideo(
  [
    { 
      imageUrl: 'scene1.png', 
      duration: 5,
      audioUrl: 'narration1.mp3' 
    },
  ],
  {
    width: 1920,
    height: 1080,
    fps: 60,
  },
  (progress) => {
    updateProgressBar(progress);
  }
);
```

## Performance

### Initial Load
- **First time**: ~30MB download (FFmpeg core + wasm)
- **Subsequent uses**: Cached, instant load

### Generation Speed
Depends on user's device:
- **Fast device** (M1/M2 Mac, modern PC): 5-10 seconds per minute of video
- **Average device**: 15-30 seconds per minute
- **Slow device**: 30-60 seconds per minute

Example: 1-minute story with 3 scenes
- Fast: ~10 seconds total
- Average: ~25 seconds total
- Slow: ~45 seconds total

## File Structure

```
lib/
  video/
    ffmpeg-generator.ts   # Main FFmpeg wrapper class

app/
  protected/
    story/
      [id]/
        preview/
          page.tsx         # Video export UI
```

## Configuration Options

```typescript
interface VideoOptions {
  width?: number;          // Default: 1280
  height?: number;         // Default: 720
  fps?: number;           // Default: 30
  backgroundColor?: string; // Default: 'black'
}

interface VideoScene {
  imageUrl: string;       // Scene background image
  duration: number;       // Scene duration in seconds
  audioUrl?: string;      // Optional audio track
}
```

## Troubleshooting

### "Failed to load video encoder"
- User's browser doesn't support SharedArrayBuffer
- Enable COOP/COEP headers in production
- Fallback: Use server-side rendering

### Slow generation
- Normal on older devices
- Consider showing estimated time
- Option to render server-side for premium users

### Large file sizes
- Adjust CRF value (23 = good balance)
- Lower: 18-20 (larger, better quality)
- Higher: 25-28 (smaller, lower quality)

## Future Enhancements

### 1. Advanced Animations
```typescript
// Add character movement
{ 
  imageUrl: 'background.png',
  characters: [
    {
      sprite: 'character.png',
      x: 100, y: 300,
      animations: [
        { type: 'move', to: { x: 500 }, duration: 2 }
      ]
    }
  ]
}
```

### 2. Filters & Effects
```typescript
// Add video filters
options: {
  filters: ['blur', 'brightness', 'contrast'],
  transitions: 'fade'
}
```

### 3. Templates
```typescript
// Pre-built animation templates
const template = getTemplate('peppa-pig-style');
await generator.generateFromTemplate(scenes, template);
```

## Resources

- [FFmpeg.wasm Docs](https://ffmpegwasm.netlify.app/)
- [FFmpeg Filter Guide](https://ffmpeg.org/ffmpeg-filters.html)
- [Video Codecs Reference](https://trac.ffmpeg.org/wiki/Encode/H.264)

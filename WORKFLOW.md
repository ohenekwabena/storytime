# Story Animation Workflow

## Complete User Journey

### 1. Create Story ✅
**URL:** `/protected/create`
- Enter story prompt (e.g., "A curious kitten explores a magical garden")
- Select style: cartoon, anime, realistic, or comic
- Choose age group: toddler, preschool, or elementary
- Set number of scenes (3-8)
- Click "Generate Story" (costs 10 credits)

**What happens:**
- AI generates story with characters, scenes, and dialogue
- Story saved to database with status "draft"
- Redirects to story editor

---

### 2. Generate Assets ✅
**URL:** `/protected/story/[id]`

**Actions available:**
- **Generate All Backgrounds** - Creates scene background images (3 credits each)
- **View Characters** - See all AI-generated character images (5 credits each)

**Status indicators:**
- Characters show loading spinner while generating
- Scenes show "No BG" placeholder until backgrounds are ready
- All generations happen automatically or via buttons

---

### 3. Preview Animation ✅ **← YOU ARE HERE**
**URL:** `/protected/story/[id]/preview`

**Features:**
- Full screen animation player (1280x720)
- Play/Pause/Reset controls
- Scene navigation timeline
- Mute/unmute button (for future audio)
- Scene-by-scene playback with automatic transitions
- Shows current scene script and details

**How it works:**
- Loads all characters and scenes from database
- Converts to PixiJS animation format
- Characters fade in and perform simple bounce animations
- Advances through scenes automatically when duration completes
- Uses the AnimationCanvas component with PixiJS engine

---

### 4. Generate Audio (NEXT STEP)
**URL:** `/protected/story/[id]` → "Generate Audio" button

**To implement:**
- Generate narration for each scene using TTS
- Generate dialogue for each character
- Create phoneme data for lip-sync
- Save audio files to Supabase Storage
- Link audio tracks to scenes in database

**Technology:**
- Browser Web Speech API (free, unlimited)
- ElevenLabs API (optional, 10k chars/month free)
- Simple phoneme-based lip sync (A, E, I, O, U mouth shapes)

---

### 5. Export Video (FINAL STEP)
**URL:** `/protected/story/[id]/preview` → "Export Video" button

**To implement:**
- Render each scene frame-by-frame
- Combine with audio tracks
- Use MediaRecorder API to create video
- Upload to Supabase Storage
- Generate video thumbnail
- Mark story as "completed"

**Format:** WebM or MP4, 1280x720, 30fps

---

## Current Progress

✅ **Completed:**
1. Database schema with 8 tables
2. AI story generation (Flan-T5)
3. Character image generation (Stable Diffusion XL)
4. Scene background generation (Stable Diffusion XL)
5. PixiJS animation engine
6. Story dashboard and editor UI
7. **Animation preview player** ← Just created!

🚧 **Next Priority:**
1. **Audio generation system**
2. Video export functionality
3. Scene editing (add/remove characters, timing)
4. Template library (pre-made scenes)

---

## Quick Test Flow

1. **Create a story:**
   ```
   Prompt: "A brave little robot learns to make friends"
   Style: cartoon
   Age: preschool
   Scenes: 3
   ```

2. **Wait for generation:**
   - Story created automatically
   - Characters generated (may take 30-60 seconds)

3. **Generate backgrounds:**
   - Click "Generate All Backgrounds"
   - Wait for all scenes (may take 1-2 minutes)

4. **Preview animation:**
   - Click "Preview Animation" button
   - Click "Play" to watch your story!

---

## Next Implementation Steps

### Step 1: Audio Generation (Priority)

Create `lib/audio/tts-engine.ts`:
```typescript
export async function generateNarration(text: string, voiceId?: string): Promise<Blob>
export async function generateDialogue(text: string, character: Character): Promise<Blob>
export function generatePhonemeData(text: string): PhonemeData[]
```

Update story editor page with "Generate Audio" functionality.

### Step 2: Video Export

Update preview page "Export Video" button to:
1. Render each scene frame-by-frame
2. Combine frames with audio
3. Create video file using MediaRecorder
4. Upload to Supabase Storage

### Step 3: Advanced Features
- Scene timing editor (adjust duration)
- Character placement editor (drag & drop)
- Animation customization (speed, type)
- Custom audio upload
- Background music

---

## File Structure

```
app/
  protected/
    create/page.tsx          # Story creation form
    page.tsx                 # Stories dashboard
    story/
      [id]/
        page.tsx            # Story editor (manage assets)
        preview/page.tsx    # Animation player ← NEW!
        
components/
  animation/
    animation-canvas.tsx    # PixiJS React wrapper ← UPDATED!
    
lib/
  ai/huggingface.ts         # AI content generation
  animation/
    pixi-engine.ts          # Animation engine
    video-export.ts         # Video rendering
  audio/                    # ← NEEDS IMPLEMENTATION
    tts-engine.ts          
```

---

## Environment Variables Required

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
HUGGINGFACE_API_KEY=your_hf_token  # Free from huggingface.co

# Optional (enhances quality)
ELEVENLABS_API_KEY=your_elevenlabs_key  # 10k chars/month free
```

---

## Testing Checklist

- [x] Story generation works
- [x] Character images generate
- [x] Scene backgrounds generate
- [x] Animation preview loads
- [x] Play/pause controls work
- [x] Scene navigation works
- [ ] Audio generation
- [ ] Lip sync animation
- [ ] Video export
- [ ] Download video file

# StoryTime - Automated Cartoon Animation Pipeline

An AI-powered web application that allows users to create short animated children's stories with minimal manual work. Users input story prompts and receive fully animated videos with characters, scenes, narration, and effects.

## Features

- 🎨 **AI Story Generation**: Generate complete story scripts with Mistral-7B
- 🖼️ **Character & Scene Generation**: Automatically create characters and backgrounds using Stable Diffusion
- 🎬 **PixiJS Animation Engine**: Render sprite-based animations with smooth transitions
- 🎙️ **Text-to-Speech**: Generate narration and dialogue (Browser TTS or ElevenLabs)
- 🎵 **Simple Lip Sync**: Phoneme-based mouth animations
- 📹 **Video Export**: Export animations as WebM/MP4 videos
- 💾 **Supabase Backend**: User authentication, database, and file storage
- 🎯 **Scene Editor**: Edit character positions, timing, and expressions
- 🚀 **Free AI Models**: Uses HuggingFace Inference API (free tier)

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Animation**: PixiJS 7, Framer Motion
- **UI**: Tailwind CSS, shadcn/ui, Radix UI
- **AI Integration**: 
  - HuggingFace Inference API (Mistral-7B, Stable Diffusion XL)
  - ElevenLabs TTS (optional, 10k chars/month free)
  - Browser Web Speech API (completely free)
- **Backend**: Supabase (Auth, PostgreSQL, Storage)

## Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works)
- HuggingFace account for API access (free)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

You already have a Supabase project configured in `.vscode/mcp.json`. Now you need to run the database migrations.

### 3. Run Database Migrations

The project includes SQL migration files in `supabase/migrations/`. You need to apply these to your Supabase project.

**Option A: Using Supabase MCP (Recommended)**

The migrations will be applied automatically when you use the Supabase tools through Copilot.

**Option B: Manual SQL Execution**

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Open your project's SQL Editor
3. Copy and run the contents of:
   - `supabase/migrations/20231206000001_initial_schema.sql`
   - `supabase/migrations/20231206000002_storage_buckets.sql`

### 4. Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your credentials:

```env
# Supabase (get from your Supabase project dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key

# HuggingFace (required for AI features)
# Get free API key: https://huggingface.co/settings/tokens
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxx

# Optional: ElevenLabs for better TTS (10k chars/month free)
ELEVENLABS_API_KEY=your_key_here

# Optional: Replicate for alternative image generation
REPLICATE_API_TOKEN=r8_your_token
```

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Creating Your First Story

1. **Sign Up**: Create an account (you start with 100 free credits)
2. **Create Story**: Click "Create New Story" and enter a story prompt
   - Example: "A brave little bunny who learns to overcome their fear of the dark"
3. **Generate Content**: AI will create:
   - Story script with scenes and dialogue
   - Character designs (costs 5 credits per character)
   - Scene backgrounds (costs 3 credits per scene)
4. **Edit Scenes**: Customize character positions, timing, and expressions
5. **Generate Audio**: Add narration and dialogue (browser TTS is free)
6. **Preview**: Watch your animation in the preview player
7. **Export Video**: Render and download your animated video

### Credit System

- **Story Generation**: 10 credits
- **Character Generation**: 5 credits each
- **Background Generation**: 3 credits each
- **Free users**: 100 credits to start

## Architecture

### Frontend Structure

```
app/
├── protected/
│   ├── page.tsx              # Stories dashboard
│   ├── create/page.tsx       # Story creation form
│   └── story/[id]/page.tsx   # Story editor
├── actions/
│   └── ai-actions.ts         # Server actions for AI generation
components/
├── animation/
│   └── animation-canvas.tsx  # PixiJS React wrapper
lib/
├── ai/
│   ├── huggingface.ts        # HuggingFace integration
│   └── tts.ts                # Text-to-speech utilities
├── animation/
│   ├── pixi-engine.ts        # Core animation engine
│   └── video-export.ts       # Video rendering
└── supabase/
    ├── client.ts             # Client-side Supabase
    ├── server.ts             # Server-side Supabase
    └── database.types.ts     # TypeScript types
```

### Database Schema

- `user_profiles` - User data linked to auth.users
- `stories` - Story metadata and scripts
- `characters` - Character data and images
- `scenes` - Scene scripts and backgrounds
- `scene_characters` - Character placements in scenes
- `audio_tracks` - TTS audio files with timing
- `video_exports` - Rendered video metadata
- `templates` - Reusable character/scene templates

## Free AI Model Limits

- **HuggingFace Inference API**: 1000 requests/month (free tier)
- **ElevenLabs TTS**: 10,000 characters/month (free tier)
- **Browser Web Speech API**: Unlimited (built into browsers)
- **Replicate**: 50 predictions/month (free tier)

## Deployment

### Deploy to Vercel

```bash
npm run build
vercel deploy
```

Set environment variables in Vercel dashboard.

## Troubleshooting

### Issue: "HUGGINGFACE_API_KEY is not set"
**Solution**: Add your HuggingFace API key to `.env.local`

### Issue: "Insufficient credits"
**Solution**: Credits are tracked in the `user_profiles` table. Manually update or implement a payment system.

### Issue: "Browser does not support video recording"
**Solution**: Use a modern browser (Chrome, Edge, Firefox). Safari has limited support.

### Issue: Images not generating
**Solution**: Check HuggingFace API limits. Consider using cached/predefined characters for testing.

## Next Steps

After setup, the application needs:

1. **Apply Database Migrations**: Run the SQL migrations in your Supabase project
2. **Get API Keys**: Sign up for HuggingFace (required) and optionally ElevenLabs
3. **Test Story Creation**: Create a test story to verify AI integration
4. **Customize**: Add your own character templates or style presets

## Contributing

Contributions welcome! Areas to improve:

- Advanced character rigging (skeletal animation)
- Better lip sync (Rhubarb integration)
- Music generation
- Multi-language support
- Advanced scene transitions
- Real-time collaboration

## License

MIT License

## Credits

- Built with [Next.js](https://nextjs.org/)
- Powered by [Supabase](https://supabase.com/)
- AI models from [HuggingFace](https://huggingface.co/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)

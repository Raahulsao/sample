# Hugging Face Image Generation Setup Guide

This guide will help you set up free image generation using Hugging Face's Inference API.

## Step 1: Get Your Free Hugging Face API Token

1. **Create Account**: Go to [huggingface.co](https://huggingface.co) and create a free account
2. **Access Settings**: Click on your profile → Settings
3. **Create Token**: Go to "Access Tokens" tab
4. **Generate Token**: Click "New token"
   - Name: `ChatGPT Clone Image Generation`
   - Type: `Write` (required for inference API)
   - ⚠️ **Important**: You MUST select "Write" permissions, not "Read"
5. **Copy Token**: Copy the generated token (starts with `hf_`)

## Step 2: Add Token to Environment Variables

1. **Open `.env.local`** in your project root
2. **Replace the placeholder**:
   ```env
   HUGGINGFACE_API_TOKEN=your_huggingface_token_here
   ```
   With your actual token:
   ```env
   HUGGINGFACE_API_TOKEN=hf_your_actual_token_here
   ```

## Step 3: Optional Configuration

You can customize the image generation by adding these optional environment variables:

```env
# Change the AI model (default: stabilityai/stable-diffusion-2-1)
HUGGINGFACE_IMAGE_MODEL=runwayml/stable-diffusion-v1-5

# Increase timeout for slower models (default: 60000ms = 60 seconds)
HUGGINGFACE_TIMEOUT=90000

# Adjust retry attempts (default: 3)
HUGGINGFACE_MAX_RETRIES=5
```

## Step 4: Available Models

Here are some popular free models you can use:

### Stable Diffusion Models
- `stabilityai/stable-diffusion-2-1` (default, good quality)
- `runwayml/stable-diffusion-v1-5` (classic, reliable)
- `stabilityai/stable-diffusion-xl-base-1.0` (higher quality, slower)

### Anime/Art Style Models
- `hakurei/waifu-diffusion` (anime style)
- `nitrosocke/Arcane-Diffusion` (Arcane TV show style)
- `dallinmackay/Van-Gogh-diffusion` (Van Gogh painting style)

### Specialized Models
- `prompthero/openjourney` (Midjourney-like results)
- `wavymulder/Analog-Diffusion` (analog photography style)

## Step 5: Test Your Setup

1. **Restart your development server**:
   ```bash
   npm run dev
   ```

2. **Test image generation**:
   - Click the purple "Image" button in the chat input
   - Type a prompt like: "A beautiful sunset over mountains"
   - Click send and wait for the image to generate

## Step 6: Understanding the Features

### Image Generation Options
The system supports these parameters (automatically optimized):
- **Width/Height**: 512x512 pixels (default, good balance of speed/quality)
- **Inference Steps**: 20 steps (default, good quality)
- **Guidance Scale**: 7.5 (default, follows prompts well)

### Error Handling
The system handles common issues:
- **Model Loading**: If a model is starting up, it will retry automatically
- **Rate Limits**: Shows user-friendly messages with retry times
- **Network Issues**: Automatic retries with exponential backoff
- **Invalid Tokens**: Clear error messages for setup issues

### Performance Tips
- **First Request**: May take 20-60 seconds as the model loads
- **Subsequent Requests**: Usually 10-30 seconds
- **Simple Prompts**: Generate faster than complex ones
- **Popular Models**: Load faster than niche models

## Troubleshooting

### "API Token Invalid" Error
- Double-check your token in `.env.local`
- Ensure the token starts with `hf_`
- **MOST COMMON**: Make sure your token has "Write" permissions (not just "Read")
- Make sure you copied the entire token
- Restart your development server

### "Model Loading" Messages
- This is normal for the first request
- Wait 20-60 seconds and try again
- Consider switching to a more popular model

### Slow Generation
- Try a different model (some are faster)
- Use simpler prompts
- Check your internet connection
- Consider increasing the timeout in `.env.local`

### Rate Limit Issues
- Hugging Face has generous free limits
- Wait for the specified retry time
- Consider upgrading to Hugging Face Pro for higher limits

## Free Tier Limits

Hugging Face's free tier includes:
- **1,000 requests per month** for most models
- **No cost** for inference API usage
- **Community models** available for free
- **Rate limiting** during peak times

For higher usage, consider:
- **Hugging Face Pro** ($9/month) for higher limits
- **Dedicated endpoints** for consistent performance
- **Local deployment** using Hugging Face Transformers

## Example Prompts

Try these prompts to test your setup:

### Landscapes
- "A serene mountain lake at sunrise with mist"
- "Tropical beach with palm trees and crystal clear water"
- "Autumn forest with golden leaves falling"

### Art Styles
- "A cat in the style of Van Gogh"
- "Cyberpunk city at night, neon lights"
- "Watercolor painting of a flower garden"

### Creative
- "A steampunk robot reading a book"
- "Floating islands in a purple sky"
- "A cozy library with magical floating books"

## Next Steps

Once you have image generation working:
1. **Experiment** with different models and prompts
2. **Customize** the UI components in `components/image-display.tsx`
3. **Add features** like image editing or style transfer
4. **Optimize** performance by caching or using dedicated endpoints

## Support

If you encounter issues:
1. Check the browser console for detailed error messages
2. Verify your `.env.local` configuration
3. Test with simple prompts first
4. Check Hugging Face status at [status.huggingface.co](https://status.huggingface.co)

Happy image generating! 🎨
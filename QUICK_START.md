# Carousel Advertorial Editor - Quick Start Guide

## 🚀 Getting Started (5 minutes)

### Step 1: Install Dependencies
```bash
cd carousel-editor
npm install
```

### Step 2: Start the Editor
```bash
npm run dev
```

The editor will open at `http://localhost:3000`

## 📝 Creating Your First Carousel

### 1. Set Global Settings
- **Customer Name**: Enter advertiser name (e.g., "URMAKER BJERKE")
- **Auto-rotate**: Check if you want slides to auto-scroll
- Adjust timing if auto-rotate is enabled

### 2. Add Your First Slide
1. Click **"+ Add Slide"**
2. Choose a slide type (start with "Image with Text")
3. Click **"Edit"** on the slide
4. Upload an image
5. Add title and text
6. Customize colors and styling
7. Optionally add a button

### 3. Preview
- Toggle between **Desktop** (980px) and **Mobile** (380px)
- Test interactions and animations

### 4. Add More Slides
- Repeat step 2 for different slide types
- Drag slides to reorder using the ☰ handle

### 5. Export
1. Click **"Export to ZIP"**
2. Save the file (e.g., `carousel-123456789.zip`)

## 📦 What You Get

The exported ZIP contains:
```
carousel-XXXXXXX.zip
├── config.json              ← Configuration file
├── carousel-runtime.js      ← The carousel script
├── assets/                  ← Your uploaded media
│   ├── image1.jpg
│   ├── image2.jpg
│   └── video1.mp4
└── README.md               ← Deployment instructions
```

## ☁️ Deploying to S3/CloudFront

### Upload Files
1. Extract the ZIP file
2. Upload to your S3 bucket:
   - `config.json` → root or subfolder
   - `carousel-runtime.js` → root or subfolder
   - `assets/*` → assets folder

### Example S3 Structure
```
my-bucket/
├── carousels/
│   ├── carousel-123456789/
│   │   ├── config.json
│   │   ├── carousel-runtime.js
│   │   └── assets/
│   │       ├── image1.jpg
│   │       └── video1.mp4
```

### CloudFront URLs
After upload, your files will be accessible at:
- `https://YOUR-CLOUDFRONT.net/carousels/carousel-123456789/config.json`
- `https://YOUR-CLOUDFRONT.net/carousels/carousel-123456789/carousel-runtime.js`

## 🎯 Google Ad Manager Setup

### Create Creative Template

1. In GAM, create a new **HTML5 Creative**
2. Use this template code:

```html
<script>
    window.carouselConfigUrl = 'https://YOUR-CLOUDFRONT.net/path/to/config.json';
</script>
<script src="https://YOUR-CLOUDFRONT.net/path/to/carousel-runtime.js"></script>
<div id="carousel-container"></div>
```

3. Replace URLs with your CloudFront paths
4. Save and test

### Benefits
- ✅ No template updates when adding new slide types
- ✅ Easy content updates (just replace config.json)
- ✅ Fast CDN delivery
- ✅ Version control multiple carousels

## 🎨 Slide Type Guide

### Full Image
Perfect for: Hero images, product shots
- Upload image
- Optional zoom effect
- Optional clickable link

### Image with Text
Perfect for: Feature highlights, announcements
- Image background
- Text overlay (top or bottom)
- Gradient for readability
- Button support

### Text Only
Perfect for: Statistics, quotes, explanations
- Clean text layout
- Custom colors
- Button support

### Video
Perfect for: Product demos, motion content
- Auto-plays when visible
- Optional poster image
- Loops automatically

### Video with Text
Perfect for: Narrated features, campaigns
- Video background
- Text overlay
- Gradient for readability

### Big Numbers
Perfect for: Statistics, metrics, KPIs
- Two large numbers with descriptions
- High visual impact

### Image Selector
Perfect for: Product variations, comparisons
- Interactive gallery
- Click dots to switch
- Caption for each image

## 💡 Pro Tips

### Images
- Use high-quality images (1200px+ wide)
- Optimize file sizes (use TinyPNG or similar)
- JPG for photos, PNG for graphics with transparency

### Videos
- Keep videos under 10MB when possible
- Use MP4 format (H.264 codec)
- Videos must be muted to autoplay

### Text
- Keep titles short (5-8 words)
- Body text should be scannable
- Use gradients for text readability on images

### Buttons
- Use action verbs ("Shop Now", "Learn More")
- Make button colors contrast with background
- Place buttons consistently across slides

### Performance
- Limit videos to 2-3 per carousel
- Optimize all images before upload
- Test on mobile devices

## 🔧 Troubleshooting

**Editor won't start?**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

**Preview not showing?**
- Check browser console (F12) for errors
- Try a different browser (Chrome recommended)

**Export ZIP is huge?**
- Compress images before uploading to editor
- Keep videos under 10MB each
- Remove unused slides before export

**Carousel not showing in GAM?**
- Verify CloudFront URLs are correct
- Check CORS settings on S3 bucket
- Test config.json URL directly in browser
- Ensure carousel-runtime.js loads (check Network tab)

## 📞 Support

For issues or questions:
- Check the full README.md
- Review example carousels
- Contact Content Studio team

## 🎉 You're Ready!

Start creating amazing carousel advertorials! Remember:
1. Design slides in the editor
2. Export to ZIP
3. Upload to S3
4. Reference in GAM creative

Happy creating! 🚀

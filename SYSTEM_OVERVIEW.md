# Carousel Advertorial System - Complete Overview

## 🎯 System Architecture

### The Big Picture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CAROUSEL EDITOR (Local)                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Visual Interface → Edit Slides → Preview → Export ZIP   │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │ Export
                             ▼
                    ┌─────────────────┐
                    │   carousel.zip  │
                    │  ├─ config.json │
                    │  ├─ runtime.js  │
                    │  └─ assets/     │
                    └────────┬────────┘
                             │ Upload
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         AWS S3 BUCKET                            │
│  /carousels/                                                     │
│    /carousel-123456789/                                          │
│      ├─ config.json       ← Configuration                       │
│      ├─ carousel-runtime.js ← Renderer                          │
│      └─ assets/                                                  │
│         ├─ image1.jpg                                            │
│         ├─ image2.jpg                                            │
│         └─ video1.mp4                                            │
└────────────────────────────┬────────────────────────────────────┘
                             │ Served via
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AWS CLOUDFRONT (CDN)                        │
│  https://YOUR-CF.cloudfront.net/carousels/carousel-123456789/   │
└────────────────────────────┬────────────────────────────────────┘
                             │ Referenced by
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  GOOGLE AD MANAGER CREATIVE                      │
│  <script>                                                        │
│    window.carouselConfigUrl = 'CF_URL/config.json';             │
│  </script>                                                       │
│  <script src="CF_URL/carousel-runtime.js"></script>             │
│  <div id="carousel-container"></div>                            │
└────────────────────────────┬────────────────────────────────────┘
                             │ Serves to
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         DN.NO WEBSITE                            │
│  User sees carousel ad with all functionality                   │
└─────────────────────────────────────────────────────────────────┘
```

## 🔧 Components Explained

### 1. Carousel Editor (Local Application)

**Purpose:** Visual tool to create and configure carousels

**Technology:**
- Vite (development server)
- Vanilla JavaScript (no framework dependency)
- JSZip (for creating export packages)
- Sortable.js (for drag-and-drop)

**Key Features:**
- Visual WYSIWYG editor
- Live preview (desktop/mobile)
- Drag-and-drop slide reordering
- File upload handling
- ZIP export with all assets

**Files:**
- `index.html` - Main editor interface
- `src/main.js` - Editor logic
- `src/editor.css` - Editor styling
- `src/slideTemplates.js` - Default slide configurations

### 2. Carousel Runtime (Client-Side Script)

**Purpose:** Renders the carousel on DN.no based on config

**Technology:**
- Pure JavaScript (ES5 compatible)
- No dependencies
- Runs in user's browser

**Key Features:**
- Loads config from URL or inline
- Dynamically renders all slide types
- Handles video autoplay
- Manages auto-rotation
- Responsive design
- Intersection Observer for video playback

**File:**
- `public/carousel-runtime.js` - Self-contained renderer

### 3. Configuration File (JSON)

**Purpose:** Defines carousel content and behavior

**Structure:**
```json
{
  "carouselId": 123456789,
  "disclaimerText": "ANNONSØRINNHOLD",
  "customerName": "BRAND NAME",
  "autoRotate": true,
  "autoRotateDelay": 4000,
  "autoRotateSpeed": 1000,
  "slides": [...]
}
```

**Benefits:**
- Easy to update content
- Human-readable
- Version controllable
- No code changes needed

### 4. Google Ad Manager Creative Template

**Purpose:** Integration point between GAM and carousel

**Approach:** Minimal template that loads runtime

**Why This Approach:**
- ✅ No GAM updates needed for new slide types
- ✅ Content updates without creative changes
- ✅ Multiple carousels from one template
- ✅ Version control outside GAM
- ✅ Fast CDN delivery

## 🎨 Supported Slide Types

### 1. Full Image
- Single image fills entire slide
- Optional Ken Burns zoom effect
- Optional clickable link
- Optional button overlay

**Use Cases:**
- Hero images
- Product photography
- Lifestyle shots

### 2. Image with Text Overlay
- Background image with text overlay
- Text can be top or bottom
- Gradient overlay for readability
- Customizable fonts and colors

**Use Cases:**
- Feature announcements
- Campaign messages
- Product highlights

### 3. Text Only
- Clean text-based slide
- Title and body text
- Custom colors and fonts
- Optional button

**Use Cases:**
- Explanations
- Quotes
- Detailed information

### 4. Video
- Auto-playing video (muted)
- Loops continuously
- Optional poster image
- Plays when 50%+ visible

**Use Cases:**
- Product demos
- Motion graphics
- Behind-the-scenes

### 5. Video with Text Overlay
- Video background
- Text overlay (like image variant)
- Gradient support
- Button support

**Use Cases:**
- Narrated features
- Campaign videos
- Storytelling

### 6. Big Numbers
- Two large statistics
- Numbers + descriptions
- High visual impact
- Custom styling

**Use Cases:**
- Key metrics
- Statistics
- Performance data

### 7. Image Selector
- Interactive image gallery
- Click dots to switch
- Caption text for each image
- Smooth transitions

**Use Cases:**
- Product variations
- Color options
- Before/after comparisons

## 🔄 Workflow

### Development Workflow

```
1. Open Editor
   ↓
2. Configure Global Settings
   ↓
3. Add Slides
   ↓
4. Customize Each Slide
   ↓
5. Preview (Desktop/Mobile)
   ↓
6. Export to ZIP
```

### Deployment Workflow

```
1. Extract ZIP
   ↓
2. Upload to S3
   ├─ assets/ first
   ├─ carousel-runtime.js
   └─ config.json last
   ↓
3. Create/Update GAM Creative
   ↓
4. Assign to Line Item
   ↓
5. Test and Go Live
```

### Update Workflow

```
1. Edit in Editor
   ↓
2. Export New ZIP
   ↓
3. Upload New config.json to S3
   ↓
4. Upload New/Changed Assets
   ↓
5. Wait for Cache or Invalidate
   ↓
6. Verify Changes
```

## 💾 File Structure

### Editor Project Structure

```
carousel-editor/
├── index.html                 # Main editor interface
├── package.json              # Dependencies
├── vite.config.js            # Vite configuration
├── src/
│   ├── main.js               # Editor logic
│   ├── editor.css            # Editor styling
│   └── slideTemplates.js     # Slide defaults
├── public/
│   └── carousel-runtime.js   # Runtime script
├── README.md                 # Full documentation
├── QUICK_START.md            # Quick start guide
├── DEPLOYMENT_CHECKLIST.md   # Deployment checklist
├── example-config.json       # Example configuration
└── google-ad-manager-template.html
```

### S3 Bucket Structure

```
s3://your-bucket/
└── carousels/
    ├── carousel-123456789/
    │   ├── config.json
    │   ├── carousel-runtime.js
    │   └── assets/
    │       ├── image1.jpg
    │       ├── image2.jpg
    │       └── video1.mp4
    └── carousel-987654321/
        ├── config.json
        ├── carousel-runtime.js
        └── assets/
            └── ...
```

## 🚀 Performance Considerations

### Optimization Strategies

**Images:**
- Compress before upload (TinyPNG, ImageOptim)
- Use appropriate formats (JPG for photos, PNG for graphics)
- Recommended max size: 500KB per image
- Consider using WebP with JPG fallback

**Videos:**
- Keep under 10MB when possible
- Use MP4 H.264 codec
- Optimize with HandBrake or similar
- Include poster images

**CDN Caching:**
- config.json: Short TTL (5 min) for easy updates
- carousel-runtime.js: Medium TTL (1 hour)
- Assets: Long TTL (1 day)

**Loading Strategy:**
- Videos lazy-load with Intersection Observer
- Images use native lazy loading when possible
- Runtime script loads asynchronously

## 🔐 Security & Best Practices

### Content Security

- ✅ HTTPS only for all assets
- ✅ Validate all URLs
- ✅ Sanitize user inputs
- ✅ Use Content Security Policy headers

### CORS Configuration

Required for cross-origin requests:

```json
{
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": ["*"]
}
```

### S3 Permissions

- Public read access for assets
- CloudFront OAI (Origin Access Identity) recommended
- Enable versioning for rollback capability

## 📊 Analytics & Tracking

### Built-in Metrics (via GAM)

- Impressions
- Clicks
- Viewability
- CTR

### Potential Custom Tracking

Could be added to runtime:

```javascript
// Track slide views
function trackSlideView(slideIndex) {
  // Send to analytics platform
}

// Track video plays
function trackVideoPlay(videoSrc) {
  // Send to analytics platform
}

// Track button clicks
function trackButtonClick(buttonUrl) {
  // Send to analytics platform
}
```

## 🛠️ Maintenance & Updates

### Updating Runtime Script

1. Edit `public/carousel-runtime.js`
2. Test locally with editor
3. Upload to S3 (consider versioning)
4. Invalidate CloudFront cache if needed
5. All carousels using it will update

### Adding New Slide Types

1. Add template to `src/slideTemplates.js`
2. Add renderer to main.js (editor)
3. Add renderer to carousel-runtime.js
4. Test in editor
5. Upload new runtime to S3
6. No GAM changes needed!

### Managing Multiple Carousels

- Use descriptive folder names
- Keep versions in S3 versioning
- Document carousel IDs
- Archive old campaigns

## 🔮 Future Enhancements

### Potential Features

**Editor Enhancements:**
- [ ] Import existing config.json
- [ ] Slide templates/presets
- [ ] A/B testing variants
- [ ] Bulk operations
- [ ] Undo/redo functionality
- [ ] Preview in actual DN.no context

**Runtime Enhancements:**
- [ ] Additional slide types (quotes, comparisons, etc.)
- [ ] Advanced animations
- [ ] Swipe gestures on mobile
- [ ] Keyboard navigation
- [ ] Accessibility improvements (ARIA)
- [ ] Analytics integration

**Workflow Enhancements:**
- [ ] Direct S3 upload from editor
- [ ] CloudFront invalidation from editor
- [ ] Preview URL generation
- [ ] Collaboration features
- [ ] Version history

## 📚 Resources

### Documentation

- [Full README](README.md) - Complete documentation
- [Quick Start Guide](QUICK_START.md) - Get started in 5 minutes
- [Deployment Checklist](DEPLOYMENT_CHECKLIST.md) - Step-by-step deployment
- [Example Config](example-config.json) - Sample configuration

### External Resources

- [Vite Documentation](https://vitejs.dev/)
- [Google Ad Manager](https://admanager.google.com/)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)

## 🎓 Training

### For Content Creators

1. Review QUICK_START.md
2. Watch demo video (if available)
3. Create a test carousel
4. Export and review files
5. Ask questions!

### For Developers

1. Review this document
2. Study carousel-runtime.js
3. Understand config.json structure
4. Test deployment workflow
5. Contribute improvements

## ✅ Quality Checklist

Before any carousel goes live:

- [ ] Content approved by customer
- [ ] Images optimized
- [ ] Videos optimized
- [ ] All links tested
- [ ] Desktop preview tested
- [ ] Mobile preview tested
- [ ] Disclaimer text correct
- [ ] Customer name correct
- [ ] Tracking implemented (if needed)
- [ ] Performance tested

## 🆘 Support

### Common Issues

See DEPLOYMENT_CHECKLIST.md troubleshooting section

### Getting Help

1. Check documentation
2. Review example config
3. Test in editor preview
4. Contact Content Studio team

## 🎉 Success Metrics

Track these for each carousel:

- Time to create: Target < 30 minutes
- Time to deploy: Target < 15 minutes
- CTR: Compare to benchmarks
- Completion rate: % who see all slides
- Load time: Target < 3 seconds

---

**Version:** 1.0  
**Last Updated:** 2025  
**Maintained By:** DN Content Studio  
**License:** Internal Use Only

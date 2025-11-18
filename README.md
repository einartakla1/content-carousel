# Carousel Advertorial Editor

A local editor for creating carousel advertorials for Google Ad Manager, served via CloudFront/S3.

## Features

- **Visual Editor**: Create and edit carousel slides with a live preview
- **Multiple Slide Types**:
  - Full Image (with optional Ken Burns effect)
  - Image with Text Overlay
  - Text Only
  - Video
  - Video with Text Overlay
  - Big Numbers
  - Image Selector/Gallery
- **Customizable Styling**: Control colors, fonts, gradients, and button placements
- **Drag-and-Drop Reordering**: Easily reorder slides
- **Auto-rotation**: Optional auto-scrolling through slides
- **Responsive Preview**: View in desktop (980px) and mobile (380px) sizes
- **Export to ZIP**: Package everything for S3 upload

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Local Development Server

```bash
npm run dev
```

This will open the editor at `http://localhost:3000`

### 3. Build for Production (optional)

```bash
npm run build
```

## How to Use

### Creating a Carousel

1. **Configure Global Settings**:
   - Carousel ID (auto-generated)
   - Disclaimer text (default: "ANNONSØRINNHOLD")
   - Customer name
   - Auto-rotate settings

2. **Add Slides**:
   - Click "Add Slide"
   - Choose slide type
   - Configure slide content and styling
   - Upload images/videos as needed

3. **Reorder Slides**:
   - Drag slides using the ☰ handle

4. **Edit Slides**:
   - Click "Edit" on any slide
   - Modify content, colors, fonts, buttons, etc.
   - Changes appear instantly in the preview

5. **Preview**:
   - Toggle between Desktop and Mobile views
   - Test auto-rotation and interactions

6. **Export**:
   - Click "Export to ZIP"
   - Downloads a package ready for S3 upload

## Exported Package Structure

```
carousel-XXXXXXX.zip
├── config.json           # Carousel configuration
├── carousel-runtime.js   # Runtime script
├── assets/              # All images and videos
│   ├── image1.jpg
│   ├── video1.mp4
│   └── ...
└── README.md            # Deployment instructions
```

## Deployment to S3/CloudFront

### 1. Upload to S3

Upload all files from the exported ZIP to your S3 bucket:
- `config.json`
- `carousel-runtime.js`
- All files in `assets/` folder

### 2. Google Ad Manager Creative Template

The creative template should be minimal and just load the runtime:

```html
<script>
    window.carouselConfigUrl = '%%CLOUDFRONT_URL%%/config.json';
</script>
<script src="%%CLOUDFRONT_URL%%/carousel-runtime.js"></script>
<div id="carousel-container"></div>
```

Replace `%%CLOUDFRONT_URL%%` with your CloudFront distribution URL.

### Benefits of This Approach

- **No template updates needed**: Add new slide types by updating the runtime script
- **Easy content updates**: Just replace config.json and assets
- **Version control**: Keep different versions on S3
- **Fast loading**: Served via CloudFront CDN

## Slide Types Reference

### Full Image
- Single image that fills the slide
- Optional Ken Burns zoom effect
- Optional clickable link
- Optional button overlay

### Image with Text Overlay
- Image background with text overlay
- Configurable text position (top/bottom)
- Gradient overlay options
- Custom text colors and sizes

### Text Only
- Plain text slide with title and content
- Fully customizable colors and fonts
- Optional button at bottom

### Video
- Auto-playing video (muted, looping)
- Optional poster image
- Plays automatically when visible

### Video with Text Overlay
- Video background with text overlay
- Same text options as Image with Text

### Big Numbers
- Display two statistics with large numbers
- Perfect for highlighting metrics
- Custom colors and sizes

### Image Selector
- Interactive image gallery
- User can click dots to switch images
- Displays caption text below image

## Customization Options

Each slide type supports various customizations:

- **Colors**: Background, text, gradient, button colors
- **Typography**: Font sizes for titles and body text
- **Layout**: Text positioning, width constraints
- **Buttons**: Text, URL, color, placement (top-left, top-right, bottom-left, bottom-right)
- **Effects**: Gradients, zoom effects

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- IE11 not supported

## Technical Notes

- All assets are base64 encoded during editing for preview
- On export, assets are saved as separate files
- Config uses relative paths for S3/CloudFront serving
- Videos auto-play when 50%+ visible using Intersection Observer
- Smooth scrolling with snap points on desktop

## Future Enhancements

Potential additions:
- More slide types (quote, comparison, etc.)
- Templates/presets
- Import existing carousel configurations
- A/B testing variants
- Analytics tracking integration

## Troubleshooting

**Preview not updating?**
- Check browser console for errors
- Make sure files are uploaded correctly

**Videos not playing?**
- Ensure video format is supported (MP4 H.264)
- Videos must be muted to autoplay on mobile

**Images not showing after export?**
- Verify all assets are uploaded to S3
- Check CloudFront distribution is working
- Ensure CORS is configured on S3 bucket

## License

Internal use for DN Content Studio.

## Contact

For questions or issues, contact the Content Studio team.
# content-carousel

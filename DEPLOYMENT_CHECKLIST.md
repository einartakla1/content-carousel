# Deployment Checklist

Use this checklist when deploying a new carousel to production.

## ☁️ S3/CloudFront Setup (One-time)

### S3 Bucket Configuration

- [ ] Create S3 bucket (or use existing)
- [ ] Enable versioning (recommended)
- [ ] Configure bucket policy for CloudFront access
- [ ] Set up folder structure:
  ```
  /carousels/
    /carousel-[ID]/
      config.json
      carousel-runtime.js
      /assets/
  ```

### CORS Configuration

Add this CORS policy to your S3 bucket:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "HEAD"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": []
    }
]
```

- [ ] CORS policy added to S3 bucket

### CloudFront Distribution

- [ ] Create CloudFront distribution (or use existing)
- [ ] Point to S3 bucket as origin
- [ ] Configure caching behavior:
  - **config.json**: Low TTL (e.g., 5 minutes) for easy updates
  - **carousel-runtime.js**: Medium TTL (e.g., 1 hour)
  - **assets/**: High TTL (e.g., 1 day)
- [ ] Enable compression
- [ ] Note CloudFront domain: `_________________.cloudfront.net`

### Example Cache Policies

**For config.json:**
- Minimum TTL: 0
- Maximum TTL: 300 (5 minutes)
- Default TTL: 300

**For carousel-runtime.js:**
- Minimum TTL: 0
- Maximum TTL: 3600 (1 hour)
- Default TTL: 3600

**For assets/*:**
- Minimum TTL: 0
- Maximum TTL: 86400 (1 day)
- Default TTL: 86400

## 📝 Pre-Deployment Checklist

### Content Review

- [ ] All slides have appropriate content
- [ ] Customer name is correct
- [ ] Disclaimer text is correct
- [ ] All images are optimized (<500KB each)
- [ ] All videos are optimized (<10MB each)
- [ ] All links are correct and tested
- [ ] Button texts are clear and actionable

### Quality Assurance

- [ ] Tested in desktop preview (980px)
- [ ] Tested in mobile preview (380px)
- [ ] Auto-rotate works correctly (if enabled)
- [ ] All videos play correctly
- [ ] All buttons work
- [ ] Text is readable on all slides
- [ ] No spelling errors

### Technical Checks

- [ ] Config.json is valid JSON (use jsonlint.com)
- [ ] All asset filenames are correct
- [ ] No spaces in filenames
- [ ] File extensions are lowercase

## 📤 Upload Process

### 1. Prepare Files

- [ ] Export carousel from editor
- [ ] Extract ZIP file
- [ ] Review all files

### 2. Upload to S3

**Upload order:**
1. [ ] Upload all files in `assets/` folder first
2. [ ] Upload `carousel-runtime.js`
3. [ ] Upload `config.json` last

**S3 Path:**
```
s3://YOUR-BUCKET/carousels/carousel-[ID]/
```

- [ ] All assets uploaded
- [ ] carousel-runtime.js uploaded
- [ ] config.json uploaded

### 3. Verify Upload

Test URLs directly in browser:

- [ ] Config URL works: `https://YOUR-CF.net/carousels/carousel-[ID]/config.json`
- [ ] Runtime URL works: `https://YOUR-CF.net/carousels/carousel-[ID]/carousel-runtime.js`
- [ ] Sample asset URL works: `https://YOUR-CF.net/carousels/carousel-[ID]/assets/image1.jpg`

## 🎯 Google Ad Manager Setup

### Create Creative

- [ ] Log into Google Ad Manager
- [ ] Navigate to Delivery → Creatives
- [ ] Click "New creative"
- [ ] Select "Third party"
- [ ] Choose appropriate size (980x516 or responsive)

### Add Creative Code

Use this template:

```html
<script>
    window.carouselConfigUrl = 'https://YOUR-CF.net/carousels/carousel-[ID]/config.json';
</script>
<script src="https://YOUR-CF.net/carousels/carousel-[ID]/carousel-runtime.js"></script>
<div id="carousel-container"></div>
```

- [ ] Creative code added
- [ ] URLs replaced with actual CloudFront URLs
- [ ] Creative saved

### Creative Settings

- [ ] Name: "Carousel - [Customer Name] - [Date]"
- [ ] Advertiser: Select correct advertiser
- [ ] Size: 980x516 (or responsive)
- [ ] Safe frame compatible: Yes (if applicable)

## ✅ Testing in GAM

### Preview Testing

- [ ] Click "Preview" in GAM creative
- [ ] Verify carousel loads
- [ ] Test all slides
- [ ] Test buttons and links
- [ ] Test on mobile (use browser dev tools)

### Line Item Testing

- [ ] Create test line item
- [ ] Assign creative to line item
- [ ] Target to test ad unit
- [ ] Verify delivery
- [ ] Check actual rendering on site

## 🚀 Go Live

### Pre-Launch

- [ ] Final approval from customer
- [ ] Final approval from sales team
- [ ] Campaign dates confirmed
- [ ] Targeting confirmed

### Launch

- [ ] Activate line item
- [ ] Monitor first few impressions
- [ ] Verify tracking/analytics (if applicable)

### Post-Launch

- [ ] Check delivery after 1 hour
- [ ] Check delivery after 24 hours
- [ ] Document any issues
- [ ] Save creative ID for reference

## 📊 Performance Monitoring

### Metrics to Track

- [ ] Impressions
- [ ] Click-through rate (CTR)
- [ ] Viewability
- [ ] Time spent
- [ ] Completion rate (for video slides)

### Weekly Review

- [ ] Review performance metrics
- [ ] Check for any delivery issues
- [ ] Gather customer feedback
- [ ] Note any optimization opportunities

## 🔄 Updates and Maintenance

### Content Updates

If you need to update the carousel content:

1. [ ] Edit in carousel editor
2. [ ] Export new ZIP
3. [ ] Upload new config.json to S3
4. [ ] Upload any new/changed assets
5. [ ] Wait for CloudFront cache to expire (or invalidate)
6. [ ] Verify changes on site

### Invalidating CloudFront Cache

If you need immediate updates:

```bash
# AWS CLI command
aws cloudfront create-invalidation \
  --distribution-id YOUR-DISTRIBUTION-ID \
  --paths "/carousels/carousel-[ID]/*"
```

- [ ] Cache invalidated (if needed)
- [ ] Changes verified

## 📋 Campaign Completion

### End of Campaign

- [ ] Pause/stop line item
- [ ] Export final performance report
- [ ] Archive creative
- [ ] Document learnings
- [ ] Update best practices (if applicable)

### Archive

- [ ] Save final config.json
- [ ] Save final assets
- [ ] Save performance report
- [ ] Save customer feedback

## 🆘 Troubleshooting Quick Reference

**Carousel not loading:**
1. Check CloudFront URLs in browser
2. Check browser console for errors
3. Verify CORS configuration
4. Check S3 file permissions

**Images not showing:**
1. Verify asset URLs are correct
2. Check file extensions match
3. Verify files uploaded to S3
4. Check CloudFront cache status

**Videos not playing:**
1. Verify video format (MP4 H.264)
2. Check file size (<10MB recommended)
3. Test video URL directly
4. Check mobile browser compatibility

**Buttons not working:**
1. Verify button URLs in config.json
2. Check for URL encoding issues
3. Test URLs directly
4. Verify target="_blank" is working

## 📞 Contacts

**Technical Issues:**
- Content Studio Team: [email]
- DevOps: [email]

**Campaign Issues:**
- Sales Team: [email]
- Customer Success: [email]

**Emergency Contact:**
- On-call: [phone]

---

**Campaign ID:** _________________

**Carousel ID:** _________________

**Deployment Date:** _________________

**Deployed By:** _________________

**Go-Live Date:** _________________

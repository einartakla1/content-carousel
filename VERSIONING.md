# Carousel Runtime Versioning

## Overview

The carousel system uses versioned runtime files to ensure that updates to the carousel functionality don't break existing published campaigns. Each carousel specifies which runtime version it uses in its `config.json`, and the Google Ad Manager template automatically loads the correct version from CDN.

## How It Works

### Architecture

```
S3/CloudFront Structure:
/public/
  ├── carousel-runtime-v1.0.0.js  ← Stable production version
  ├── carousel-runtime-v1.1.0.js  ← Current development version
  ├── carousel-runtime-v1.2.0.js  ← Future versions
  ├── 315460247/
  │   ├── config.json              (contains: "runtimeVersion": "1.0.0")
  │   └── assets/
  └── 954955373/
      ├── config.json              (contains: "runtimeVersion": "1.0.0")
      └── assets/
```

### Loading Process

1. GAM creative template loads the carousel config.json
2. Template reads the `runtimeVersion` field (defaults to "1.0.0" if missing)
3. Template loads the appropriate versioned runtime: `carousel-runtime-v{version}.js`
4. Carousel renders using that specific runtime version

### Benefits

✅ **Production Safety**: Old carousels continue working even when runtime is updated
✅ **Independent Development**: Add new features without affecting published campaigns
✅ **Easy Testing**: Test new versions with specific carousels before full rollout
✅ **Rollback Capability**: Can easily downgrade a carousel by changing its config

## Versioning Scheme

We use **Semantic Versioning** (semver):

- **Major version** (v2.0.0): Breaking changes to slide types or config schema
- **Minor version** (v1.1.0): New features, new slide types, backwards compatible
- **Patch version** (v1.0.1): Bug fixes only, backwards compatible

### Current Versions

- **v1.0.0**: Initial stable release (frozen, production-safe)
- **v1.1.0**: Current development version with analytics features

## Development Workflow

### 1. Making Changes to Runtime

When working on new features:

```bash
# Edit the runtime file
vim public/carousel-runtime.js

# The file header should show the version:
# Version: 1.1.0
```

### 2. Testing Locally

```bash
# Start the local development server
npm run dev

# Test your changes in the editor preview
# Export a test carousel and verify it works
```

### 3. Releasing a New Version

When ready to deploy a new version:

#### Step 1: Update Version Number

Edit `public/carousel-runtime.js`:

```javascript
// Carousel Runtime Script
// Version: 1.2.0  ← Update this

(function () {
    'use strict';

    // Runtime version
    const RUNTIME_VERSION = '1.2.0';  ← Update this
    window.carouselRuntimeVersion = RUNTIME_VERSION;
```

#### Step 2: Update Editor Default Version

Edit `src/main.js` in the `prepareConfigForExport()` function:

```javascript
// Add runtime version if not already present
if (!exportConfig.runtimeVersion) {
    exportConfig.runtimeVersion = '1.2.0'; // ← Update to new version
}
```

#### Step 3: Deploy to S3

```bash
# Upload the new versioned runtime
aws s3 cp public/carousel-runtime.js \
  s3://dnmgcs-content-carousel-prod/public/carousel-runtime-v1.2.0.js \
  --profile dnmgcs \
  --content-type "application/javascript"

# Verify it was uploaded
aws s3 ls s3://dnmgcs-content-carousel-prod/public/ \
  --profile dnmgcs | grep carousel-runtime
```

#### Step 4: Invalidate CloudFront Cache (if needed)

```bash
aws cloudfront create-invalidation \
  --distribution-id E3J8NUZWGFHGH2 \
  --paths "/public/carousel-runtime-v1.2.0.js" \
  --profile dnmgcs
```

#### Step 5: Test with a Carousel

Export a new carousel from the editor - it will automatically use the new version. Upload it to S3 and test in GAM.

### 4. Upgrading Existing Carousels

To upgrade an existing carousel to use a new runtime version:

#### Option A: Via S3 Console or CLI

Download the config, update the version, and re-upload:

```bash
# Download config
aws s3 cp s3://dnmgcs-content-carousel-prod/public/315460247/config.json \
  /tmp/config.json --profile dnmgcs

# Edit config.json and change runtimeVersion field
# "runtimeVersion": "1.2.0"

# Upload updated config
aws s3 cp /tmp/config.json \
  s3://dnmgcs-content-carousel-prod/public/315460247/config.json \
  --profile dnmgcs --content-type "application/json"
```

#### Option B: Batch Update Script

```bash
# Update multiple carousels at once
jq '. + {runtimeVersion: "1.2.0"}' /tmp/config.json > /tmp/config-updated.json
```

## Breaking Changes

### When to Bump Major Version

Only increment the major version (e.g., v1.x.x → v2.0.0) when:

- Removing or renaming slide types
- Changing config.json structure in incompatible ways
- Removing support for old config fields
- Changing the rendering behavior significantly

### Migration Path

If a breaking change is necessary:

1. Create v2.0.0 with the breaking changes
2. Update documentation about what changed
3. Test thoroughly with new carousels
4. Existing carousels stay on v1.x.x (continue to work)
5. Gradually migrate carousels on a case-by-case basis

## Monitoring

### Check Which Versions Are in Use

```bash
# List all carousel configs and their versions
for carousel in 315460247 954955373; do
  echo "Carousel $carousel:"
  aws s3 cp s3://dnmgcs-content-carousel-prod/public/$carousel/config.json - \
    --profile dnmgcs | jq -r '.runtimeVersion'
done
```

### Check Available Runtime Versions

```bash
# List all versioned runtimes on CDN
aws s3 ls s3://dnmgcs-content-carousel-prod/public/ --profile dnmgcs \
  | grep carousel-runtime-v
```

## Troubleshooting

### Carousel Not Loading After Version Update

1. **Check browser console** for 404 errors on runtime file
2. **Verify runtime file exists** on S3: `/public/carousel-runtime-v{version}.js`
3. **Check version in config**: Does it match an available runtime version?
4. **Invalidate cache** if you just uploaded a new runtime version

### Wrong Runtime Version Loading

1. **Check config.json**: Look at the `runtimeVersion` field
2. **Check GAM template**: Ensure it's using the latest version that reads the config
3. **Browser cache**: Hard refresh (Cmd+Shift+R or Ctrl+Shift+F5)
4. **CloudFront cache**: May need to wait or invalidate

### Reverting to Previous Version

Simply update the carousel's config.json to use an older version:

```json
{
  "carouselId": 315460247,
  "runtimeVersion": "1.0.0",
  ...
}
```

No need to change any other files - the carousel will immediately use the older runtime.

## Best Practices

### Development

- ✅ Always work on a new minor version, don't modify old versions
- ✅ Test thoroughly before deploying new versions to production
- ✅ Keep v1.0.0 frozen as the stable fallback
- ✅ Document new features in the CHANGELOG or commit messages

### Deployment

- ✅ Deploy new versions to S3 before updating any carousels
- ✅ Test with one carousel before rolling out broadly
- ✅ Keep old versions on S3 indefinitely (they're small files)
- ✅ Communicate version updates to the team

### Config Management

- ✅ Always include `runtimeVersion` in exported configs
- ✅ Use v1.0.0 for stable, production campaigns
- ✅ Use v1.1.0+ for new campaigns that need new features
- ✅ Document which carousels use which versions

## Version History

### v1.0.0 (2025-11-26)
- Initial stable release
- All core slide types
- Basic analytics hooks
- **Status**: Frozen, production-safe

### v1.1.0 (2025-11-27)
- Added `setupAnalytics()` function
- Enhanced slide click tracking
- Added slideIndex parameter to render functions
- **Status**: Current development version

### v1.2.0 (Future)
- Planned: Your next features here

---

**Last Updated**: 2025-12-18
**Maintained By**: DN Content Studio

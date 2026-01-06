/**
 * Editor backend Lambda handler.
 *
 * Supports:
 * - GET /projects
 * - GET /projects/{id}
 * - POST /projects
 * - PUT /projects/{id}
 * - DELETE /projects/{id}
 * - POST /projects/{id}/assets (returns presigned PUT URL for drafts)
 * - POST /projects/{id}/publish (copies draft -> public and invalidates CDN)
 * - POST /projects/{id}/copy-from-published (copies public -> draft, optional new id)
 * - POST /projects/{id}/preview-link (returns signed GET URL to draft config)
 *
 * Environment variables:
 * - TABLE_NAME
 * - BUCKET_NAME
 * - PUBLIC_PREFIX
 * - DRAFT_PREFIX
 * - EDITOR_PREFIX (unused here, but exposed for completeness)
 * - CDN_DISTRIBUTION_ID
 * - PREVIEW_DISTRIBUTION_ID (optional, not required for S3-signed previews)
 */

const AWS = require('aws-sdk');

const s3 = new AWS.S3();
const dynamo = new AWS.DynamoDB.DocumentClient();
const cloudfront = new AWS.CloudFront();

const TABLE_NAME = process.env.TABLE_NAME;
const BUCKET_NAME = process.env.BUCKET_NAME;
const PUBLIC_PREFIX = process.env.PUBLIC_PREFIX || 'public';
const DRAFT_PREFIX = process.env.DRAFT_PREFIX || 'drafts';
const CDN_DISTRIBUTION_ID = process.env.CDN_DISTRIBUTION_ID;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

const respond = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    ...corsHeaders,
  },
  body: JSON.stringify(body),
});

const parseBody = (event) => {
  if (!event.body) return null;
  try {
    return JSON.parse(event.body);
  } catch (err) {
    return null;
  }
};

const safeNameFromConfig = (config) => {
  if (!config) return 'Untitled';
  if (config.carouselName) return config.carouselName;
  if (config.customerName) return config.customerName;
  return 'Untitled';
};

const draftConfigKey = (id) => `${DRAFT_PREFIX}/${id}/config.json`;
const draftAssetPrefix = (id) => `${DRAFT_PREFIX}/${id}/assets/`;
const publicAssetPrefix = (id) => `${PUBLIC_PREFIX}/${id}/assets/`;
const publicPrefix = (id) => `${PUBLIC_PREFIX}/${id}/`;
const publicConfigKey = (id) => `${PUBLIC_PREFIX}/${id}/config.json`;

// Get CloudFront distribution domain from environment or use default
const getCdnDomain = () => {
  // The main CDN serves public assets
  return process.env.CDN_DOMAIN || `${process.env.BUCKET_NAME}.s3.amazonaws.com`;
};

async function putConfigToS3(key, config) {
  await s3
    .putObject({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: JSON.stringify(config, null, 2),
      ContentType: 'application/json',
    })
    .promise();
}

async function getConfigFromS3(key) {
  try {
    const res = await s3
      .getObject({
        Bucket: BUCKET_NAME,
        Key: key,
      })
      .promise();
    return JSON.parse(res.Body.toString('utf-8'));
  } catch (err) {
    if (err.code === 'NoSuchKey') return null;
    throw err;
  }
}

async function listObjectsByPrefix(prefix) {
  const results = [];
  let continuationToken;
  do {
    const res = await s3
      .listObjectsV2({
        Bucket: BUCKET_NAME,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
      .promise();
    results.push(...(res.Contents || []));
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);
  return results;
}

async function deletePrefix(prefix) {
  const objects = await listObjectsByPrefix(prefix);
  if (!objects.length) return;
  const chunks = [];
  for (let i = 0; i < objects.length; i += 1000) {
    chunks.push(objects.slice(i, i + 1000));
  }
  for (const chunk of chunks) {
    await s3
      .deleteObjects({
        Bucket: BUCKET_NAME,
        Delete: { Objects: chunk.map((obj) => ({ Key: obj.Key })) },
      })
      .promise();
  }
}

async function copyPrefix(fromPrefix, toPrefix) {
  const objects = await listObjectsByPrefix(fromPrefix);
  for (const obj of objects) {
    const destKey = obj.Key.replace(fromPrefix, toPrefix);
    await s3
      .copyObject({
        Bucket: BUCKET_NAME,
        CopySource: `${BUCKET_NAME}/${obj.Key}`,
        Key: destKey,
      })
      .promise();
  }
}

async function invalidateCdn(pathPattern) {
  if (!CDN_DISTRIBUTION_ID) return;
  const callerReference = `inv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await cloudfront
    .createInvalidation({
      DistributionId: CDN_DISTRIBUTION_ID,
      InvalidationBatch: {
        CallerReference: callerReference,
        Paths: {
          Quantity: 1,
          Items: [pathPattern],
        },
      },
    })
    .promise();
}

// Routes
async function listProjects() {
  const res = await dynamo
    .scan({
      TableName: TABLE_NAME,
    })
    .promise();

  const projects = (res.Items || []).sort((a, b) => {
    const da = a.lastModified || '';
    const db = b.lastModified || '';
    return da < db ? 1 : da > db ? -1 : 0;
  });

  return respond(200, { projects });
}

async function getProject(id, source = 'draft') {
  // Load from draft or published based on source parameter
  let config;
  if (source === 'published') {
    config = await getConfigFromS3(publicConfigKey(id));
    if (!config) {
      // Fall back to draft if published doesn't exist
      config = await getConfigFromS3(draftConfigKey(id));
    }
  } else {
    // Default to draft
    config = await getConfigFromS3(draftConfigKey(id));
    if (!config) {
      // Fall back to published if draft doesn't exist
      config = await getConfigFromS3(publicConfigKey(id));
    }
  }

  if (!config) {
    return respond(404, { error: 'Project not found' });
  }
  return respond(200, config);
}

async function saveProject(id, config) {
  if (!config) return respond(400, { error: 'Missing config payload' });

  // Save to drafts only (no auto-publish)
  await putConfigToS3(draftConfigKey(id), config);

  // Removed auto-publish - use POST /projects/{id}/publish to publish explicitly
  // await copyPrefix(`${DRAFT_PREFIX}/${id}/`, `${PUBLIC_PREFIX}/${id}/`);
  // if (CDN_DISTRIBUTION_ID) {
  //   await invalidateCdn(`/${PUBLIC_PREFIX}/${id}/*`);
  // }

  const now = new Date().toISOString();
  const name = safeNameFromConfig(config);

  await dynamo
    .put({
      TableName: TABLE_NAME,
      Item: {
        id: String(id),
        name,
        lastModified: now,
        status: 'draft', // Save as draft, not published
        version: config.version || 1,
      },
    })
    .promise();

  return respond(200, { success: true, project: config });
}

async function deleteProject(id) {
  await dynamo
    .delete({
      TableName: TABLE_NAME,
      Key: { id: String(id) },
    })
    .promise();

  await Promise.all([deletePrefix(`${DRAFT_PREFIX}/${id}/`), deletePrefix(`${PUBLIC_PREFIX}/${id}/`)]);

  return respond(200, { success: true });
}

async function presignAssetUpload(id, filename) {
  if (!filename) return respond(400, { error: 'Missing filename' });

  // Upload directly to public prefix for immediate CloudFront access
  const key = `${publicAssetPrefix(id)}${filename}`;
  const uploadUrl = await s3.getSignedUrlPromise('putObject', {
    Bucket: BUCKET_NAME,
    Key: key,
    Expires: 900, // 15 minutes
    ContentType: 'application/octet-stream',
  });

  // Return CloudFront URL (permanent, no expiration)
  const cdnDomain = getCdnDomain();
  const publicUrl = `https://${cdnDomain}/${key}`;

  return respond(200, {
    uploadUrl,
    key,
    path: key,
    url: publicUrl, // CloudFront URL for immediate access
  });
}

async function publishProject(id) {
  // copy draft -> public
  await copyPrefix(`${DRAFT_PREFIX}/${id}/`, `${PUBLIC_PREFIX}/${id}/`);
  await invalidateCdn(`/${PUBLIC_PREFIX}/${id}/*`);

  const now = new Date().toISOString();
  await dynamo
    .update({
      TableName: TABLE_NAME,
      Key: { id: String(id) },
      UpdateExpression: 'SET #status = :status, lastModified = :now ADD version :inc',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':status': 'published', ':now': now, ':inc': 1 },
    })
    .promise()
    .catch(async (err) => {
      if (err.code === 'ValidationException') {
        // Item might not exist yet, create it
        await dynamo
          .put({
            TableName: TABLE_NAME,
            Item: { id: String(id), name: String(id), status: 'published', lastModified: now, version: 1 },
          })
          .promise();
      } else {
        throw err;
      }
    });

  return respond(200, { success: true });
}

async function copyFromPublished(id, targetId) {
  const srcPrefix = `${PUBLIC_PREFIX}/${id}/`;
  const dstPrefix = `${DRAFT_PREFIX}/${targetId}/`;
  await deletePrefix(dstPrefix); // clear old draft
  await copyPrefix(srcPrefix, dstPrefix);

  const now = new Date().toISOString();
  await dynamo
    .put({
      TableName: TABLE_NAME,
      Item: { id: String(targetId), name: String(targetId), status: 'draft', lastModified: now, version: 1 },
    })
    .promise();

  return respond(200, { success: true, targetId });
}

async function previewLink(id, ttlSeconds = 900) {
  const key = draftConfigKey(id);
  const url = await s3.getSignedUrlPromise('getObject', {
    Bucket: BUCKET_NAME,
    Key: key,
    Expires: ttlSeconds,
  });
  return respond(200, { url, expiresIn: ttlSeconds });
}

async function trackAnalytics(event, body) {
  if (!body) return respond(400, { error: 'Missing analytics payload' });

  // Log structured analytics event to CloudWatch
  // This is completely anonymous - no IP or user_agent collected
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event_type: body.event_type,
    carousel_id: body.carousel_id,
    environment: body.environment,
    slide_index: body.slide_index,
    is_mobile: body.is_mobile,
    viewport_width: body.viewport_width,
    data: body.data
  }));

  return respond(200, { success: true });
}

exports.handler = async (event) => {
  const method = (event.requestContext?.http?.method || 'GET').toUpperCase();

  // Handle OPTIONS preflight requests
  if (method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: '',
    };
  }

  const path = event.rawPath || '/';
  const body = parseBody(event);
  const qs = event.queryStringParameters || {};

  try {
    // /analytics - anonymous event tracking
    if (path === '/analytics' && method === 'POST') {
      return await trackAnalytics(event, body);
    }

    // /projects
    if (path === '/projects' && method === 'GET') {
      return await listProjects();
    }
    if (path === '/projects' && method === 'POST') {
      const config = body;
      const id = config?.carouselId;
      if (!id) return respond(400, { error: 'Missing carouselId in config' });
      return await saveProject(id, config);
    }

    // /projects/{id}[/*]
    const match = path.match(/^\/projects\/([^/]+)(?:\/([^/]+))?$/);
    if (!match) {
      return respond(404, { error: 'Not found' });
    }
    const id = decodeURIComponent(match[1]);
    const sub = match[2];

    if (!sub) {
      if (method === 'GET') {
        const source = qs.source || 'draft'; // Accept ?source=draft or ?source=published
        return await getProject(id, source);
      }
      if (method === 'PUT') return await saveProject(id, body);
      if (method === 'DELETE') return await deleteProject(id);
    }

    if (sub === 'assets' && method === 'POST') {
      const filename = body?.filename || qs.filename;
      return await presignAssetUpload(id, filename);
    }

    if (sub === 'publish' && method === 'POST') {
      return await publishProject(id);
    }

    if (sub === 'copy-from-published' && method === 'POST') {
      const targetId = body?.targetId || body?.newId || id;
      return await copyFromPublished(id, targetId);
    }

    if (sub === 'preview-link' && method === 'POST') {
      const ttl = Number(body?.ttlSeconds || qs.ttlSeconds || 900);
      return await previewLink(id, Math.min(Math.max(ttl, 60), 3600));
    }

    return respond(404, { error: 'Not found' });
  } catch (err) {
    console.error('Handler error', { method, path, err });
    return respond(500, { error: 'Internal Server Error', detail: err.message });
  }
};

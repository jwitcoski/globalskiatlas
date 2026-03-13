/**
 * Lambda: serve Iceberg stats JSON from S3 for the Download Data page.
 * Expects: iceberg-stats/latest.json in ICEBERG_STATS_BUCKET (from query_iceberg.py --json upload).
 * No auth; GET only. CORS enabled.
 */
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const BUCKET = process.env.ICEBERG_STATS_BUCKET || '';
const KEY = 'iceberg-stats/latest.json';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Content-Type': 'application/json',
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: typeof body === 'string' ? body : JSON.stringify(body == null ? {} : body),
  };
}

exports.handler = async (event) => {
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (!BUCKET) {
    return json(503, {
      source: 'Apache Iceberg via AWS Glue',
      table_counts: {},
      sample_resorts: [],
      message: 'Iceberg stats not configured (ICEBERG_STATS_BUCKET missing). Upload iceberg-stats/latest.json to S3 to enable.',
    });
  }

  try {
    const s3 = new S3Client({});
    const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: KEY });
    const response = await s3.send(cmd);
    const body = await response.Body.transformToString();
    const data = JSON.parse(body);
    return json(200, data);
  } catch (err) {
    if (err.name === 'NoSuchKey') {
      return json(200, {
        source: 'Apache Iceberg via AWS Glue',
        bucket: BUCKET,
        table_counts: {},
        versioning: {},
        sample_resorts: [],
        message: 'Stats will appear here once the pipeline uploads iceberg-stats/latest.json (run query_iceberg.py --json and upload to S3).',
      });
    }
    console.error('iceberg-stats Lambda error:', err);
    return json(500, {
      message: 'Failed to load Iceberg stats',
      error: err.message,
    });
  }
};

/**
 * Google Veo Service — Node.js-side Vertex AI integration.
 *
 * Handles all server-to-server communication with Google Cloud:
 *   - Vertex AI Veo (predictLongRunning) for video generation
 *   - Gemini API for prompt compilation (raw → cinematic prompt)
 *   - Imagen API for keyframe image generation
 *   - GCS storage for input/output assets
 *   - Long Running Operation (LRO) polling with exponential backoff
 *
 * Auth: uses a GCP Service Account JSON key stored in provider_configs.auth_config.
 * The key can also be set via GOOGLE_APPLICATION_CREDENTIALS env var.
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// ── Constants ────────────────────────────────────────────────

const VEO_MODEL_ID = 'veo-2.0-generate-001';
const GEMINI_MODEL_ID = 'gemini-2.0-flash';
const IMAGEN_MODEL_ID = 'imagen-3.0-generate-001';

const LRO_POLL_INTERVAL_MS = 12000;    // 12 seconds between polls
const LRO_MAX_POLL_TIME_MS = 900000;   // 15 minutes max
const LRO_MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 2000;

// ── Auth Token Management ────────────────────────────────────

/** Cached access token + expiry */
let _tokenCache = { token: null, expiresAt: 0 };

/**
 * Parse the service account key from auth_config.
 * Accepts: { serviceAccountKey: {...} } or { keyFile: "/path/to/key.json" }
 */
function getServiceAccountKey(authConfig) {
  if (!authConfig) throw new Error('No auth_config provided for Google Veo');
  const config = typeof authConfig === 'string' ? JSON.parse(authConfig) : authConfig;

  if (config.serviceAccountKey) {
    return config.serviceAccountKey;
  }
  if (config.keyFile) {
    const fs = require('fs');
    return JSON.parse(fs.readFileSync(config.keyFile, 'utf-8'));
  }
  throw new Error('auth_config must contain serviceAccountKey or keyFile');
}

/**
 * Build a signed JWT and exchange it for an OAuth2 access token.
 * Uses the built-in crypto module to sign without external deps.
 */
async function getAccessToken(authConfig) {
  const now = Math.floor(Date.now() / 1000);

  // Return cached token if still valid (with 60s buffer)
  if (_tokenCache.token && _tokenCache.expiresAt > now + 60) {
    return _tokenCache.token;
  }

  const key = getServiceAccountKey(authConfig);
  const crypto = require('crypto');

  // Build JWT header + claims
  const header = Buffer.from(JSON.stringify({
    alg: 'RS256', typ: 'JWT'
  })).toString('base64url');

  const claims = Buffer.from(JSON.stringify({
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  })).toString('base64url');

  const signInput = `${header}.${claims}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signInput);
  const signature = sign.sign(key.private_key, 'base64url');

  const jwt = `${signInput}.${signature}`;

  // Exchange JWT for access token
  const tokenResponse = await httpRequest('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  const tokenData = JSON.parse(tokenResponse);
  _tokenCache = {
    token: tokenData.access_token,
    expiresAt: now + (tokenData.expires_in || 3600)
  };

  return _tokenCache.token;
}

// ── HTTP Helpers ─────────────────────────────────────────────

/**
 * Simple promise-based HTTP request (works with both http and https).
 */
function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const transport = parsed.protocol === 'https:' ? https : http;
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = transport.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          const error = new Error(`HTTP ${res.statusCode}: ${data}`);
          error.statusCode = res.statusCode;
          error.responseBody = data;
          reject(error);
        }
      });
    });

    req.on('error', reject);
    if (options.timeout) req.setTimeout(options.timeout, () => { req.destroy(); reject(new Error('Request timeout')); });
    if (options.body) req.write(options.body);
    req.end();
  });
}

/**
 * Authenticated Vertex AI request.
 */
async function vertexRequest(url, authConfig, options = {}) {
  const token = await getAccessToken(authConfig);
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };
  return httpRequest(url, { ...options, headers });
}

// ── Vertex AI Veo Video Generation ───────────────────────────

/**
 * Submit a video generation request via Veo predictLongRunning.
 *
 * @param {object} params
 * @param {string} params.projectId - GCP project ID
 * @param {string} params.location - GCP region (e.g. 'us-central1')
 * @param {string} params.prompt - The cinematic prompt
 * @param {string} [params.imageGcsUri] - GCS URI of keyframe image (for img2vid)
 * @param {string} [params.aspectRatio] - '16:9' | '9:16' | '1:1'
 * @param {number} [params.durationSeconds] - 5 or 8
 * @param {number} [params.fps] - frames per second (24)
 * @param {number} [params.seed] - deterministic seed
 * @param {string} [params.outputGcsUri] - GCS bucket for output
 * @param {string} [params.negativePrompt] - negative prompt
 * @param {string} [params.model] - model override
 * @param {object} authConfig - from provider_configs.auth_config
 * @returns {Promise<{operationName: string, status: string}>}
 */
async function submitVideoGeneration(params, authConfig) {
  const {
    projectId, location = 'us-central1',
    prompt, imageGcsUri, aspectRatio = '16:9',
    durationSeconds = 5, fps = 24, seed,
    outputGcsUri, negativePrompt,
    model = VEO_MODEL_ID
  } = params;

  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:predictLongRunning`;

  // Build the Veo request payload per Vertex AI schema
  const instance = { prompt };
  if (imageGcsUri) {
    instance.image = { gcsUri: imageGcsUri };
  }

  const parameters = {
    aspectRatio,
    durationSeconds,
  };
  if (fps) parameters.fps = fps;
  if (seed !== undefined && seed !== null) parameters.seed = seed;
  if (outputGcsUri) parameters.outputGcsUri = outputGcsUri;
  if (negativePrompt) parameters.negativePrompt = negativePrompt;

  const payload = {
    instances: [instance],
    parameters,
  };

  const response = await vertexRequest(endpoint, authConfig, {
    method: 'POST',
    body: JSON.stringify(payload),
    timeout: 30000,
  });

  const result = JSON.parse(response);

  return {
    operationName: result.name || result.operationName || null,
    status: 'submitted',
    rawResponse: result,
  };
}

/**
 * Poll a Long Running Operation until done or timeout.
 *
 * @param {string} operationName - The LRO resource name
 * @param {object} authConfig
 * @param {function} [onProgress] - callback(statusObj) for each poll
 * @returns {Promise<{done: boolean, result?: object, error?: object}>}
 */
async function pollOperation(operationName, authConfig, onProgress) {
  const startTime = Date.now();
  let attempt = 0;
  let consecutiveErrors = 0;

  while (Date.now() - startTime < LRO_MAX_POLL_TIME_MS) {
    // Wait before polling (first iteration too, to give the job time to start)
    const delay = attempt === 0
      ? LRO_POLL_INTERVAL_MS
      : Math.min(LRO_POLL_INTERVAL_MS * Math.pow(1.5, consecutiveErrors), 60000);

    await sleep(delay);
    attempt++;

    try {
      const url = `https://${extractLocation(operationName)}-aiplatform.googleapis.com/v1/${operationName}`;
      const response = await vertexRequest(url, authConfig, {
        method: 'GET',
        timeout: 15000,
      });

      const op = JSON.parse(response);
      consecutiveErrors = 0; // Reset on success

      const status = {
        done: !!op.done,
        progress: op.metadata?.progress || (op.done ? 100 : Math.min(attempt * 8, 95)),
        attempt,
        elapsed: Date.now() - startTime,
      };

      if (onProgress) onProgress(status);

      if (op.done) {
        if (op.error) {
          return { done: true, error: op.error };
        }
        return {
          done: true,
          result: op.response || op.result || op,
        };
      }
    } catch (err) {
      consecutiveErrors++;
      console.error(`[VeoService] Poll attempt ${attempt} failed:`, err.message);

      if (consecutiveErrors >= LRO_MAX_RETRIES) {
        return {
          done: true,
          error: { message: `Polling failed after ${LRO_MAX_RETRIES} consecutive errors: ${err.message}` },
        };
      }
      // Will retry with exponential backoff on next iteration
    }
  }

  return {
    done: true,
    error: { message: `Operation timed out after ${LRO_MAX_POLL_TIME_MS / 1000}s` },
  };
}

/**
 * Cancel a running LRO.
 */
async function cancelOperation(operationName, authConfig) {
  try {
    const location = extractLocation(operationName);
    const url = `https://${location}-aiplatform.googleapis.com/v1/${operationName}:cancel`;
    await vertexRequest(url, authConfig, { method: 'POST', timeout: 10000 });
    return { cancelled: true };
  } catch (err) {
    console.error('[VeoService] Cancel failed:', err.message);
    return { cancelled: false, error: err.message };
  }
}

// ── Gemini Prompt Compiler ───────────────────────────────────

/**
 * Expand a raw scene description + state vectors into a cinematic prompt
 * using Gemini API.
 *
 * @param {object} params
 * @param {string} params.projectId - GCP project ID
 * @param {string} params.location - GCP region
 * @param {string} params.rawPrompt - the raw scene description
 * @param {object} [params.characterState] - character state vector
 * @param {object} [params.contextState] - environment state vector
 * @param {string} [params.style] - style guidance (cinematic, anime, etc.)
 * @param {string} [params.cameraHints] - camera movement hints
 * @param {string} [params.model] - Gemini model override
 * @param {object} authConfig
 * @returns {Promise<{cinematicPrompt: string, negativePrompt: string}>}
 */
async function compilePrompt(params, authConfig) {
  const {
    projectId, location = 'us-central1',
    rawPrompt, characterState, contextState,
    style = 'cinematic', cameraHints = '',
    model = GEMINI_MODEL_ID
  } = params;

  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;

  const systemInstruction = `You are a cinematic prompt engineer for AI video generation. Your task is to expand a raw scene description into a detailed, production-ready prompt optimized for Google Veo video generation.

Output a JSON object with exactly two fields:
- "cinematicPrompt": A detailed, vivid prompt describing the scene with specific camera angles, lens type, lighting, composition, motion, and atmosphere. Include character appearance details if provided.
- "negativePrompt": Things to avoid (deformation, artifacts, inconsistencies).

Always maintain consistency with the provided character and environment states.`;

  const userContent = [
    `## Raw Scene Description\n${rawPrompt}`,
    characterState ? `## Character State\n${JSON.stringify(characterState, null, 2)}` : '',
    contextState ? `## Environment State\n${JSON.stringify(contextState, null, 2)}` : '',
    style ? `## Visual Style: ${style}` : '',
    cameraHints ? `## Camera Direction: ${cameraHints}` : '',
  ].filter(Boolean).join('\n\n');

  const payload = {
    contents: [{
      role: 'user',
      parts: [{ text: userContent }],
    }],
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    },
  };

  const response = await vertexRequest(endpoint, authConfig, {
    method: 'POST',
    body: JSON.stringify(payload),
    timeout: 30000,
  });

  const result = JSON.parse(response);

  // Extract text from Gemini response
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  try {
    const parsed = JSON.parse(text);
    return {
      cinematicPrompt: parsed.cinematicPrompt || rawPrompt,
      negativePrompt: parsed.negativePrompt || '',
    };
  } catch {
    // If Gemini returns non-JSON, use the raw text as the prompt
    return { cinematicPrompt: text.trim() || rawPrompt, negativePrompt: '' };
  }
}

// ── Imagen Keyframe Generation ───────────────────────────────

/**
 * Generate a keyframe image using Imagen API for image-to-video pipeline.
 *
 * @param {object} params
 * @param {string} params.projectId - GCP project ID
 * @param {string} params.location - GCP region
 * @param {string} params.prompt - image generation prompt
 * @param {string} [params.referenceGcsUri] - character reference sheet GCS URI
 * @param {string} [params.aspectRatio] - '16:9' | '9:16' | '1:1'
 * @param {number} [params.sampleCount] - number of images to generate (1-4)
 * @param {string} [params.outputGcsUri] - GCS bucket for output
 * @param {string} [params.model] - model override
 * @param {object} authConfig
 * @returns {Promise<{images: Array<{gcsUri?: string, base64?: string}>}>}
 */
async function generateKeyframe(params, authConfig) {
  const {
    projectId, location = 'us-central1',
    prompt, referenceGcsUri, aspectRatio = '16:9',
    sampleCount = 1, outputGcsUri,
    model = IMAGEN_MODEL_ID
  } = params;

  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:predict`;

  const instance = { prompt };
  if (referenceGcsUri) {
    instance.image = { gcsUri: referenceGcsUri };
  }

  const parameters = {
    sampleCount,
    aspectRatio,
  };
  if (outputGcsUri) parameters.outputGcsUri = outputGcsUri;

  const payload = {
    instances: [instance],
    parameters,
  };

  const response = await vertexRequest(endpoint, authConfig, {
    method: 'POST',
    body: JSON.stringify(payload),
    timeout: 60000,
  });

  const result = JSON.parse(response);
  const predictions = result.predictions || [];

  return {
    images: predictions.map((pred) => ({
      gcsUri: pred.gcsUri || null,
      base64: pred.bytesBase64Encoded || null,
      mimeType: pred.mimeType || 'image/png',
    })),
  };
}

// ── Utility Functions ────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extract location from an operation name.
 * Format: projects/{project}/locations/{location}/...
 */
function extractLocation(operationName) {
  const match = operationName.match(/locations\/([^/]+)/);
  return match ? match[1] : 'us-central1';
}

/**
 * Build the full GCS output path for a generation.
 */
function buildGcsOutputUri(bucket, projectId, workflowId, runId) {
  return `gs://${bucket}/projects/${projectId}/workflows/${workflowId}/runs/${runId}/`;
}

/**
 * Validate auth_config has necessary fields.
 */
function validateAuthConfig(authConfig) {
  try {
    if (!authConfig) return { valid: false, error: 'No auth_config provided' };
    const config = typeof authConfig === 'string' ? JSON.parse(authConfig) : authConfig;
    if (!config || typeof config !== 'object') return { valid: false, error: 'auth_config must be an object' };
    if (!config.serviceAccountKey && !config.keyFile) {
      return { valid: false, error: 'Missing serviceAccountKey or keyFile' };
    }
    if (!config.projectId) {
      return { valid: false, error: 'Missing projectId (GCP project)' };
    }
    return { valid: true, config };
  } catch (err) {
    return { valid: false, error: `Invalid auth_config JSON: ${err.message}` };
  }
}

// ── IPC Handler Registration ─────────────────────────────────

/**
 * Register all Veo-related IPC handlers on the main process.
 * Called from main.js alongside database IPC handlers.
 */
function registerVeoIpcHandlers(ipcMain) {

  // ── Submit Video Generation ──────────────────
  ipcMain.handle('veo:submit', async (_, { params, authConfig }) => {
    try {
      return { success: true, data: await submitVideoGeneration(params, authConfig) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ── Poll Operation ───────────────────────────
  ipcMain.handle('veo:poll', async (_, { operationName, authConfig }) => {
    try {
      // Single poll check (no loop — the renderer manages the polling interval)
      const url = `https://${extractLocation(operationName)}-aiplatform.googleapis.com/v1/${operationName}`;
      const response = await vertexRequest(url, authConfig, { method: 'GET', timeout: 15000 });
      const op = JSON.parse(response);

      return {
        success: true,
        data: {
          done: !!op.done,
          error: op.error || null,
          result: op.done ? (op.response || op.result || null) : null,
          metadata: op.metadata || null,
        },
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ── Poll with full loop (background worker style) ──
  // This runs the entire poll loop in the main process and
  // sends progress updates via webContents.
  ipcMain.handle('veo:poll-until-done', async (event, { operationName, authConfig, jobId }) => {
    try {
      const webContents = event.sender;
      const result = await pollOperation(operationName, authConfig, (status) => {
        // Send progress updates to the renderer
        webContents.send('veo:progress', { jobId, ...status });
      });
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ── Cancel Operation ─────────────────────────
  ipcMain.handle('veo:cancel', async (_, { operationName, authConfig }) => {
    try {
      return { success: true, data: await cancelOperation(operationName, authConfig) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ── Compile Prompt (Gemini) ──────────────────
  ipcMain.handle('veo:compile-prompt', async (_, { params, authConfig }) => {
    try {
      return { success: true, data: await compilePrompt(params, authConfig) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ── Generate Keyframe (Imagen) ───────────────
  ipcMain.handle('veo:generate-keyframe', async (_, { params, authConfig }) => {
    try {
      return { success: true, data: await generateKeyframe(params, authConfig) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ── Validate Auth Config ─────────────────────
  ipcMain.handle('veo:validate-auth', async (_, { authConfig }) => {
    const validation = validateAuthConfig(authConfig);
    if (!validation.valid) return validation;

    // Try to actually get a token to verify the credentials
    try {
      await getAccessToken(authConfig);
      return { valid: true, message: 'Authentication successful' };
    } catch (err) {
      return { valid: false, error: `Auth failed: ${err.message}` };
    }
  });

  console.log('[VeoService] IPC handlers registered');
}

// ── Exports ──────────────────────────────────────────────────

module.exports = {
  registerVeoIpcHandlers,
  submitVideoGeneration,
  pollOperation,
  cancelOperation,
  compilePrompt,
  generateKeyframe,
  validateAuthConfig,
  buildGcsOutputUri,
  // Expose for testing
  _getAccessToken: getAccessToken,
  _httpRequest: httpRequest,
};

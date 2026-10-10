/**
 * Provider Adapter — abstraction layer for external AI generation services.
 *
 * Supports five provider_type values:
 *   rest_api — direct HTTP calls to a REST endpoint
 *   sdk      — JS/Node SDK integration (future, stubbed)
 *   mcp      — Model Context Protocol server (future, stubbed)
 *   webhook  — fire-and-forget webhook; result polled or pushed back
 *   manual   — user exports inputs, runs externally, imports result
 *
 * Each adapter exposes the same interface so the WorkflowRunPanel can
 * treat every provider identically.
 */

// ── Base Adapter ──────────────────────────────────────────────

class BaseAdapter {
  constructor(providerConfig) {
    this.config = providerConfig;
    this.defaultParams = this._parseJson(providerConfig.default_params, {});
    this.capabilities = this._parseJson(providerConfig.capabilities, []);
  }

  _parseJson(val, fallback) {
    if (!val) return fallback;
    if (typeof val === 'object') return val;
    try { return JSON.parse(val); } catch { return fallback; }
  }

  /** Check whether this provider supports a capability string. */
  supports(capability) {
    return this.capabilities.includes(capability);
  }

  /**
   * Submit a generation job.
   * @param {object} inputSnapshot - the frozen input data
   * @param {object} params - merged default + node-level overrides
   * @returns {Promise<{jobId: string, status: string, result?: any}>}
   */
  async submit(inputSnapshot, params = {}) {
    throw new Error(`submit() not implemented for provider type "${this.config.provider_type}"`);
  }

  /**
   * Poll / check the status of a previously submitted job.
   * @returns {Promise<{status: string, progress?: number, result?: any}>}
   */
  async checkStatus(jobId) {
    throw new Error(`checkStatus() not implemented for provider type "${this.config.provider_type}"`);
  }

  /**
   * Cancel a running job if possible.
   * @returns {Promise<{cancelled: boolean}>}
   */
  async cancel(jobId) {
    return { cancelled: false };
  }
}

// ── REST API Adapter ──────────────────────────────────────────

class RestApiAdapter extends BaseAdapter {
  async submit(inputSnapshot, params = {}) {
    const endpoint = this.config.endpoint;
    if (!endpoint) throw new Error('REST API provider has no endpoint configured.');

    const merged = { ...this.defaultParams, ...params };
    const body = {
      inputs: inputSnapshot,
      params: merged,
    };

    // In a real implementation this would use fetch() with auth headers.
    // For now, return a structured stub so the UI flow can exercise the full lifecycle.
    console.log(`[REST Adapter] POST ${endpoint}`, body);
    return {
      jobId: `rest-${Date.now()}`,
      status: 'submitted',
      message: `Job submitted to ${endpoint}. Implement fetch() call for real integration.`,
    };
  }

  async checkStatus(jobId) {
    console.log(`[REST Adapter] Checking status for ${jobId}`);
    return { status: 'pending', progress: 0 };
  }

  async cancel(jobId) {
    console.log(`[REST Adapter] Cancel ${jobId}`);
    return { cancelled: true };
  }
}

// ── SDK Adapter ───────────────────────────────────────────────

class SdkAdapter extends BaseAdapter {
  async submit(inputSnapshot, params = {}) {
    // Future: integrate Kling, Runway, Pika SDK etc.
    console.log(`[SDK Adapter] Submit via SDK`, { inputSnapshot, params });
    return {
      jobId: `sdk-${Date.now()}`,
      status: 'submitted',
      message: 'SDK adapter stub — implement SDK-specific client.',
    };
  }
}

// ── MCP Adapter ───────────────────────────────────────────────

class McpAdapter extends BaseAdapter {
  async submit(inputSnapshot, params = {}) {
    console.log(`[MCP Adapter] Submit via MCP`, { inputSnapshot, params });
    return {
      jobId: `mcp-${Date.now()}`,
      status: 'submitted',
      message: 'MCP adapter stub — implement MCP client connection.',
    };
  }
}

// ── Webhook Adapter ───────────────────────────────────────────

class WebhookAdapter extends BaseAdapter {
  async submit(inputSnapshot, params = {}) {
    const endpoint = this.config.endpoint;
    if (!endpoint) throw new Error('Webhook provider has no endpoint configured.');

    console.log(`[Webhook Adapter] POST ${endpoint}`, { inputSnapshot, params });
    return {
      jobId: `webhook-${Date.now()}`,
      status: 'submitted',
      message: `Webhook fired to ${endpoint}. Result will arrive asynchronously.`,
    };
  }
}

// ── Google Veo Adapter ────────────────────────────────────────
// Integrates with Google Vertex AI for Veo video generation,
// Gemini prompt compilation, and Imagen keyframe generation.
// Actual API calls are routed through IPC to the main process
// (electron/services/veo-service.js) for Node.js HTTP access.

class GoogleVeoAdapter extends BaseAdapter {
  constructor(providerConfig) {
    super(providerConfig);
    this.authConfig = this._parseJson(providerConfig.auth_config, {});
    this.gcpProjectId = this.authConfig.projectId || '';
    this.gcpLocation = this.authConfig.location || 'us-central1';
    this.gcsBucket = this.authConfig.gcsBucket || '';
    this._activeJobs = new Map(); // jobId → operationName
  }

  /**
   * Submit a video generation job via Veo.
   *
   * Flow: raw prompt → Gemini compile → (optional keyframe) → Veo submit
   *
   * inputSnapshot fields used:
   *   - prompt: raw scene description
   *   - characterState: character state vector (optional)
   *   - contextState: environment state vector (optional)
   *   - referenceImageUri: GCS URI for character reference (optional)
   *   - style: visual style hints (optional)
   *   - cameraHints: camera movement hints (optional)
   *
   * params can override: aspectRatio, durationSeconds, fps, seed,
   *   skipPromptCompile, skipKeyframe, model, imagenModel, geminiModel
   */
  async submit(inputSnapshot, params = {}) {
    const merged = { ...this.defaultParams, ...params };
    const ipc = window.api;
    if (!ipc) throw new Error('IPC bridge not available');

    const jobId = `veo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // ── Step 1: Compile prompt via Gemini (unless skipped) ────
    let cinematicPrompt = inputSnapshot.prompt || '';
    let negativePrompt = merged.negativePrompt || '';

    if (!merged.skipPromptCompile && cinematicPrompt) {
      try {
        const compileResult = await ipc.veoCompilePrompt({
          params: {
            projectId: this.gcpProjectId,
            location: this.gcpLocation,
            rawPrompt: cinematicPrompt,
            characterState: inputSnapshot.characterState || null,
            contextState: inputSnapshot.contextState || null,
            style: inputSnapshot.style || merged.style || 'cinematic',
            cameraHints: inputSnapshot.cameraHints || merged.cameraHints || '',
            model: merged.geminiModel || undefined,
          },
          authConfig: this.authConfig,
        });

        if (compileResult.success) {
          cinematicPrompt = compileResult.data.cinematicPrompt;
          negativePrompt = negativePrompt || compileResult.data.negativePrompt;
        } else {
          console.warn('[GoogleVeo] Prompt compilation failed, using raw prompt:', compileResult.error);
        }
      } catch (err) {
        console.warn('[GoogleVeo] Prompt compilation error, using raw prompt:', err.message);
      }
    }

    // ── Step 2: Generate keyframe if image-to-video mode ─────
    let imageGcsUri = inputSnapshot.referenceImageUri || merged.imageGcsUri || null;

    if (!imageGcsUri && !merged.skipKeyframe && inputSnapshot.referenceImageUri !== false) {
      // Check if we have a character reference to generate a keyframe from
      const charRef = inputSnapshot.characterReferenceUri || merged.characterReferenceUri;
      if (charRef) {
        try {
          const keyframeResult = await ipc.veoGenerateKeyframe({
            params: {
              projectId: this.gcpProjectId,
              location: this.gcpLocation,
              prompt: cinematicPrompt,
              referenceGcsUri: charRef,
              aspectRatio: merged.aspectRatio || '16:9',
              sampleCount: 1,
              outputGcsUri: this.gcsBucket
                ? `gs://${this.gcsBucket}/keyframes/${jobId}/`
                : undefined,
              model: merged.imagenModel || undefined,
            },
            authConfig: this.authConfig,
          });

          if (keyframeResult.success && keyframeResult.data.images?.length > 0) {
            imageGcsUri = keyframeResult.data.images[0].gcsUri;
          }
        } catch (err) {
          console.warn('[GoogleVeo] Keyframe generation failed:', err.message);
        }
      }
    }

    // ── Step 3: Submit to Veo ────────────────────────────────
    const submitResult = await ipc.veoSubmit({
      params: {
        projectId: this.gcpProjectId,
        location: this.gcpLocation,
        prompt: cinematicPrompt,
        imageGcsUri,
        aspectRatio: merged.aspectRatio || '16:9',
        durationSeconds: merged.durationSeconds || 5,
        fps: merged.fps || 24,
        seed: merged.seed !== undefined ? merged.seed : null,
        negativePrompt,
        outputGcsUri: this.gcsBucket
          ? `gs://${this.gcsBucket}/outputs/${jobId}/`
          : undefined,
        model: merged.model || undefined,
      },
      authConfig: this.authConfig,
    });

    if (!submitResult.success) {
      throw new Error(`Veo submission failed: ${submitResult.error}`);
    }

    // Track the operation for polling
    const operationName = submitResult.data.operationName;
    this._activeJobs.set(jobId, operationName);

    return {
      jobId,
      status: 'submitted',
      operationName,
      compiledPrompt: cinematicPrompt,
      negativePrompt,
      keyframeUri: imageGcsUri || null,
      message: operationName
        ? `Video generation submitted. Operation: ${operationName}`
        : 'Video generation submitted (no operation name returned — check GCP console).',
    };
  }

  /**
   * Check status of a Veo LRO.
   */
  async checkStatus(jobId) {
    const ipc = window.api;
    if (!ipc) throw new Error('IPC bridge not available');

    const operationName = this._activeJobs.get(jobId);
    if (!operationName) {
      return { status: 'unknown', error: `No tracked operation for jobId ${jobId}` };
    }

    const pollResult = await ipc.veoPoll({
      operationName,
      authConfig: this.authConfig,
    });

    if (!pollResult.success) {
      return { status: 'error', error: pollResult.error };
    }

    const data = pollResult.data;

    if (data.done) {
      this._activeJobs.delete(jobId);

      if (data.error) {
        return {
          status: 'failed',
          error: data.error.message || JSON.stringify(data.error),
        };
      }

      return {
        status: 'completed',
        progress: 100,
        result: data.result,
      };
    }

    return {
      status: 'processing',
      progress: data.metadata?.progress || 0,
    };
  }

  /**
   * Cancel a running Veo operation.
   */
  async cancel(jobId) {
    const ipc = window.api;
    if (!ipc) return { cancelled: false, error: 'IPC bridge not available' };

    const operationName = this._activeJobs.get(jobId);
    if (!operationName) {
      return { cancelled: false, error: `No tracked operation for jobId ${jobId}` };
    }

    const cancelResult = await ipc.veoCancel({
      operationName,
      authConfig: this.authConfig,
    });

    if (cancelResult.success && cancelResult.data.cancelled) {
      this._activeJobs.delete(jobId);
      return { cancelled: true };
    }

    return { cancelled: false, error: cancelResult.error || 'Cancel failed' };
  }
}

// ── Manual Adapter ────────────────────────────────────────────

class ManualAdapter extends BaseAdapter {
  /**
   * For manual providers, "submit" means preparing an export package
   * the user can download, process externally, then import the result.
   */
  async submit(inputSnapshot, params = {}) {
    const exportPackage = buildExportPackage(inputSnapshot, params, this.config);
    return {
      jobId: `manual-${Date.now()}`,
      status: 'awaiting_export',
      exportPackage,
      message: 'Manual provider — download the export package, process externally, and import the result.',
    };
  }
}

// ── Export / Import helpers for Manual flow ────────────────────

/**
 * Build a JSON export package the user can download.
 * Contains all input data a human operator needs to produce the output externally.
 */
export function buildExportPackage(inputSnapshot, params, providerConfig) {
  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    provider: {
      name: providerConfig?.name || 'Manual',
      type: providerConfig?.provider_type || 'manual',
    },
    inputs: inputSnapshot,
    params,
    instructions: [
      '1. Review the inputs below.',
      '2. Process the generation step using the external tool.',
      '3. Save the result (image/video file or URL).',
      '4. Import the result back into the workflow using "Import Result".',
    ],
  };
}

/**
 * Parse an imported result file (JSON) and return a normalized result object.
 */
export function parseImportResult(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    return {
      valid: true,
      result: {
        outputUrl: data.outputUrl || data.url || data.output || null,
        outputPath: data.outputPath || data.path || null,
        metadata: data.metadata || {},
        importedAt: new Date().toISOString(),
      },
    };
  } catch (err) {
    return { valid: false, error: `Invalid JSON: ${err.message}` };
  }
}

// ── Factory ───────────────────────────────────────────────────

const ADAPTER_MAP = {
  rest_api: RestApiAdapter,
  sdk: SdkAdapter,
  mcp: McpAdapter,
  webhook: WebhookAdapter,
  manual: ManualAdapter,
  google_veo: GoogleVeoAdapter,
};

/**
 * Create an adapter instance for a provider config row.
 * @param {object} providerConfig — row from provider_configs table
 * @returns {BaseAdapter}
 */
export function createAdapter(providerConfig) {
  const AdapterClass = ADAPTER_MAP[providerConfig.provider_type];
  if (!AdapterClass) {
    throw new Error(`Unknown provider type: "${providerConfig.provider_type}"`);
  }
  return new AdapterClass(providerConfig);
}

/**
 * Determine which capability a PROCESS node_subtype likely needs.
 * Returns null when ambiguous.
 */
export function inferCapability(nodeSubtype) {
  const mapping = {
    generate_video: 'text_to_video',
    img2vid: 'image_to_video',
    vid2vid: 'video_to_video',
    generate_image: 'text_to_image',
    img2img: 'image_to_image',
    upscale: 'upscale',
    inpaint: 'inpaint',
    outpaint: 'outpaint',
  };
  return mapping[nodeSubtype] || null;
}

/**
 * Load provider configs that match a capability, from the IPC bridge.
 * Falls back to all active providers when capability is null.
 */
export async function loadMatchingProviders(capability) {
  if (!window.api) return [];
  try {
    if (capability) {
      return await window.api.getProvidersByCapability(capability);
    }
    return await window.api.getProviderConfigs();
  } catch (err) {
    console.error('Failed to load providers:', err);
    return [];
  }
}

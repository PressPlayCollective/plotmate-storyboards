/**
 * Z-Image Turbo Service — Free image generation via Hugging Face Inference API.
 *
 * This service is completely independent from geminiService.ts.
 * It uses a natural-language prompt style (comma-separated descriptive phrases)
 * optimized for diffusion models, NOT the XML-structured prompts used by Gemini.
 *
 * Z-Image Turbo is text-to-image only — it cannot accept reference images.
 * Actor/location consistency relies entirely on text descriptions.
 */

import type { ShotParameters, Actor, Prop, LightingSetup, SceneContinuityData, ShotPositionData } from '../types';
import { buildSpatialPrompt } from '../utils/continuityTranslator';
import * as C from '../constants';

const HF_INFERENCE_URL = 'https://router.huggingface.co/models/Tongyi-MAI/Z-Image-Turbo';

function getHfToken(): string | null {
    return localStorage.getItem('hf_token') || null;
}

// ─────────────────────────────────────────────
// Prompt Builder (natural-language, NOT XML)
// ─────────────────────────────────────────────

function buildZImagePrompt(
    params: ShotParameters,
    sceneInfo: string,
    timeOfDay: 'Day' | 'Night' | 'Other',
    sceneMood: string | undefined,
    sceneColorPalette: string | undefined,
    aspectRatio: string,
    projectStyle: { projectType: string; cameraBody: string; sensorMode: string },
    locationAnalysis?: string,
    actorDescriptions?: string[],
    propDescriptions?: string[],
    sceneLighting?: LightingSetup[],
    continuityContext?: string,
    sceneDescription?: string,
): string {
    const parts: string[] = [];

    // Core framing — tells the model what kind of image this is
    parts.push('Cinematic film still, photorealistic, high production value');

    // Scene setting
    if (sceneInfo) parts.push(sceneInfo);
    if (sceneDescription) parts.push(sceneDescription);

    // Time of day
    if (timeOfDay === 'Night') parts.push('nighttime scene, dark dramatic lighting');
    else if (timeOfDay === 'Day') parts.push('daytime scene, natural light');

    // Shot composition
    if (params.shotSize) parts.push(params.shotSize);
    if (params.cameraAngle && params.cameraAngle !== 'Eye-level') parts.push(`${params.cameraAngle} angle`);
    if (params.composition) parts.push(params.composition);

    // Camera movement hint (for implied motion)
    if (params.cameraMovement && params.cameraMovement !== 'Static') {
        parts.push(`${params.cameraMovement} camera movement`);
    }

    // Lens feel from focal length
    if (params.focalLength) {
        if (params.focalLength <= 24) parts.push('wide angle lens, expansive perspective');
        else if (params.focalLength >= 85) parts.push('telephoto lens, compressed perspective, shallow depth of field');
        else if (params.focalLength >= 50) parts.push('portrait lens, natural perspective');
    }
    if (params.lensType && params.lensType !== 'Spherical') {
        parts.push(`${params.lensType} lens characteristics`);
    }
    if (params.dof === 'Shallow' || params.dof === 'Ultra shallow') {
        parts.push('shallow depth of field, soft bokeh background');
    } else if (params.dof === 'Deep') {
        parts.push('deep focus, everything sharp');
    }

    // Subjects — text descriptions only (no photos with Z-Image)
    if (actorDescriptions && actorDescriptions.length > 0) {
        actorDescriptions.forEach(desc => parts.push(desc));
    }

    // Subject action
    if (params.subjectMotion && params.subjectMotion !== 'None' && params.subjectMotion !== 'Static') {
        parts.push(params.subjectMotion);
    }

    // Camera-subject relationship
    if (params.cameraSubjectRelationship) {
        parts.push(`${params.cameraSubjectRelationship} camera perspective`);
    }

    // Props
    if (propDescriptions && propDescriptions.length > 0) {
        parts.push(propDescriptions.join(', '));
    } else if (params.objectsInShot) {
        parts.push(params.objectsInShot);
    }

    // Location
    if (locationAnalysis) parts.push(locationAnalysis);

    // Mood and color
    if (sceneMood) parts.push(`${sceneMood} mood`);
    if (sceneColorPalette) parts.push(`${sceneColorPalette} color palette`);

    // Lighting — skip when continuity context handles it
    if (!continuityContext && sceneLighting && sceneLighting.length > 0) {
        const lightDesc = sceneLighting.map(l =>
            `${l.name} ${l.sourceType} light from ${l.direction}${l.color && l.color !== 'White' ? `, ${l.color} tint` : ''}`
        ).join(', ');
        parts.push(lightDesc);
    }

    // Camera style
    parts.push(`shot on ${projectStyle.cameraBody} camera, ${projectStyle.sensorMode} sensor`);

    // Spatial context from continuity (strip any XML-like tags)
    if (continuityContext) {
        const stripped = continuityContext.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        if (stripped.length > 0 && stripped.length < 400) {
            parts.push(stripped);
        }
    }

    // Anti-equipment (positive framing for diffusion models)
    parts.push('no camera equipment visible, no crew, no lighting rigs, finished movie frame as seen in theaters');

    return parts.filter(p => p && p.trim()).join(', ');
}

// ─────────────────────────────────────────────
// Aspect ratio → pixel dimension mapping
// ─────────────────────────────────────────────

function aspectRatioToPixels(aspectRatio: string): { width: number; height: number } {
    switch (aspectRatio) {
        case '2.39:1': return { width: 1024, height: 432 };
        case '1.85:1': return { width: 1024, height: 554 };
        case '16:9':   return { width: 1024, height: 576 };
        case '9:16':   return { width: 576, height: 1024 };
        case '1:1':    return { width: 1024, height: 1024 };
        default:       return { width: 1024, height: 576 };
    }
}

// ─────────────────────────────────────────────
// HF Inference API call
// ─────────────────────────────────────────────

async function callHuggingFaceInference(prompt: string, width: number, height: number): Promise<Blob> {
    const hfToken = getHfToken();
    if (!hfToken) {
        throw new Error('A free Hugging Face token is now required for Z-Image. Go to Settings to add one (free at huggingface.co/settings/tokens).');
    }

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${hfToken}`,
    };

    const response = await fetch(HF_INFERENCE_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            inputs: prompt,
            parameters: {
                width,
                height,
                guidance_scale: 0.0,   // Required for Z-Image Turbo (no CFG)
                num_inference_steps: 8, // Turbo distilled model — 8 steps is optimal
            },
        }),
    });

    if (!response.ok) {
        if (response.status === 503) {
            // Model is loading (cold start) — caller should retry
            throw new Error('Z-IMAGE_LOADING: Z-Image Turbo model is loading on the server. This usually takes 30-60 seconds on the first request.');
        }
        if (response.status === 429) {
            throw new Error('Rate limit reached on the free tier. Please wait a minute and try again, or upgrade your Hugging Face token for higher limits.');
        }
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Z-Image generation failed (${response.status}): ${errorText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
        // HF sometimes returns JSON errors with 200 status
        const text = await response.text();
        throw new Error(`Z-Image returned unexpected response: ${text.slice(0, 200)}`);
    }

    return response.blob();
}

function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// ─────────────────────────────────────────────
// Main export — matches geminiService signature
// ─────────────────────────────────────────────

export const generateShotImage = async (
    params: ShotParameters,
    sceneInfo: string,
    timeOfDay: 'Day' | 'Night' | 'Other',
    sceneMood: string | undefined,
    sceneColorPalette: string | undefined,
    aspectRatio: string,
    projectStyle: { projectType: string; cameraBody: string; sensorMode: string },
    locationAnalysis?: string,
    actorsInShotData?: Actor[],
    propsInShotData?: Prop[],
    sceneLighting?: LightingSetup[],
    locationReferenceImage?: string, // Accepted but ignored — Z-Image is text-only
    continuityData?: SceneContinuityData,
    shotPositions?: ShotPositionData,
    sceneDescription?: string,
): Promise<string> => {
    // Build text descriptions from actor/prop data (no photos — text only)
    const actorDescriptions = actorsInShotData?.map(a => {
        const genderPrefix = a.gender ? `[${a.gender.toUpperCase()}] ` : '';
        return `${genderPrefix}${a.description || `a person named ${a.name}`}`;
    });

    const propDescriptions = propsInShotData?.map(p =>
        p.description || p.name
    );

    // Build spatial/continuity context using the shared utility
    const continuityContext = buildSpatialPrompt(
        continuityData,
        shotPositions,
        params.focalLength || 35,
        C.SENSOR_WIDTHS[projectStyle.sensorMode] || 36,
        params.shotSize,
        sceneLighting,
    );

    const prompt = buildZImagePrompt(
        params, sceneInfo, timeOfDay, sceneMood, sceneColorPalette,
        aspectRatio, projectStyle, locationAnalysis,
        actorDescriptions, propDescriptions, sceneLighting,
        continuityContext, sceneDescription,
    );

    const { width, height } = aspectRatioToPixels(aspectRatio);

    // Retry logic for model cold-starts (503 responses)
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const imageBlob = await callHuggingFaceInference(prompt, width, height);
            return await blobToBase64(imageBlob);
        } catch (error: any) {
            lastError = error;
            if (error.message?.startsWith('Z-IMAGE_LOADING')) {
                // Model is cold-starting — wait and retry with increasing delay
                const delay = (attempt + 1) * 15000; // 15s, 30s, 45s
                console.warn(`[Z-Image] Model loading, retrying in ${delay / 1000}s (attempt ${attempt + 1}/3)...`);
                await new Promise(r => setTimeout(r, delay));
            } else {
                // Non-transient error — don't retry
                throw error;
            }
        }
    }
    throw lastError || new Error('Z-Image generation failed after retries. The model may be temporarily unavailable.');
};

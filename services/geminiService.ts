

import { GoogleGenAI, Modality, Type, Operation } from "@google/genai";
import type { ShotParameters, TechnicalData, Scene, Shot, SceneContinuityData, ShotPositionData, LightingSetup, Actor, Prop, ProjectSettings, Location } from '../types';
import * as C from '../constants';
import { detectTimeOfDay } from '../utils/detectTimeOfDay';
import { buildSpatialPrompt } from '../utils/continuityTranslator';


const getApiKey = (): string => {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
        throw new Error("Gemini API key not found. Please set your API key in the Account Settings.");
    }
    return apiKey;
};

const getAI = (): GoogleGenAI => {
    return new GoogleGenAI({ apiKey: getApiKey() });
};


/**
 * A wrapper function to retry an API call with exponential backoff.
 * @param apiCall The async function to call.
 * @param maxRetries Maximum number of retries.
 * @param initialDelay The initial delay in milliseconds.
 * @returns The result of the API call.
 */
async function withRetry<T>(apiCall: () => Promise<T>, maxRetries = 3, initialDelay = 2000): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await apiCall();
    } catch (error: any) {
      attempt++;
      // Check for common transient error messages from the API
      const errorMessage = (error.message || '').toLowerCase();
      const isOverloadedError = errorMessage.includes('503') || errorMessage.includes('overloaded') || errorMessage.includes('unavailable');

      if (isOverloadedError && attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt - 1);
        console.warn(`API is busy. Retrying in ${delay / 1000}s... (Attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // For other errors or if max retries are reached, re-throw the error
        console.error(`API call failed after ${attempt} attempts.`, error);
        throw error;
      }
    }
  }
  throw new Error("Max retries reached. The model is still overloaded.");
}

/** Safely extract text from an AI response, throwing if empty/null. */
const getResponseText = (response: { text: string | null | undefined }): string => {
    const text = response.text;
    if (!text) throw new Error("The AI returned an empty response. Please try again.");
    return text.trim();
};

const base64ToGenerativePart = (base64Data: string) => {
    // More robustly extract mime type and data
    const parts = base64Data.split(',');
    const mimeTypePart = parts[0]?.match(/:(.*?);/);

    if (!mimeTypePart || parts.length < 2) {
        console.warn("Could not parse base64 data URI, falling back to jpeg assumption.");
        // Fallback for cases where the data URI prefix is missing
        const data = parts[parts.length - 1];
        return { inlineData: { data, mimeType: 'image/jpeg' } };
    }

    const mimeType = mimeTypePart[1];
    const data = parts[1];
    return { inlineData: { data, mimeType } };
};

// Helper function for generating subject descriptions
const getSubjectDescription = (params: ShotParameters, actorDescriptions?: string[]): string => {
    if (params.actorsInShot?.length) {
        if (actorDescriptions && actorDescriptions.length > 0) {
            return actorDescriptions.map((desc, index) =>
                `${params.actorsInShot?.[index] || 'Actor'} (who looks like: ${desc})`
            ).join(', ');
        }
        return params.actorsInShot.join(', ');
    }
    return params.subjectCount || 'Single subject';
};

// Helper function for generating prop descriptions
const getPropDescription = (params: ShotParameters, propData?: Prop[]): string => {
    const parts: string[] = [];
    if (params.objectsInShot) {
        parts.push(`Key objects in shot: ${params.objectsInShot}`);
    }
    if (propData && propData.length > 0) {
        const propDescriptions = propData.map(p => p.description ? `${p.name} (which looks like: ${p.description})` : p.name).join('; ');
        parts.push(`Adhere to these prop descriptions: ${propDescriptions}`);
    }
    return parts.length > 0 ? parts.join('. ') : 'None specified.';
};

/** Validates a value against an allowed list; returns undefined if invalid. */
const validateAgainst = (value: string | undefined, allowed: readonly string[]): string | undefined => {
    if (!value) return undefined;
    return allowed.includes(value) ? value : undefined;
};

/** Sanitize AI-returned shot parameters against known constant arrays. */
const sanitizeShotParams = (params: Partial<ShotParameters>, lensKit?: number[], supportGear?: string[]): Partial<ShotParameters> => {
    const sanitized: Partial<ShotParameters> = {
        ...params,
        shotSize: validateAgainst(params.shotSize, C.SHOT_SIZES),
        composition: validateAgainst(params.composition, C.COMPOSITIONS),
        cameraAngle: validateAgainst(params.cameraAngle, C.CAMERA_ANGLES),
        cameraMovement: validateAgainst(params.cameraMovement, C.CAMERA_MOVEMENTS),
        dof: validateAgainst(params.dof, C.DOFS),
        lensType: validateAgainst(params.lensType, C.LENS_TYPES),
        subjectMotion: validateAgainst(params.subjectMotion, C.SUBJECT_MOTIONS),
        focusBehavior: validateAgainst(params.focusBehavior, C.FOCUS_BEHAVIORS),
        cameraSubjectRelationship: validateAgainst(params.cameraSubjectRelationship, C.CAMERA_SUBJECT_RELATIONSHIPS),
    };
    if (supportGear && sanitized.support) {
        sanitized.support = supportGear.includes(sanitized.support) ? sanitized.support : undefined;
    }
    if (lensKit && sanitized.focalLength) {
        sanitized.focalLength = lensKit.includes(sanitized.focalLength) ? sanitized.focalLength : undefined;
    }
    return sanitized;
};

/**
 * Convert continuity data (character/camera positions on a grid) into a
 * natural-language spatial description suitable for AI image generation.
 *
 * Delegates to the continuityTranslator module which produces prose describing
 * what the camera LENS sees -- no grid coordinates, no production equipment
 * terms, no angle numbers. The output reads like a photograph description.
 */
function buildContinuityContext(
    continuityData?: SceneContinuityData,
    shotPositions?: ShotPositionData,
    focalLength?: number,
    sensorWidth?: number,
    shotSize?: string,
    sceneLighting?: LightingSetup[],
): string | undefined {
    return buildSpatialPrompt(
        continuityData,
        shotPositions,
        focalLength || 35,
        sensorWidth || 36,
        shotSize,
        sceneLighting,
    );
}


function buildPrompt(
    params: ShotParameters,
    sceneInfo: string,
    timeOfDay: 'Day' | 'Night' | 'Other',
    sceneMood: string | undefined,
    sceneColorPalette: string | undefined,
    aspectRatio: string,
    hasReferenceImages: boolean,
    projectStyle: { projectType: string; cameraBody: string; sensorMode: string; },
    locationAnalysis?: string,
    actorDescriptions?: string[],
    propData?: Prop[],
    sceneLighting?: LightingSetup[],
    hasLocationImage?: boolean,
    continuityContext?: string,
    sceneDescription?: string,
): string {
    const antiEquipmentRule = `<equipment_exclusion_rule PRIORITY="CRITICAL">
ABSOLUTE PROHIBITION: This image is a MOVIE FRAME as seen through the camera lens. You must NEVER depict, show, render, or include ANY of the following:
- Camera equipment (cameras, lenses, tripods, dollies, jibs, cranes, steadicams, monitors)
- Lighting equipment (C-stands, light rigs, LED panels, softboxes, reflectors, flags, scrims, barn doors)
- Audio equipment (boom mics, lavaliers, sound mixers, cables)
- Crew members (directors, camera operators, grips, gaffers, script supervisors)
- Production elements (clapperboards, tape marks, sandbags, apple boxes, directors chairs)
- Behind-the-scenes elements (video village, craft services, equipment cases)
The generated image must look like a FINISHED MOVIE FRAME that an audience would see in a theater. Nothing from the production process should ever be visible.
</equipment_exclusion_rule>`;

    const overallStyleInstructions = `
- **Project Type:** This is for a '${projectStyle.projectType}', so the style should be cinematic and appropriate for that format.
- **Camera Look:** Emulate the visual characteristics of a '${projectStyle.cameraBody}' camera with a '${projectStyle.sensorMode}' sensor. This influences color rendition, grain, and the overall texture of the image.
- **Realism:** The overall image must be photo-realistic, with natural textures and lighting, resembling a high-quality film still.
    `;
    
    const compositionInstructions = `
- **Shot Size:** ${params.shotSize || 'not specified'}
- **Camera Angle:** ${params.cameraAngle || 'not specified'}
- **Framing:** ${params.composition || 'not specified'}
- **Camera Movement:** ${params.cameraMovement || 'static / not specified'}.
- **Camera Support:** ${params.support || 'not specified'}.
- **Lens Feel:** ${params.focalLength ? `Use a ${params.focalLength}mm` : 'Use a standard'} ${params.lensType || 'Spherical'} lens effect${params.dof ? `, creating a depth of field that is ${params.dof}` : ''}.
- **Focus Behavior:** ${params.focusBehavior || 'standard focus'}.
- **Subject(s) On Screen:** ${getSubjectDescription(params, actorDescriptions)}
- **Camera-Subject Relationship:** ${params.cameraSubjectRelationship || 'not specified'}.
- **Subject Action:** ${params.subjectMotion || 'not specified'}.
- **Key Props:** ${getPropDescription(params, propData)}
- **Production Notes:** Flags: ${(params.flags || []).join(', ') || 'none'}.
    `;

    // The user's core directive, made into a universal rule for the AI.
    const aspectRatioMasterRule = `
<master_rule PRIORITY="HIGHEST">
    - **Non-Negotiable Aspect Ratio:** The final output image's aspect ratio MUST be exactly **${aspectRatio}**. This is the single, project-wide aspect ratio setting.
    - **Override All Inputs:** This rule is absolute and overrides all other inputs, especially the aspect ratio of any provided reference images.
    - **Reference Image Handling:** You MUST completely ignore the original aspect ratio of any reference image provided. Generate a new canvas at the project's aspect ratio (${aspectRatio}), and then place content into it as instructed below.
    - **Final Check:** Before outputting, you must verify: "Is this image in the ${aspectRatio} aspect ratio?" The answer must be yes.
</master_rule>
`;
    
    if (hasReferenceImages) {
        const characterFidelityRules = `<character_fidelity_rules PRIORITY="CRITICAL">
    - **EXACT LIKENESS IS THE #1 PRIORITY — THIS OVERRIDES ALL OTHER CREATIVE CHOICES.** The generated person MUST be visually IDENTICAL to the person in the reference photo. A viewer who knows this person must immediately recognize them.
    - **FACIAL STRUCTURE:** You MUST precisely replicate the EXACT facial features, bone structure, jawline, and proportions from the reference image. Do NOT alter the face shape, nose, eyes, mouth, chin, or forehead in ANY way.
    - **ATTRIBUTE ACCURACY:** Eye color, hair color, hairstyle, facial hair, skin tone, skin texture, freckles, moles, and ALL distinguishing features MUST be an EXACT match to the reference image. Do NOT change, stylize, or "improve" any attribute.
    - **GENDER CONSISTENCY:** The character's gender presentation MUST match the reference photo exactly. Do NOT alter masculine/feminine characteristics.
    - **AGE CONSISTENCY:** The character's apparent age MUST match the reference photo. Do NOT make them look older or younger.
    - **NATURAL RENDERING:** The rendering must be completely photo-realistic with natural skin textures, pores, lighting, and hair. Avoid ANY "airbrushed," "CGI," "AI-generated," or artificial look.
    - **IDENTITY PRESERVATION:** If you must choose between creative composition and accurate likeness, ALWAYS choose accurate likeness. The person's identity is sacred and must never be altered.
</character_fidelity_rules>`;

        let referenceHandlingInstructions;
        if (hasLocationImage) {
            referenceHandlingInstructions = `
<reference_image_handling>
    <background_image_rules>
        - The FIRST provided image is the location background.
        - You MUST adapt this image to create a new background that strictly fits the **${aspectRatio}** aspect ratio. This may require intelligent cropping or extending the scene. Do NOT distort, stretch, or letterbox the image. Preserve its key features.
    </background_image_rules>
    <subject_image_rules>
        - All SUBSEQUENT images are for subject reference (actors, props).
        - For these images, you must extract ONLY the visual appearance of the subjects.
        - COMPLETELY IGNORE the background, composition, lighting, and aspect ratio of these subject reference images.
    </subject_image_rules>
    ${characterFidelityRules}
</reference_image_handling>
`;
        } else {
             referenceHandlingInstructions = `
<reference_image_handling>
    <subject_image_rules>
        - You are provided one or more reference images for subjects (actors, props).
        - Your ONLY task with these images is to extract the visual appearance of the subjects.
        - You MUST COMPLETELY IGNORE AND DISCARD all other attributes from the reference images: their original background, composition, lighting, and especially their aspect ratio.
    </subject_image_rules>
    ${characterFidelityRules}
</reference_image_handling>
`;
        }

        return `${antiEquipmentRule}
${aspectRatioMasterRule}
<shot_generation_task>
    ${referenceHandlingInstructions}
    <new_scene_synthesis>
        <instruction>
            ${hasLocationImage 
                ? "Place the identified subjects into the newly-reframed background image, following the new scene specifications." 
                : "Create a completely new scene from scratch based on the specifications below, and place the identified subjects into it."
            }
        </instruction>
        <specifications>
            <context>
${overallStyleInstructions}
- **Setting:** ${sceneInfo}.
${sceneDescription ? `- **Scene Action:** ${sceneDescription}` : ''}
- **Time of Day:** ${timeOfDay}.
${sceneMood ? `- **Mood:** '${sceneMood}' mood.` : ''}
${sceneColorPalette ? `- **Color Palette:** '${sceneColorPalette}' color palette.` : ''}
${locationAnalysis ? `- **Location Details:** The environment must be: "${locationAnalysis}".` : ''}
${!continuityContext && sceneLighting && sceneLighting.length > 0 ? `- **Lighting Scheme:** The scene is lit by: ${sceneLighting.map(l => `${l.name} (${l.sourceType} from ${l.direction}${l.color && l.color !== 'White' ? `, colored ${l.color}` : ''})`).join(', ')}.` : ''}
            </context>
            <composition>${compositionInstructions}</composition>
        </specifications>
    </new_scene_synthesis>
</shot_generation_task>
${continuityContext ? `
<spatial_context PRIORITY="ABSOLUTE">
ABSOLUTE SCENE AUTHORITY — CONTINUITY OVERRIDE: The spatial context below is the DEFINITIVE description of the scene. It was established in the continuity plan and overrides all other inputs.
- ONLY the characters listed below should appear in the image. Do NOT add any characters not mentioned here.
- ONLY the set elements/props listed below should be visible. Do NOT invent additional objects.
- ONLY the lighting described below should be rendered. Do NOT add extra light sources.
- Character positions (left/center/right, depth) are LOCKED and MUST be followed exactly. DO NOT mirror, reverse, or swap left/right positioning.

${continuityContext}

Use this spatial information to guide actor placement, framing, and depth arrangement in the generated image. Characters closer to the camera MUST appear larger; characters to the left MUST be on the left side of frame; characters to the right MUST be on the right side.
DO NOT reverse left/right positioning under any circumstances.
</spatial_context>` : ''}

FINAL REMINDER: This is a FINISHED MOVIE FRAME. No cameras, lights, crew, or production equipment may appear anywhere in the image.`;
    } else {
        // For Imagen (text-to-image), we need to handle supported and unsupported aspect ratios.
        const isSupported = C.VALID_IMAGEN_ASPECT_RATIOS.includes(aspectRatio);

        const basePrompt = `
**Overall Project Style:**
${overallStyleInstructions}

**Style & Tone:**
${sceneMood ? `- **Mood:** Evoke a feeling of '${sceneMood}'.` : '- **Mood:** Infer an appropriate mood from the scene context.'}
${sceneColorPalette ? `- **Color:** Use a '${sceneColorPalette}' color palette.` : '- **Color:** Infer an appropriate color palette from the scene context.'}

**Scene Context:**
- **Setting:** ${sceneInfo}.
${sceneDescription ? `- **Scene Action:** ${sceneDescription}` : ''}
- **Time of Day:** ${timeOfDay}.
${locationAnalysis ? `- **Location Details:** The environment must match this description: "${locationAnalysis}".` : ''}
${!continuityContext && sceneLighting && sceneLighting.length > 0 ? `- **Lighting Scheme:** The scene is lit by: ${sceneLighting.map(l => `${l.name} (${l.sourceType} from ${l.direction}${l.color && l.color !== 'White' ? `, colored ${l.color}` : ''})`).join(', ')}.` : ''}

**Composition Instructions:**
You are to construct an image based on the following compositional rules:
${compositionInstructions}
        `;

        if (isSupported) {
              return `${antiEquipmentRule}
**GENERATE A CINEMATIC STORYBOARD FRAME WITH AN EXACT, NON-NEGOTIABLE ASPECT RATIO OF ${aspectRatio}.**
This aspect ratio rule is the highest priority.
${basePrompt}
${continuityContext ? `\n**ABSOLUTE SCENE AUTHORITY — CONTINUITY OVERRIDE:**\nThe spatial context below is the DEFINITIVE description of the scene. ONLY the characters, set elements, and lighting described here should appear. Do NOT add any characters, objects, or light sources not listed.\nCharacter positions are LOCKED. DO NOT reverse left/right positioning.\n\n${continuityContext}\nUse this spatial information to guide actor placement, framing, and depth arrangement. Characters closer MUST appear larger; left-side characters MUST be on the left of frame.` : ''}

FINAL REMINDER: This is a FINISHED MOVIE FRAME. No cameras, lights, crew, or production equipment may appear anywhere.
            `;
        } else {
            // Instruct the model to letterbox within a 16:9 frame for unsupported ratios
            return `${antiEquipmentRule}
**GENERATE A CINEMATIC STORYBOARD FRAME IN A 16:9 CONTAINER, LETTERBOXED TO A ${aspectRatio} ASPECT RATIO.**

**Goal:** Create a single cinematic storyboard frame. The final output image MUST be 16:9.

**CRITICAL INSTRUCTION:** The visual content must be composed for a **${aspectRatio}** aspect ratio. You MUST add solid black bars (letterboxing) to the top and bottom of the 16:9 frame to achieve this. Do not stretch or distort the content.
${basePrompt}
${continuityContext ? `\n**ABSOLUTE SCENE AUTHORITY — CONTINUITY OVERRIDE:**\nThe spatial context below is the DEFINITIVE description of the scene. ONLY the characters, set elements, and lighting described here should appear. Do NOT add any characters, objects, or light sources not listed.\nCharacter positions are LOCKED. DO NOT reverse left/right positioning.\n\n${continuityContext}\nUse this spatial information to guide actor placement, framing, and depth arrangement. Characters closer MUST appear larger; left-side characters MUST be on the left of frame.` : ''}

FINAL REMINDER: This is a FINISHED MOVIE FRAME. No cameras, lights, crew, or production equipment may appear anywhere.
            `;
        }
    }
}

export const generateShotImage = async (
    params: ShotParameters,
    sceneInfo: string,
    timeOfDay: 'Day' | 'Night' | 'Other',
    sceneMood: string | undefined,
    sceneColorPalette: string | undefined,
    aspectRatio: string,
    projectStyle: { projectType: string; cameraBody: string; sensorMode: string; },
    locationAnalysis?: string,
    actorsInShotData?: Actor[],
    propsInShotData?: Prop[],
    sceneLighting?: LightingSetup[],
    locationReferenceImage?: string,
    continuityData?: SceneContinuityData,
    shotPositions?: ShotPositionData,
    sceneDescription?: string,
): Promise<string> => {
    return withRetry(async () => {
        const ai = getAI();
        const actorDescriptions = actorsInShotData?.map(a => {
            const genderPrefix = a.gender ? `[${a.gender.toUpperCase()}] ` : '';
            return `${genderPrefix}${a.description || `a person named ${a.name}`}`;
        });
        
        const actorPhotos = actorsInShotData?.map(a => a.photo).filter(p => !!p) as string[] || [];
        const propImages = propsInShotData?.map(p => p.referenceImage).filter(p => !!p) as string[] || [];
        
        const hasLocationImage = !!locationReferenceImage;
        const subjectReferenceImages = [...actorPhotos, ...propImages];
        // If location image exists, it MUST be the first image in the payload.
        const allReferenceImages = hasLocationImage ? [locationReferenceImage, ...subjectReferenceImages] : subjectReferenceImages;
        const hasReferenceImages = allReferenceImages.length > 0;
        
        const continuityContext = buildContinuityContext(continuityData, shotPositions, params.focalLength, C.SENSOR_WIDTHS[projectStyle.sensorMode] || 36, params.shotSize, sceneLighting);
        const prompt = buildPrompt(params, sceneInfo, timeOfDay, sceneMood, sceneColorPalette, aspectRatio, hasReferenceImages, projectStyle, locationAnalysis, actorDescriptions, propsInShotData, sceneLighting, hasLocationImage, continuityContext, sceneDescription);

        // Check for "NanoBanana Pro" setting
        const useProModel = localStorage.getItem('use_pro_model') === 'true';

        if (hasReferenceImages) {
            const parts: any[] = [];
            
            for (const photo of allReferenceImages) {
                parts.push(base64ToGenerativePart(photo));
            }
            
            parts.push({ text: prompt });

            const modelName = useProModel ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
            
            // Note: imageSize is only supported on gemini-3-pro-image-preview
            const imageConfig = useProModel ? { imageSize: "1K" } : undefined;

            const response = await ai.models.generateContent({
                model: modelName,
                contents: { parts },
                config: {
                    responseModalities: [Modality.IMAGE],
                    // @ts-ignore - The SDK types might not be fully updated for imageConfig yet in all versions
                    imageConfig
                },
            });

            if (!response.candidates?.[0]?.content?.parts) {
                throw new Error(`${modelName} returned no candidates. The image may have been filtered by safety settings. Try adjusting your prompt.`);
            }
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    const base64ImageBytes: string = part.inlineData.data;
                    return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
                }
            }
            throw new Error(`No image was generated by ${modelName}.`);

        } else {
            const finalAspectRatio = C.VALID_IMAGEN_ASPECT_RATIOS.includes(aspectRatio) ? aspectRatio : '16:9';

            // First try Imagen 4.0, then fall back to Gemini image generation
            // if Imagen's safety filter blocks the content.
            try {
                const response = await ai.models.generateImages({
                    model: 'imagen-4.0-generate-001',
                    prompt,
                    config: {
                        numberOfImages: 1,
                        outputMimeType: 'image/jpeg',
                        aspectRatio: finalAspectRatio as "1:1" | "3:4" | "4:3" | "9:16" | "16:9",
                        // @ts-ignore — Allow person generation to avoid overly aggressive filters
                        personGeneration: 'ALLOW_ALL',
                    },
                });

                if (response.generatedImages?.[0]?.image?.imageBytes) {
                    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
                    return `data:image/jpeg;base64,${base64ImageBytes}`;
                }
                console.warn('[generateShotImage] Imagen returned no images. Falling back to Gemini image generation.');
            } catch (imagenError: any) {
                console.warn('[generateShotImage] Imagen failed:', imagenError.message || imagenError, '— Falling back to Gemini image generation.');
            }

            // Fallback: use Gemini's native image generation with a CINEMATIC prompt.
            // Gemini image gen models default to stylized output unless given strong
            // photorealism directives, so we rebuild the prompt with explicit rules.
            const fallbackModelName = useProModel ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
            const imageConfig = useProModel ? { imageSize: "1K" } : undefined;

            const cinematicFallbackPrompt = buildPrompt(
                params, sceneInfo, timeOfDay, sceneMood, sceneColorPalette, aspectRatio,
                true, // treat as "has reference images" to use the full XML prompt structure
                projectStyle, locationAnalysis, actorDescriptions, propsInShotData, sceneLighting,
                false, // no location image
                continuityContext,
                sceneDescription
            );

            // Wrap with mandatory photorealism enforcement
            const enforcedPrompt = `<mandatory_style_rules PRIORITY="ABSOLUTE">
- You MUST generate a PHOTO-REALISTIC, CINEMATIC film still. This is NON-NEGOTIABLE.
- The image must look like it was captured on a real film camera on a real film set with real actors.
- NEVER generate cartoon, animated, LEGO, toy, miniature, CGI, illustrated, painted, sketched, or stylized images.
- The output must have natural skin textures, real lighting, real environments, and photographic quality.
- If in doubt, make it look MORE like a photograph, not less.
</mandatory_style_rules>

${cinematicFallbackPrompt}`;

            const fallbackResponse = await ai.models.generateContent({
                model: fallbackModelName,
                contents: enforcedPrompt,
                config: {
                    responseModalities: [Modality.IMAGE],
                    // @ts-ignore
                    imageConfig
                },
            });

            if (!fallbackResponse.candidates?.[0]?.content?.parts) {
                throw new Error(`Both Imagen and ${fallbackModelName} failed to generate an image. The content may have been filtered. Try simplifying your scene description or adjusting shot parameters.`);
            }
            for (const part of fallbackResponse.candidates[0].content.parts) {
                if (part.inlineData) {
                    const base64ImageBytes: string = part.inlineData.data;
                    return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
                }
            }
            throw new Error(`Both Imagen and ${fallbackModelName} failed to produce an image.`);
        }
    });
};

export const describeActorImage = async (base64Image: string): Promise<string> => {
    return withRetry(async () => {
        const ai = getAI();
        const imagePart = base64ToGenerativePart(base64Image);
        const prompt = "Describe this person's key visual features for a film's storyboard generation AI. Focus on gender, apparent age, ethnicity, hair style and color, and any distinct facial features. Be concise and descriptive. Example: 'Male, 30s, Caucasian, with short brown hair and a beard.'";
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: { parts: [imagePart, {text: prompt}] },
        });
        return getResponseText(response);
    });
};

interface ActorImageAnalysis {
    description: string;
    gender: 'male' | 'female' | 'non-binary' | 'other';
    boundingBox: {
        x: number;
        y: number;
        width: number;
        height: number;
    } | null; // Bounding box in pixels, null if no face found
}

const actorAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        description: {
            type: Type.STRING,
            description: "A concise visual description of the person's key features like gender, age, ethnicity, hair. Example: 'Male, 30s, Caucasian, with short brown hair and a beard.'"
        },
        gender: {
            type: Type.STRING,
            description: "The person's gender. Must be one of: 'male', 'female', 'non-binary', 'other'.",
            enum: ['male', 'female', 'non-binary', 'other']
        },
        faceFound: {
            type: Type.BOOLEAN,
            description: "Set to true if a prominent face is clearly visible, otherwise false."
        },
        boundingBox: {
            type: Type.OBJECT,
            description: "The bounding box of the most prominent face in pixels, from the top-left corner. Omit if faceFound is false.",
            properties: {
                x: { type: Type.INTEGER, description: "The x-coordinate of the top-left corner of the box." },
                y: { type: Type.INTEGER, description: "The y-coordinate of the top-left corner of the box." },
                width: { type: Type.INTEGER, description: "The width of the box." },
                height: { type: Type.INTEGER, description: "The height of the box." }
            }
        }
    },
    required: ["description", "faceFound", "gender"]
};

export const analyzeActorImage = async (base64Image: string): Promise<ActorImageAnalysis> => {
     return withRetry(async () => {
        const ai = getAI();
        const imagePart = base64ToGenerativePart(base64Image);
        const prompt = "Analyze the provided image. First, write a concise visual description of the person's key features (gender, age, ethnicity, hair). Then, determine if a prominent face is clearly visible. If a face is visible, provide the bounding box coordinates (x, y, width, height) in pixels from the top-left corner. If no clear face is visible, just indicate that.";

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: { parts: [imagePart, { text: prompt }] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: actorAnalysisSchema,
            },
        });

        const jsonText = getResponseText(response);
        const analysis = JSON.parse(jsonText);
        
        const bbox = analysis.faceFound ? analysis.boundingBox : null;
        const isValidBBox = bbox &&
            typeof bbox.x === 'number' && bbox.x >= 0 &&
            typeof bbox.y === 'number' && bbox.y >= 0 &&
            typeof bbox.width === 'number' && bbox.width > 0 &&
            typeof bbox.height === 'number' && bbox.height > 0;

        return {
            description: analysis.description,
            gender: analysis.gender || 'other',
            boundingBox: isValidBBox ? bbox : null,
        };
    });
};

export const describePropImage = async (base64Image: string): Promise<string> => {
    return withRetry(async () => {
        const ai = getAI();
        const imagePart = base64ToGenerativePart(base64Image);
        const prompt = "Describe this object's key visual features for a film's storyboard generation AI. Focus on what it is, its material, color, and any distinct details. Be concise and descriptive. Example: 'A silver, ornate pocket watch with a cracked glass face.'";
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: { parts: [imagePart, {text: prompt}] },
        });
        return getResponseText(response);
    });
};

export const generateShotDescription = async (
    params: ShotParameters,
    sceneMood?: string,
    sceneColorPalette?: string,
    sceneLighting?: LightingSetup[],
): Promise<string> => {
     return withRetry(async () => {
        const ai = getAI();
        const prompt = `
            Write a one-sentence, present-tense description for a storyboard panel based on these parameters.
            Focus on the action and mood, not the technical details.

            - Shot Size: ${params.shotSize || 'N/A'}
            - Composition: ${params.composition || 'N/A'}
            - Subject(s): ${params.actorsInShot?.join(', ') || params.subjectCount || 'N/A'}
            - Subject Action: ${params.subjectMotion || 'N/A'}
            - Key Objects: ${params.objectsInShot || 'N/A'}
            - Mood: ${sceneMood || 'N/A'}
            - Color Palette: ${sceneColorPalette || 'N/A'}
${sceneLighting && sceneLighting.length > 0 ? `            - Lighting: ${sceneLighting.map(l => `${l.name} (${l.sourceType} from ${l.direction})`).join(', ')}` : ''}

            Example: "A tense CLOSE UP on JANE as she nervously glances at the ticking clock on the wall."
        `;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        return getResponseText(response);
    });
};

/**
 * Constructs a technical data object directly from project and shot metadata.
 * This is a deterministic function and does not use an AI model.
 */
export const generateTechnicalData = (
    params: ShotParameters,
    sceneId: string,
    shotId: string,
    projectSettings: ProjectSettings,
    sceneLighting?: LightingSetup[],
): TechnicalData => {
    
    // Camera String
    const camera = `${projectSettings.cameraBody} (${projectSettings.sensorMode})`;

    // Lens String
    const lensParts = [];
    if (params.focalLength) lensParts.push(`${params.focalLength}mm`);
    if (params.lensType) lensParts.push(params.lensType);
    const lens = lensParts.join(' ') || 'Not set';
    
    // Support String
    const support = params.support || 'Not set';
    
    // Movement String
    const movement = params.cameraMovement || 'Not set';

    // Lighting String
    const lighting = sceneLighting && sceneLighting.length > 0
        ? sceneLighting.map(l => `${l.name} (${l.sourceType} from ${l.direction})`).join(', ')
        : 'Natural / Not specified';

    // DOF String
    const dof = params.dof || 'Not set';
    
    // Flags
    const flags = params.flags?.length ? params.flags : ['None'];
    
    // Aspect Ratio
    const aspectRatio = projectSettings.primaryAspectRatio;
    
    // Shot Type
    const shotType = params.shotSize || 'Not set';

    return {
        sceneId,
        shotId,
        camera,
        lens,
        support,
        movement,
        lighting,
        dof,
        flags,
        aspectRatio,
        shotType,
    };
};

export const editImageWithNanoBanana = async (base64Image: string, prompt: string): Promise<string> => {
    return withRetry(async () => {
        const ai = getAI();
        const imagePart = base64ToGenerativePart(base64Image);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [imagePart, { text: prompt }],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });
        if (!response.candidates?.[0]?.content?.parts) {
            throw new Error("Image editing returned no candidates. The content may have been filtered by safety settings. Try a different edit prompt.");
        }
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
            }
        }
        throw new Error("No image was edited/returned by gemini-2.5-flash-image.");
    });
};

export const analyzeLocationByAddress = async (address: string): Promise<string> => {
    return withRetry(async () => {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `As a film location scout, provide a one-paragraph visual description of the area around this address: ${address}. Focus on architectural style, environment type (urban, suburban, rural), notable landmarks, and overall mood. This will be used to guide an AI image generator.`,
            config: {
                tools: [{googleMaps: {}}],
            }
        });
        return getResponseText(response);
    });
};

const SCENE_HEADER_RE = /^[ \t]*(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/im;

function splitScriptIntoSceneBlocks(scriptContent: string): string[] {
    const lines = scriptContent.split('\n');
    const blocks: string[] = [];
    let current: string[] = [];

    for (const line of lines) {
        if (SCENE_HEADER_RE.test(line) && current.length > 0) {
            blocks.push(current.join('\n'));
            current = [];
        }
        current.push(line);
    }
    if (current.length > 0) blocks.push(current.join('\n'));
    return blocks;
}

function createBatches(blocks: string[], targetBatchCount: number): string[][] {
    if (blocks.length <= targetBatchCount) {
        return blocks.map(b => [b]);
    }
    const perBatch = Math.ceil(blocks.length / targetBatchCount);
    const batches: string[][] = [];
    for (let i = 0; i < blocks.length; i += perBatch) {
        batches.push(blocks.slice(i, i + perBatch));
    }
    return batches;
}

function splitByCharacterCount(text: string, targetChunks: number): string[] {
    const chunkSize = Math.ceil(text.length / targetChunks);
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
        let end = Math.min(start + chunkSize, text.length);
        if (end < text.length) {
            const nextNewline = text.indexOf('\n', end);
            if (nextNewline !== -1 && nextNewline - end < 500) {
                end = nextNewline + 1;
            }
        }
        chunks.push(text.slice(start, end));
        start = end;
    }
    return chunks;
}

async function hashScript(text: string): Promise<string> {
    const encoded = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, 16);
}

const sceneExtractionSchema = {
    type: Type.OBJECT,
    properties: {
        scenes: {
            type: Type.ARRAY,
            description: "An array of scene objects extracted from the script.",
            items: {
                type: Type.OBJECT,
                properties: {
                    sceneNumber: { type: Type.INTEGER, description: "The sequential number of the scene." },
                    slugline: { type: Type.STRING, description: "The full scene heading (e.g., 'INT. APARTMENT - DAY')." },
                    description: { type: Type.STRING, description: "A one-sentence summary of the main action or event in the scene." },
                    actors: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of character names who appear in this scene." },
                    props: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of key props mentioned in this scene." },
                    locations: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of location names mentioned in this scene." },
                    timeOfDay: { type: Type.STRING, description: "The time of day for this scene, inferred from the slugline or scene context. Must be one of: 'Day', 'Night', or 'Other'.", enum: ['Day', 'Night', 'Other'] },
                    mood: { type: Type.STRING, description: "The dominant mood or emotional tone of the scene (e.g., 'Tense', 'Romantic', 'Comedic', 'Melancholic', 'Action-packed')." },
                    colorPalette: { type: Type.STRING, description: "A suggested color palette based on the scene's mood and setting (e.g., 'Warm amber tones', 'Cool blue', 'High contrast noir', 'Desaturated earth tones')." },
                    lightingDescription: { type: Type.STRING, description: "A description of the lighting implied by the script's stage directions and setting (e.g., 'Harsh fluorescent overhead lighting', 'Warm golden hour sunlight streaming through windows', 'Dark with a single practical desk lamp')." },
                    estimatedPageCount: { type: Type.NUMBER, description: "Estimated page count of this scene (e.g., 0.5, 1, 2.5)." },
                },
                required: ["sceneNumber", "slugline", "description", "actors", "timeOfDay"]
            }
        }
    },
    required: ["scenes"]
};

export type AnalysisProgressCallback = (phase: string, completed: number, total: number) => void;

type ScriptAnalysisResult = {
    scenes: Scene[];
    uniqueCharacters: string[];
    uniqueProps: string[];
    uniqueLocations: string[];
};

const SCRIPT_CACHE_PREFIX = 'script_analysis_';
const TARGET_BATCH_COUNT = 4;
const MIN_CHARS_FOR_PARALLEL = 3000;

function buildExtractionPrompt(scriptChunk: string, sceneNumberOffset: number, isPartial: boolean): string {
    const partialNote = isPartial
        ? `You are analyzing a portion of a larger script. Number the scenes sequentially starting from ${sceneNumberOffset + 1}.`
        : '';
    return `Analyze this film script content and extract all scenes. For each scene, provide:
1. Scene number, full slugline, and a one-sentence summary of the action.
2. All characters who appear in the scene.
3. Key props and specific location names mentioned.
4. The overall mood/emotional tone of the scene.
5. A suggested color palette based on the mood and setting.
6. Lighting description based on stage directions, setting, and time of day.
7. An estimated page count for the scene.

${partialNote}
Return the data in the specified JSON format.

Script:
${scriptChunk}`;
}

function mapRawScenesToDomain(rawScenes: any[]): { scenes: Scene[]; characters: Set<string>; props: Set<string>; locations: Set<string> } {
    const characters = new Set<string>();
    const props = new Set<string>();
    const locations = new Set<string>();

    const scenes: Scene[] = rawScenes.map((s: any) => {
        (s.actors || []).forEach((actor: string) => characters.add(actor.trim()));
        (s.props || []).forEach((prop: string) => props.add(prop.trim()));
        (s.locations || []).forEach((loc: string) => locations.add(loc.trim()));

        return {
            id: crypto.randomUUID(),
            sceneNumber: s.sceneNumber,
            slugline: s.slugline.toUpperCase(),
            description: s.description,
            pageCount: s.estimatedPageCount || 0,
            estimatedScreenTime: s.estimatedPageCount ? `~${Math.round(s.estimatedPageCount)}min` : 'N/A',
            tags: [],
            actors: s.actors || [],
            props: s.props || [],
            timeOfDay: s.timeOfDay || detectTimeOfDay(s.slugline) || 'Day',
            mood: s.mood || undefined,
            colorPalette: s.colorPalette || undefined,
            lighting: s.lightingDescription ? [{
                id: crypto.randomUUID(),
                name: 'Key Light (from script)',
                sourceType: 'Natural' as const,
                direction: 'Front',
                intensity: 100,
                color: 'White',
                modifiers: [],
                description: s.lightingDescription,
            }] : undefined,
        };
    });

    return { scenes, characters, props, locations };
}

async function analyzeChunkStreaming(
    ai: GoogleGenAI,
    scriptChunk: string,
    sceneNumberOffset: number,
    isPartial: boolean,
    expectedSceneCount: number,
    onStreamProgress?: (scenesReceived: number, expectedTotal: number) => void,
): Promise<any[]> {
    const prompt = buildExtractionPrompt(scriptChunk, sceneNumberOffset, isPartial);

    const stream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: sceneExtractionSchema,
            thinkingConfig: { thinkingBudget: 0 },
        },
    });

    let accumulated = '';
    for await (const chunk of stream) {
        accumulated += chunk.text ?? '';
        if (onStreamProgress) {
            const matches = accumulated.match(/"sceneNumber"/g);
            onStreamProgress(matches ? matches.length : 0, expectedSceneCount);
        }
    }

    accumulated = accumulated.trim();
    if (!accumulated) throw new Error("The AI returned an empty response. Please try again.");

    let parsed;
    try {
        parsed = JSON.parse(accumulated);
    } catch {
        throw new Error("The AI returned an invalid response while analyzing the script. Please try again.");
    }

    if (!parsed?.scenes || !Array.isArray(parsed.scenes)) {
        throw new Error("Unexpected response format from AI script analysis.");
    }

    return parsed.scenes;
}

export const analyzeScriptAndExtractScenes = async (
    scriptContent: string,
    onProgress?: AnalysisProgressCallback,
): Promise<ScriptAnalysisResult> => {
    const scriptHash = await hashScript(scriptContent);
    const cacheKey = SCRIPT_CACHE_PREFIX + scriptHash;

    const cached = localStorage.getItem(cacheKey);
    if (cached) {
        try {
            const parsed = JSON.parse(cached) as ScriptAnalysisResult;
            if (parsed?.scenes?.length) {
                onProgress?.('cached', 1, 1);
                return parsed;
            }
        } catch { /* cache corrupt, re-analyze */ }
    }

    const sceneBlocks = splitScriptIntoSceneBlocks(scriptContent);
    const hasGoodSceneHeaders = sceneBlocks.length >= 2;

    let textChunks: string[];
    let expectedScenesPerChunk: number[];

    if (hasGoodSceneHeaders && sceneBlocks.length >= TARGET_BATCH_COUNT) {
        const batches = createBatches(sceneBlocks, TARGET_BATCH_COUNT);
        textChunks = batches.map(b => b.join('\n\n'));
        expectedScenesPerChunk = batches.map(b => b.length);
    } else if (scriptContent.length >= MIN_CHARS_FOR_PARALLEL) {
        textChunks = splitByCharacterCount(scriptContent, TARGET_BATCH_COUNT);
        const roughScenesPerChunk = Math.max(2, Math.ceil(scriptContent.length / 3000 / textChunks.length));
        expectedScenesPerChunk = textChunks.map(() => roughScenesPerChunk);
    } else {
        textChunks = [scriptContent];
        expectedScenesPerChunk = [Math.max(1, sceneBlocks.length)];
    }

    const totalExpectedScenes = expectedScenesPerChunk.reduce((a, b) => a + b, 0);
    const streamProgressPerChunk: number[] = textChunks.map(() => 0);

    const reportStreamProgress = () => {
        const totalReceived = streamProgressPerChunk.reduce((a, b) => a + b, 0);
        onProgress?.('analyzing', totalReceived, totalExpectedScenes);
    };

    onProgress?.('analyzing', 0, totalExpectedScenes);

    let allRawScenes: any[];

    if (textChunks.length > 1) {
        const chunkOffsets: number[] = [];
        let runningOffset = 0;
        for (let i = 0; i < expectedScenesPerChunk.length; i++) {
            chunkOffsets.push(runningOffset);
            runningOffset += expectedScenesPerChunk[i];
        }

        const batchResults = await Promise.all(
            textChunks.map(async (chunkText, idx) => {
                return withRetry(() =>
                    analyzeChunkStreaming(
                        getAI(),
                        chunkText,
                        chunkOffsets[idx],
                        textChunks.length > 1,
                        expectedScenesPerChunk[idx],
                        (scenesReceived) => {
                            streamProgressPerChunk[idx] = scenesReceived;
                            reportStreamProgress();
                        },
                    )
                );
            })
        );

        allRawScenes = batchResults.flat();
        allRawScenes.forEach((s, i) => { s.sceneNumber = i + 1; });
    } else {
        allRawScenes = await withRetry(() =>
            analyzeChunkStreaming(
                getAI(),
                scriptContent,
                0,
                false,
                totalExpectedScenes,
                (scenesReceived) => {
                    streamProgressPerChunk[0] = scenesReceived;
                    reportStreamProgress();
                },
            )
        );
    }

    onProgress?.('analyzing', totalExpectedScenes, totalExpectedScenes);

    const { scenes, characters, props, locations } = mapRawScenesToDomain(allRawScenes);
    const result: ScriptAnalysisResult = {
        scenes,
        uniqueCharacters: Array.from(characters),
        uniqueProps: Array.from(props),
        uniqueLocations: Array.from(locations),
    };

    try {
        localStorage.setItem(cacheKey, JSON.stringify(result));
    } catch { /* localStorage full -- non-critical */ }

    return result;
};


export const describeLocationAsset = async (name: string, base64Image?: string, address?: string) => {
    return withRetry(async () => {
        const ai = getAI();
        const parts: any[] = [];
        let prompt = `As a film location scout, provide a one-paragraph visual description of the location named "${name}".`;

        if (address) {
            prompt += ` It is located at ${address}.`;
        }
        if (base64Image) {
            prompt += " Use the provided image as the primary reference. Describe the architectural style, environment, key features, and overall mood for an AI image generator.";
            parts.push(base64ToGenerativePart(base64Image));
        } else {
            prompt += " Describe a typical version of this kind of location.";
        }
        
        parts.push({ text: prompt });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: { parts },
            config: {
                tools: address ? [{googleMaps: {}}] : undefined,
            }
        });
        return getResponseText(response);
    });
};

export const generateShotSequence = async (sceneAction: string, lensKit: number[], supportGear: string[]): Promise<Partial<ShotParameters>[]> => {
    return withRetry(async () => {
        const ai = getAI();
        const shotSequenceSchema = {
            type: Type.OBJECT,
            properties: {
                shots: {
                    type: Type.ARRAY,
                    description: "An array of suggested shots to cover the scene action.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            shotSize: { type: Type.STRING, description: `e.g., ${C.SHOT_SIZES.join(', ')}` },
                            composition: { type: Type.STRING, description: `e.g., ${C.COMPOSITIONS.join(', ')}` },
                            cameraAngle: { type: Type.STRING, description: `e.g., ${C.CAMERA_ANGLES.join(', ')}` },
                            cameraMovement: { type: Type.STRING, description: `e.g., ${C.CAMERA_MOVEMENTS.join(', ')}` },
                            focalLength: { type: Type.INTEGER, description: `Choose from: ${lensKit.join(', ')}` },
                            support: { type: Type.STRING, description: `Choose from: ${supportGear.join(', ')}` },
                        },
                        required: ["shotSize", "cameraAngle"]
                    }
                }
            }
        };

        const prompt = `
        As a Director of Photography, suggest a sequence of 3-5 shots to cover the following scene action.
        Provide varied and cinematic choices. Use only the available equipment.

        Scene Action: "${sceneAction}"

        Available Focal Lengths (mm): ${lensKit.join(', ')}
        Available Support Gear: ${supportGear.join(', ')}
        Available Shot Sizes: ${C.SHOT_SIZES.join(', ')}
        Available Compositions: ${C.COMPOSITIONS.join(', ')}
        Available Camera Angles: ${C.CAMERA_ANGLES.join(', ')}
        Available Camera Movements: ${C.CAMERA_MOVEMENTS.join(', ')}

        Return your answer in the specified JSON format.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: shotSequenceSchema,
            }
        });

        let result;
        try {
            result = JSON.parse(getResponseText(response));
        } catch (e) {
            throw new Error("The AI returned an invalid response for shot sequence. Please try again.");
        }
        return (result.shots || []).map((s: Partial<ShotParameters>) => sanitizeShotParams(s, lensKit, supportGear));
    });
};

export const interpretNaturalLanguageShot = async (prompt: string, scene: Scene, projectSettings: ProjectSettings): Promise<Partial<ShotParameters>> => {
    return withRetry(async () => {
        const ai = getAI();
        const interpretationSchema = {
            type: Type.OBJECT,
            properties: {
                shotSize: { type: Type.STRING, description: `One of: ${C.SHOT_SIZES.join(', ')}` },
                composition: { type: Type.STRING, description: `One of: ${C.COMPOSITIONS.join(', ')}` },
                cameraAngle: { type: Type.STRING, description: `One of: ${C.CAMERA_ANGLES.join(', ')}` },
                cameraMovement: { type: Type.STRING, description: `One of: ${C.CAMERA_MOVEMENTS.join(', ')}` },
                focalLength: { type: Type.INTEGER, description: `Choose one from the project's lens kit: ${projectSettings.lensKit.join(', ')}` },
                support: { type: Type.STRING, description: `Choose one from the project's support gear: ${projectSettings.support.join(', ')}` },
                dof: { type: Type.STRING, description: `One of: ${C.DOFS.join(', ')}` },
                actorsInShot: { type: Type.ARRAY, items: { type: Type.STRING }, description: `List of actor names from the scene's cast that are in this shot. Scene cast: ${scene.actors.join(', ')}` }
            },
            required: ["shotSize", "cameraAngle"]
        };

        const fullPrompt = `
            Interpret the following natural language shot description and map it to the available technical parameters.
            
            Description: "${prompt}"

            Scene Information:
            - Slugline: ${scene.slugline}
            - Actors in Scene: ${scene.actors.join(', ') || 'None specified'}
            - Time of Day: ${scene.timeOfDay || 'Not specified'}
            - Mood: ${scene.mood || 'Not specified'}
            - Color Palette: ${scene.colorPalette || 'Not specified'}
${scene.lighting && scene.lighting.length > 0 ? `            - Lighting: ${scene.lighting.map(l => `${l.name} (${l.sourceType} from ${l.direction})`).join(', ')}` : ''}

            Available Parameters:
            - Shot Sizes: ${C.SHOT_SIZES.join(', ')}
            - Compositions: ${C.COMPOSITIONS.join(', ')}
            - Camera Angles: ${C.CAMERA_ANGLES.join(', ')}
            - Camera Movements: ${C.CAMERA_MOVEMENTS.join(', ')}
            - Focal Lengths: ${projectSettings.lensKit.join(', ')}
            - Support Gear: ${projectSettings.support.join(', ')}
            - Depths of Field: ${C.DOFS.join(', ')}

            Infer the most likely parameters based on the description. If a parameter isn't mentioned, you can omit it.
            For 'actorsInShot', identify which characters from the scene are mentioned in the description.
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: fullPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: interpretationSchema,
            }
        });

        try {
            const parsed = JSON.parse(getResponseText(response));
            return sanitizeShotParams(parsed, projectSettings.lensKit, projectSettings.support);
        } catch (e) {
            throw new Error("The AI returned an invalid response for shot interpretation. Please try again.");
        }
    });
};

export const checkContinuity = async (shots: Shot[], continuityData: SceneContinuityData): Promise<string[]> => {
     return withRetry(async () => {
        const ai = getAI();
        if (!continuityData.oneEightyLine) return [];
        
        const prompt = `
        Analyze the camera positions for the following shots in a scene. The 180-degree line is defined by two points.
        The first camera placed establishes the 'safe' side of the line. Identify any subsequent shots that cross this line.
        
        180-Degree Line:
        - Point 1: { x: ${continuityData.oneEightyLine.p1.x}, y: ${continuityData.oneEightyLine.p1.y} }
        - Point 2: { x: ${continuityData.oneEightyLine.p2.x}, y: ${continuityData.oneEightyLine.p2.y} }

        Shot Positions:
        ${shots.filter(s => s.positions?.camera).map(s => `- Shot ID ${s.id} (Number ${s.shotNumber}): { x: ${s.positions!.camera.x}, y: ${s.positions!.camera.y} }`).join('\n')}
        
        Return a JSON object with a single key "warningShotIds" containing an array of shot IDs that cross the line.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        warningShotIds: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    }
                }
            }
        });

        let result;
        try {
            result = JSON.parse(getResponseText(response));
        } catch (e) {
            throw new Error("The AI returned an invalid response for continuity check. Please try again.");
        }
        return result.warningShotIds || [];
    });
};
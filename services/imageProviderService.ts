/**
 * Image Provider Service — Routes image generation to the active provider.
 *
 * This is the ONLY routing layer between ShotBuilder and the image generation services.
 * All other geminiService functions (script analysis, actor analysis, etc.) are still
 * imported directly — they are NOT routed through here.
 */

import { generateShotImage as geminiGenerateImage } from './geminiService';
import { generateShotImage as zimageGenerateImage } from './zimageService';
import type { ImageProvider } from '../types';
import type { ShotParameters, Actor, Prop, LightingSetup, SceneContinuityData, ShotPositionData } from '../types';

export function getActiveImageProvider(): ImageProvider {
    return (localStorage.getItem('image_provider') as ImageProvider) || 'gemini';
}

export function hasGeminiKey(): boolean {
    return !!localStorage.getItem('gemini_api_key');
}

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
    locationReferenceImage?: string,
    continuityData?: SceneContinuityData,
    shotPositions?: ShotPositionData,
    sceneDescription?: string,
): Promise<string> => {
    const provider = getActiveImageProvider();

    if (provider === 'zimage') {
        return zimageGenerateImage(
            params, sceneInfo, timeOfDay, sceneMood,
            sceneColorPalette, aspectRatio, projectStyle,
            locationAnalysis, actorsInShotData, propsInShotData,
            sceneLighting, locationReferenceImage, // passed but ignored by Z-Image
            continuityData, shotPositions, sceneDescription,
        );
    }

    // Default: Gemini (existing behavior, untouched)
    return geminiGenerateImage(
        params, sceneInfo, timeOfDay, sceneMood,
        sceneColorPalette, aspectRatio, projectStyle,
        locationAnalysis, actorsInShotData, propsInShotData,
        sceneLighting, locationReferenceImage,
        continuityData, shotPositions, sceneDescription,
    );
};

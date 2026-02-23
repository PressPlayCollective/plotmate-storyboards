// This utility function converts an image file to a base64 string,
// handling various formats and converting unsupported ones to PNG.
export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

        // If the type is already supported, process it directly.
        if (supportedTypes.includes(file.type)) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
            return;
        }

        // For unsupported types, convert using a canvas.
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get canvas context for image conversion.'));
                }
                ctx.drawImage(img, 0, 0);
                const dataUrl = canvas.toDataURL('image/png'); // Convert to PNG
                resolve(dataUrl);
            };
            img.onerror = (error) => reject(new Error(`Failed to load image for conversion: ${error}`));
            img.src = event.target?.result as string;
        };
        reader.onerror = (error) => reject(error);
    });
};

/**
 * Creates a smart crop of a base64 image centered on a provided bounding box,
 * ensuring the crop adheres to the target aspect ratio.
 * @param base64 The base64 string of the image to crop.
 * @param box The bounding box of the face in pixels { x, y, width, height }.
 * @param targetAspectRatioString The target aspect ratio, e.g., "16:9".
 * @returns A promise resolving to the cropped image as a base64 string.
 */
export const cropBase64ImageWithBoundingBox = (
    base64: string,
    box: { x: number; y: number; width: number; height: number },
    targetAspectRatioString: string
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Could not get canvas context.'));

            const ratioParts = targetAspectRatioString.split(':').map(Number);
            if (ratioParts.length !== 2 || isNaN(ratioParts[0]) || isNaN(ratioParts[1]) || ratioParts[0] <= 0 || ratioParts[1] <= 0) {
                console.warn(`Invalid aspect ratio provided: "${targetAspectRatioString}". Falling back to original image.`);
                return resolve(base64);
            }
            const targetRatio = ratioParts[0] / ratioParts[1];

            // Define how much padding to add around the face bounding box
            const PADDING_FACTOR = 2.0; 
            const paddedWidth = box.width * PADDING_FACTOR;
            const paddedHeight = box.height * PADDING_FACTOR;

            let sWidth, sHeight;

            // Determine crop dimensions based on the padded face box and target ratio
            if (paddedWidth / paddedHeight > targetRatio) {
                // Padded area is wider than target, so width is the constraint
                sWidth = paddedWidth;
                sHeight = sWidth / targetRatio;
            } else {
                // Padded area is taller, so height is the constraint
                sHeight = paddedHeight;
                sWidth = sHeight * targetRatio;
            }

            // Ensure the crop isn't larger than the image itself, scaling down if necessary
            const scale = Math.min(img.width / sWidth, img.height / sHeight, 1);
            sWidth *= scale;
            sHeight *= scale;

            // Center the crop on the original bounding box's center
            const boxCenterX = box.x + box.width / 2;
            const boxCenterY = box.y + box.height / 2;
            let sx = boxCenterX - sWidth / 2;
            let sy = boxCenterY - sHeight / 2;

            // Clamp crop coordinates to be within the image bounds
            sx = Math.max(0, Math.min(sx, img.width - sWidth));
            sy = Math.max(0, Math.min(sy, img.height - sHeight));

            // Set a reasonable output resolution for previews
            const MAX_DIMENSION = 512;
            canvas.width = MAX_DIMENSION;
            canvas.height = MAX_DIMENSION / targetRatio;

            ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.9));
        };
        img.onerror = (error) => reject(new Error(`Failed to load image for cropping: ${error}`));
        img.src = base64;
    });
};


/**
 * Crops a base64 encoded image to a target aspect ratio using a center-weighted algorithm.
 * The original image is preserved in the media library; this creates a new, cropped version for project use.
 * If face detection fails or is unavailable, this provides a graceful fallback.
 * @param base64 The base64 string of the image to crop.
 * @param aspectRatioString The target aspect ratio, e.g., "16:9".
 * @returns A promise that resolves with the cropped image as a base64 string in JPEG format.
 */
export const cropBase64ImageToAspectRatio = (base64: string, aspectRatioString: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context for image cropping.'));
            }

            const ratioParts = aspectRatioString.split(':').map(Number);
            if (ratioParts.length !== 2 || isNaN(ratioParts[0]) || isNaN(ratioParts[1]) || ratioParts[0] <= 0 || ratioParts[1] <= 0) {
                console.warn(`Invalid aspect ratio provided: "${aspectRatioString}". Falling back to original image.`);
                return resolve(base64);
            }
            const targetRatio = ratioParts[0] / ratioParts[1];
            const sourceRatio = img.width / img.height;

            let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;

            // Determine crop parameters to center the image
            if (sourceRatio > targetRatio) { // Image is wider than target aspect ratio
                sWidth = img.height * targetRatio;
                sx = (img.width - sWidth) / 2;
            } else if (sourceRatio < targetRatio) { // Image is taller than target aspect ratio
                sHeight = img.width / targetRatio;
                sy = (img.height - sHeight) / 2;
            }

            // Set a reasonable output resolution for avatars/previews
            const MAX_DIMENSION = 512;
            if (sWidth > sHeight) {
                canvas.width = MAX_DIMENSION;
                canvas.height = Math.round(MAX_DIMENSION / targetRatio);
            } else {
                canvas.height = MAX_DIMENSION;
                canvas.width = Math.round(MAX_DIMENSION * targetRatio);
            }

            ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.9));
        };
        img.onerror = (error) => reject(new Error(`Failed to load image for cropping: ${error}`));
        img.src = base64;
    });
};

/**
 * Reads an image file and returns a cropped, center-weighted base64 string.
 * This is the entry point for all actor image uploads into a project.
 * @param file The image file to process.
 * @param aspectRatioString The target aspect ratio, e.g., "16:9".
 * @returns A promise that resolves with the cropped base64 string.
 */
export const cropImageToAspectRatio = (file: File, aspectRatioString: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            if (typeof event.target?.result === 'string') {
                resolve(cropBase64ImageToAspectRatio(event.target.result, aspectRatioString));
            } else {
                reject(new Error('Failed to read file as data URL.'));
            }
        };
        reader.onerror = (error) => reject(error);
    });
};
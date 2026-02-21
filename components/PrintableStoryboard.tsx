
import type { Shot, Scene, ProjectSettings } from '../types';

export type StoryboardTemplate = 'client_grid' | 'production_list' | 'presentation_slides';

interface PrintableStoryboardProps {
    shots: Shot[];
    scene: Scene;
    projectSettings: ProjectSettings;
    template?: StoryboardTemplate;
}

const getAspectRatioPadding = (ratio: string): string => {
    const parts = ratio.split(':').map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[0] > 0 && parts[1] > 0) {
        return `${(parts[1] / parts[0]) * 100}%`;
    }
    return '56.25%'; // Default to 16:9 if ratio is invalid
};

// Escape HTML entities to prevent XSS in generated HTML documents
const escapeHtml = (str: string): string => {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

const PrintableStoryboard = ({ shots, scene, projectSettings, template = 'client_grid' }: PrintableStoryboardProps): string => {
    const aspectRatioPadding = getAspectRatioPadding(projectSettings.primaryAspectRatio);
    const safeName = escapeHtml(projectSettings.name);
    const safeSlugline = escapeHtml(scene.slugline);
    const safeProjectType = escapeHtml(projectSettings.projectType);
    const safeCameraBody = escapeHtml(projectSettings.cameraBody);
    
    // Base styles common to all templates
    const baseCss = `
        @media print {
            @page { margin: 0.5in; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
        .page-break { page-break-before: always; }
        .aspect-ratio-box { position: relative; width: 100%; background-color: #f3f4f6; border-bottom: 1px solid #e5e7eb; overflow: hidden; }
        .aspect-ratio-box::before { content: ""; display: block; padding-top: ${aspectRatioPadding}; }
        .aspect-ratio-box img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain; }
        .aspect-ratio-box .placeholder { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #9ca3af; }
    `;

    // Template-specific layouts
    let contentHtml = '';
    let templateCss = '';

    if (template === 'presentation_slides') {
        templateCss = `
            @media print {
                @page { size: landscape; margin: 0; }
            }
            .slide-container {
                width: 100vw;
                height: 100vh;
                display: flex;
                flex-direction: column;
                background-color: #000;
                color: #fff;
                page-break-after: always;
                position: relative;
            }
            .slide-image-wrapper {
                flex-grow: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 2rem;
                background-color: #000;
            }
            .slide-image-wrapper img {
                max-width: 100%;
                max-height: 80vh;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            }
            .slide-footer {
                height: 15vh;
                padding: 1.5rem 3rem;
                background-color: #111;
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                border-top: 1px solid #333;
            }
        `;
        contentHtml = shots.map(shot => `
            <div class="slide-container">
                <div class="slide-image-wrapper">
                     ${shot.generatedImage ? `<img src="${shot.generatedImage}" />` : `<div class="text-gray-500">No Image Generated</div>`}
                </div>
                <div class="slide-footer">
                    <div style="width: 70%;">
                        <h2 class="text-2xl font-bold mb-1" style="color: #FF6B35;">SHOT ${shot.shotNumber}</h2>
                        <p class="text-lg text-gray-300">${escapeHtml(shot.description || 'No description provided.')}</p>
                    </div>
                    <div class="text-right" style="width: 30%;">
                        <p class="text-sm font-mono text-gray-500 uppercase tracking-widest">Technicals</p>
                        <p class="text-md text-gray-300 font-mono">${shot.technicalData?.lens || 'N/A'} | ${shot.technicalData?.shotType || 'N/A'}</p>
                        <p class="text-md text-gray-300 font-mono">${shot.technicalData?.movement || 'N/A'}</p>
                    </div>
                </div>
            </div>
        `).join('');

    } else if (template === 'production_list') {
        templateCss = `
            .shot-row {
                display: grid;
                grid-template-columns: 200px 1fr 200px;
                gap: 1.5rem;
                border-bottom: 1px solid #e5e7eb;
                padding: 1rem 0;
                align-items: start;
            }
            .shot-row:last-child { border-bottom: none; }
            .tech-list { font-family: monospace; font-size: 0.75rem; color: #4b5563; }
            .tech-list p { margin-bottom: 0.25rem; }
            .tech-label { font-weight: bold; color: #1f2937; text-transform: uppercase; }
        `;
        contentHtml = `
            <div class="max-w-7xl mx-auto p-8">
                <div class="border-b-2 border-black pb-4 mb-6">
                    <h1 class="text-3xl font-bold uppercase tracking-wider mb-2">Shot List</h1>
                    <div class="flex justify-between items-end">
                        <div>
                            <p class="text-xl"><strong>Project:</strong> ${safeName}</p>
                            <p class="text-lg text-gray-600"><strong>Scene:</strong> ${scene.sceneNumber}. ${safeSlugline}</p>
                        </div>
                        <div class="text-right text-sm text-gray-500">
                             <p>Date: ${new Date().toLocaleDateString()}</p>
                             <p>Cam: ${safeCameraBody}</p>
                        </div>
                    </div>
                </div>
                <div>
                    ${shots.map(shot => `
                        <div class="shot-row page-break-inside-avoid">
                            <div class="aspect-ratio-box rounded border border-gray-200">
                                 ${shot.generatedImage ? `<img src="${shot.generatedImage}" />` : `<div class="placeholder">No Image</div>`}
                            </div>
                            <div>
                                <h3 class="font-bold text-xl mb-1">Shot ${shot.shotNumber}</h3>
                                <p class="text-gray-800 mb-2">${escapeHtml(shot.description || '')}</p>
                                ${shot.notes ? `<p class="text-sm text-gray-500 italic bg-gray-50 p-2 rounded">Note: ${escapeHtml(shot.notes)}</p>` : ''}
                            </div>
                            <div class="tech-list">
                                <p><span class="tech-label">Size:</span> ${shot.technicalData?.shotType || '-'}</p>
                                <p><span class="tech-label">Lens:</span> ${shot.technicalData?.lens || '-'}</p>
                                <p><span class="tech-label">Angle:</span> ${shot.parameters.cameraAngle || '-'}</p>
                                <p><span class="tech-label">Move:</span> ${shot.technicalData?.movement || '-'}</p>
                                <p><span class="tech-label">Support:</span> ${shot.technicalData?.support || '-'}</p>
                                <p><span class="tech-label">Focus:</span> ${shot.technicalData?.dof || '-'}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

    } else {
        // Default: Client Grid
        templateCss = `
            .shot-card {
                display: flex;
                flex-direction: column;
                border: 1px solid #e2e8f0;
                height: 100%;
                overflow: hidden;
                break-inside: avoid;
            }
            .shot-details {
                padding: 0.75rem;
                font-size: 0.8rem;
                flex-grow: 1;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
            }
            .grid-container {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 1rem;
            }
        `;
        contentHtml = `
            <div class="p-8">
                <header class="flex justify-between items-end mb-6 border-b pb-4">
                  <div>
                    <h1 class="text-2xl font-bold">${safeName}</h1>
                    <h2 class="text-lg text-gray-600">${scene.sceneNumber}. ${safeSlugline}</h2>
                  </div>
                  <div class="text-right text-xs text-gray-500">
                    <p>${safeProjectType}</p>
                    <p>Aspect Ratio: ${projectSettings.primaryAspectRatio}</p>
                  </div>
                </header>
                <main class="grid-container">
                  ${shots.map(shot => `
                    <div class="shot-card rounded-lg shadow-sm">
                      <div class="aspect-ratio-box">
                        ${shot.generatedImage ? `<img src="${shot.generatedImage}" />` : `<div class="placeholder">No Image</div>`}
                      </div>
                      <div class="shot-details">
                        <div>
                          <div class="flex justify-between items-baseline mb-1">
                             <h3 class="font-bold text-sm">Shot ${shot.shotNumber}</h3>
                             <span class="text-xs font-mono bg-gray-100 px-1 rounded text-gray-500">${shot.technicalData?.lens}</span>
                          </div>
                          <p class="mb-2 text-xs text-gray-700 leading-snug">${escapeHtml(shot.description || 'No description')}</p>
                        </div>
                        ${shot.notes ? `<p class="mt-2 text-[10px] italic text-gray-500 border-t pt-1">${escapeHtml(shot.notes)}</p>` : ''}
                      </div>
                    </div>
                  `).join('')}
                </main>
            </div>
        `;
    }

    return (
        `<!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Storyboard - ${safeName} - ${safeSlugline}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            ${baseCss}
            ${templateCss}
          </style>
        </head>
        <body class="${template === 'presentation_slides' ? 'bg-black' : 'bg-white text-gray-800'}">
          ${contentHtml}
        </body>
        </html>`
    );
};

export default PrintableStoryboard;

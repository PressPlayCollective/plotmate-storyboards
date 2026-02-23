import React, { useContext } from 'react';
import { ProjectContext } from '../context/ProjectContext';

const SaveStatusIndicator: React.FC = () => {
    const { saveStatus } = useContext(ProjectContext);

    if (!saveStatus) return null;
    
    const getStatusText = () => {
        switch(saveStatus) {
            case 'UNSAVED': return 'Unsaved changes';
            case 'SAVING': return 'Saving...';
            case 'SAVED': return 'All changes saved';
            default: return '';
        }
    };

    return (
        <div className="flex items-center gap-2" title={getStatusText()}>
            <div className={`w-2 h-2 rounded-full ${
                saveStatus === 'SAVED' ? 'bg-green-500' :
                saveStatus === 'SAVING' ? 'bg-yellow-500 animate-pulse' :
                'bg-gray-500'
            }`}></div>
            <span className="text-xs text-white/60 hidden sm:inline">{getStatusText()}</span>
        </div>
    );
};

export default SaveStatusIndicator;

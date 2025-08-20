import React, { useState } from 'react';
import axios from 'axios';
import { getApiUrl } from '@/config/apiConfig';

interface GeneratedImage {
    imageUrl: string;
}

interface ErrorResponse {
    message: string;
}

const TextToImagePanel: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);

    const handleGenerateImage = async () => {
        if (!prompt.trim()) {
            setError('Please enter a prompt');
            return;
        }

        try {
            setIsGenerating(true);
            setError(null);

            const response = await axios.post<{ imageUrl: string }>(getApiUrl('/api/images/generate-image'), {
                prompt: prompt.trim(),
            });

            setGeneratedImage({ imageUrl: response.data.imageUrl });
        } catch (err: any) {
            console.error('Failed to generate image:', err);
            setError(
                err?.response?.data?.message
                    ? err.response.data.message
                    : 'Failed to generate image. Please try again later.'
            );
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex flex-col space-y-4 p-4 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-semibold">Text to Image Generator</h2>
            <p className="text-sm text-gray-600">
                Describe the image you want to generate
            </p>

            <textarea
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the image you want to generate..."
                disabled={isGenerating}
            />

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
                className={`py-2 px-4 rounded-md ${isGenerating
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                onClick={handleGenerateImage}
                disabled={isGenerating}
            >
                {isGenerating ? 'Generating...' : 'Generate Image'}
            </button>

            {generatedImage && (
                <div className="mt-4">
                    <h3 className="text-lg font-medium mb-2">Generated Image</h3>
                    <div className="border border-gray-300 rounded-md overflow-hidden">
                        <img
                            src={generatedImage.imageUrl}
                            alt="Generated image"
                            className="w-full h-auto"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default TextToImagePanel; 
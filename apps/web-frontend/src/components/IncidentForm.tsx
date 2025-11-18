'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDropzone } from 'react-dropzone';
import { apsicAPI } from '@/lib/api';
import { IncidentType } from '@/types';
import toast from 'react-hot-toast';

const incidentSchema = z.object({
  text: z.string().min(10, 'Description must be at least 10 characters').max(5000),
  incident_type: z.enum(['auto', 'harassment', 'accident', 'cyber', 'infrastructure', 'medical', 'other']),
});

type IncidentFormData = z.infer<typeof incidentSchema>;

interface IncidentFormProps {
  walletAddress: string;
  onSuccess: (incidentId: string) => void;
}

export function IncidentForm({ walletAddress, onSuccess }: IncidentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ type: string; name: string; url: string }[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<IncidentFormData>({
    resolver: zodResolver(incidentSchema),
    defaultValues: {
      incident_type: 'auto',
    },
  });

  // File upload handling (mock URLs for now - in production would upload to S3/R2)
  const onDrop = (acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      const fileType = file.type.startsWith('image/')
        ? 'image'
        : file.type.startsWith('audio/')
        ? 'audio'
        : file.type.startsWith('video/')
        ? 'video'
        : 'other';

      if (fileType === 'other') {
        toast.error(`Unsupported file type: ${file.type}`);
        return;
      }

      // Mock URL (in production, upload to S3/R2 and get real URL)
      const mockUrl = `https://storage.example.com/${Date.now()}-${file.name}`;

      setUploadedFiles((prev) => [
        ...prev,
        {
          type: fileType,
          name: file.name,
          url: mockUrl,
        },
      ]);

      toast.success(`${file.name} ready for upload`);
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'audio/*': ['.mp3', '.wav', '.m4a'],
      'video/*': ['.mp4', '.mov', '.avi'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: IncidentFormData) => {
    setIsSubmitting(true);

    try {
      const imageUrls = uploadedFiles.filter((f) => f.type === 'image').map((f) => f.url);
      const audioUrls = uploadedFiles.filter((f) => f.type === 'audio').map((f) => f.url);
      const videoUrls = uploadedFiles.filter((f) => f.type === 'video').map((f) => f.url);

      const result = await apsicAPI.createIncident({
        text: data.text,
        incident_type: data.incident_type as IncidentType,
        image_urls: imageUrls.length > 0 ? imageUrls : undefined,
        audio_urls: audioUrls.length > 0 ? audioUrls : undefined,
        video_urls: videoUrls.length > 0 ? videoUrls : undefined,
        reporter_wallet: walletAddress,
      });

      toast.success('Incident submitted successfully!');
      onSuccess(result.incident_id);
      reset();
      setUploadedFiles([]);
    } catch (error: any) {
      console.error('Submission error:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to submit incident');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Incident Type */}
      <div>
        <label htmlFor="incident_type" className="block text-sm font-medium text-gray-700 mb-2">
          Incident Type
        </label>
        <select
          {...register('incident_type')}
          id="incident_type"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="auto">🤖 Auto-detect</option>
          <option value="harassment">😟 Harassment</option>
          <option value="accident">🚑 Accident</option>
          <option value="cyber">💻 Cyber Incident</option>
          <option value="infrastructure">🏗️ Infrastructure</option>
          <option value="medical">⚕️ Medical</option>
          <option value="other">📋 Other</option>
        </select>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
          Incident Description *
        </label>
        <textarea
          {...register('text')}
          id="text"
          rows={6}
          placeholder="Describe the incident in detail. Include what happened, when, where, and who was involved..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
        />
        {errors.text && <p className="mt-1 text-sm text-red-600">{errors.text.message}</p>}
      </div>

      {/* File Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Attachments (Optional)
        </label>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
          }`}
        >
          <input {...getInputProps()} />
          <div className="text-4xl mb-3">📎</div>
          {isDragActive ? (
            <p className="text-primary-600 font-medium">Drop files here...</p>
          ) : (
            <>
              <p className="text-gray-700 font-medium mb-1">
                Drag & drop files here, or click to select
              </p>
              <p className="text-sm text-gray-500">
                Images, audio, or video (max 50MB per file)
              </p>
            </>
          )}
        </div>

        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">
                    {file.type === 'image' ? '🖼️' : file.type === 'audio' ? '🎵' : '🎥'}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{file.type}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="text-red-600 hover:text-red-700 font-medium text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-6 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 text-white font-semibold rounded-lg shadow-md hover:from-primary-700 hover:to-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center">
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Processing...
          </span>
        ) : (
          '🚀 Submit Incident'
        )}
      </button>
    </form>
  );
}

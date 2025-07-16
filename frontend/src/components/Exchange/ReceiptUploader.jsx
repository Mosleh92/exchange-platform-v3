import React, { useState, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import './ReceiptUploader.css';

/**
 * Comprehensive Receipt Uploader Component
 * Features: Drag & Drop, Multiple Files, Image Preview, Progress Tracking
 */
const ReceiptUploader = ({ 
  transactionId, 
  onUploadComplete, 
  onUploadError,
  maxFiles = 5,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
}) => {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [dragActive, setDragActive] = useState(false);
  const [errors, setErrors] = useState([]);
  
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // Validate file
  const validateFile = (file) => {
    const errors = [];

    // Check file size
    if (file.size > maxFileSize) {
      errors.push(`${file.name} is too large. Maximum size is ${maxFileSize / 1024 / 1024}MB`);
    }

    // Check file type
    if (!acceptedTypes.includes(file.type)) {
      errors.push(`${file.name} is not a supported file type`);
    }

    // Check if file already exists
    if (files.some(f => f.name === file.name && f.size === file.size)) {
      errors.push(`${file.name} is already selected`);
    }

    return errors;
  };

  // Handle file selection
  const handleFileSelect = useCallback((selectedFiles) => {
    const newFiles = Array.from(selectedFiles);
    const newErrors = [];

    // Validate each file
    newFiles.forEach(file => {
      const fileErrors = validateFile(file);
      newErrors.push(...fileErrors);
    });

    // Filter out invalid files
    const validFiles = newFiles.filter(file => {
      const fileErrors = validateFile(file);
      return fileErrors.length === 0;
    });

    // Check total file count
    if (files.length + validFiles.length > maxFiles) {
      newErrors.push(`Maximum ${maxFiles} files allowed`);
    } else {
      setFiles(prev => [...prev, ...validFiles]);
    }

    setErrors(newErrors);
  }, [files, maxFiles, maxFileSize, acceptedTypes]);

  // Handle drag events
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true);
    }
  }, []);

  const handleDragOut = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  // Upload file
  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('receipt', file);
    formData.append('transactionId', transactionId);
    formData.append('description', file.name);

    try {
      const response = await fetch('/api/transactions/receipts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'x-tenant-id': currentTenant._id
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }
  };

  // Upload all files
  const uploadAllFiles = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress({});
    setErrors([]);

    const uploadPromises = files.map(async (file, index) => {
      try {
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: 0
        }));

        // Simulate progress (in real implementation, use XMLHttpRequest or fetch with progress)
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: Math.min(prev[file.name] + 10, 90)
          }));
        }, 200);

        const result = await uploadFile(file);

        clearInterval(progressInterval);
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: 100
        }));

        return { file, result, success: true };
      } catch (error) {
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: -1
        }));
        return { file, error: error.message, success: false };
      }
    });

    try {
      const results = await Promise.all(uploadPromises);
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      if (successful.length > 0) {
        onUploadComplete?.(successful);
        setFiles([]);
      }

      if (failed.length > 0) {
        const errorMessages = failed.map(r => `${r.file.name}: ${r.error}`);
        setErrors(errorMessages);
        onUploadError?.(failed);
      }
    } catch (error) {
      setErrors([`Upload failed: ${error.message}`]);
      onUploadError?.([{ error: error.message }]);
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  };

  // Remove file
  const removeFile = (fileToRemove) => {
    setFiles(prev => prev.filter(file => file !== fileToRemove));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileToRemove.name];
      return newProgress;
    });
  };

  // Get file preview
  const getFilePreview = (file) => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return null;
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="receipt-uploader">
      {/* Drop Zone */}
      <div
        ref={dropZoneRef}
        className={`upload-dropzone ${dragActive ? 'drag-active' : ''} ${uploading ? 'uploading' : ''}`}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="dropzone-content">
          <div className="dropzone-icon">
            📄
          </div>
          <h3>Upload Receipts</h3>
          <p>Drag and drop files here, or click to select files</p>
          <p className="file-info">
            Supported formats: JPEG, PNG, GIF, PDF (Max: {maxFileSize / 1024 / 1024}MB)
          </p>
          
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            Select Files
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedTypes.join(',')}
            onChange={(e) => handleFileSelect(e.target.files)}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="upload-errors">
          {errors.map((error, index) => (
            <div key={index} className="error-message">
              ⚠️ {error}
            </div>
          ))}
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="file-list">
          <div className="file-list-header">
            <h4>Selected Files ({files.length}/{maxFiles})</h4>
            <button
              type="button"
              className="btn btn-success"
              onClick={uploadAllFiles}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload All'}
            </button>
          </div>

          <div className="file-items">
            {files.map((file, index) => (
              <div key={index} className="file-item">
                <div className="file-preview">
                  {getFilePreview(file) ? (
                    <img 
                      src={getFilePreview(file)} 
                      alt={file.name}
                      className="file-image"
                    />
                  ) : (
                    <div className="file-icon">
                      📄
                    </div>
                  )}
                </div>

                <div className="file-info">
                  <div className="file-name">{file.name}</div>
                  <div className="file-size">{formatFileSize(file.size)}</div>
                  <div className="file-type">{file.type}</div>
                </div>

                <div className="file-actions">
                  {uploadProgress[file.name] !== undefined && (
                    <div className="upload-progress">
                      {uploadProgress[file.name] === -1 ? (
                        <span className="upload-error">❌ Failed</span>
                      ) : uploadProgress[file.name] === 100 ? (
                        <span className="upload-success">✅ Complete</span>
                      ) : (
                        <div className="progress-bar">
                          <div 
                            className="progress-fill"
                            style={{ width: `${uploadProgress[file.name]}%` }}
                          />
                          <span className="progress-text">
                            {uploadProgress[file.name]}%
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => removeFile(file)}
                    disabled={uploading}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="upload-progress-overall">
          <div className="progress-info">
            <span>Uploading files...</span>
            <span>
              {Object.values(uploadProgress).filter(p => p === 100).length} / {files.length} complete
            </span>
          </div>
          <div className="overall-progress-bar">
            <div 
              className="overall-progress-fill"
              style={{ 
                width: `${(Object.values(uploadProgress).filter(p => p === 100).length / files.length) * 100}%` 
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptUploader; 
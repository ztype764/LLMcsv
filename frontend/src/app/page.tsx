'use client';

import React, { useState, useEffect } from 'react';
import DragDropZone from '../components/DragDropZone';
import CsvPreviewTable from '../components/CsvPreviewTable';
import ResultTable, { ProcessingResult } from '../components/ResultTable';

type StepType = 'upload' | 'processing' | 'results';

interface ProgressType {
  current: number;
  total: number;
  batchIndex: number;
  totalBatches: number;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<StepType>('upload');
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [progress, setProgress] = useState<ProgressType>({
    current: 0,
    total: 0,
    batchIndex: 0,
    totalBatches: 0,
  });
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light';
    const preference = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const initialTheme = savedTheme || preference || 'dark';
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const handleFileSelect = (selectedFile: File | null) => {
    setFile(selectedFile);
    setError(null);
    setResults([]);
    setProgress({ current: 0, total: 0, batchIndex: 0, totalBatches: 0 });
  };

  const handleImport = async () => {
    if (!file) return;

    setStep('processing');
    setError(null);
    setResults([]);

    const formData = new FormData();
    formData.append('file', file);

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    try {
      const response = await fetch(`${apiBaseUrl}/api/import`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No body reader available');
      }

      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Preserve the last unfinished line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.substring(6).trim();
            if (dataStr) {
              try {
                const event = JSON.parse(dataStr);

                if (event.type === 'batch') {
                  setResults((prev) => [...prev, ...event.records]);
                  setProgress(event.progress);
                } else if (event.type === 'complete') {
                  setStep('results');
                } else if (event.type === 'error') {
                  setError(event.message);
                  setStep('upload');
                }
              } catch (err) {
                console.error('Failed to parse SSE event JSON:', err, 'Line content:', dataStr);
              }
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Import error:', err);
      setError(err.message || 'An unexpected error occurred during import.');
      setStep('upload');
    }
  };

  const resetImporter = () => {
    setFile(null);
    setStep('upload');
    setResults([]);
    setProgress({ current: 0, total: 0, batchIndex: 0, totalBatches: 0 });
    setError(null);
  };

  const progressPercent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <main style={{ minHeight: '100vh', padding: '3rem 1.5rem' }}>
      <div style={{ maxWidth: '1750px', margin: '0 auto' }}>
        {/* Top bar with Theme Toggle */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button
            onClick={toggleTheme}
            style={{
              padding: '0.5rem',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              transition: 'var(--transition)',
              boxShadow: 'var(--shadow)',
            }}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            )}
          </button>
        </div>

        {/* Header Section */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div
            style={{
              display: 'inline-flex',
              padding: '0.5rem 1rem',
              borderRadius: '50px',
              background: 'var(--primary-glow)',
              color: 'var(--primary)',
              fontSize: '0.8rem',
              fontWeight: 600,
              fontFamily: 'var(--font-title)',
              marginBottom: '1rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            ✦ GrowEasy CRM Intelligent System
          </div>
          <h1
            style={{
              fontSize: '3rem',
              fontWeight: 800,
              marginBottom: '0.5rem',
            }}
          >
            AI-Powered <span className="gradient-text">CSV Importer</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
            Upload leads from any marketing platform, Excel export, or custom list. Our LLM automatically maps and formats them for your CRM.
          </p>
        </div>

        {/* Global Error Display */}
        {error && (
          <div
            className="animate-fade-in"
            style={{
              background: 'var(--danger-glow)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem 1.5rem',
              marginBottom: '2rem',
              color: 'var(--danger)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div style={{ flexGrow: 1, fontSize: '0.9rem', fontWeight: 500 }}>{error}</div>
            <button
              onClick={() => setError(null)}
              style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Step 1: Upload & Preview */}
        {step === 'upload' && (
          <div className="glass-card animate-fade-in">
            <DragDropZone onFileSelect={handleFileSelect} selectedFile={file} />

            {file && <CsvPreviewTable file={file} />}

            {file && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginTop: '2rem',
                  paddingTop: '1.5rem',
                  borderTop: '1px solid var(--border-color)',
                }}
              >
                <button className="btn btn-primary" onClick={handleImport}>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 11 12 14 22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                  Confirm Import
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Processing Live Stream */}
        {step === 'processing' && (
          <div className="glass-card animate-fade-in" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--primary-glow)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
                marginBottom: '2rem',
                position: 'relative',
              }}
            >
              {/* Spinner animation */}
              <div
                style={{
                  position: 'absolute',
                  inset: '-4px',
                  borderRadius: '50%',
                  border: '3px solid transparent',
                  borderTopColor: 'var(--primary)',
                  animation: 'spin 1.5s linear infinite',
                }}
              />
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>

            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>AI Mapping in Progress</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '2.5rem' }}>
              Our language model is cleaning and aligning columns to your CRM schema...
            </p>

            {/* Progress Bar */}
            <div style={{ maxWidth: '500px', margin: '0 auto 1.5rem auto' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '0.5rem',
                  fontWeight: 500,
                }}
              >
                <span>
                  Batch {progress.batchIndex} of {progress.totalBatches}
                </span>
                <span>{progressPercent}% Complete</span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '10px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: '50px',
                  overflow: 'hidden',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${progressPercent}%`,
                    background: 'linear-gradient(90deg, #8b5cf6 0%, #3b82f6 100%)',
                    borderRadius: '50px',
                    transition: 'width 0.3s ease-out',
                    boxShadow: '0 0 8px var(--primary)',
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  marginTop: '0.75rem',
                }}
              >
                Processed {progress.current} of {progress.total} raw leads
              </div>
            </div>

            {/* Incremental Live Table showing mapped records in real time */}
            {results.length > 0 && (
              <div style={{ marginTop: '3rem', textAlign: 'left' }}>
                <h4 style={{ fontFamily: 'var(--font-title)', color: 'var(--text-primary)', marginBottom: '1rem' }}>
                  Streaming Mapped Leads ({results.length} records processed)
                </h4>
                <ResultTable results={results} />
              </div>
            )}
          </div>
        )}

        {/* Step 3: Complete Results */}
        {step === 'results' && (
          <div className="glass-card animate-fade-in">
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '1.5rem',
                marginBottom: '1.5rem',
                gap: '1rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)' }}>
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <h2 style={{ fontSize: '1.75rem', color: 'var(--text-primary)' }}>Import Complete</h2>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  Leads have been parsed and structured into GrowEasy format.
                </p>
              </div>
              <button className="btn btn-secondary" onClick={resetImporter}>
                Import Another File
              </button>
            </div>

            <ResultTable results={results} />
          </div>
        )}
      </div>

      {/* Embedded Animations and Keyframes */}
      <style jsx global>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </main>
  );
}

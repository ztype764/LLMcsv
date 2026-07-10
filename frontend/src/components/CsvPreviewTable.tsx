'use client';

import React, { useEffect, useState } from 'react';
import Papa from 'papaparse';
import styles from './CsvPreviewTable.module.css';

interface CsvPreviewTableProps {
  file: File;
}

export default function CsvPreviewTable({ file }: CsvPreviewTableProps) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<any[][]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);

  const [visibleCount, setVisibleCount] = useState<number>(10);

  useEffect(() => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setVisibleCount(10); // Reset for new files

    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          const rawHeaders = results.data[0] as string[];
          const rawRows = results.data.slice(1) as any[][];

          setHeaders(rawHeaders);
          setRows(rawRows);
          setTotalCount(rawRows.length);
        } else {
          setError('No data found in CSV file.');
        }
        setLoading(false);
      },
      error: (err) => {
        setError(`Failed to parse CSV file: ${err.message}`);
        setLoading(false);
      },
    });
  }, [file]);

  if (loading) {
    return <div className={styles.note}>Parsing CSV file details...</div>;
  }

  if (error) {
    return <div className={styles.note} style={{ color: 'var(--danger)' }}>{error}</div>;
  }

  return (
    <div className="animate-fade-in" style={{ marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h4 style={{ fontFamily: 'var(--font-title)', color: 'var(--text-primary)' }}>
          Raw Data Preview (Showing {Math.min(visibleCount, rows.length)} of {rows.length} Rows)
        </h4>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Rows: {totalCount}</span>
      </div>
      
      <div className={styles.container}>
        <table className={styles.table}>
          <thead>
            <tr>
              {headers.map((header, index) => (
                <th key={index} className={styles.th}>
                  {header || `Column ${index + 1}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, visibleCount).map((row, rowIndex) => (
              <tr key={rowIndex} className={styles.tr}>
                {headers.map((_, colIndex) => (
                  <td key={colIndex} className={styles.td} title={String(row[colIndex] || '')}>
                    {String(row[colIndex] === undefined ? '' : row[colIndex])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', marginBottom: '0.75rem', justifyContent: 'center' }}>
        <button
          className="btn btn-secondary"
          onClick={() => setVisibleCount((prev) => Math.min(rows.length, prev + 10))}
          disabled={visibleCount >= rows.length}
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderRadius: 'var(--radius-sm)' }}
        >
          View More (+10 Rows)
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => setVisibleCount((prev) => Math.max(10, prev - 10))}
          disabled={visibleCount <= 10}
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderRadius: 'var(--radius-sm)' }}
        >
          View Less (-10 Rows)
        </button>
      </div>
      <div className={styles.note}>
        * This is a local client preview. No AI mapping has run yet. Verify column alignments and click &quot;Confirm Import&quot; below.
      </div>
    </div>
  );
}

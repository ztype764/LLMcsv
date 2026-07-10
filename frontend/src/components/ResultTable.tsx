'use client';

import React, { useState } from 'react';
import styles from './ResultTable.module.css';

interface CrmLeadRecord {
  created_at?: string;
  name?: string;
  email?: string;
  country_code?: string;
  mobile_without_country_code?: string;
  company?: string;
  city?: string;
  state?: string;
  country?: string;
  lead_owner?: string;
  crm_status?: string;
  crm_note?: string;
  data_source?: string;
  possession_time?: string;
  description?: string;
}

export interface ProcessingResult {
  status: 'success' | 'skipped';
  skip_reason: string | null;
  data: Partial<CrmLeadRecord> & { original_row: number };
}

interface ResultTableProps {
  results: ProcessingResult[];
}

type TabType = 'all' | 'success' | 'skipped';

export default function ResultTable({ results }: ResultTableProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate statistics
  const totalRecords = results.length;
  const successCount = results.filter((r) => r.status === 'success').length;
  const skippedCount = results.filter((r) => r.status === 'skipped').length;
  const successRate = totalRecords > 0 ? Math.round((successCount / totalRecords) * 100) : 0;

  // Filter records based on tab and search query
  const filteredResults = results.filter((record) => {
    // 1. Tab filter
    if (activeTab === 'success' && record.status !== 'success') return false;
    if (activeTab === 'skipped' && record.status !== 'skipped') return false;

    // 2. Search query filter
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const name = (record.data.name || '').toLowerCase();
    const email = (record.data.email || '').toLowerCase();
    const mobile = (record.data.mobile_without_country_code || '').toString().toLowerCase();
    const notes = (record.data.crm_note || '').toLowerCase();
    const source = (record.data.data_source || '').toLowerCase();

    return (
      name.includes(query) ||
      email.includes(query) ||
      mobile.includes(query) ||
      notes.includes(query) ||
      source.includes(query)
    );
  });

  return (
    <div className="animate-fade-in" style={{ marginTop: '2rem' }}>
      {/* Stats Cards */}
      <div className={styles.statsContainer}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Parsed</span>
          <span className={styles.statValue}>{totalRecords}</span>
        </div>
        <div className={styles.statCard} style={{ borderLeft: '3px solid var(--success)' }}>
          <span className={styles.statLabel}>Successfully Imported</span>
          <span className={styles.statValue} style={{ color: 'var(--success)' }}>
            {successCount}
          </span>
        </div>
        <div className={styles.statCard} style={{ borderLeft: '3px solid var(--danger)' }}>
          <span className={styles.statLabel}>Skipped Records</span>
          <span className={styles.statValue} style={{ color: 'var(--danger)' }}>
            {skippedCount}
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>AI Conversion Rate</span>
          <span className={styles.statValue}>{successRate}%</span>
        </div>
      </div>

      {/* Controls Bar */}
      <div className={styles.controlsRow}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'all' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Leads ({totalRecords})
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'success' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('success')}
          >
            Imported ({successCount})
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'skipped' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('skipped')}
          >
            Skipped ({skippedCount})
          </button>
        </div>

        <input
          type="text"
          className={styles.search}
          placeholder="Search by name, email, phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Results Table */}
      <div className={styles.tableContainer}>
        {filteredResults.length === 0 ? (
          <div className={styles.emptyState}>No records match the current filters.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Row #</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Name</th>
                <th className={styles.th}>Email</th>
                <th className={styles.th}>Mobile</th>
                <th className={styles.th}>CRM Status</th>
                <th className={styles.th}>Data Source</th>
                <th className={styles.th}>CRM Note / Skip Reason</th>
                <th className={styles.th}>Company</th>
                <th className={styles.th}>City/State</th>
                <th className={styles.th}>Possession Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((record, index) => {
                const isSuccess = record.status === 'success';
                const d = record.data;
                return (
                  <tr
                    key={index}
                    className={`${styles.tr} ${!isSuccess ? styles.trSkipped : ''}`}
                  >
                    <td className={styles.td} style={{ fontWeight: 600 }}>
                      {d.original_row}
                    </td>
                    <td className={styles.td}>
                      <span
                        className={`${styles.badge} ${
                          isSuccess ? styles.badgeSuccess : styles.badgeSkipped
                        }`}
                      >
                        {record.status}
                      </span>
                    </td>
                    <td className={styles.td} style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                      {d.name || <span style={{ color: 'var(--text-muted)' }}>-</span>}
                    </td>
                    <td className={styles.td} title={d.email}>
                      {d.email || <span style={{ color: 'var(--text-muted)' }}>-</span>}
                    </td>
                    <td className={styles.td}>
                      {d.country_code ? `${d.country_code} ` : ''}
                      {d.mobile_without_country_code || <span style={{ color: 'var(--text-muted)' }}>-</span>}
                    </td>
                    <td className={styles.td}>
                      {isSuccess && d.crm_status ? (
                        <span className={`${styles.badge} ${styles.badgeStatus}`}>
                          {d.crm_status}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className={styles.td}>
                      {d.data_source ? (
                        <span style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>
                          {d.data_source}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                    <td className={styles.td} style={{ maxWidth: '300px' }}>
                      {isSuccess ? (
                        <span title={d.crm_note}>{d.crm_note || <span style={{ color: 'var(--text-muted)' }}>-</span>}</span>
                      ) : (
                        <span className={styles.reason} title={record.skip_reason || ''}>
                          {record.skip_reason}
                        </span>
                      )}
                    </td>
                    <td className={styles.td}>{d.company || <span style={{ color: 'var(--text-muted)' }}>-</span>}</td>
                    <td className={styles.td}>
                      {d.city || d.state ? (
                        <span>
                          {d.city}
                          {d.city && d.state ? ', ' : ''}
                          {d.state}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                    <td className={styles.td}>{d.possession_time || <span style={{ color: 'var(--text-muted)' }}>-</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

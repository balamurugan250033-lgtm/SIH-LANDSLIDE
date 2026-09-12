import { useState } from 'react';
import { updateReportStatus, deleteReport } from '../api';
import { CheckCircle2, Clock, XCircle, AlertTriangle, Image as ImageIcon, MapPin, Trash2, Filter } from 'lucide-react';

const STATUS_CONFIG = {
  Submitted: { bg: '#EFF6FF', color: '#2563EB', label: 'New / Submitted', icon: Clock },
  'Under Review': { bg: '#FEF3C7', color: '#D97706', label: 'Under Review', icon: AlertTriangle },
  Validated: { bg: '#DCFCE7', color: '#16A34A', label: 'Validated / Verified', icon: CheckCircle2 },
  Rejected: { bg: '#FEE2E2', color: '#DC2626', label: 'Rejected / Dismissed', icon: XCircle },
};

function formatTime(val) {
  if (!val || Number.isNaN(Date.parse(val))) return 'Just now';
  return new Date(val).toLocaleString();
}

export default function ReportManagement({ reports = [], regions = [], onRefresh, token }) {
  const [filterRegion, setFilterRegion] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const filteredReports = reports.filter(r => {
    if (filterRegion !== 'ALL' && String(r.region_id) !== String(filterRegion)) return false;
    if (filterStatus !== 'ALL' && (r.status || 'Submitted') !== filterStatus) return false;
    return true;
  });

  const handleStatusChange = async (reportId, newStatus) => {
    setActionLoading(reportId);
    try {
      await updateReportStatus(reportId, newStatus, token);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || 'Failed to update report status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this citizen report?')) return;
    setActionLoading(reportId);
    try {
      await deleteReport(reportId, token);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || 'Failed to delete report');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Citizen Hazard Reports</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '4px 0 0' }}>
            Live crowd-sourced ground verification and incident reports from affected communities.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #E2E8F0', padding: '6px 12px', borderRadius: '8px' }}>
            <Filter size={16} color="#64748B" />
            <select
              value={filterRegion}
              onChange={e => setFilterRegion(e.target.value)}
              style={{ border: 'none', background: 'transparent', fontSize: '0.85rem', outline: 'none' }}
            >
              <option value="ALL">All Regions ({reports.length})</option>
              {regions.map(reg => (
                <option key={reg.region_id || reg.id} value={reg.region_id || reg.id}>
                  {reg.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #E2E8F0', padding: '6px 12px', borderRadius: '8px' }}>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{ border: 'none', background: 'transparent', fontSize: '0.85rem', outline: 'none' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="Submitted">Submitted</option>
              <option value="Under Review">Under Review</option>
              <option value="Validated">Validated</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {filteredReports.length === 0 ? (
        <div className="table-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📋</div>
          <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>No citizen reports found</h3>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            {reports.length === 0
              ? 'When citizens submit ground observations or photos from the Citizen Portal or Mobile App, they will appear here in real time.'
              : 'No reports match your current region and status filters.'}
          </p>
        </div>
      ) : (
        <div className="table-panel">
          <table className="data-table">
            <thead>
              <tr>
                <th>Report ID</th>
                <th>Region</th>
                <th>Hazard Category</th>
                <th>Description</th>
                <th>Evidence / Location</th>
                <th>Status</th>
                <th>Timestamp</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map(report => {
                const statusKey = report.status || 'Submitted';
                const statusMeta = STATUS_CONFIG[statusKey] || STATUS_CONFIG['Submitted'];
                const region = regions.find(r => r.region_id === report.region_id || r.id === report.region_id);
                const hazards = report.hazard_types?.length ? report.hazard_types : (report.hazard_type ? report.hazard_type.split(', ') : ['General']);

                return (
                  <tr key={report.id}>
                    <td style={{ fontWeight: 700, color: 'var(--primary-color)' }}>
                      #REP-{report.id}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {region ? region.name : report.region_name || `Region #${report.region_id}`}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {hazards.map((h, i) => (
                          <span
                            key={i}
                            style={{
                              background: '#F1F5F9',
                              color: '#334155',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            {h}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ maxWidth: 280 }}>
                      <div style={{ fontSize: '0.85rem', color: '#1E293B', lineHeight: '1.4' }}>
                        {report.description}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {report.photo_url || report.media_path ? (
                          <button
                            onClick={() => setSelectedPhoto(report.photo_url || report.media_path)}
                            style={{
                              background: '#EFF6FF',
                              border: '1px solid #BFDBFE',
                              color: '#2563EB',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <ImageIcon size={13} /> View Photo
                          </button>
                        ) : null}

                        {report.latitude && report.longitude ? (
                          <a
                            href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              background: '#F8FAFC',
                              border: '1px solid #E2E8F0',
                              color: '#64748B',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              textDecoration: 'none',
                            }}
                          >
                            <MapPin size={13} /> GPS
                          </a>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: statusMeta.bg,
                          color: statusMeta.color,
                          border: `1px solid ${statusMeta.color}33`,
                          fontWeight: 700,
                          fontSize: '0.78rem',
                        }}
                      >
                        {statusMeta.label}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {formatTime(report.timestamp)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {statusKey !== 'Validated' && (
                          <button
                            onClick={() => handleStatusChange(report.id, 'Validated')}
                            disabled={actionLoading === report.id}
                            style={{
                              background: '#DCFCE7',
                              border: '1px solid #86EFAC',
                              color: '#166534',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                            title="Verify and validate this report"
                          >
                            Validate
                          </button>
                        )}

                        {statusKey === 'Submitted' && (
                          <button
                            onClick={() => handleStatusChange(report.id, 'Under Review')}
                            disabled={actionLoading === report.id}
                            style={{
                              background: '#FEF3C7',
                              border: '1px solid #FDE68A',
                              color: '#92400E',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                            title="Mark as under operator review"
                          >
                            Review
                          </button>
                        )}

                        {statusKey !== 'Rejected' && (
                          <button
                            onClick={() => handleStatusChange(report.id, 'Rejected')}
                            disabled={actionLoading === report.id}
                            style={{
                              background: '#FEE2E2',
                              border: '1px solid #FECACA',
                              color: '#991B1B',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                            title="Reject report as false alarm or duplicate"
                          >
                            Reject
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(report.id)}
                          disabled={actionLoading === report.id}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94A3B8',
                            cursor: 'pointer',
                            padding: '4px',
                          }}
                          title="Delete report"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '2rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '12px',
              overflow: 'hidden',
              maxWidth: '90vw',
              maxHeight: '90vh',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #E2E8F0' }}>
              <span style={{ fontWeight: 600 }}>Ground Evidence Photo</span>
              <button onClick={() => setSelectedPhoto(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            <img src={selectedPhoto} alt="Evidence" style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain', display: 'block' }} />
          </div>
        </div>
      )}
    </div>
  );
}


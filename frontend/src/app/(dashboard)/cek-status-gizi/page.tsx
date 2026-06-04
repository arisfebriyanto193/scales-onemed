'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface StatusGizi {
  id: number; child_id: number; nama_anak: string;
  jenis_kelamin: string; wilayah: string;
  tanggal_kunjungan: string; usia_bulan: number;
  berat_badan: number; tinggi_badan: number;
  status_bb_umur: string; status_tb_umur: string;
  status_keseluruhan: string; is_stunting: number; is_wasting: number;
}

function badgeStatus(status: string) {
  const map: Record<string, string> = {
    'Gizi Baik/Normal' : 'badge-normal',
    'Berat Badan Normal': 'badge-normal',
    'Tinggi Normal'    : 'badge-normal',
    'Kurang Gizi'      : 'badge-kurang',
    'Pendek'           : 'badge-kurang',
    'Gizi Buruk'       : 'badge-buruk',
    'Sangat Pendek'    : 'badge-buruk',
    'Gizi Lebih'       : 'badge-lebih',
    'Tinggi'           : 'badge-lebih',
  };
  return map[status] || 'badge-normal';
}

export default function CekStatusGiziPage() {
  const [data, setData]         = useState<StatusGizi[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStunting, setFilterStunting] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = '/nutritional-status?';
      if (filterStatus) url += `status_keseluruhan=${filterStatus}&`;
      if (filterStunting !== '') url += `is_stunting=${filterStunting}&`;
      const res = await api.get(url);
      setData(res.data.data);
    } catch { setData([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const recalculate = async (measurementId: number) => {
    try {
      await api.post(`/nutritional-status/calculate/${measurementId}`);
      fetchData();
      alert('Status gizi berhasil dihitung ulang!');
    } catch { alert('Gagal menghitung ulang.'); }
  };

  const stuntingCount = data.filter(d => d.is_stunting).length;
  const normalCount   = data.filter(d => d.status_keseluruhan === 'Gizi Baik/Normal').length;
  const kurangCount   = data.filter(d => d.status_keseluruhan === 'Kurang Gizi').length;

  return (
    <div>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '20px', color: '#1e293b' }}>Cek Status Gizi</h1>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Total Data', value: data.length, icon: '📋', bg: '#eff6ff', ib: '#dbeafe' },
          { label: 'Gizi Normal', value: normalCount, icon: '✅', bg: '#f0fdf4', ib: '#bbf7d0' },
          { label: 'Kurang Gizi', value: kurangCount, icon: '⚠️', bg: '#fff7ed', ib: '#fed7aa' },
          { label: 'Stunting', value: stuntingCount, icon: '🔴', bg: '#fef2f2', ib: '#fecaca' },
        ].map(c => (
          <div key={c.label} className="stat-card" style={{ background: c.bg, padding: '16px' }}>
            <div className="stat-icon" style={{ background: c.ib, width: '40px', height: '40px', fontSize: '1.1rem' }}>{c.icon}</div>
            <div>
              <p style={{ fontSize: '0.72rem', color: '#64748b' }}>{c.label}</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{loading ? '...' : c.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        {/* Filter bar */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="input-penting" style={{ maxWidth: '200px' }}
            value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Semua Status</option>
            <option value="Gizi Baik/Normal">Gizi Baik/Normal</option>
            <option value="Kurang Gizi">Kurang Gizi</option>
            <option value="Gizi Lebih">Gizi Lebih</option>
          </select>
          <select className="input-penting" style={{ maxWidth: '180px' }}
            value={filterStunting} onChange={e => setFilterStunting(e.target.value)}>
            <option value="">Semua</option>
            <option value="1">Stunting</option>
            <option value="0">Tidak Stunting</option>
          </select>
          <button className="btn-primary" onClick={fetchData}>🔍 Filter</button>
          <button className="btn-secondary" onClick={() => { setFilterStatus(''); setFilterStunting(''); setTimeout(fetchData, 50); }}>
            ↺ Reset
          </button>
          <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#64748b' }}>
            Menampilkan <strong>{data.length}</strong> data
          </span>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="table-penting">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nama Anak</th>
                <th>Wilayah</th>
                <th>Status Gizi<br /><span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '0.75rem' }}>Berat Badan/Umur</span></th>
                <th>Status Gizi<br /><span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '0.75rem' }}>Tinggi Badan/Umur</span></th>
                <th>Status Gizi<br /><span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '0.75rem' }}>Keseluruhan</span></th>
                <th>Stunting</th>
                <th>BB / TB</th>
                <th>Usia</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Memuat data...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  Tidak ada data. Tambahkan pengukuran anak terlebih dahulu.
                </td></tr>
              ) : data.map((d) => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 600, color: '#64748b' }}>{d.child_id}</td>
                  <td style={{ fontWeight: 600 }}>{d.nama_anak}</td>
                  <td>
                    {d.wilayah ? (
                      <span style={{ color: '#2563eb', textDecoration: 'underline', cursor: 'default' }}>{d.wilayah}</span>
                    ) : '-'}
                  </td>
                  <td><span className={`badge ${badgeStatus(d.status_bb_umur)}`}>{d.status_bb_umur}</span></td>
                  <td><span className={`badge ${badgeStatus(d.status_tb_umur)}`}>{d.status_tb_umur}</span></td>
                  <td>
                    <span className={`badge ${badgeStatus(d.status_keseluruhan)}`} style={{ fontWeight: 700 }}>
                      {d.status_keseluruhan}
                    </span>
                  </td>
                  <td>
                    {d.is_stunting ? (
                      <span className="badge badge-buruk">⚠️ Stunting</span>
                    ) : (
                      <span className="badge badge-normal">✓ Normal</span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                    <span style={{ color: '#2563eb' }}>{d.berat_badan} kg</span>
                    {' / '}
                    <span style={{ color: '#0891b2' }}>{d.tinggi_badan} cm</span>
                  </td>
                  <td style={{ fontSize: '0.82rem' }}>
                    {Math.floor(d.usia_bulan / 12)} thn {d.usia_bulan % 12} bln
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div style={{ marginTop: '16px', padding: '12px 16px', background: '#f8fafc', borderRadius: '8px', fontSize: '0.78rem', color: '#64748b' }}>
          <strong>Keterangan klasifikasi WHO:</strong>&nbsp;
          <span className="badge badge-normal" style={{ marginRight: 6 }}>Normal</span>
          <span className="badge badge-kurang" style={{ marginRight: 6 }}>Kurang Gizi / Pendek</span>
          <span className="badge badge-buruk"  style={{ marginRight: 6 }}>Gizi Buruk / Sangat Pendek</span>
          <span className="badge badge-lebih"  style={{ marginRight: 6 }}>Gizi Lebih / Tinggi</span>
          <span className="badge badge-stunting">⚠️ Stunting (TB/U &lt; -2SD)</span>
        </div>
      </div>
    </div>
  );
}

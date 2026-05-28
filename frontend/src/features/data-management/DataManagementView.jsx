import React, { useState, useRef } from 'react';
import {
  UploadCloud, Link2, Plus, FileText, FileSpreadsheet, CheckCircle2, Trash2, AlertTriangle
} from 'lucide-react';
import { toDisplayDate } from '../../lib/utils.js';

export const DataManagementView = ({ sources, onUploadFiles, onDeleteSource, onConnectGSheet, onDisconnectGSheet, gsheetConnections, uploading, syncing }) => {
  const [itemToDelete, setItemToDelete] = useState(null);
  const fileInputRef = useRef(null);
  const [gsheetUrl, setGsheetUrl] = useState('');
  const [gsheetLoading, setGsheetLoading] = useState(false);
  const [gsheetError, setGsheetError] = useState('');
  const [gsheetSuccess, setGsheetSuccess] = useState('');

  const handleGSheetConnect = async () => {
    if (!gsheetUrl.trim()) return;
    setGsheetLoading(true);
    setGsheetError('');
    setGsheetSuccess('');
    try {
      await onConnectGSheet(gsheetUrl.trim());
      setGsheetSuccess('Connected successfully! Data will sync automatically each time the page opens.');
      setGsheetUrl('');
      setTimeout(() => setGsheetSuccess(''), 5000);
    } catch (err) {
      setGsheetError(err.message || 'Connect failed');
    } finally {
      setGsheetLoading(false);
    }
  };

  const totalRows = sources.reduce((sum, s) => sum + (Number(s.rows) || 0), 0);
  const totalPages = sources.reduce((sum, s) => sum + (Number(s.pageCount) || 0), 0);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    await onUploadFiles(files);
    e.target.value = null;
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-300">
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".csv,.xlsx,.xlsm,.xls"
      />

      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#17335f]">Data Management</h1>
          <p className="text-slate-500 mt-1">Upload Excel/CSV and consolidate all data into one central SQLite table with file and page names.</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#00a4e4] to-[#3860be] rounded-2xl p-6 text-white shadow-lg flex items-center justify-between">
        <div>
          <div className="text-blue-100 font-medium mb-1">Central Table Rows</div>
          <div className="text-3xl font-extrabold">{totalRows.toLocaleString()} <span className="text-lg font-medium text-blue-200">Rows</span></div>
        </div>
        <div className="text-right">
          <div className="text-blue-100 font-medium mb-1">Files / Pages</div>
          <div className="text-2xl font-bold">{sources.length} / {totalPages}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 min-h-[270px] flex flex-col items-center justify-center text-center transition-all cursor-pointer group shadow-ktb ${uploading ? 'border-slate-200 bg-slate-50 cursor-not-allowed' : 'border-[#bfe8f8] bg-white hover:bg-[#e8f7fd] hover:border-[#00a4e4]'}`}
        >
          <div className="w-16 h-16 bg-[#e8f7fd] text-[#00a4e4] rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Upload Excel / CSV</h3>
          <button className="mt-6 h-12 px-6 bg-[#00a4e4] text-white text-base font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-2 pointer-events-none">
            <Plus className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Select Files'}
          </button>
        </div>

        <div className={`border-2 border-dashed rounded-2xl p-8 min-h-[270px] flex flex-col items-center justify-center text-center shadow-ktb transition-all ${gsheetLoading ? 'border-[#bfe8f8] bg-[#e8f7fd]' : 'border-[#bfe8f8] bg-white hover:bg-[#e8f7fd] hover:border-[#3860be]'}`}>
          <div className="w-16 h-16 bg-[#eef3ff] text-[#3860be] rounded-full flex items-center justify-center mb-4">
            <Link2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Google Sheet Connector</h3>
          <div className="mt-6 flex items-stretch gap-2 w-full max-w-sm">
            <input
              type="text"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={gsheetUrl}
              onChange={(e) => { setGsheetUrl(e.target.value); setGsheetError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleGSheetConnect()}
              disabled={gsheetLoading}
              className="h-12 flex-1 px-3 text-sm border border-[#d7e8f6] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00a4e4]/20 focus:border-[#00a4e4] disabled:bg-slate-50 disabled:text-slate-400"
            />
            <button
              onClick={handleGSheetConnect}
              disabled={gsheetLoading || !gsheetUrl.trim()}
              className="h-12 px-5 bg-[#3860be] text-white text-base font-semibold rounded-lg shadow-sm hover:bg-[#2f52a6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {gsheetLoading ? (
                <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4" strokeDashoffset="10" /></svg> Connecting...</>
              ) : (
                <><Plus className="w-4 h-4" /> Connect</>
              )}
            </button>
          </div>
          {gsheetError && <p className="text-xs text-red-500 mt-2">{gsheetError}</p>}
          {gsheetSuccess && <p className="text-xs text-emerald-600 mt-2 font-medium">{gsheetSuccess}</p>}
        </div>
      </div>

      {gsheetConnections.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#d7e8f6] shadow-ktb overflow-hidden">
          <div className="px-6 py-4 border-b border-[#d7e8f6] flex justify-between items-center bg-[#e8f7fd]">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-[#3860be]" />
              <h2 className="text-base font-bold text-slate-900">Connected Google Sheets</h2>
            </div>
            {syncing && <span className="text-xs text-emerald-600 flex items-center gap-1"><svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4" strokeDashoffset="10" /></svg> Syncing...</span>}
          </div>
          <div className="divide-y divide-slate-100">
            {gsheetConnections.map((conn) => (
              <div key={conn.connectionId} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Link2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-slate-900 truncate">{conn.label}</div>
                    <div className="text-xs text-slate-400 truncate">{conn.url}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Last sync: {conn.lastSyncAt ? new Date(conn.lastSyncAt + 'Z').toLocaleString() : 'Never'}
                      {' · '}{conn.lastSyncRows || 0} rows · {conn.lastSyncPages || 0} pages
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onDisconnectGSheet(conn.connectionId)}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors flex-shrink-0"
                >
                  Disconnect
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#d7e8f6] shadow-ktb overflow-hidden">
        <div className="px-6 py-5 border-b border-[#d7e8f6] flex justify-between items-center bg-[#f6fbff]">
          <h2 className="text-lg font-bold text-[#17335f]">Connected Sources</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {sources.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-slate-50/30">
              <div className="w-16 h-16 mx-auto mb-3 bg-slate-100 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-slate-400" />
              </div>
              No uploaded files yet
            </div>
          ) : (
            sources.map((source) => (
              <div key={source.sourceId} className="p-4 px-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-green-100 text-green-600">
                    {String(source.type || '').includes('csv') ? <FileText className="w-6 h-6" /> : <FileSpreadsheet className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{source.name}</div>
                    <div className="text-sm text-slate-500 mt-0.5">
                      {source.rows?.toLocaleString()} rows
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">Updated: {toDisplayDate(source.date)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                    <CheckCircle2 className="w-4 h-4" />
                    {source.status || 'Active'}
                  </div>
                  <button
                    onClick={() => setItemToDelete(source)}
                    className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                    title="Delete source"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Source</h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                Remove data from <span className="font-semibold text-slate-800">{itemToDelete.name}</span> ?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setItemToDelete(null)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await onDeleteSource(itemToDelete.sourceId);
                    setItemToDelete(null);
                  }}
                  className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

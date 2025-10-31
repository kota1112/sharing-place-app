import React from 'react';

export default function ConfirmDialog({ open, title = '確認', message, onConfirm, onCancel, confirmText = '削除', cancelText = 'キャンセル' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-[92%] max-w-md p-6">
        <h3 className="text-lg font-semibold mb-3">{title}</h3>
        <p className="text-sm text-gray-600 mb-6 whitespace-pre-wrap">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50"> {cancelText} </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700"> {confirmText} </button>
        </div>
      </div>
    </div>
  );
}

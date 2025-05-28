import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Task } from '../types/task';
import { useTasks } from '../contexts/TaskContext';
import { taskApi } from '../lib/api';
import { auth } from '../lib/firebase';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { categoryApi } from '../lib/api';
import { useAppStore } from '../lib/useAppStore';

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  onTaskUpdate: (taskId: number, updates: Partial<Task> & { category?: string }) => Promise<void>;
  from: 'today' | 'list';
}

type Subtask = {
  name: string;
  estimatedDuration?: number;
  description?: string;
};

const EditTaskModal: React.FC<EditTaskModalProps> = ({ isOpen, onClose, task, onTaskUpdate, from }) => {
  const deleteTask = useAppStore(s => s.deleteTask);
  const [formData, setFormData] = useState({
    name: task.name,
    due_date: task.due_date || '',
    importance: task.importance,
    estimated_duration_minutes: task.estimated_duration_minutes || 30,
    hurdle_level: task.hurdle_level || 1,
    memo: task.memo || ''
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [categories, setCategories] = useState([
    { id: 1, name: '仕事', color: '#2196F3' },
    { id: 2, name: '私用', color: '#4CAF50' },
    { id: 3, name: 'その他', color: '#FFB300' },
  ]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(task.category_id);

  useEffect(() => {
    // APIから取得する場合は下記を有効化
    // categoryApi.getCategories().then(setCategories).catch(console.error);
    setSelectedCategoryId(task.category_id);
  }, [task.category_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updates = {
        name: formData.name,
        due_date: formData.due_date,
        importance: formData.importance,
        estimated_duration_minutes: formData.estimated_duration_minutes,
        hurdle_level: formData.hurdle_level,
        memo: formData.memo,
        category_id: selectedCategoryId,
        user_id: task.user_id
      };
      await onTaskUpdate(task.id, updates);
      onClose();
    } catch (error) {
      console.error('タスクの更新に失敗しました:', error);
    }
  };

  const handleDelete = () => {
    if (confirm("このタスクを本当に削除しますか？")) {
      deleteTask(task.id);
      onClose();
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="fixed top-0 left-0 w-full h-full z-[9999] bg-black bg-opacity-50 flex items-center justify-center" onClose={onClose} style={{ overscrollBehavior: 'contain' }}>
        <div className="bg-white rounded-2xl p-6 w-[90%] max-w-[340px] shadow-xl relative mx-auto mt-8 mb-[env(safe-area-inset-bottom,80px)] flex flex-col" style={{ maxHeight: '90vh', minHeight: 'unset', display: 'flex', flexDirection: 'column' }}>
          <div className="flex items-center gap-2 mb-4 border-b pb-2 flex-shrink-0">
            <span className="text-blue-500"><svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/><path d="M9 11v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></span>
            <h2 className="text-lg font-bold tracking-wide">タスクを編集</h2>
            <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-700 text-xl font-bold" aria-label="閉じる">✕</button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4 px-2 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 64px - 24px)' }}>
            <div>
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 text-sm"
                placeholder="タスク名を入力"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value.slice(0, 20) })}
                maxLength={20}
                required
                autoFocus
              />
              <div className="text-right text-xs text-gray-500 mt-1">
                {formData.name.length}/20文字
              </div>
              <div className="flex justify-center mt-2 mb-2">
                <button
                  type="button"
                  className="px-3 py-1 bg-gray-200 text-gray-500 rounded transition font-semibold shadow-sm cursor-not-allowed"
                  disabled={true}
                  onClick={async () => {
                    try {
                      const token = await auth.currentUser?.getIdToken();
                      const res = await fetch(`${import.meta.env.VITE_API_URL}/gpt-split-task`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                          taskName: formData.name,
                          estimatedDuration: formData.estimated_duration_minutes,
                          hurdleLevel: formData.hurdle_level
                        })
                      });
                      const data = await res.json();
                      if (data.subtasks && Array.isArray(data.subtasks)) {
                        // ここでサブタスクを処理するロジックを実装
                      } else if (data.raw) {
                        // ここでエラーハンドリングを実装
                      } else {
                        // ここでエラーハンドリングを実装
                      }
                    } catch (e) {
                      // ここでエラーハンドリングを実装
                    }
                  }}
                >
                  🧩GPTで分解してみる
                </button>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-gray-700 mb-2 px-3 py-1.5 bg-gray-50 rounded-md">カテゴリー</h3>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(category.id)}
                      className={`flex items-center gap-2 flex-shrink-0 whitespace-nowrap px-3 py-1 rounded-lg border text-sm font-medium cursor-pointer transition-colors duration-150 ${selectedCategoryId === category.id ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-blue-50'}`}
                      style={{ minWidth: 0 }}
                    >
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color || '#ccc' }}></div>
                      <span>{category.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-700 mb-2 px-3 py-1.5 bg-gray-50 rounded-md">期日</h3>
                <div className="flex gap-2 mb-2">
                  {[
                    { label: '今日', onClick: () => setFormData({ ...formData, due_date: new Date().toISOString().slice(0, 10) }) },
                    { label: '今週', onClick: () => {
                      const endOfWeek = new Date();
                      endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
                      setFormData({ ...formData, due_date: endOfWeek.toISOString().slice(0, 10) });
                    }},
                    { label: '今月', onClick: () => {
                      const endOfMonth = new Date();
                      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
                      endOfMonth.setDate(0);
                      setFormData({ ...formData, due_date: endOfMonth.toISOString().slice(0, 10) });
                    }},
                    { label: '未定', onClick: () => setFormData({ ...formData, due_date: '' }) }
                  ].map(({ label, onClick }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={onClick}
                      className={`flex-1 px-3 py-1 rounded-lg border text-sm font-medium cursor-pointer transition-colors duration-150 ${
                        (label === '未定' && !formData.due_date) ||
                        (label === '今日' && formData.due_date === new Date().toISOString().slice(0, 10)) ||
                        (label === '今週' && formData.due_date === (() => { const d = new Date(); d.setDate(d.getDate() + (7 - d.getDay())); return d.toISOString().slice(0, 10); })()) ||
                        (label === '今月' && formData.due_date === (() => { const d = new Date(); d.setMonth(d.getMonth() + 1); d.setDate(0); return d.toISOString().slice(0, 10); })())
                          ? 'bg-blue-100 border-blue-400 text-blue-700'
                          : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-blue-50'
                      }`}
                      style={{ minWidth: 0 }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="text"
                    readOnly
                    className="block h-10 px-3 text-sm rounded-md border border-gray-300 bg-gray-50 cursor-pointer w-full"
                    value={formData.due_date ? format(new Date(formData.due_date), 'yyyy/MM/dd', { locale: ja }) : '未設定'}
                    onClick={() => setShowCalendar(!showCalendar)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCalendar(!showCalendar)}
                    className="inline-flex items-center justify-center text-gray-500 hover:text-gray-700"
                  >
                    <CalendarIcon className="h-5 w-5" />
                  </button>
                </div>
                {showCalendar && (
                  <div className="fixed inset-0 flex items-center justify-center z-50">
                    <div className="absolute inset-0 bg-black/30" onClick={() => setShowCalendar(false)} />
                    <div className="relative bg-white rounded-lg shadow-lg">
                      <Calendar
                        mode="single"
                        selected={formData.due_date ? new Date(formData.due_date) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            setFormData({ ...formData, due_date: format(date, 'yyyy-MM-dd') });
                            setShowCalendar(false);
                          }
                        }}
                        className={cn(
                          'rounded-lg border',
                          'bg-white shadow-xm'
                        )}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-700 mb-2 px-3 py-1.5 bg-gray-50 rounded-md">ハードル</h3>
                <div className="flex gap-2">
                  {[1, 2, 3].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setFormData({ ...formData, hurdle_level: level })}
                      className={`flex-1 px-3 py-1 rounded-lg border text-sm font-medium cursor-pointer transition-colors duration-150 ${formData.hurdle_level === level ? 'bg-green-100 border-green-400 text-green-800' : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-green-50'}`}
                    >
                      {level === 1 ? 'やさしい' : level === 2 ? '普通' : '難しい'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-700 mb-2 px-3 py-1.5 bg-gray-50 rounded-md">重要度</h3>
                <div className="flex gap-2">
                  {['low', 'medium', 'high'].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setFormData({ ...formData, importance: opt })}
                      className={`flex-1 px-3 py-1 rounded-lg border text-sm font-medium cursor-pointer transition-colors duration-150 ${formData.importance === opt ? 'bg-yellow-100 border-yellow-400 text-yellow-800' : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-yellow-50'}`}
                    >
                      {opt === 'high' ? '高' : opt === 'medium' ? '中' : '低'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-700 mb-2 px-3 py-1.5 bg-gray-50 rounded-md">推定時間</h3>
                <div className="bg-gray-50 rounded-xl p-4 mb-2">
                  <div className="relative w-full" style={{height: 64}}>
                    {/* 目盛り（バーの上） */}
                    <div className="flex justify-between mb-2 px-1 text-xs text-gray-500 select-none">
                      <span>0時間</span>
                      <span>1時間</span>
                      <span>2時間</span>
                      <span>3時間</span>
                    </div>
                    {/* クリックで区間選択バー */}
                    <div
                      className="w-full h-8 bg-blue-50 rounded-full cursor-pointer relative"
                      onClick={e => {
                        const bar = e.currentTarget;
                        const rect = bar.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const percent = Math.max(0, Math.min(1, x / rect.width));
                        // 15分刻みで0,15,30,...,180に丸める
                        const minutes = Math.round((percent * 180) / 15) * 15;
                        setFormData({ ...formData, estimated_duration_minutes: Math.max(0, Math.min(180, minutes)) });
                      }}
                    >
                      {/* 選択済み部分（右端強調） */}
                      <div
                        className="absolute top-0 left-0 h-8 rounded-full"
                        style={{
                          width: `${((formData.estimated_duration_minutes - 1) / 179) * 100}%`,
                          background: 'linear-gradient(90deg, #60a5fa 60%, #2563eb 100%)',
                          boxShadow: '0 0 8px 2px #2563eb55',
                          transition: 'width 0.2s',
                        }}
                      />
                      {/* 吹き出しラベル */}
                      {(() => {
                        const percent = (formData.estimated_duration_minutes - 1) / 179;
                        const labelWidth = 100;
                        let leftPx = 0;
                        const bar = document.querySelector('.w-full.h-8.bg-blue-50.rounded-full.cursor-pointer.relative');
                        if (bar) {
                          const barW = (bar as HTMLDivElement).offsetWidth;
                          leftPx = percent * barW - labelWidth / 2;
                          if (leftPx < 0) leftPx = 0;
                          if (leftPx > barW - labelWidth) leftPx = barW - labelWidth;
                        }
                        return (
                          <div
                            className="absolute z-10 flex flex-col items-center"
                            style={{
                              left: leftPx,
                              top: '-36px',
                              width: labelWidth
                            }}
                          >
                            <div className="px-3 py-1 rounded-lg bg-blue-500 text-white text-sm font-bold shadow-md w-full text-center" style={{whiteSpace: 'nowrap'}}>
                              {Math.floor(formData.estimated_duration_minutes / 60)}時間{formData.estimated_duration_minutes % 60}分
                            </div>
                            <div className="w-2 h-2 bg-blue-500 rotate-45 mt-[-6px]"></div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 mb-2">
                    {[15, 30, 45, 60].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setFormData({ ...formData, estimated_duration_minutes: val })}
                        className={`flex-1 px-0 py-1 rounded-lg border text-sm font-medium cursor-pointer transition-colors duration-150 text-center
                          ${formData.estimated_duration_minutes === val ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-blue-50'}`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {/* メモ欄を一番下に移動 */}
              <div>
                <h3 className="text-base font-semibold text-gray-700 mb-2 px-3 py-1.5 bg-gray-50 rounded-md">メモ</h3>
                <textarea
                  className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 text-sm"
                  placeholder="メモや補足情報を入力"
                  value={formData.memo}
                  onChange={e => setFormData({ ...formData, memo: e.target.value.slice(0, 500) })}
                  maxLength={500}
                  rows={4}
                />
                <div className="text-right text-xs text-gray-500 mt-1">
                  {formData.memo.length}/500文字
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8 sticky bottom-0 bg-white pt-2 pb-1 z-10 px-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors font-semibold"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors font-semibold shadow"
              >
                更新
              </button>
            </div>
          </form>
        </div>
      </Dialog>
    </Transition>
  );
};

export default EditTaskModal; 
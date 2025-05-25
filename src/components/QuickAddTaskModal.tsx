import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Task, Category } from '../types/task';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon } from 'lucide-react';
import { categoryApi } from '../lib/api';
import { useAppStore } from '../lib/useAppStore';

interface QuickAddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const QuickAddTaskModal: React.FC<QuickAddTaskModalProps> = ({ isOpen, onClose }) => {
  const [taskName, setTaskName] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined);
  const [hurdleLevel, setHurdleLevel] = useState(1);
  const [showDetails, setShowDetails] = useState(false);
  const [estimatedDuration, setEstimatedDuration] = useState(30);
  const [importance, setImportance] = useState<'high' | 'medium' | 'low'>('medium');
  const [isTodayTask, setIsTodayTask] = useState(false);
  const { user } = useAuth();
  const addTask = useAppStore(s => s.addTask);

  // フィルター作成モーダル風のボタンクラス
  const filterModalButtonClass = (selected: boolean, color: 'blue' | 'yellow' | 'green' | 'gray' = 'blue') => {
    const colorMap = {
      blue: selected
        ? 'bg-blue-100 border-blue-400 text-blue-700'
        : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-blue-50',
      yellow: selected
        ? 'bg-yellow-100 border-yellow-400 text-yellow-800'
        : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-yellow-50',
      green: selected
        ? 'bg-green-100 border-green-400 text-green-800'
        : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-green-50',
      gray: selected
        ? 'bg-gray-300 border-gray-400 text-gray-800'
        : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200',
    };
    return `px-3 py-1 rounded-lg border text-sm font-medium cursor-pointer transition-colors duration-150 ${colorMap[color]}`;
  };

  // カテゴリー一覧を取得
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const fetchedCategories = await categoryApi.getCategories();
        setCategories(fetchedCategories);
      } catch (error) {
        console.error('カテゴリーの取得に失敗しました:', error);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim() || !user) return;

    addTask({
      name: taskName.trim(),
      description: '',
      due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : undefined,
      importance: importance,
      estimated_duration_minutes: estimatedDuration,
      category_id: selectedCategoryId,
      status: 'pending',
      progress: 0,
      is_deleted: false,
      is_today_task: isTodayTask,
      suggested_by_ai: false,
      priority_score: 0.0,
      child_order: 0,
      task_depth: 0,
      hurdle_level: hurdleLevel,
      user_id: user.uid
    });

    setTaskName('');
    setDueDate(new Date());
    setSelectedCategoryId(undefined);
    setHurdleLevel(1);
    setShowDetails(false);
    setEstimatedDuration(30);
    setImportance('medium');
    setIsTodayTask(false);
    onClose();
  };

  // useRefの定義
  const barRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  return (
    <div
      className="fixed top-0 left-0 w-full h-full z-[9999] bg-black bg-opacity-50 flex items-center justify-center"
      style={{ overscrollBehavior: 'contain' }}
    >
      <div className="bg-white rounded-2xl p-6 w-[90%] max-w-[340px] shadow-xl relative mx-auto mt-8 mb-[env(safe-area-inset-bottom,80px)]" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="flex items-center gap-2 mb-4 border-b pb-2 flex-shrink-0">
          <h2 className="text-lg font-bold tracking-wide">タスクを追加</h2>
          <button
            onClick={onClose}
            className="ml-auto text-gray-400 hover:text-gray-700 text-xl font-bold"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-2 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 64px - 24px)' }}>
          <div>
            <input
              type="text"
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 text-sm"
              placeholder="タスク名を入力（例：企画書の作成）"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value.slice(0, 20))}
              maxLength={20}
              autoFocus
            />
            <div className="text-right text-xs text-gray-500 mt-1">
              {taskName.length}/20文字
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-700 mb-2 px-3 py-1.5 bg-gray-50 rounded-md">カテゴリー</h3>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => {
                  let displayColor = category.color;
                  if (category.name === '仕事') displayColor = '#2196F3';
                  else if (category.name === '私用') displayColor = '#4CAF50';
                  else if (category.name === 'その他') displayColor = '#FFB300';
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(category.id)}
                      className={filterModalButtonClass(selectedCategoryId === category.id, 'blue') + ' flex items-center gap-2 flex-shrink-0 whitespace-nowrap'}
                      style={{ minWidth: 0 }}
                    >
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: displayColor || '#ccc' }}></div>
                      <span>{category.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-gray-700 mb-2 px-3 py-1.5 bg-gray-50 rounded-md">期日</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '今日', onClick: () => setDueDate(new Date()) },
                  { label: '今週', onClick: () => {
                    const endOfWeek = new Date();
                    endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
                    setDueDate(endOfWeek);
                  }},
                  { label: '今月', onClick: () => {
                    const endOfMonth = new Date();
                    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
                    endOfMonth.setDate(0);
                    setDueDate(endOfMonth);
                  }},
                  { label: '未定', onClick: () => setDueDate(undefined) }
                ].map(({ label, onClick }) => {
                  const isSelected =
                    (!dueDate && label === '未定') ||
                    (dueDate && format(dueDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') && label === '今日') ||
                    (dueDate && format(dueDate, 'yyyy-MM-dd') === format(new Date(new Date().setDate(new Date().getDate() + (7 - new Date().getDay()))), 'yyyy-MM-dd') && label === '今週') ||
                    (dueDate && format(dueDate, 'yyyy-MM-dd') === format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), 'yyyy-MM-dd') && label === '今月');
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={onClick}
                      className={filterModalButtonClass(!!isSelected, 'blue') + ' flex-1'}
                      style={{ minWidth: 0 }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  readOnly
                  className="block h-10 px-3 text-sm rounded-md border border-gray-300 bg-gray-50 cursor-pointer w-full"
                  value={dueDate ? format(dueDate, 'yyyy/MM/dd', { locale: ja }) : '未設定'}
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
            </div>

            <div>
              <h3 className="text-base font-semibold text-gray-700 mb-2 px-3 py-1.5 bg-gray-50 rounded-md">ハードル</h3>
              <div className="flex gap-2">
                {[1, 2, 3].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setHurdleLevel(level)}
                    className={filterModalButtonClass(level === hurdleLevel, 'green') + ' flex-1'}
                    style={{ minWidth: 0 }}
                  >
                    {level === 1 ? 'やさしい' : level === 2 ? '普通' : '難しい'}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="w-full text-[#666] text-sm flex items-center justify-center gap-1 py-2 hover:bg-gray-50 rounded-md transition-colors"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? '🔼 詳細設定を閉じる' : '🔽 詳細設定を開く'}
            </button>

            {showDetails && (
              <div className="space-y-4 p-3 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="text-base font-semibold text-gray-700 mb-2">推定時間</h3>
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
                        ref={barRef}
                        className="w-full h-8 bg-blue-50 rounded-full cursor-pointer relative"
                        onClick={e => {
                          if (!barRef.current) return;
                          const rect = barRef.current.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          const percent = Math.max(0, Math.min(1, x / rect.width));
                          // 15分刻みで0,15,30,...,180に丸める
                          const minutes = Math.round((percent * 180) / 15) * 15;
                          setEstimatedDuration(Math.max(0, Math.min(180, minutes)));
                        }}
                      >
                        {/* 選択済み部分（右端強調） */}
                        <div
                          className="absolute top-0 left-0 h-8 rounded-full"
                          style={{
                            width: `${((estimatedDuration - 1) / 179) * 100}%`,
                            background: 'linear-gradient(90deg, #60a5fa 60%, #2563eb 100%)',
                            boxShadow: '0 0 8px 2px #2563eb55',
                            transition: 'width 0.2s',
                          }}
                        />
                        {/* 吹き出しラベル */}
                        {(() => {
                          const percent = (estimatedDuration - 1) / 179;
                          const labelWidth = 100; // px (was 64)
                          let leftPx = 0;
                          if (barRef.current) {
                            const barW = barRef.current.offsetWidth;
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
                                {Math.floor(estimatedDuration / 60)}時間{estimatedDuration % 60}分
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
                          onClick={() => setEstimatedDuration(val)}
                          className={`flex-1 px-0 py-1 rounded-lg border text-sm font-medium cursor-pointer transition-colors duration-150 text-center
                            ${estimatedDuration === val ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-blue-50'}`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-gray-700 mb-2">重要度</h3>
                  <div className="flex items-center gap-2">
                    {[
                      { level: 'high', icon: '◎', label: '高' },
                      { level: 'medium', icon: '○', label: '中' },
                      { level: 'low', icon: '△', label: '低' }
                    ].map(({ level, icon, label }) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setImportance(level as 'high' | 'medium' | 'low')}
                        className={filterModalButtonClass(importance === level, 'yellow') + ' flex-1'}
                        style={{ minWidth: 0 }}
                      >
                        <span className="text-base">{icon}</span>
                        <span className="ml-1 text-xs">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isTodayTask"
                checked={isTodayTask}
                onChange={(e) => setIsTodayTask(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isTodayTask" className="ml-2 block text-sm text-gray-700">
                今日のタスクに入れる
              </label>
            </div>
          </div>

          <div className="flex gap-3 mt-8 sticky bottom-0 bg-white pt-2 pb-1 z-10 px-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors font-semibold text-base shadow"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className={`flex-1 px-4 py-2 rounded-md font-semibold text-base shadow transition-colors
                ${!taskName.trim() ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}
              `}
              disabled={!taskName.trim()}
            >
              登録
            </button>
          </div>
        </form>

        {showCalendar && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="absolute inset-0 bg-black/30" onClick={() => setShowCalendar(false)} />
            <div className="relative bg-white rounded-lg shadow-lg">
              <Calendar
                mode="single"
                selected={dueDate}
                onSelect={(date: Date | undefined) => {
                  if (date) {
                    setDueDate(date);
                    setShowCalendar(false);
                  }
                }}
                className={cn(
                  "rounded-lg border",
                  "bg-white shadow-xm"
                )}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickAddTaskModal;

// --- スライダーのグラフィカルCSSはpublic/index.css等のグローバルCSSに記述してください ---
// 例:
// input[type='range'].slider-thumb-custom::-webkit-slider-thumb { ... }
// ... existing code ... 
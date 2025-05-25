import React, { useState, useEffect } from 'react';
import Drawer from './Drawer';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { GripVertical, PlusCircle, View, Edit2, Eye, EyeOff } from 'lucide-react';
import { useAppStore } from '../../lib/useAppStore';
import { v4 as uuidv4 } from 'uuid';
import { customViewApi, focusViewSettingsApi } from '../../lib/api';
import { toast } from 'react-hot-toast';

interface SettingsDisplayDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialSettings: {
    show_hurdle: boolean;
    show_importance: boolean;
    show_deadline_alert: boolean;
    show_category: boolean;
  };
  onSave: (settings: {
    show_hurdle: boolean;
    show_importance: boolean;
    show_deadline_alert: boolean;
    show_category: boolean;
  }) => Promise<void>;
}

interface CustomView {
  id: number;
  name: string;
  is_visible: boolean;
}

interface CustomFocusView {
  id: string;
  name: string;
  filters: {
    due: string[];
    importance: string[];
    hurdle: number[];
  };
  isTemp?: boolean;
}

const SettingsDisplayDrawer: React.FC<SettingsDisplayDrawerProps> = ({ isOpen, onClose, initialSettings, onSave }) => {
  const [settings, setSettings] = useState(initialSettings);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // 集中モード設定zustandストア連携
  const focusViewSettings = useAppStore(s => s.focusViewSettings);
  const setFocusViewSettings = useAppStore(s => s.setFocusViewSettings);
  const [localFocusViews, setLocalFocusViews] = useState(focusViewSettings);

  const focusViewLimit = useAppStore(s => s.focusViewLimit);
  const setFocusViewLimit = useAppStore(s => s.setFocusViewLimit);
  const [localFocusViewLimit, setLocalFocusViewLimit] = useState(focusViewLimit);

  const customFocusViews: CustomFocusView[] = useAppStore(s => s.customFocusViews);
  const setCustomFocusViews: (views: CustomFocusView[]) => void = useAppStore(s => s.setCustomFocusViews);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingViewId, setEditingViewId] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [customDue, setCustomDue] = useState<string[]>([]);
  const [customImportance, setCustomImportance] = useState<string[]>([]);
  const [customHurdle, setCustomHurdle] = useState<number[]>([]);

  // タブ切り替え用state
  const [activeTab, setActiveTab] = useState<'display' | 'view'>('display');

  // フェードアニメーション用state
  const [fade, setFade] = useState(true);
  useEffect(() => {
    setFade(false);
    const timeout = setTimeout(() => setFade(true), 30);
    return () => clearTimeout(timeout);
  }, [activeTab]);

  useEffect(() => {
    setSettings(initialSettings);
    setSaved(false);
    setLocalFocusViews(focusViewSettings);
    setLocalFocusViewLimit(focusViewLimit);
  }, [initialSettings, isOpen, focusViewSettings, focusViewLimit]);

  // ビュー設定の取得
  useEffect(() => {
    const fetchFocusViewSettings = async () => {
      try {
        const settings = await focusViewSettingsApi.getFocusViewSettings();
        
        setLocalFocusViews(settings.map((v: any) => ({
          key: v.view_key,
          label: v.label,
          visible: !!v.visible,
          order: v.view_order,
        })));
        // カスタムビューも同期（型を厳密に正規化）
        const customViews = settings
          .filter((v: any) => v.view_key.length > 10)
          .map((v: any) => ({
            id: v.view_key,
            name: v.label,
            filters: {
              due: v.filter_due && v.filter_due !== '' && v.filter_due !== null ? [v.filter_due] : [],
              importance: typeof v.filters_importance === 'string' 
                ? JSON.parse(v.filters_importance)
                : v.filters_importance || [],
              hurdle: typeof v.filters_hurdle === 'string'
                ? JSON.parse(v.filters_hurdle)
                : v.filters_hurdle || [],
            },
          }));
        setCustomFocusViews(customViews);
        // ★DBの値でzustandも上書き
        setFocusViewSettings(settings.map((v: any) => ({
          key: v.view_key,
          label: v.label,
          visible: !!v.visible,
          order: v.view_order,
        })));
      } catch (error) {
        console.error('ビュー設定の取得に失敗しました:', error);
      }
    };
    if (isOpen) {
      fetchFocusViewSettings();
    }
  }, [isOpen]);

  const handleChange = (key: keyof typeof settings) => (checked: boolean) => {
    setSettings(prev => ({ ...prev, [key]: checked }));
    setSaved(false);
  };

  // 表示設定用保存ボタンの有効・無効判定
  const isDisplayChanged =
    settings.show_hurdle !== initialSettings.show_hurdle ||
    settings.show_importance !== initialSettings.show_importance ||
    settings.show_deadline_alert !== initialSettings.show_deadline_alert ||
    settings.show_category !== initialSettings.show_category;

  // ビュー管理用保存ボタンの有効・無効判定
  const isFocusViewChanged = JSON.stringify(localFocusViews) !== JSON.stringify(focusViewSettings);
  const isFocusViewLimitChanged = localFocusViewLimit !== focusViewLimit;
  const isViewChanged = isFocusViewChanged || isFocusViewLimitChanged;

  // 表示設定用保存処理
  const handleDisplaySave = async () => {
    setLoading(true);
    await onSave(settings);
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
    onClose();
  };

  // ビュー管理用保存処理
  const handleViewSave = async () => {
    setLoading(true);
    try {
      // 重複を自動除去
      const uniqueViews = localFocusViews.filter(
        (view, index, self) => self.findIndex(v => v.key === view.key) === index
      );

      // DBに既に存在するカスタムビューのidとnameリストを取得
      const dbCustomViews = await customViewApi.getCustomViews();
      const dbCustomViewIds = dbCustomViews.map((v: { id: string }) => v.id);
      const dbCustomViewNames = dbCustomViews.map((v: { name: string }) => v.name);

      // 1. 新規カスタムビュー（idがDBに存在せず、nameも重複しないもの）のみ保存
      for (const customView of customFocusViews) {
        const isAlreadyInDB = dbCustomViewIds.includes(customView.id);
        const isNameDuplicate = dbCustomViewNames.includes(customView.name);
        if (!isAlreadyInDB && !isNameDuplicate) {
          await customViewApi.addCustomView({
            name: customView.name,
            filter_due: customView.filters.due.length > 0 ? customView.filters.due[0] : '',
            filters_importance: customView.filters.importance,
            filters_hurdle: customView.filters.hurdle,
          });
        }
      }
      // 2. ビュー設定をfocus_view_settingsに保存
      await focusViewSettingsApi.updateFocusViewSettings(
        uniqueViews.map((v, i) => ({
          view_key: v.key,
          label: v.label,
          visible: v.visible,
          view_order: i + 1,
        })),
        localFocusViewLimit
      );
      setFocusViewLimit(localFocusViewLimit);
      // 3. 保存後、両方のテーブルを再取得してzustandとlocal stateを上書き
      const settings = await focusViewSettingsApi.getFocusViewSettings();
      setLocalFocusViews(settings.map((v: any) => ({
        key: v.view_key,
        label: v.label,
        visible: !!v.visible,
        order: v.view_order,
      })));
      setCustomFocusViews(settings.filter((v: any) => v.view_key.length > 10).map((v: any) => ({
        id: v.view_key,
        name: v.label,
        filters: {
          due: v.filter_due ? [v.filter_due] : [],
          importance: Array.isArray(v.filters_importance) ? v.filters_importance : JSON.parse(v.filters_importance || '[]'),
          hurdle: Array.isArray(v.filters_hurdle) ? v.filters_hurdle : JSON.parse(v.filters_hurdle || '[]'),
        },
      })));
      setFocusViewSettings(settings.map((v: any) => ({
        key: v.view_key,
        label: v.label,
        visible: !!v.visible,
        order: v.view_order,
      })));
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
      onClose();
    } catch (e) {
      console.error('ビュー設定の保存に失敗しました', e);
    }
    setLoading(false);
  };

  // ドラッグ＆ドロップのハンドラ
  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    const items = Array.from(localFocusViews);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    // orderを再計算
    const reordered = items.map((v, i) => ({ ...v, order: i + 1 }));
    setLocalFocusViews(reordered);
    // ★ ここでAPIは呼ばず、保存時にまとめて送信
  };

  const handleEditCustomView = (viewId: string) => {
    const customView = customFocusViews.find(v => v.id === viewId);
    if (!customView) return;

    setEditingViewId(viewId);
    setCustomName(customView.name);
    setCustomDue(customView.filters.due);
    setCustomImportance(customView.filters.importance);
    setCustomHurdle(customView.filters.hurdle);
    setIsEditMode(true);
    setIsCustomModalOpen(true);
  };

  const handleUpdateCustomView = async () => {
    if (!editingViewId || !customName.trim()) {
      console.log('更新条件を満たしていません:', { editingViewId, customName });
      return;
    }

    try {
      console.log('更新開始:', {
        id: editingViewId,
        name: customName,
        due: customDue,
        importance: customImportance,
        hurdle: customHurdle
      });

      // APIを呼び出してカスタムビューを更新
      const updatedView = await customViewApi.updateCustomView(editingViewId, {
        name: customName,
        filter_due: customDue.length > 0 ? customDue[0] : '',
        filters_importance: customImportance,
        filters_hurdle: customHurdle,
      });

      console.log('API更新成功:', updatedView);

      // customFocusViewsを更新
      const updatedCustomViews = customFocusViews.map(view => 
        view.id === editingViewId 
          ? {
              ...view,
              name: updatedView.name,
              filters: {
                due: customDue,
                importance: customImportance,
                hurdle: customHurdle,
              },
            }
          : view
      );
      setCustomFocusViews(updatedCustomViews);

      // focusViewSettingsも更新
      const updatedFocusViews = localFocusViews.map(view =>
        view.key === editingViewId
          ? { ...view, label: updatedView.name }
          : view
      );
      setLocalFocusViews(updatedFocusViews);

      // モーダルを閉じて状態をリセット
      setIsCustomModalOpen(false);
      setIsEditMode(false);
      setEditingViewId(null);
      setCustomName('');
      setCustomDue([]);
      setCustomImportance([]);
      setCustomHurdle([]);

      // 編集後にlocalFocusViews/customFocusViewsをAPIから再取得して再同期
      try {
        const settings = await focusViewSettingsApi.getFocusViewSettings();
        setLocalFocusViews(settings.map((v: any) => ({
          key: v.view_key,
          label: v.label,
          visible: !!v.visible,
          order: v.view_order,
        })));
        setCustomFocusViews(settings.filter((v: any) => v.view_key.length > 10).map((v: any) => ({
          id: v.view_key,
          name: v.label,
          filters: {
            due: v.filter_due ? [v.filter_due] : [],
            importance: Array.isArray(v.filters_importance) ? v.filters_importance : JSON.parse(v.filters_importance || '[]'),
            hurdle: Array.isArray(v.filters_hurdle) ? v.filters_hurdle : JSON.parse(v.filters_hurdle || '[]'),
          },
        })));
      } catch (e) {
        console.error('編集後のビュー再取得に失敗:', e);
      }
    } catch (error) {
      console.error('カスタムビューの更新に失敗しました:', error);
      // エラー時もモーダルは閉じる
      setIsCustomModalOpen(false);
      setIsEditMode(false);
      setEditingViewId(null);
      setCustomName('');
      setCustomDue([]);
      setCustomImportance([]);
      setCustomHurdle([]);
    }
  };

  const handleAddCustomView = async () => {
    if (!isCustomViewValid) return;
    if (customFocusViews.length >= 3) return;

    // ローカルに一時保存（DBには反映しない）
    const newView = {
      id: uuidv4(), // 一時的なID
      name: customName,
      filters: {
        due: customDue,
        importance: customImportance,
        hurdle: customHurdle,
      },
    };

    // ローカルのビュー一覧に追加
    const newLocalFocusView = {
      key: newView.id,
      label: newView.name,
      visible: true,
      order: localFocusViews.length + 1,
    };

    setLocalFocusViews([...localFocusViews, newLocalFocusView]);
    setCustomFocusViews([...customFocusViews, newView]);

    // 保存ボタンを有効化
    setSaved(false);

    // モーダルを閉じて入力フィールドをリセット
    setIsCustomModalOpen(false);
    setCustomName('');
    setCustomDue([]);
    setCustomImportance([]);
    setCustomHurdle([]);
  };

  const handleModalClose = () => {
    setIsCustomModalOpen(false);
    setIsEditMode(false);
    setEditingViewId(null);
    setCustomName('');
    setCustomDue([]);
    setCustomImportance([]);
    setCustomHurdle([]);

    // 保存ボタンを押していない場合のみ、一時保存を削除
    if (!saved && !isEditMode) {
      setLocalFocusViews(focusViewSettings);
      setCustomFocusViews(customFocusViews.filter(v => v.id !== editingViewId));
    }
  };

  const handleDeleteCustomView = async (view: any) => {
    if (!window.confirm('本当にこのカスタムビューを削除しますか？\nこの操作は取り消せません。')) return;
    
    try {
      // 一時保存の場合はローカルステートから削除
      if (view.isTemp) {
        const newCustom = customFocusViews.filter(v => v.id !== view.id);
        const newLocal = localFocusViews.filter(v => v.key !== view.id);
        setCustomFocusViews(newCustom);
        setLocalFocusViews(newLocal);
        handleModalClose();
        return;
      }

      // カスタムビューの削除を実行
      if (!view.key) {
        console.error('削除対象のビューIDが存在しません');
        toast.error('削除対象のビューIDが存在しません');
        return;
      }

      await customViewApi.deleteCustomView(view.key);
      
      // 削除後の設定を再取得
      const settings = await focusViewSettingsApi.getFocusViewSettings();
      setLocalFocusViews(settings.map((v: any) => ({
        key: v.view_key,
        label: v.label,
        visible: !!v.visible,
        order: v.view_order,
      })));
      setCustomFocusViews(settings.filter((v: any) => v.view_key.length > 10).map((v: any) => ({
        id: v.view_key,
        name: v.label,
        filters: {
          due: v.filter_due ? [v.filter_due] : [],
          importance: Array.isArray(v.filters_importance) ? v.filters_importance : JSON.parse(v.filters_importance || '[]'),
          hurdle: Array.isArray(v.filters_hurdle) ? v.filters_hurdle : JSON.parse(v.filters_hurdle || '[]'),
        },
      })));
      setFocusViewSettings(settings.map((v: any) => ({
        key: v.view_key,
        label: v.label,
        visible: !!v.visible,
        order: v.view_order,
      })));
      
      handleModalClose();
      toast.success('カスタムビューを削除しました');
    } catch (error) {
      console.error('カスタムビューの削除に失敗しました:', error);
      toast.error('カスタムビューの削除に失敗しました');
    }
  };

  // ビュー名バリデーション
  const isNameTooLong = customName.length > 12;
  const isNameEmpty = customName.trim().length === 0;
  const isAnyConditionSelected = customDue.length > 0 || customImportance.length > 0 || customHurdle.length > 0;
  const isCustomViewValid = !isNameEmpty && !isNameTooLong && isAnyConditionSelected;

  return (
    <Drawer isOpen={isOpen} onClose={onClose}>
      <div className="pt-4">
        {/* タブ切り替えUI */}
        <div className="flex mb-4 gap-2">
          <button
            className={`flex-1 py-2 rounded-lg font-bold transition-colors duration-200 ${activeTab === 'display' ? 'bg-blue-500 text-white shadow' : 'bg-gray-100 text-gray-600'}`}
            onClick={() => setActiveTab('display')}
          >
            表示設定
          </button>
          <button
            className={`flex-1 py-2 rounded-lg font-bold transition-colors duration-200 ${activeTab === 'view' ? 'bg-blue-500 text-white shadow' : 'bg-gray-100 text-gray-600'}`}
            onClick={() => setActiveTab('view')}
          >
            ビュー管理
          </button>
        </div>
      </div>
      {/* タブコンテンツ */}
      <div className={`transition-opacity duration-300 ${fade ? 'opacity-100' : 'opacity-0'}`}>
        {activeTab === 'display' && (
          <>
            <h2 className="text-base font-semibold mb-2">表示項目のカスタマイズ</h2>
            <div className="bg-gray-50 rounded-lg p-3 mb-6 w-full">
              <div className="space-y-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-base">ハードルバッジを表示する</span>
                  <div className="relative inline-flex items-center h-6 rounded-full w-11 transition-all duration-300 ease-in-out"
                       style={{ backgroundColor: settings.show_hurdle ? '#3B82F6' : '#E5E7EB' }}>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={settings.show_hurdle}
                      onChange={(e) => handleChange('show_hurdle')(e.target.checked)}
                    />
                    <span
                      className={`inline-block w-4 h-4 transform bg-white rounded-full transition-all duration-300 ease-in-out ${
                        settings.show_hurdle ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </div>
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-base">重要度バッジを表示する</span>
                  <div className="relative inline-flex items-center h-6 rounded-full w-11 transition-all duration-300 ease-in-out"
                       style={{ backgroundColor: settings.show_importance ? '#3B82F6' : '#E5E7EB' }}>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={settings.show_importance}
                      onChange={(e) => handleChange('show_importance')(e.target.checked)}
                    />
                    <span
                      className={`inline-block w-4 h-4 transform bg-white rounded-full transition-all duration-300 ease-in-out ${
                        settings.show_importance ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </div>
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-base">カテゴリを色表示する</span>
                  <div className="relative inline-flex items-center h-6 rounded-full w-11 transition-all duration-300 ease-in-out"
                       style={{ backgroundColor: settings.show_category ? '#3B82F6' : '#E5E7EB' }}>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={settings.show_category}
                      onChange={(e) => handleChange('show_category')(e.target.checked)}
                    />
                    <span
                      className={`inline-block w-4 h-4 transform bg-white rounded-full transition-all duration-300 ease-in-out ${
                        settings.show_category ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </div>
                </label>
              </div>
            </div>
            {/* 表示設定用保存ボタン */}
            <div className="sticky bottom-0 left-0 right-0 bg-white pt-2 pb-1 z-10 flex flex-col gap-2">
              <button
                className={`w-[60%] mx-auto py-2 rounded-lg text-white font-bold transition-colors mb-1 ${saved ? 'bg-green-400' : 'bg-blue-500 hover:bg-blue-600'} ${(loading || !isDisplayChanged ? 'bg-gray-400 opacity-60 cursor-not-allowed' : '')}`}
                onClick={handleDisplaySave}
                disabled={loading || !isDisplayChanged}
              >
                {saved ? '保存しました！' : '保存'}
              </button>
            </div>
          </>
        )}
        {activeTab === 'view' && (
          <>
            <h3 className="text-base font-semibold mb-2">集中モード設定</h3>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex font-bold text-sm text-gray-600 mb-2">
                <div className="flex-1 pl-1">ビュー名</div>
                <div className="w-[52px] text-left -ml-5">表示</div>
                <div className="w-10 text-center"></div>
              </div>
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="focusViews">
                  {(provided: any) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}>
                      {localFocusViews.map((view, idx) => (
                        view.key !== 'focus' && (
                          <Draggable key={view.key} draggableId={view.key} index={idx}>
                            {(provided: any, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`flex items-center gap-2 p-2 rounded-lg mb-2 transition-colors ${snapshot.isDragging ? 'bg-blue-50' : 'bg-white'}`}
                              >
                                <div className="flex-1 pl-1">{view.label}</div>
                                {view.key.length > 10 && (
                                  <div className="w-8 text-center">
                                    <button
                                      onClick={() => handleEditCustomView(view.key)}
                                      className="text-blue-500 hover:text-blue-700"
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                  </div>
                                )}
                                <div className="w-10 text-right">
                                  <button
                                    onClick={() => {
                                      const newViews = localFocusViews.map(v =>
                                        v.key === view.key ? { ...v, visible: !v.visible } : v
                                      );
                                      setLocalFocusViews(newViews);
                                    }}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                                      view.visible ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
                                    }`}
                                  >
                                    {view.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                                  </button>
                                </div>
                                <div className="w-10 flex items-center justify-center cursor-grab" {...provided.dragHandleProps}>
                                  <GripVertical className="text-gray-400 hover:text-blue-500" />
                                </div>
                              </div>
                            )}
                          </Draggable>
                        )
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
              <div className="text-xs text-gray-400 mt-2">※ 並び替えはドラッグ＆ドロップで可能です</div>
            </div>
            {/* カスタムビュー追加ボタン */}
            <div className="mt-4 flex flex-col items-center">
              <button
                className="px-6 py-2 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                onClick={() => setIsCustomModalOpen(true)}
                disabled={customFocusViews.length >= 3}
              >
                <PlusCircle size={18} />
                カスタムビューを追加
              </button>
              {customFocusViews.length >= 3 && (
                <div className="text-xs text-gray-400 mt-1">※カスタムビューは最大3つまでです</div>
              )}
            </div>
            <div className="mt-6">
              <div className="text-base font-semibold mb-2">表示するタスク数</div>
              <div className="bg-gray-50 rounded-lg p-2 flex gap-2">
                {[1, 3, 5, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`flex-1 py-2 rounded-lg font-bold transition-colors duration-200 text-sm text-center
                      ${localFocusViewLimit === num
                        ? 'bg-blue-500 text-white shadow'
                        : 'bg-gray-200 text-gray-700 hover:bg-blue-100'}
                    `}
                    onClick={() => setLocalFocusViewLimit(Number(num))}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
            {/* ビュー管理用保存ボタン */}
            <div className="sticky bottom-0 left-0 right-0 bg-white pt-2 pb-1 z-10 flex flex-col gap-2">
              <button
                className={`w-[60%] mx-auto py-2 rounded-lg text-white font-bold transition-colors mb-1 ${saved ? 'bg-green-400' : 'bg-blue-500 hover:bg-blue-600'} ${(loading || !isViewChanged ? 'bg-gray-400 opacity-60 cursor-not-allowed' : '')}`}
                onClick={handleViewSave}
                disabled={loading || !isViewChanged}
              >
                {saved ? '保存しました！' : '保存'}
              </button>
            </div>
          </>
        )}
      </div>
      {/* カスタムビュー作成/編集モーダル */}
      {isCustomModalOpen && (
        <div className="fixed top-0 left-0 w-full h-full z-[9999] bg-black bg-opacity-50 flex items-center justify-center" style={{ overscrollBehavior: 'contain' }}>
          <div className="bg-white rounded-2xl p-6 w-[90%] max-w-[340px] shadow-xl relative mx-auto mt-8 mb-[env(safe-area-inset-bottom,80px)] flex flex-col" style={{ maxHeight: '90vh', minHeight: 'unset', display: 'flex', flexDirection: 'column' }}>
            <div className="flex items-center gap-2 mb-4 border-b pb-2 flex-shrink-0">
              <View size={20} className="text-blue-500" />
              <h2 className="text-lg font-bold tracking-wide">{isEditMode ? 'カスタムビュー編集' : 'カスタムビュー作成'}</h2>
              <button
                onClick={handleModalClose}
                className="ml-auto text-gray-400 hover:text-gray-700 text-xl font-bold"
                aria-label="閉じる"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4 px-2 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 64px - 24px)' }}>
              <div>
                <input
                  type="text"
                  className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 text-sm"
                  placeholder="ビュー名を入力"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value.slice(0, 12))}
                  maxLength={12}
                />
                <div className="text-right text-xs text-gray-500 mt-1">
                  {customName.length}/12文字
                </div>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-700 mb-2 px-3 py-1.5 bg-gray-50 rounded-md">期限</h3>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    {['today', 'tomorrow'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setCustomDue([opt])}
                        className={`flex-1 px-3 py-1 rounded-lg border text-sm font-medium cursor-pointer transition-colors duration-150 ${customDue.includes(opt) ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-blue-50'}`}
                      >
                        {opt === 'today' ? '今日' : '明日'}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {['within_week', 'within_month'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setCustomDue([opt])}
                        className={`flex-1 px-3 py-1 rounded-lg border text-sm font-medium cursor-pointer transition-colors duration-150 ${customDue.includes(opt) ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-blue-50'}`}
                      >
                        {opt === 'within_week' ? '今週' : '今月'}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {['overdue', 'none'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setCustomDue([opt])}
                        className={`flex-1 px-3 py-1 rounded-lg border text-sm font-medium cursor-pointer transition-colors duration-150 ${customDue.includes(opt) ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-blue-50'}`}
                      >
                        {opt === 'overdue' ? '期限切れ' : '期限なし'}
                      </button>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">※期限は1つしか選べません</div>
                </div>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-700 mb-2 px-3 py-1.5 bg-gray-50 rounded-md">重要度</h3>
                <div className="flex gap-2">
                  {['high', 'medium', 'low'].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setCustomImportance(customImportance.includes(opt) ? customImportance.filter(v => v !== opt) : [...customImportance, opt])}
                      className={`flex-1 px-3 py-1 rounded-lg border text-sm font-medium cursor-pointer transition-colors duration-150 ${customImportance.includes(opt) ? 'bg-yellow-100 border-yellow-400 text-yellow-800' : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-yellow-50'}`}
                    >
                      {opt === 'high' ? '高' : opt === 'medium' ? '中' : '低'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-700 mb-2 px-3 py-1.5 bg-gray-50 rounded-md">ハードル</h3>
                <div className="flex gap-2">
                  {[1, 2, 3].map((optNum) => (
                    <button
                      key={optNum}
                      type="button"
                      onClick={() => setCustomHurdle(customHurdle.includes(optNum) ? customHurdle.filter(v => v !== optNum) : [...customHurdle, optNum])}
                      className={`flex-1 px-3 py-1 rounded-lg border text-sm font-medium cursor-pointer transition-colors duration-150 ${customHurdle.includes(optNum) ? 'bg-green-100 border-green-400 text-green-800' : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-green-50'}`}
                    >
                      {optNum === 1 ? 'やさしい' : optNum === 2 ? '普通' : '難しい'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8 sticky bottom-0 bg-white pt-2 pb-1 z-10 px-2">
              {isEditMode ? (
                <>
                  <button
                    className="flex-1 px-4 py-2 rounded-md bg-red-500 text-white font-bold hover:bg-red-600"
                    onClick={() => handleDeleteCustomView({
                      key: editingViewId,
                      id: editingViewId,
                      isTemp: false
                    })}
                  >
                    削除
                  </button>
                  <button
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors font-semibold shadow disabled:bg-gray-300 disabled:cursor-not-allowed"
                    onClick={handleUpdateCustomView}
                    disabled={!isCustomViewValid}
                  >
                    更新
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors font-semibold"
                    onClick={handleModalClose}
                  >
                    キャンセル
                  </button>
                  <button
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors font-semibold shadow disabled:bg-gray-300 disabled:cursor-not-allowed"
                    onClick={handleAddCustomView}
                    disabled={!isCustomViewValid}
                  >
                    追加
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
};

export default SettingsDisplayDrawer; 
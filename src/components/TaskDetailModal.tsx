import React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Task } from '../types/task';
import { formatDuration } from '../utils/format';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  task: Task;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  onClose,
  onEdit,
  task
}) => {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 mb-4"
                >
                  タスクの詳細
                </Dialog.Title>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">タスク名</h4>
                    <p className="mt-1 text-base text-gray-900">{task.name}</p>
                  </div>

                  {task.description && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">説明</h4>
                      <p className="mt-1 text-base text-gray-900">{task.description}</p>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-medium text-gray-500">カテゴリー</h4>
                    <p className="mt-1 text-base text-gray-900">{task.category?.name || "その他"}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500">所要時間</h4>
                    <p className="mt-1 text-base text-gray-900">{formatDuration(task.estimated_duration_minutes)}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500">重要度</h4>
                    <p className="mt-1 text-base text-gray-900">
                      {task.importance === 'high' ? '高' : task.importance === 'medium' ? '中' : '低'}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500">ハードルレベル</h4>
                    <p className="mt-1 text-base text-gray-900">
                      {task.hurdle_level || 1} ⚡
                    </p>
                  </div>

                  {task.due_date && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">期限</h4>
                      <p className="mt-1 text-base text-gray-900">
                        {format(new Date(task.due_date), 'yyyy/MM/dd (EEEE)', { locale: ja })}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    閉じる
                  </button>
                  <button
                    type="button"
                    onClick={onEdit}
                    className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    編集
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default TaskDetailModal; 
const updateTask = async (taskId: string, updates: Partial<Task>) => {
  try {
    const taskRef = doc(db, 'tasks', taskId);
    await updateDoc(taskRef, {
      ...updates,
      updated_at: new Date().toISOString()
    });

    // ローカルのタスクリストを更新
    setTasks(prevTasks => {
      const updatedTasks = prevTasks.map(task => 
        task.id === taskId ? { ...task, ...updates, updated_at: new Date().toISOString() } : task
      );
      return updatedTasks;
    });

    // 親タスクの更新も反映
    if (updates.parent_task_id) {
      setTasks(prevTasks => {
        const parentTask = prevTasks.find(t => t.id === updates.parent_task_id);
        if (parentTask) {
          return prevTasks.map(task =>
            task.id === parentTask.id
              ? { ...task, has_children: true }
              : task
          );
        }
        return prevTasks;
      });
    }

    // 完了状態の更新時は子タスクも更新
    if (updates.status) {
      setTasks(prevTasks => {
        const childTasks = prevTasks.filter(t => t.parent_task_id === taskId);
        return prevTasks.map(task =>
          childTasks.some(ct => ct.id === task.id)
            ? { ...task, status: updates.status }
            : task
        );
      });
    }

    return true;
  } catch (error) {
    console.error('タスク更新エラー:', error);
    return false;
  }
}; 
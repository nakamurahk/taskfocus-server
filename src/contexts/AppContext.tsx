import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Task } from '../types/task';

interface AppState {
  tasks: Task[];
  selectedTasks: Task[];
  selectedTaskCount: 3 | 5 | 7;
  setSelectedTasks: (tasks: Task[]) => void;
  setSelectedTaskCount: (count: 3 | 5 | 7) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Task[]>([]);
  const [selectedTaskCount, setSelectedTaskCount] = useState<3 | 5 | 7>(5);

  return (
    <AppContext.Provider
      value={{
        tasks,
        selectedTasks,
        selectedTaskCount,
        setSelectedTasks,
        setSelectedTaskCount,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}; 
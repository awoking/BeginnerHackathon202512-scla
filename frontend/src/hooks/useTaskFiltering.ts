import { useMemo } from 'react';
import { isOverdue } from '@/lib/task-utils';
import type { Task } from '@/services/TaskApi';

interface TaskFilterOptions {
  tasks: Task[];
  leafTaskIds: Set<number>;
  showCompleted: boolean;
  showOverdue: boolean;
  sortKey: 'updated' | 'deadline';
}

export const useTaskFiltering = ({
  tasks,
  leafTaskIds,
  showCompleted,
  showOverdue,
  sortKey,
}: TaskFilterOptions) => {
  const filtered = useMemo(() => {
    // 葉タスクをフィルター
    const assignedLeaves = tasks.filter((t) => leafTaskIds.has(t.id));

    // 完了タスクをフィルター
    const withCompleted = showCompleted
      ? assignedLeaves
      : assignedLeaves.filter((t) => t.status !== 'completed');

    // 期限超過タスクをフィルター
    const withOverdue = showOverdue
      ? withCompleted
      : withCompleted.filter((t) => !isOverdue(t));

    // ソート
    const sorted = [...withOverdue].sort((a, b) => {
      if (sortKey === 'deadline') {
        const aTime = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const bTime = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return aTime - bTime;
      }
      const aTime = new Date(a.updated_at || a.created_at).getTime();
      const bTime = new Date(b.updated_at || b.created_at).getTime();
      return bTime - aTime;
    });

    return sorted;
  }, [tasks, leafTaskIds, showCompleted, showOverdue, sortKey]);

  return filtered;
};

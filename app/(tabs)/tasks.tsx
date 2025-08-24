import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, CircleCheck as CheckCircle2, Circle, Calendar, Flag, Leaf, Clock, CreditCard as Edit, Trash2, Archive } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task } from '@/types/xion';
import { useDocustore } from '@/services/docustoreService';
import {
  useAbstraxionAccount,
} from '@burnt-labs/abstraxion-react-native';

const TASKS_STORAGE_KEY = '@tendly_tasks';

// Document type for blockchain storage
interface TaskDocument {
  type: 'task';
  task: Task;
  timestamp: number;
}
export default function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    category: 'personal' as const,
  });

  // Blockchain integration
  const { data: account } = useAbstraxionAccount();
  const { docustoreService, isConnected } = useDocustore();

  // Load tasks from storage on component mount
  useEffect(() => {
    loadTasks();
  }, []);

  // Sync to blockchain when tasks change
  useEffect(() => {
    if (!loading && isConnected) {
      syncTasksToBlockchain();
    }
  }, [tasks, isConnected]);

  const syncTasksToBlockchain = async () => {
    try {
      if (!isConnected || !docustoreService) return;

      // Store tasks collection on blockchain
      const tasksDoc = {
        type: 'tasks_collection',
        tasks,
        timestamp: Date.now(),
      };

      await docustoreService.storeDocument(tasksDoc);
      console.log('Tasks synced to blockchain');
    } catch (error) {
      console.warn('Failed to sync tasks to blockchain:', error);
    }
  };
  const loadTasks = async () => {
    try {
      setLoading(true);

      // Try to load from blockchain first if connected
      if (isConnected && docustoreService) {
        const loadedFromBlockchain = await loadTasksFromBlockchain();
        if (loadedFromBlockchain) {
          setLoading(false);
          return;
        }
      }

      const storedTasks = await AsyncStorage.getItem(TASKS_STORAGE_KEY);
      if (storedTasks) {
        const parsedTasks = JSON.parse(storedTasks).map((task: any) => ({
          ...task,
          createdAt: new Date(task.createdAt),
          updatedAt: new Date(task.updatedAt),
          completedAt: task.completedAt
            ? new Date(task.completedAt)
            : undefined,
          dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        }));
        setTasks(parsedTasks);
      } else {
        // Load sample data for new users
        const sampleTasks: Task[] = [
          {
            id: '1',
            userId: account?.bech32Address || 'local_user',
            title: 'Morning workout',
            description: 'Complete 30-minute cardio session',
            priority: 'high',
            category: 'health',
            status: 'pending',
            plantType: 'tree',
            compostReward: 15,
            createdAt: new Date(),
            updatedAt: new Date(),
            dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
            tags: ['fitness', 'morning'],
          },
          {
            id: '2',
            userId: account?.bech32Address || 'local_user',
            title: 'Review project proposal',
            description: 'Read through and provide feedback',
            priority: 'medium',
            category: 'work',
            status: 'completed',
            plantType: 'flower',
            compostReward: 10,
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
            updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            tags: ['work', 'review'],
          },
          {
            id: '3',
            userId: account?.bech32Address || 'local_user',
            title: 'Call mom',
            description: 'Weekly check-in call',
            priority: 'low',
            category: 'personal',
            status: 'pending',
            plantType: 'sprout',
            compostReward: 5,
            createdAt: new Date(),
            updatedAt: new Date(),
            tags: ['family', 'personal'],
          },
        ];
        setTasks(sampleTasks);
        await saveTasks(sampleTasks);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      Alert.alert('Error', 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const loadTasksFromBlockchain = async (): Promise<boolean> => {
    try {
      if (!docustoreService || !account?.bech32Address) return false;

      const documents = await docustoreService.queryDocuments({
        owner: account.bech32Address,
        limit: 1,
      });

      const tasksDoc = documents
        .filter((doc) => doc.data.type === 'tasks_collection')
        .sort((a, b) => b.data.timestamp - a.data.timestamp)[0];

      if (tasksDoc) {
        const tasksData = tasksDoc.data.tasks;
        
        // Parse dates for tasks
        const tasksWithDates = tasksData.map((task: any) => ({
          ...task,
          createdAt: new Date(task.createdAt),
          updatedAt: new Date(task.updatedAt),
          completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
          dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        }));

        setTasks(tasksWithDates);
        return true;
      }

      return false;
    } catch (error) {
      console.warn('Failed to load tasks from blockchain:', error);
      return false;
    }
  };

  const saveTasks = async (tasksToSave: Task[]) => {
    try {
      await AsyncStorage.setItem(
        TASKS_STORAGE_KEY,
        JSON.stringify(tasksToSave)
      );
    } catch (error) {
      console.error('Error saving tasks:', error);
      Alert.alert('Error', 'Failed to save tasks');
    }
  };

  // Create new task
  const createTask = async () => {
    if (!newTask.title.trim()) {
      Alert.alert('Error', 'Task title is required');
      return;
    }

    try {
      const task: Task = {
        id: Date.now().toString(),
        userId: account?.bech32Address || 'local_user',
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        priority: newTask.priority,
        category: newTask.category,
        status: 'pending',
        plantType:
          newTask.priority === 'high'
            ? 'tree'
            : newTask.priority === 'medium'
            ? 'flower'
            : 'sprout',
        compostReward:
          newTask.priority === 'high'
            ? 15
            : newTask.priority === 'medium'
            ? 10
            : 5,
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: [],
      };

      const updatedTasks = [task, ...tasks];
      setTasks(updatedTasks);
      await saveTasks(updatedTasks);

      // Store on blockchain if connected
      if (isConnected && docustoreService) {
        try {
          const taskDoc: TaskDocument = {
            type: 'task',
            task,
            timestamp: Date.now(),
          };
          const docId = await docustoreService.storeDocument(taskDoc);
          
          // Update task with blockchain document ID
          const taskWithDocId = { ...task, blockchainDocId: docId };
          const tasksWithDocId = updatedTasks.map(t => 
            t.id === task.id ? taskWithDocId : t
          );
          setTasks(tasksWithDocId);
          await saveTasks(tasksWithDocId);
        } catch (error) {
          console.warn('Failed to store task on blockchain:', error);
        }
      }

      // Reset form
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        category: 'personal',
      });
      setShowAddModal(false);

      Alert.alert('Success', 'Task created successfully!');
    } catch (error) {
      console.error('Error creating task:', error);
      Alert.alert('Error', 'Failed to create task');
    }
  };

  // Update existing task
  const updateTask = async () => {
    if (!editingTask || !newTask.title.trim()) {
      Alert.alert('Error', 'Task title is required');
      return;
    }

    try {
      const updatedTask: Task = {
        ...editingTask,
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        priority: newTask.priority,
        category: newTask.category,
        plantType:
          newTask.priority === 'high'
            ? 'tree'
            : newTask.priority === 'medium'
            ? 'flower'
            : 'sprout',
        compostReward:
          newTask.priority === 'high'
            ? 15
            : newTask.priority === 'medium'
            ? 10
            : 5,
        updatedAt: new Date(),
      };

      const updatedTasks = tasks.map((task) =>
        task.id === editingTask.id ? updatedTask : task
      );

      setTasks(updatedTasks);
      await saveTasks(updatedTasks);

      // Update on blockchain if connected
      if (isConnected && docustoreService && editingTask.blockchainDocId) {
        try {
          const taskDoc: TaskDocument = {
            type: 'task',
            task: updatedTask,
            timestamp: Date.now(),
          };
          await docustoreService.updateDocument(editingTask.blockchainDocId, taskDoc);
        } catch (error) {
          console.warn('Failed to update task on blockchain:', error);
        }
      }

      // Reset form
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        category: 'personal',
      });
      setEditingTask(null);
      setShowAddModal(false);

      Alert.alert('Success', 'Task updated successfully!');
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Error', 'Failed to update task');
    }
  };

  // Toggle task completion
  const toggleTaskCompletion = async (taskId: string) => {
    try {
      const updatedTasks = tasks.map((task) => {
        if (task.id === taskId) {
          const isCompleting = task.status !== 'completed';
          return {
            ...task,
            status: isCompleting ? 'completed' : 'pending',
            completedAt: isCompleting ? new Date() : undefined,
            updatedAt: new Date(),
          };
        }
        return task;
      });

      setTasks(updatedTasks);
      await saveTasks(updatedTasks);

      const task = tasks.find((t) => t.id === taskId);
      if (task && task.status !== 'completed') {
        Alert.alert(
          'Great job!',
          `You earned ${task.compostReward} compost! 🌱`
        );
      }
    } catch (error) {
      console.error('Error toggling task:', error);
      Alert.alert('Error', 'Failed to update task');
    }
  };

  // Archive task
  const archiveTask = async (taskId: string) => {
    try {
      const updatedTasks = tasks.map((task) =>
        task.id === taskId ? { 
          ...task, 
          status: 'archived',
          updatedAt: new Date()
        } : task
      );

      setTasks(updatedTasks);
      await saveTasks(updatedTasks);

      Alert.alert('Success', 'Task archived successfully!');
    } catch (error) {
      console.error('Error archiving task:', error);
      Alert.alert('Error', 'Failed to archive task');
    }
  };

  // Delete task
  const deleteTask = async (taskId: string) => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const taskToDelete = tasks.find(t => t.id === taskId);
              const updatedTasks = tasks.filter((task) => task.id !== taskId);
              setTasks(updatedTasks);
              await saveTasks(updatedTasks);

              // Delete from blockchain if connected
              if (isConnected && docustoreService && taskToDelete?.blockchainDocId) {
                try {
                  await docustoreService.deleteDocument(taskToDelete.blockchainDocId);
                } catch (error) {
                  console.warn('Failed to delete task from blockchain:', error);
                }
              }

              Alert.alert('Success', 'Task deleted successfully!');
            } catch (error) {
              console.error('Error deleting task:', error);
              Alert.alert('Error', 'Failed to delete task');
            }
          },
        },
      ]
    );
  };

  // Open edit modal
  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setNewTask({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      category: task.category,
    });
    setShowAddModal(true);
  };

  // Close modal and reset form
  const closeModal = () => {
    setShowAddModal(false);
    setEditingTask(null);
    setNewTask({
      title: '',
      description: '',
      priority: 'medium',
      category: 'personal',
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#D97757';
      case 'medium':
        return '#F59E0B';
      case 'low':
        return '#87A96B';
      default:
        return '#87A96B';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'work':
        return '💼';
      case 'health':
        return '💪';
      case 'learning':
        return '📚';
      case 'personal':
        return '🏠';
      default:
        return '📝';
    }
  };

  // Filter out archived tasks for display
  const activeTasks = tasks.filter((task) => task.status !== 'archived');
  const completedTasks = activeTasks.filter((task) => task.status === 'completed');
  const pendingTasks = activeTasks.filter((task) => task.status === 'pending');

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>Loading tasks...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#E8F4E6', '#F5F1E8']} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Task Garden</Text>
              <Text style={styles.subtitle}>
                {pendingTasks.length} tasks to plant • {completedTasks.length}{' '}
                growing{isConnected && ' • ⛓️ Synced'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}
            >
              <Plus size={24} color="#F5F1E8" />
            </TouchableOpacity>
          </View>

          {/* Pending Tasks */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ready to Plant 🌱</Text>
            {pendingTasks.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No pending tasks</Text>
                <Text style={styles.emptySubtext}>
                  Create a new task to start growing your garden!
                </Text>
              </View>
            ) : (
              pendingTasks.map((task) => (
                <View key={task.id} style={styles.taskCard}>
                  <TouchableOpacity
                    style={styles.taskLeft}
                    onPress={() => toggleTaskCompletion(task.id)}
                  >
                    <Circle size={24} color="#87A96B" strokeWidth={2} />
                    <View style={styles.taskContent}>
                      <View style={styles.taskHeader}>
                        <Text style={styles.taskTitle}>{task.title}</Text>
                        <View style={styles.taskMeta}>
                          <Text style={styles.categoryEmoji}>
                            {getCategoryIcon(task.category)}
                          </Text>
                          <View
                            style={[
                              styles.priorityIndicator,
                              {
                                backgroundColor: getPriorityColor(
                                  task.priority
                                ),
                              },
                            ]}
                          />
                        </View>
                      </View>
                      {task.description && (
                        <Text style={styles.taskDescription}>
                          {task.description}
                        </Text>
                      )}
                      <View style={styles.taskFooter}>
                        <View style={styles.rewardInfo}>
                          <Leaf size={14} color="#87A96B" />
                          <Text style={styles.rewardText}>
                            +{task.compostReward} compost
                          </Text>
                          {task.blockchainDocId && (
                            <Text style={styles.blockchainIndicator}>⛓️</Text>
                          )}
                        </View>
                        {task.dueDate && (
                          <View style={styles.dueDate}>
                            <Clock size={12} color="#8B7355" />
                            <Text style={styles.dueText}>
                              {task.dueDate.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Task Actions */}
                  <View style={styles.taskActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => openEditModal(task)}
                    >
                      <Edit size={16} color="#8B7355" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => archiveTask(task.id)}
                    >
                      <Archive size={16} color="#8B7355" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => deleteTask(task.id)}
                    >
                      <Trash2 size={16} color="#D97757" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Growing Strong 🌿</Text>
              {completedTasks.map((task) => (
                <View
                  key={task.id}
                  style={[styles.taskCard, styles.completedTask]}
                >
                  <TouchableOpacity
                    style={styles.taskLeft}
                    onPress={() => toggleTaskCompletion(task.id)}
                  >
                    <CheckCircle2 size={24} color="#87A96B" />
                    <View style={styles.taskContent}>
                      <Text style={[styles.taskTitle, styles.completedTitle]}>
                        {task.title}
                      </Text>
                      <View style={styles.taskFooter}>
                        <View style={styles.rewardInfo}>
                          <Leaf size={14} color="#87A96B" />
                          <Text style={styles.rewardText}>
                            +{task.compostReward} earned
                          </Text>
                        </View>
                        {task.completedAt && (
                          <Text style={styles.completedTime}>
                            Completed{' '}
                            {task.completedAt.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Completed Task Actions */}
                  <View style={styles.taskActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => archiveTask(task.id)}
                    >
                      <Archive size={16} color="#8B7355" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => deleteTask(task.id)}
                    >
                      <Trash2 size={16} color="#D97757" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Add/Edit Task Modal */}
        <Modal
          visible={showAddModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeModal}>
                <Text style={styles.cancelButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingTask ? 'Edit Task' : 'Plant New Task'}
              </Text>
              <TouchableOpacity onPress={editingTask ? updateTask : createTask}>
                <Text style={styles.saveButton}>
                  {editingTask ? 'Update' : 'Plant'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Task Name</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="What would you like to accomplish?"
                  value={newTask.title}
                  onChangeText={(text) =>
                    setNewTask({ ...newTask, title: text })
                  }
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description (optional)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Add some details..."
                  value={newTask.description}
                  onChangeText={(text) =>
                    setNewTask({ ...newTask, description: text })
                  }
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Priority</Text>
                <View style={styles.prioritySelector}>
                  {(['low', 'medium', 'high'] as const).map((priority) => (
                    <TouchableOpacity
                      key={priority}
                      style={[
                        styles.priorityOption,
                        newTask.priority === priority &&
                          styles.prioritySelected,
                        { borderColor: getPriorityColor(priority) },
                      ]}
                      onPress={() => setNewTask({ ...newTask, priority })}
                    >
                      <Text
                        style={[
                          styles.priorityText,
                          newTask.priority === priority && {
                            color: getPriorityColor(priority),
                          },
                        ]}
                      >
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category</Text>
                <View style={styles.categorySelector}>
                  {(['personal', 'work', 'health', 'learning'] as const).map(
                    (category) => (
                      <TouchableOpacity
                        key={category}
                        style={[
                          styles.categoryOption,
                          newTask.category === category &&
                            styles.categorySelected,
                        ]}
                        onPress={() => setNewTask({ ...newTask, category })}
                      >
                        <Text style={styles.categoryEmoji}>
                          {getCategoryIcon(category)}
                        </Text>
                        <Text
                          style={[
                            styles.categoryText,
                            newTask.category === category &&
                              styles.categorySelectedText,
                          ]}
                        >
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    )
                  )}
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1E8',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2C5F41',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '400',
  },
  addButton: {
    backgroundColor: '#87A96B',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C5F41',
    marginBottom: 16,
  },
  emptyState: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(229, 221, 208, 0.6)',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B7355',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  taskCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(229, 221, 208, 0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  completedTask: {
    backgroundColor: 'rgba(135, 169, 107, 0.1)',
    borderColor: 'rgba(135, 169, 107, 0.3)',
  },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  taskContent: {
    flex: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C5F41',
    flex: 1,
    marginRight: 8,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: '#87A96B',
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryEmoji: {
    fontSize: 16,
  },
  priorityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  taskDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardText: {
    fontSize: 12,
    color: '#87A96B',
    fontWeight: '500',
  },
  blockchainIndicator: {
    fontSize: 12,
    color: '#87A96B',
    marginLeft: 4,
  },
  dueDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueText: {
    fontSize: 12,
    color: '#8B7355',
  },
  completedTime: {
    fontSize: 12,
    color: '#8B7355',
  },
  taskActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(229, 221, 208, 0.6)',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F1E8',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(229, 221, 208, 0.6)',
  },
  cancelButton: {
    fontSize: 16,
    color: '#8B7355',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C5F41',
  },
  saveButton: {
    fontSize: 16,
    color: '#87A96B',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C5F41',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(229, 221, 208, 0.6)',
    color: '#2C5F41',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  prioritySelector: {
    flexDirection: 'row',
    gap: 12,
  },
  priorityOption: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  prioritySelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  categorySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(229, 221, 208, 0.6)',
    minWidth: '45%',
  },
  categorySelected: {
    backgroundColor: 'rgba(135, 169, 107, 0.1)',
    borderColor: '#87A96B',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  categorySelectedText: {
    color: '#87A96B',
  },
});

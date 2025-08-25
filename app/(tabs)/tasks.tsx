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
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, CircleCheck as CheckCircle2, Circle, Calendar, Flag, Leaf, Clock, CreditCard as Edit, Trash2, Archive, X, Save } from 'lucide-react-native';
import {
  useAbstraxionAccount,
  useAbstraxionSigningClient,
  useAbstraxionClient,
} from '@burnt-labs/abstraxion-react-native';
import { Task } from '@/types/xion';

if (!process.env.EXPO_PUBLIC_DOCUSTORE_CONTRACT_ADDRESS) {
  throw new Error(
    'EXPO_PUBLIC_DOCUSTORE_CONTRACT_ADDRESS is not set in your environment file'
  );
}

type TaskSummary = {
  total: number;
  completed: number;
  pending: number;
  archived: number;
};

export default function TasksScreen() {
  // Abstraxion hooks
  const { data: account, isConnected, isConnecting, login } = useAbstraxionAccount();
  const { client } = useAbstraxionSigningClient();
  const { client: queryClient } = useAbstraxionClient();

  // State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [summary, setSummary] = useState<TaskSummary>({
    total: 0,
    completed: 0,
    pending: 0,
    archived: 0,
  });
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<{
    type: 'complete' | 'delete' | 'archive';
    id: string;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    category: 'personal' as const,
  });

  // Fetch tasks from docustore
  const fetchTasks = async () => {
    if (!queryClient || !account) {
      console.log('Cannot fetch tasks - missing queryClient or account:', {
        hasQueryClient: !!queryClient,
        hasAccount: !!account,
        accountAddress: account?.bech32Address,
      });
      return;
    }

    const contractAddress = process.env.EXPO_PUBLIC_DOCUSTORE_CONTRACT_ADDRESS as string;
    console.log('Fetching tasks with contract address:', contractAddress);

    try {
      console.log('Querying contract with params:', {
        owner: account.bech32Address,
        collection: 'tasks',
      });

      const response = await queryClient.queryContractSmart(contractAddress, {
        UserDocuments: {
          owner: account.bech32Address,
          collection: 'tasks',
        },
      });

      console.log('Raw response from contract:', response);

      if (response?.documents) {
        console.log('Documents found:', response.documents);
        const tasksList = response.documents.map(([id, doc]: [string, any]) => {
          const data = typeof doc.data === 'string' ? JSON.parse(doc.data) : doc.data;
          console.log('Processing task:', { id, data });
          return {
            id,
            userId: data.userId,
            title: data.title,
            description: data.description,
            priority: data.priority,
            category: data.category,
            status: data.status,
            plantType: data.plantType,
            compostReward: data.compostReward,
            estimatedFocusTime: data.estimatedFocusTime,
            actualFocusTime: data.actualFocusTime,
            createdAt: new Date(data.createdAt),
            updatedAt: new Date(data.updatedAt),
            completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
            dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
            tags: data.tags || [],
          } as Task;
        });

        // Sort tasks by creation date (newest first)
        const sortedTasks = tasksList.sort((a: Task, b: Task) => {
          return b.createdAt.getTime() - a.createdAt.getTime();
        });

        console.log('Final sorted tasks:', sortedTasks);
        setTasks(sortedTasks);

        // Update summary
        const completed = sortedTasks.filter((t: Task) => t.status === 'completed').length;
        const pending = sortedTasks.filter((t: Task) => t.status === 'pending').length;
        const archived = sortedTasks.filter((t: Task) => t.status === 'archived').length;
        
        setSummary({
          total: sortedTasks.length,
          completed,
          pending,
          archived,
        });
      } else {
        console.log('No documents found in response');
        setTasks([]);
        setSummary({ total: 0, completed: 0, pending: 0, archived: 0 });
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setTasks([]);
      setSummary({ total: 0, completed: 0, pending: 0, archived: 0 });
    }
  };

  // CREATE - Add new task
  const addTask = async () => {
    if (!client || !account || !newTask.title.trim() || !queryClient) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    const contractAddress = process.env.EXPO_PUBLIC_DOCUSTORE_CONTRACT_ADDRESS as string;
    const taskId = Date.now().toString();
    
    const task: Task = {
      id: taskId,
      userId: account.bech32Address,
      title: newTask.title.trim(),
      description: newTask.description.trim(),
      priority: newTask.priority,
      category: newTask.category,
      status: 'pending',
      plantType: newTask.priority === 'high' ? 'tree' : newTask.priority === 'medium' ? 'flower' : 'sprout',
      compostReward: newTask.priority === 'high' ? 15 : newTask.priority === 'medium' ? 10 : 5,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
    };

    setLoading(true);
    try {
      await client.execute(
        account.bech32Address,
        contractAddress,
        {
          Set: {
            collection: 'tasks',
            document: taskId,
            data: JSON.stringify(task),
          },
        },
        'auto'
      );

      // Wait for confirmation with retry logic
      let retries = 0;
      const maxRetries = 10;
      const delay = 2000;

      while (retries < maxRetries) {
        try {
          const response = await queryClient.queryContractSmart(contractAddress, {
            UserDocuments: {
              owner: account.bech32Address,
              collection: 'tasks',
            },
          });

          if (response?.documents) {
            const found = response.documents.some(([id]: [string, any]) => id === taskId);
            if (found) {
              break;
            }
          }
        } catch (error) {
          console.log(`Confirmation attempt ${retries + 1} failed:`, error);
        }

        retries++;
        if (retries < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      // Reset form and close modal
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        category: 'personal',
      });
      setShowAddModal(false);

      // Refresh tasks list
      await fetchTasks();
      Alert.alert('Success', 'Task planted in your garden! 🌱');
    } catch (error) {
      console.error('Error adding task:', error);
      Alert.alert('Error', 'Failed to add task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // UPDATE - Edit existing task
  const updateTask = async () => {
    if (!client || !account || !editingTask || !newTask.title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    const contractAddress = process.env.EXPO_PUBLIC_DOCUSTORE_CONTRACT_ADDRESS as string;

    setLoading(true);
    try {
      const updatedTask: Task = {
        ...editingTask,
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        priority: newTask.priority,
        category: newTask.category,
        plantType: newTask.priority === 'high' ? 'tree' : newTask.priority === 'medium' ? 'flower' : 'sprout',
        compostReward: newTask.priority === 'high' ? 15 : newTask.priority === 'medium' ? 10 : 5,
        updatedAt: new Date(),
      };

      await client.execute(
        account.bech32Address,
        contractAddress,
        {
          Update: {
            collection: 'tasks',
            document: editingTask.id,
            data: JSON.stringify(updatedTask),
          },
        },
        'auto'
      );

      // Update local state immediately
      setTasks(tasks.map((task) => (task.id === editingTask.id ? updatedTask : task)));

      // Reset form and close modal
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        category: 'personal',
      });
      setEditingTask(null);
      setShowAddModal(false);

      Alert.alert('Success', 'Task updated successfully! 🌿');
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Error', 'Failed to update task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // UPDATE - Toggle task completion
  const toggleTaskCompletion = async (task: Task) => {
    if (!client || !account) return;

    const contractAddress = process.env.EXPO_PUBLIC_DOCUSTORE_CONTRACT_ADDRESS as string;

    setLoadingAction({ type: 'complete', id: task.id });
    try {
      const isCompleting = task.status !== 'completed';
      const updatedTask: Task = {
        ...task,
        status: isCompleting ? 'completed' : 'pending',
        completedAt: isCompleting ? new Date() : undefined,
        updatedAt: new Date(),
      };

      await client.execute(
        account.bech32Address,
        contractAddress,
        {
          Update: {
            collection: 'tasks',
            document: task.id,
            data: JSON.stringify(updatedTask),
          },
        },
        'auto'
      );

      // Update local state
      setTasks(tasks.map((t) => (t.id === task.id ? updatedTask : t)));

      // Update summary
      const completed = tasks.filter((t) =>
        t.id === task.id ? updatedTask.status === 'completed' : t.status === 'completed'
      ).length;
      const pending = tasks.filter((t) =>
        t.id === task.id ? updatedTask.status === 'pending' : t.status === 'pending'
      ).length;
      const archived = tasks.filter((t) => t.status === 'archived').length;

      setSummary({
        total: tasks.length,
        completed,
        pending,
        archived,
      });

      if (isCompleting) {
        Alert.alert('Task Completed! 🎉', `You earned ${task.compostReward} compost and planted a ${task.plantType}!`);
      }
    } catch (error) {
      console.error('Error toggling task completion:', error);
      Alert.alert('Error', 'Failed to update task. Please try again.');
    } finally {
      setLoadingAction(null);
    }
  };

  // UPDATE - Archive task
  const archiveTask = async (taskId: string) => {
    if (!client || !account) return;

    const contractAddress = process.env.EXPO_PUBLIC_DOCUSTORE_CONTRACT_ADDRESS as string;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    setLoadingAction({ type: 'archive', id: taskId });
    try {
      const updatedTask: Task = {
        ...task,
        status: 'archived',
        updatedAt: new Date(),
      };

      await client.execute(
        account.bech32Address,
        contractAddress,
        {
          Update: {
            collection: 'tasks',
            document: taskId,
            data: JSON.stringify(updatedTask),
          },
        },
        'auto'
      );

      // Update local state
      setTasks(tasks.map((t) => (t.id === taskId ? updatedTask : t)));

      // Update summary
      const completed = tasks.filter((t) => t.id !== taskId && t.status === 'completed').length;
      const pending = tasks.filter((t) => t.id !== taskId && t.status === 'pending').length;
      const archived = tasks.filter((t) => t.id === taskId || t.status === 'archived').length;

      setSummary({
        total: tasks.length,
        completed,
        pending,
        archived,
      });

      Alert.alert('Success', 'Task archived to garden history! 📚');
    } catch (error) {
      console.error('Error archiving task:', error);
      Alert.alert('Error', 'Failed to archive task. Please try again.');
    } finally {
      setLoadingAction(null);
    }
  };

  // DELETE - Remove task permanently
  const deleteTask = async (taskId: string) => {
    if (!client || !account) return;

    Alert.alert(
      'Delete Task',
      'Are you sure you want to permanently delete this task? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const contractAddress = process.env.EXPO_PUBLIC_DOCUSTORE_CONTRACT_ADDRESS as string;

            setLoadingAction({ type: 'delete', id: taskId });
            try {
              await client.execute(
                account.bech32Address,
                contractAddress,
                {
                  Delete: {
                    collection: 'tasks',
                    document: taskId,
                  },
                },
                'auto'
              );

              // Update local state
              const updatedTasks = tasks.filter((t) => t.id !== taskId);
              setTasks(updatedTasks);

              // Update summary
              const completed = updatedTasks.filter((t) => t.status === 'completed').length;
              const pending = updatedTasks.filter((t) => t.status === 'pending').length;
              const archived = updatedTasks.filter((t) => t.status === 'archived').length;

              setSummary({
                total: updatedTasks.length,
                completed,
                pending,
                archived,
              });

              Alert.alert('Success', 'Task deleted successfully!');
            } catch (error) {
              console.error('Error deleting task:', error);
              Alert.alert('Error', 'Failed to delete task. Please try again.');
            } finally {
              setLoadingAction(null);
            }
          },
        },
      ]
    );
  };

  // Load tasks when account changes
  useEffect(() => {
    console.log('Fetching tasks - account changed or component mounted');
    if (account?.bech32Address) {
      fetchTasks();
    }
  }, [account?.bech32Address]);

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTasks();
    setRefreshing(false);
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

  // Filter tasks for display
  const activeTasks = tasks.filter((task) => task.status !== 'archived');
  const pendingTasks = activeTasks.filter((task) => task.status === 'pending');
  const completedTasks = activeTasks.filter((task) => task.status === 'completed');

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#E8F4E6', '#F5F1E8']} style={styles.gradient}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Task Garden</Text>
              <Text style={styles.subtitle}>
                {pendingTasks.length} tasks to plant • {completedTasks.length} growing
                {isConnected && ' • ⛓️ Synced'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}
              disabled={!isConnected}
            >
              <Plus size={24} color="#F5F1E8" />
            </TouchableOpacity>
          </View>

          {/* Connection Status */}
          {!isConnected && (
            <View style={styles.connectionCard}>
              <Text style={styles.connectionTitle}>Connect Wallet to Plant Tasks</Text>
              <Text style={styles.connectionDescription}>
                Connect your XION wallet to store tasks on the blockchain and grow your garden
              </Text>
              <TouchableOpacity
                style={[styles.connectButton, isConnecting && styles.disabledButton]}
                onPress={login}
                disabled={isConnecting}
              >
                <Text style={styles.connectButtonText}>
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {isConnected && (
            <>
              {/* Summary Section */}
              <View style={styles.summaryCard}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{summary.total}</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{summary.completed}</Text>
                  <Text style={styles.statLabel}>Completed</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{summary.pending}</Text>
                  <Text style={styles.statLabel}>Pending</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{summary.archived}</Text>
                  <Text style={styles.statLabel}>Archived</Text>
                </View>
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
                        onPress={() => toggleTaskCompletion(task)}
                        disabled={!!loadingAction}
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
                                  { backgroundColor: getPriorityColor(task.priority) },
                                ]}
                              />
                            </View>
                          </View>
                          {task.description && (
                            <Text style={styles.taskDescription}>{task.description}</Text>
                          )}
                          <View style={styles.taskFooter}>
                            <View style={styles.rewardInfo}>
                              <Leaf size={14} color="#87A96B" />
                              <Text style={styles.rewardText}>+{task.compostReward} compost</Text>
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
                          disabled={!!loadingAction}
                        >
                          <Edit size={16} color="#8B7355" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => archiveTask(task.id)}
                          disabled={!!loadingAction}
                        >
                          <Archive size={16} color="#8B7355" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => deleteTask(task.id)}
                          disabled={!!loadingAction}
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
                    <View key={task.id} style={[styles.taskCard, styles.completedTask]}>
                      <TouchableOpacity
                        style={styles.taskLeft}
                        onPress={() => toggleTaskCompletion(task)}
                        disabled={!!loadingAction}
                      >
                        <CheckCircle2 size={24} color="#87A96B" />
                        <View style={styles.taskContent}>
                          <Text style={[styles.taskTitle, styles.completedTitle]}>
                            {task.title}
                          </Text>
                          <View style={styles.taskFooter}>
                            <View style={styles.rewardInfo}>
                              <Leaf size={14} color="#87A96B" />
                              <Text style={styles.rewardText}>+{task.compostReward} earned</Text>
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
                          disabled={!!loadingAction}
                        >
                          <Archive size={16} color="#8B7355" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => deleteTask(task.id)}
                          disabled={!!loadingAction}
                        >
                          <Trash2 size={16} color="#D97757" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
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
                <X size={24} color="#8B7355" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingTask ? 'Edit Task' : 'Plant New Task'}
              </Text>
              <TouchableOpacity 
                onPress={editingTask ? updateTask : addTask}
                disabled={loading || !newTask.title.trim()}
              >
                <Save size={24} color={loading || !newTask.title.trim() ? "#C4B59A" : "#87A96B"} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Task Name</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="What would you like to accomplish?"
                  value={newTask.title}
                  onChangeText={(text) => setNewTask({ ...newTask, title: text })}
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description (optional)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Add some details..."
                  value={newTask.description}
                  onChangeText={(text) => setNewTask({ ...newTask, description: text })}
                  multiline
                  numberOfLines={3}
                  editable={!loading}
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
                        newTask.priority === priority && styles.prioritySelected,
                        { borderColor: getPriorityColor(priority) },
                      ]}
                      onPress={() => setNewTask({ ...newTask, priority })}
                      disabled={loading}
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
                      <Text style={styles.plantTypeText}>
                        {priority === 'high' ? '🌳' : priority === 'medium' ? '🌸' : '🌱'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category</Text>
                <View style={styles.categorySelector}>
                  {(['personal', 'work', 'health', 'learning'] as const).map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryOption,
                        newTask.category === category && styles.categorySelected,
                      ]}
                      onPress={() => setNewTask({ ...newTask, category })}
                      disabled={loading}
                    >
                      <Text style={styles.categoryEmoji}>{getCategoryIcon(category)}</Text>
                      <Text
                        style={[
                          styles.categoryText,
                          newTask.category === category && styles.categorySelectedText,
                        ]}
                      >
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>

        {/* Global Loading Overlay */}
        {(loadingAction || loading) && (
          <View style={styles.globalLoadingOverlay}>
            <View style={styles.loadingContent}>
              <ActivityIndicator size="large" color="#87A96B" />
              <Text style={styles.loadingText}>
                {loading
                  ? editingTask ? 'Updating...' : 'Adding...'
                  : loadingAction?.type === 'complete'
                  ? 'Updating...'
                  : loadingAction?.type === 'archive'
                  ? 'Archiving...'
                  : 'Deleting...'}
              </Text>
            </View>
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1E8',
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 100,
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
  connectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(229, 221, 208, 0.6)',
  },
  connectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C5F41',
    marginBottom: 8,
    textAlign: 'center',
  },
  connectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  connectButton: {
    backgroundColor: '#87A96B',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  connectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F5F1E8',
  },
  disabledButton: {
    backgroundColor: '#C4B59A',
    opacity: 0.7,
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: 'rgba(229, 221, 208, 0.6)',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C5F41',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C5F41',
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
    marginBottom: 4,
  },
  plantTypeText: {
    fontSize: 16,
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
  globalLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 150,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#2C5F41',
    fontWeight: '500',
  },
});
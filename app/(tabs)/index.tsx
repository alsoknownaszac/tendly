import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import {
  useAbstraxionAccount,
  useAbstraxionSigningClient,
  useAbstraxionClient,
} from '@burnt-labs/abstraxion-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Sprout,
  Plus,
  CreditCard as Edit3,
  Trash2,
  CircleCheck as CheckCircle2,
  Circle,
  X,
  Save,
} from 'lucide-react-native';
import { GardenPlant } from '@/components/GardenPlant';
import { WeatherMood } from '@/components/WeatherMood';
import { CompostCounter } from '@/components/CompostCounter';
import { Task, Plant } from '@/types/xion';
import { useDocustore } from '@/services/docustoreService';

const { width } = Dimensions.get('window');

type RootStackParamList = {
  index: { refresh?: number };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'index'>;

// Docustore Service for XION blockchain integration
import {
  useAbstraxionAccount,
} from '@burnt-labs/abstraxion-react-native';

export interface DocustoreDocument {
  id: string;
  data: any;
  owner: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocustoreQuery {
  owner?: string;
  limit?: number;
  offset?: number;
}

export class DocustoreService {
  private signingClient: any;
  private queryClient: any;
  private account: any;

  constructor(signingClient: any, queryClient: any, account: any) {
    this.signingClient = signingClient;
    this.queryClient = queryClient;
    this.account = account;
  }

  // CREATE - Store document in docustore
  async storeDocument(data: any): Promise<string> {
    if (!this.signingClient || !this.account?.bech32Address) {
      throw new Error('Wallet not connected');
    }

    try {
      const msg = {
        typeUrl: '/docustore.v1.MsgStoreDocument',
        value: {
          creator: this.account.bech32Address,
          data: JSON.stringify(data),
        },
      };

      const fee = {
        amount: [{ denom: 'uxion', amount: '1000' }],
        gas: '200000',
      };

      const result = await this.signingClient.signAndBroadcast(
        this.account.bech32Address,
        [msg],
        fee,
        'Store document in Tendly'
      );

      if (result.code !== 0) {
        throw new Error(`Transaction failed: ${result.rawLog}`);
      }

      // Extract document ID from transaction result
      const documentId = this.extractDocumentId(result);
      return documentId;
    } catch (error) {
      console.error('Failed to store document:', error);
      throw error;
    }
  }

  // READ - Query documents from docustore
  async queryDocuments(query: DocustoreQuery = {}): Promise<DocustoreDocument[]> {
    if (!this.queryClient) {
      throw new Error('Query client not available');
    }

    try {
      const queryMsg = {
        documents: {
          owner: query.owner || this.account?.bech32Address,
          limit: query.limit || 100,
          offset: query.offset || 0,
        },
      };

      const result = await this.queryClient.queryContractSmart(
        process.env.EXPO_PUBLIC_DOCUSTORE_CONTRACT_ADDRESS,
        queryMsg
      );

      return result.documents.map((doc: any) => ({
        id: doc.id,
        data: JSON.parse(doc.data),
        owner: doc.owner,
        createdAt: new Date(doc.created_at),
        updatedAt: new Date(doc.updated_at),
      }));
    } catch (error) {
      console.error('Failed to query documents:', error);
      throw error;
    }
  }

  // READ - Get specific document by ID
  async getDocument(documentId: string): Promise<DocustoreDocument | null> {
    if (!this.queryClient) {
      throw new Error('Query client not available');
    }

    try {
      const queryMsg = {
        document: {
          id: documentId,
        },
      };

      const result = await this.queryClient.queryContractSmart(
        process.env.EXPO_PUBLIC_DOCUSTORE_CONTRACT_ADDRESS,
        queryMsg
      );

      if (!result.document) {
        return null;
      }

      return {
        id: result.document.id,
        data: JSON.parse(result.document.data),
        owner: result.document.owner,
        createdAt: new Date(result.document.created_at),
        updatedAt: new Date(result.document.updated_at),
      };
    } catch (error) {
      console.error('Failed to get document:', error);
      return null;
    }
  }

  // UPDATE - Update existing document
  async updateDocument(documentId: string, data: any): Promise<void> {
    if (!this.signingClient || !this.account?.bech32Address) {
      throw new Error('Wallet not connected');
    }

    try {
      const msg = {
        typeUrl: '/docustore.v1.MsgUpdateDocument',
        value: {
          creator: this.account.bech32Address,
          id: documentId,
          data: JSON.stringify(data),
        },
      };

      const fee = {
        amount: [{ denom: 'uxion', amount: '1000' }],
        gas: '200000',
      };

      const result = await this.signingClient.signAndBroadcast(
        this.account.bech32Address,
        [msg],
        fee,
        'Update document in Tendly'
      );

      if (result.code !== 0) {
        throw new Error(`Transaction failed: ${result.rawLog}`);
      }
    } catch (error) {
      console.error('Failed to update document:', error);
      throw error;
    }
  }

  // DELETE - Delete document from docustore
  async deleteDocument(documentId: string): Promise<void> {
    if (!this.signingClient || !this.account?.bech32Address) {
      throw new Error('Wallet not connected');
    }

    try {
      const msg = {
        typeUrl: '/docustore.v1.MsgDeleteDocument',
        value: {
          creator: this.account.bech32Address,
          id: documentId,
        },
      };

      const fee = {
        amount: [{ denom: 'uxion', amount: '1000' }],
        gas: '200000',
      };

      const result = await this.signingClient.signAndBroadcast(
        this.account.bech32Address,
        [msg],
        fee,
        'Delete document from Tendly'
      );

      if (result.code !== 0) {
        throw new Error(`Transaction failed: ${result.rawLog}`);
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
      throw error;
    }
  }

  private extractDocumentId(result: any): string {
    // Extract document ID from transaction events
    const events = result.events || [];
    for (const event of events) {
      if (event.type === 'docustore.document_stored') {
        const idAttr = event.attributes.find((attr: any) => attr.key === 'id');
        if (idAttr) {
          return idAttr.value;
        }
      }
    }
    
    // Fallback: generate ID from transaction hash
    return `doc_${result.transactionHash}_${Date.now()}`;
  }
}

// Hook to use docustore service
export function useDocustore() {
  const { data: account, isConnected } = useAbstraxionAccount();
  const { client: signingClient } = useAbstraxionSigningClient();
  const { client: queryClient } = useAbstraxionClient();

  const docustoreService = new DocustoreService(
    signingClient,
    queryClient,
    account
  );

  return {
    docustoreService,
    isConnected,
    account,
  };
}

// Add retry utility function
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve: () => void) => setTimeout(resolve, ms));

const retryOperation = async <T,>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> => {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.log(`Attempt ${i + 1} failed:`, error);
      if (i < maxRetries - 1) {
        await sleep(delay * Math.pow(2, i)); // Exponential backoff
      }
    }
  }

  throw lastError;
};

const STORAGE_KEYS = {
  TASKS: 'tendly_tasks',
  PLANTS: 'tendly_plants',
  COMPOST: 'tendly_compost',
  MOOD: 'tendly_mood',
};

// Document types for blockchain storage
interface TaskDocument {
  type: 'task';
  task: Task;
  timestamp: number;
}

interface PlantDocument {
  type: 'plant';
  plant: Plant;
  timestamp: number;
}

interface GardenDocument {
  type: 'garden_state';
  tasks: Task[];
  plants: Plant[];
  compost: number;
  mood: 'sunny' | 'cloudy' | 'rainy';
  timestamp: number;
}
export default function GardenScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [mood, setMood] = useState<'sunny' | 'cloudy' | 'rainy'>('sunny');
  const [compost, setCompost] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    category: 'personal' as const,
  });

  // Abstraxion hooks - always call them unconditionally
  const account = useAbstraxionAccount();
  const { docustoreService, isConnected } = useDocustore();
  const navigation = useNavigation<NavigationProp>();


  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Save data whenever state changes
  useEffect(() => {
    if (!isLoading) {
      saveData();
      // Sync to blockchain if connected
      if (isConnected) {
        syncToBlockchain();
      }
    }
  }, [tasks, plants, compost, mood]);

  // Sync data to blockchain
  const syncToBlockchain = async () => {
    try {
      if (!isConnected || !docustoreService) return;

      const gardenState: GardenDocument = {
        type: 'garden_state',
        tasks,
        plants,
        compost,
        mood,
        timestamp: Date.now(),
      };

      await docustoreService.storeDocument(gardenState);
      console.log('Garden state synced to blockchain');
    } catch (error) {
      console.warn('Failed to sync to blockchain:', error);
    }
  };

  // Load data from blockchain
  const loadFromBlockchain = async () => {
    try {
      if (!isConnected || !docustoreService) return false;

      const documents = await docustoreService.queryDocuments({
        owner: account?.bech32Address,
        limit: 1,
      });

      const gardenDoc = documents
        .filter((doc) => doc.data.type === 'garden_state')
        .sort((a, b) => b.data.timestamp - a.data.timestamp)[0];

      if (gardenDoc) {
        const gardenData = gardenDoc.data as GardenDocument;
        
        // Parse dates for tasks
        const tasksWithDates = gardenData.tasks.map((task: any) => ({
          ...task,
          createdAt: new Date(task.createdAt),
          updatedAt: new Date(task.updatedAt),
          completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
          dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        }));

        // Parse dates for plants
        const plantsWithDates = gardenData.plants.map((plant: any) => ({
          ...plant,
          plantedAt: new Date(plant.plantedAt),
        }));

        setTasks(tasksWithDates);
        setPlants(plantsWithDates);
        setCompost(gardenData.compost);
        setMood(gardenData.mood);

        return true;
      }

      return false;
    } catch (error) {
      console.warn('Failed to load from blockchain:', error);
      return false;
    }
  };
  const loadData = async () => {
    try {
      setIsLoading(true);

      // Try to load from blockchain first if connected
      if (isConnected) {
        const loadedFromBlockchain = await loadFromBlockchain();
        if (loadedFromBlockchain) {
          setLoading(false);
          return;
        }
      }

      const [storedTasks, storedPlants, storedCompost, storedMood] =
        await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.TASKS),
          AsyncStorage.getItem(STORAGE_KEYS.PLANTS),
          AsyncStorage.getItem(STORAGE_KEYS.COMPOST),
          AsyncStorage.getItem(STORAGE_KEYS.MOOD),
        ]);

      // Parse stored data or use defaults
      const parsedTasks = storedTasks ? JSON.parse(storedTasks) : [];
      const parsedPlants = storedPlants ? JSON.parse(storedPlants) : [];
      const parsedCompost = storedCompost ? parseInt(storedCompost) : 0;
      const parsedMood = storedMood ? JSON.parse(storedMood) : 'sunny';

      // If no tasks exist, load sample data
      if (parsedTasks.length === 0) {
        const sampleTasks = getSampleTasks();
        const samplePlants = getSamplePlants();
        setTasks(sampleTasks);
        setPlants(samplePlants);
        setCompost(128);
      } else {
        setTasks(parsedTasks);
        setPlants(parsedPlants);
        setCompost(parsedCompost);
      }

      setMood(parsedMood);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load garden data');
      // Load sample data as fallback
      setTasks(getSampleTasks());
      setPlants(getSamplePlants());
      setCompost(128);
    } finally {
      setIsLoading(false);
    }
  };

  const saveData = async () => {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks)),
        AsyncStorage.setItem(STORAGE_KEYS.PLANTS, JSON.stringify(plants)),
        AsyncStorage.setItem(STORAGE_KEYS.COMPOST, compost.toString()),
        AsyncStorage.setItem(STORAGE_KEYS.MOOD, JSON.stringify(mood)),
      ]);
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  const getSampleTasks = (): Task[] => [
    {
      id: '1',
      title: 'Morning workout',
      description: 'Complete 30-minute cardio session',
      priority: 'high',
      category: 'health',
      completed: false,
      plantType: 'tree',
      compostReward: 15,
      createdAt: new Date(),
      dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
    },
    {
      id: '2',
      title: 'Review project proposal',
      description: 'Read through and provide feedback',
      priority: 'medium',
      category: 'work',
      completed: true,
      plantType: 'flower',
      compostReward: 10,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      id: '3',
      title: 'Call mom',
      description: 'Weekly check-in call',
      priority: 'low',
      category: 'personal',
      completed: false,
      plantType: 'sprout',
      compostReward: 5,
      createdAt: new Date(),
    },
  ];

  const getSamplePlants = (): Plant[] => [
    {
      id: '1',
      taskId: '2',
      type: 'flower',
      growth: 90,
      position: { x: 200, y: 300 },
      plantedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
  ];

  // CREATE - Add new task
  const addTask = async () => {
    if (!newTask.title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    try {
      const task: Task = {
        id: Date.now().toString(),
        userId: account?.publicKey || 'local_user',
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

      setTasks((prev) => [task, ...prev]);

      // Store individual task on blockchain if connected
      if (isConnected && docustoreService) {
        try {
          const taskDoc: TaskDocument = {
            type: 'task',
            task,
            timestamp: Date.now(),
          };
          await docustoreService.storeDocument(taskDoc);
        } catch (error) {
          console.warn('Failed to store task on blockchain:', error);
        }
      }

      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        category: 'personal',
      });
      setShowAddModal(false);

      Alert.alert('Success', 'Task planted in your garden! 🌱');
    } catch (error) {
      console.error('Error adding task:', error);
      Alert.alert('Error', 'Failed to add task');
    }
  };

  // UPDATE - Edit existing task
  const updateTask = async () => {
    if (!editingTask || !newTask.title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
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

      setTasks((prev) =>
        prev.map((task) => (task.id === editingTask.id ? updatedTask : task))
      );

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

      setEditingTask(null);
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        category: 'personal',
      });
      setShowAddModal(false);

      Alert.alert('Success', 'Task updated successfully! 🌿');
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Error', 'Failed to update task');
    }
  };

  // DELETE - Remove task
  const deleteTask = async (taskId: string) => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to remove this task from your garden?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setTasks((prev) => prev.filter((task) => task.id !== taskId));
              setPlants((prev) =>
                prev.filter((plant) => plant.taskId !== taskId)
              );
              Alert.alert('Success', 'Task removed from garden');
            } catch (error) {
              console.error('Error deleting task:', error);
              Alert.alert('Error', 'Failed to delete task');
            }
          },
        },
      ]
    );
  };

  // TOGGLE COMPLETION - Complete/uncomplete task
  const toggleTaskCompletion = async (taskId: string) => {
    try {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const updatedTask: Task = {
        ...task,
        status: task.status === 'completed' ? 'pending' : 'completed',
        completedAt: task.status !== 'completed' ? new Date() : undefined,
        updatedAt: new Date(),
      };

      setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));

      // If completing task, create a plant and award compost
      if (task.status !== 'completed') {
        const newPlant: Plant = {
          id: Date.now().toString(),
          userId: account?.bech32Address || 'local_user',
          taskId: task.id,
          type:
            task.plantType === 'sprout'
              ? 'sprout'
              : task.plantType === 'flower'
              ? 'flower'
              : 'tree',
          species: {
            id: 'basic',
            name: `Basic ${task.plantType}`,
            emoji: task.plantType === 'tree' ? '🌳' : task.plantType === 'flower' ? '🌸' : '🌱',
            rarity: 'common',
            growthRate: 1.0,
            compostRequirement: task.compostReward,
            description: `A ${task.plantType} grown from completing "${task.title}"`,
            unlockConditions: [],
          },
          growth: 25,
          health: 100,
          position: {
            x: Math.random() * (width - 120) + 60,
            y: Math.random() * 200 + 150,
          },
          plantedAt: new Date(),
          isRare: false,
          specialTraits: [],
        };

        setPlants((prev) => [...prev, newPlant]);
        setCompost((prev) => prev + task.compostReward);

        // Store plant on blockchain if connected
        if (isConnected && docustoreService) {
          try {
            const plantDoc: PlantDocument = {
              type: 'plant',
              plant: newPlant,
              timestamp: Date.now(),
            };
            await docustoreService.storeDocument(plantDoc);
          } catch (error) {
            console.warn('Failed to store plant on blockchain:', error);
          }
        }

        Alert.alert(
          'Task Completed! 🎉',
          `You earned ${task.compostReward} compost and planted a ${task.plantType}!`
        );
      } else {
        // If uncompleting, remove the plant
        setPlants((prev) => prev.filter((plant) => plant.taskId !== taskId));
        setCompost((prev) => Math.max(0, prev - task.compostReward));
      }
    } catch (error) {
      console.error('Error toggling task completion:', error);
      Alert.alert('Error', 'Failed to update task');
    }
  };

  // ARCHIVE - Archive completed tasks
  const archiveTask = async (taskId: string) => {
    Alert.alert(
      'Archive Task',
      'Move this completed task to your garden history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          onPress: async () => {
            try {
              const task = tasks.find((t) => t.id === taskId);
              if (task) {
                const archivedTask: Task = {
                  ...task,
                  archived: true,
                  archivedAt: new Date(),
                  updatedAt: new Date(),
                };

                setTasks((prev) =>
                  prev.map((t) => (t.id === taskId ? archivedTask : t))
                );
                Alert.alert('Success', 'Task archived to garden history');
              }
            } catch (error) {
              console.error('Error archiving task:', error);
              Alert.alert('Error', 'Failed to archive task');
            }
          },
        },
      ]
    );
  };

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

  const handleMoodChange = async (newMood: 'sunny' | 'cloudy' | 'rainy') => {
    setMood(newMood);
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
  const activeTasks = tasks.filter((task) => !task.archived);
  const pendingTasks = activeTasks.filter((task) => task.status === 'pending');
  const completedTasks = activeTasks.filter((task) => task.status === 'completed');

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#87A96B" />
        <Text style={styles.loadingText}>Loading your garden...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E8F4E6', '#F5F1E8', '#E5DDD0']}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>Good morning! 🌱</Text>
              <Text style={styles.subtitle}>
                {pendingTasks.length} tasks to plant • {plants.length} growing
                {account && ' • ⛓️ Synced'}
              </Text>
            </View>
            <CompostCounter count={compost} />
          </View>

          {/* Weather Mood */}
          <WeatherMood mood={mood} onMoodChange={handleMoodChange} />

          {/* Quick Add Task */}
          <TouchableOpacity
            style={styles.quickAddButton}
            onPress={() => setShowAddModal(true)}
          >
            <Plus size={20} color="#87A96B" />
            <Text style={styles.quickAddText}>Plant a new task</Text>
          </TouchableOpacity>

          {/* Garden Area */}
          <View style={styles.gardenContainer}>
            <Text style={styles.gardenTitle}>My Garden</Text>

            <View style={styles.garden}>
              {plants.map((plant) => (
                <GardenPlant
                  key={plant.id}
                  plant={{
                    id: plant.id,
                    type: plant.type,
                    taskName:
                      tasks.find((t) => t.id === plant.taskId)?.title ||
                      'Unknown Task',
                    growth: plant.growth,
                    position: plant.position,
                    planted: plant.plantedAt,
                  }}
                  style={{
                    ...styles.plantPosition,
                    left: plant.position.x,
                    top: plant.position.y,
                  }}
                />
              ))}

              {/* Empty garden message */}
              {plants.length === 0 && (
                <View style={styles.emptyGarden}>
                  <Sprout size={48} color="#C4B59A" />
                  <Text style={styles.emptyGardenText}>
                    Complete tasks to grow your garden
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyGardenButton}
                    onPress={() => setShowAddModal(true)}
                  >
                    <Text style={styles.emptyGardenButtonText}>
                      Plant your first task
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Recent Tasks */}
          {pendingTasks.length > 0 && (
            <View style={styles.tasksSection}>
              <Text style={styles.sectionTitle}>Ready to Complete</Text>
              {pendingTasks.slice(0, 3).map((task) => (
                <View key={task.id} style={styles.taskCard}>
                  <TouchableOpacity
                    style={styles.taskLeft}
                    onPress={() => toggleTaskCompletion(task.id)}
                  >
                    <Circle size={20} color="#87A96B" strokeWidth={2} />
                    <View style={styles.taskContent}>
                      <Text style={styles.taskTitle}>{task.title}</Text>
                      <View style={styles.taskMeta}>
                        <Text style={styles.categoryEmoji}>
                          {getCategoryIcon(task.category)}
                        </Text>
                        <View
                          style={[
                            styles.priorityIndicator,
                            {
                              backgroundColor: getPriorityColor(task.priority),
                            },
                          ]}
                        />
                        <Text style={styles.rewardText}>
                          +{task.compostReward}
                        </Text>
                        {task.blockchainDocId && (
                          <Text style={styles.blockchainIndicator}>⛓️</Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.taskActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => openEditModal(task)}
                    >
                      <Edit3 size={16} color="#8B7355" />
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

          {/* Recently Completed */}
          {completedTasks.length > 0 && (
            <View style={styles.tasksSection}>
              <Text style={styles.sectionTitle}>Recently Completed</Text>
              {completedTasks.slice(0, 2).map((task) => (
                <View
                  key={task.id}
                  style={[styles.taskCard, styles.completedTaskCard]}
                >
                  <TouchableOpacity
                    style={styles.taskLeft}
                    onPress={() => toggleTaskCompletion(task.id)}
                  >
                    <CheckCircle2 size={20} color="#87A96B" />
                    <View style={styles.taskContent}>
                      <Text style={[styles.taskTitle, styles.completedTitle]}>
                        {task.title}
                      </Text>
                      <Text style={styles.completedTime}>
                        {task?.completedAt
                          ? new Date(task.completedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Not completed'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.archiveButton}
                    onPress={() => archiveTask(task.id)}
                  >
                    <Text style={styles.archiveButtonText}>Archive</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Garden Stats */}
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{plants.length}</Text>
              <Text style={styles.statLabel}>Plants</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{completedTasks.length}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{compost}</Text>
              <Text style={styles.statLabel}>Compost</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{account ? '⛓️' : '📱'}</Text>
              <Text style={styles.statLabel}>{account ? 'On-Chain' : 'Local'}</Text>
            </View>
          </View>
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
              <TouchableOpacity onPress={editingTask ? updateTask : addTask}>
                <Save size={24} color="#87A96B" />
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
                      <Text style={styles.plantTypeText}>
                        {priority === 'high'
                          ? '🌳'
                          : priority === 'medium'
                          ? '🌸'
                          : '🌱'}
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
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F1E8',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8B7355',
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
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C5F41',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '400',
  },
  quickAddButton: {
    backgroundColor: 'rgba(135, 169, 107, 0.1)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#87A96B',
    borderStyle: 'dashed',
  },
  quickAddText: {
    color: '#87A96B',
    fontWeight: '600',
    fontSize: 16,
  },
  gardenContainer: {
    marginBottom: 32,
  },
  gardenTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C5F41',
    marginBottom: 16,
  },
  garden: {
    backgroundColor: 'rgba(229, 221, 208, 0.3)',
    borderRadius: 20,
    minHeight: 400,
    position: 'relative',
    borderWidth: 2,
    borderColor: 'rgba(196, 181, 154, 0.3)',
  },
  plantPosition: {
    position: 'absolute',
  },
  emptyGarden: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyGardenText: {
    fontSize: 16,
    color: '#8B7355',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  emptyGardenButton: {
    backgroundColor: '#87A96B',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyGardenButtonText: {
    color: '#F5F1E8',
    fontWeight: '600',
    fontSize: 14,
  },
  tasksSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C5F41',
    marginBottom: 16,
  },
  taskCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(229, 221, 208, 0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  completedTaskCard: {
    backgroundColor: 'rgba(135, 169, 107, 0.1)',
    borderColor: 'rgba(135, 169, 107, 0.3)',
  },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C5F41',
    marginBottom: 4,
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
    fontSize: 14,
  },
  priorityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rewardText: {
    fontSize: 12,
    color: '#87A96B',
    fontWeight: '500',
  },
  blockchainIndicator: {
    fontSize: 12,
    color: '#87A96B',
  },
  completedTime: {
    fontSize: 12,
    color: '#8B7355',
  },
  taskActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  archiveButton: {
    backgroundColor: 'rgba(135, 169, 107, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  archiveButtonText: {
    fontSize: 12,
    color: '#87A96B',
    fontWeight: '500',
  },
  stats: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: 'rgba(229, 221, 208, 0.8)',
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
});

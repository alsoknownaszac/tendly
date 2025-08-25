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
  RefreshControl,
} from 'react-native';
import {
  useAbstraxionAccount,
  useAbstraxionClient,
} from '@burnt-labs/abstraxion-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Sprout,
  LogIn,
} from 'lucide-react-native';
import { GardenPlant } from '@/components/GardenPlant';
import { WeatherMood } from '@/components/WeatherMood';
import { CompostCounter } from '@/components/CompostCounter';
import { Task, Plant } from '@/types/xion';

const { width } = Dimensions.get('window');

if (!process.env.EXPO_PUBLIC_DOCUSTORE_CONTRACT_ADDRESS) {
  throw new Error(
    'EXPO_PUBLIC_DOCUSTORE_CONTRACT_ADDRESS is not set in your environment file'
  );
}

export default function GardenScreen() {
  // Abstraxion hooks
  const { data: account, isConnected, isConnecting, login } = useAbstraxionAccount();
  const { client: queryClient } = useAbstraxionClient();

  // State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [mood, setMood] = useState<'sunny' | 'cloudy' | 'rainy'>('sunny');
  const [compost, setCompost] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
    console.log('Fetching tasks for garden with contract address:', contractAddress);

    try {
      const response = await queryClient.queryContractSmart(contractAddress, {
        UserDocuments: {
          owner: account.bech32Address,
          collection: 'tasks',
        },
      });

      if (response?.documents) {
        const tasksList = response.documents.map(([id, doc]: [string, any]) => {
          const data = typeof doc.data === 'string' ? JSON.parse(doc.data) : doc.data;
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
            createdAt: new Date(data.createdAt),
            updatedAt: new Date(data.updatedAt),
            completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
            tags: data.tags || [],
          } as Task;
        });

        setTasks(tasksList);

        // Generate plants from completed tasks
        const completedTasks = tasksList.filter((task: Task) => task.status === 'completed');
        const generatedPlants: Plant[] = completedTasks.map((task, index) => ({
          id: `plant_${task.id}`,
          userId: task.userId,
          taskId: task.id,
          type: task.plantType === 'tree' ? 'tree' : task.plantType === 'flower' ? 'flower' : 'sprout',
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
          growth: Math.min(100, 25 + Math.floor(Math.random() * 50)),
          health: 100,
          position: {
            x: 60 + (index % 3) * 100 + Math.random() * 40,
            y: 150 + Math.floor(index / 3) * 80 + Math.random() * 30,
          },
          plantedAt: task.completedAt || new Date(),
          isRare: false,
          specialTraits: [],
        }));

        setPlants(generatedPlants);

        // Calculate total compost from completed tasks
        const totalCompost = completedTasks.reduce((acc, task) => acc + task.compostReward, 0);
        setCompost(totalCompost);
      } else {
        setTasks([]);
        setPlants([]);
        setCompost(0);
      }
    } catch (error) {
      console.error('Error fetching tasks for garden:', error);
      setTasks([]);
      setPlants([]);
      setCompost(0);
    }
  };

  // Load data when account changes
  useEffect(() => {
    console.log('Fetching garden data - account changed or component mounted');
    if (account?.bech32Address) {
      fetchTasks();
    } else {
      setLoading(false);
    }
  }, [account?.bech32Address]);

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTasks();
    setRefreshing(false);
    setLoading(false);
  };

  const handleMoodChange = async (newMood: 'sunny' | 'cloudy' | 'rainy') => {
    setMood(newMood);
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

  if (loading) {
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
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>Good morning! 🌱</Text>
              <Text style={styles.subtitle}>
                {pendingTasks.length} tasks to plant • {plants.length} growing
                {isConnected && ' • ⛓️ Synced'}
              </Text>
            </View>
            <CompostCounter count={compost} />
          </View>

          {/* Connection Status */}
          {!isConnected && (
            <View style={styles.connectionCard}>
              <Text style={styles.connectionTitle}>Connect to Grow Your Garden</Text>
              <Text style={styles.connectionDescription}>
                Connect your XION wallet to store your garden progress on the blockchain
              </Text>
              <TouchableOpacity
                style={[styles.connectButton, isConnecting && styles.disabledButton]}
                onPress={login}
                disabled={isConnecting}
              >
                <LogIn size={20} color="#F5F1E8" />
                <Text style={styles.connectButtonText}>
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Weather Mood */}
          <WeatherMood mood={mood} onMoodChange={handleMoodChange} />

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
                    {isConnected 
                      ? 'Complete tasks to grow your garden'
                      : 'Connect your wallet to start growing'
                    }
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Recent Tasks */}
          {isConnected && pendingTasks.length > 0 && (
            <View style={styles.tasksSection}>
              <Text style={styles.sectionTitle}>Ready to Complete</Text>
              {pendingTasks.slice(0, 3).map((task) => (
                <View key={task.id} style={styles.taskCard}>
                  <View style={styles.taskContent}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <View style={styles.taskMeta}>
                      <Text style={styles.categoryEmoji}>
                        {getCategoryIcon(task.category)}
                      </Text>
                      <Text style={styles.rewardText}>
                        +{task.compostReward} compost
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Recently Completed */}
          {isConnected && completedTasks.length > 0 && (
            <View style={styles.tasksSection}>
              <Text style={styles.sectionTitle}>Recently Completed</Text>
              {completedTasks.slice(0, 2).map((task) => (
                <View
                  key={task.id}
                  style={[styles.taskCard, styles.completedTaskCard]}
                >
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
                        : 'Recently completed'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Garden Stats */}
          {isConnected && (
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
                <Text style={styles.statNumber}>⛓️</Text>
                <Text style={styles.statLabel}>On-Chain</Text>
              </View>
            </View>
          )}
        </ScrollView>
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
  },
  connectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  },
  completedTaskCard: {
    backgroundColor: 'rgba(135, 169, 107, 0.1)',
    borderColor: 'rgba(135, 169, 107, 0.3)',
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
  rewardText: {
    fontSize: 12,
    color: '#87A96B',
    fontWeight: '500',
  },
  completedTime: {
    fontSize: 12,
    color: '#8B7355',
    marginTop: 4,
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
  },
});

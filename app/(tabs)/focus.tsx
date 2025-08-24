import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Play,
  Pause,
  RotateCcw,
  Settings,
  Leaf,
  Plus,
  X,
  Save,
  Edit,
  Trash2,
  Clock,
  Target,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FocusSession, Task } from '@/types/xion';
import { useDocustore } from '@/services/docustoreService';
import {
  useAbstraxionAccount,
} from '@burnt-labs/abstraxion-react-native';

const STORAGE_KEYS = {
  FOCUS_SESSIONS: 'tendly_focus_sessions',
  FOCUS_SETTINGS: 'tendly_focus_settings',
  TASKS: 'tendly_tasks',
};

// Document type for blockchain storage
interface FocusSessionDocument {
  type: 'focus_session';
  session: FocusSession;
  timestamp: number;
}
interface FocusSettings {
  defaultFocusTime: number;
  shortBreakTime: number;
  longBreakTime: number;
  soundEnabled: boolean;
  autoStartBreaks: boolean;
}

export default function FocusScreen() {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'focus' | 'short_break' | 'long_break'>(
    'focus'
  );
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [currentSession, setCurrentSession] =
    useState<Partial<FocusSession> | null>(null);
  const [settings, setSettings] = useState<FocusSettings>({
    defaultFocusTime: 25,
    shortBreakTime: 5,
    longBreakTime: 15,
    soundEnabled: true,
    autoStartBreaks: false,
  });
  const [loading, setLoading] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [editingSession, setEditingSession] = useState<FocusSession | null>(
    null
  );
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionMood, setSessionMood] =
    useState<FocusSession['mood']>('focused');

  // Blockchain integration
  const { data: account } = useAbstraxionAccount();
  const { docustoreService, isConnected } = useDocustore();

  const totalSeconds = minutes * 60 + seconds;
  const initialSeconds =
    mode === 'focus'
      ? settings.defaultFocusTime * 60
      : mode === 'short_break'
      ? settings.shortBreakTime * 60
      : settings.longBreakTime * 60;
  const progress = 1 - totalSeconds / initialSeconds;

  const progressAnim = useRef(new Animated.Value(0)).current;
  const plantGrowthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadFocusData();
  }, []);

  useEffect(() => {
    if (!loading) {
      saveFocusData();
    }
  }, [sessions, settings]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (isActive && totalSeconds > 0) {
      interval = setInterval(() => {
        if (seconds > 0) {
          setSeconds(seconds - 1);
        } else if (minutes > 0) {
          setMinutes(minutes - 1);
          setSeconds(59);
        }
      }, 1000);
    } else if (totalSeconds === 0) {
      setIsActive(false);
      completeSession();
    }

    return () => clearInterval(interval);
  }, [isActive, minutes, seconds, totalSeconds]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const loadFocusData = async () => {
    try {
      setLoading(true);

      const [storedSessions, storedSettings, storedTasks] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.FOCUS_SESSIONS),
        AsyncStorage.getItem(STORAGE_KEYS.FOCUS_SETTINGS),
        AsyncStorage.getItem(STORAGE_KEYS.TASKS),
      ]);

      // Parse stored data or use defaults
      const parsedSessions = storedSessions ? JSON.parse(storedSessions) : [];
      const parsedSettings = storedSettings
        ? JSON.parse(storedSettings)
        : settings;
      const parsedTasks = storedTasks ? JSON.parse(storedTasks) : [];

      // Parse dates for sessions
      const sessionsWithDates = parsedSessions.map((session: any) => ({
        ...session,
        startTime: new Date(session.startTime),
        endTime: new Date(session.endTime),
      }));

      // Parse dates for tasks
      const tasksWithDates = parsedTasks.map((task: any) => ({
        ...task,
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt),
        completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
      }));

      setSessions(sessionsWithDates);
      setSettings(parsedSettings);
      setTasks(
        tasksWithDates.filter((task: Task) => task.status === 'pending')
      );

      // Update timer with settings
      setMinutes(parsedSettings.defaultFocusTime);
    } catch (error) {
      console.error('Error loading focus data:', error);
      Alert.alert('Error', 'Failed to load focus data');
    } finally {
      setLoading(false);
    }
  };

  const saveFocusData = async () => {
    try {
      await Promise.all([
        AsyncStorage.setItem(
          STORAGE_KEYS.FOCUS_SESSIONS,
          JSON.stringify(sessions)
        ),
        AsyncStorage.setItem(
          STORAGE_KEYS.FOCUS_SETTINGS,
          JSON.stringify(settings)
        ),
      ]);
    } catch (error) {
      console.error('Error saving focus data:', error);
    }
  };

  const completeSession = () => {
    if (mode === 'focus' && currentSession) {
      // CREATE - Record completed focus session
      recordFocusSession();

      const completedSessions =
        sessions.filter((s) => s.sessionType === 'pomodoro').length + 1;

      if (completedSessions % 4 === 0) {
        setMode('long_break');
        setMinutes(settings.longBreakTime);
      } else {
        setMode('short_break');
        setMinutes(settings.shortBreakTime);
      }
      setSeconds(0);

      // Animate plant growth
      Animated.spring(plantGrowthAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start(() => {
        plantGrowthAnim.setValue(0);
      });

      if (settings.autoStartBreaks) {
        setIsActive(true);
      }
    } else {
      setMode('focus');
      setMinutes(settings.defaultFocusTime);
      setSeconds(0);
    }
  };

  // CREATE - Record new focus session
  const recordFocusSession = async () => {
    if (!currentSession) return;

    try {
      const session: FocusSession = {
        id: Date.now().toString(),
        userId: account?.bech32Address || 'local_user',
        taskId: selectedTask?.id,
        duration: settings.defaultFocusTime * 60 - totalSeconds,
        plannedDuration: settings.defaultFocusTime * 60,
        startTime:
          currentSession.startTime ||
          new Date(Date.now() - settings.defaultFocusTime * 60 * 1000),
        endTime: new Date(),
        distractionsCount: currentSession.distractionsCount || 0,
        focusScore: Math.max(
          0,
          100 - (currentSession.distractionsCount || 0) * 10
        ),
        compostEarned:
          Math.floor((settings.defaultFocusTime * 60 - totalSeconds) / 60) * 2,
        plantGrowthContributed: 10,
        sessionType: 'pomodoro',
        mood: sessionMood,
        notes: sessionNotes,
      };

      const updatedSessions = [session, ...sessions];
      setSessions(updatedSessions);

      // Store on blockchain if connected
      if (isConnected && docustoreService) {
        try {
          const sessionDoc: FocusSessionDocument = {
            type: 'focus_session',
            session,
            timestamp: Date.now(),
          };
          const docId = await docustoreService.storeDocument(sessionDoc);
          
          // Update session with blockchain document ID
          const sessionWithDocId = { ...session, blockchainDocId: docId };
          const sessionsWithDocId = updatedSessions.map(s => 
            s.id === session.id ? sessionWithDocId : s
          );
          setSessions(sessionsWithDocId);
        } catch (error) {
          console.warn('Failed to store focus session on blockchain:', error);
        }
      }

      setCurrentSession(null);
      setSessionNotes('');
      setSessionMood('focused');

      Alert.alert(
        'Session Complete! 🎉',
        `You earned ${session.compostEarned} compost and contributed to plant growth!`
      );
    } catch (error) {
      console.error('Error recording focus session:', error);
      Alert.alert('Error', 'Failed to record focus session');
    }
  };

  // UPDATE - Edit existing session
  const updateSession = async () => {
    if (!editingSession) return;

    try {
      const updatedSession: FocusSession = {
        ...editingSession,
        mood: sessionMood,
        notes: sessionNotes,
      };

      const updatedSessions = sessions.map((session) =>
        session.id === editingSession.id ? updatedSession : session
      );

      setSessions(updatedSessions);

      // Update on blockchain if connected
      if (isConnected && docustoreService && editingSession.blockchainDocId) {
        try {
          const sessionDoc: FocusSessionDocument = {
            type: 'focus_session',
            session: updatedSession,
            timestamp: Date.now(),
          };
          await docustoreService.updateDocument(editingSession.blockchainDocId, sessionDoc);
        } catch (error) {
          console.warn('Failed to update focus session on blockchain:', error);
        }
      }

      setEditingSession(null);
      setSessionNotes('');
      setSessionMood('focused');
      setShowSessionModal(false);

      Alert.alert('Success', 'Session updated successfully! 🌿');
    } catch (error) {
      console.error('Error updating session:', error);
      Alert.alert('Error', 'Failed to update session');
    }
  };

  // DELETE - Remove session
  const deleteSession = async (sessionId: string) => {
    Alert.alert(
      'Delete Session',
      'Are you sure you want to delete this focus session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedSessions = sessions.filter(
                (session) => session.id !== sessionId
              );
              setSessions(updatedSessions);
              Alert.alert('Success', 'Session deleted successfully');
            } catch (error) {
              console.error('Error deleting session:', error);
              Alert.alert('Error', 'Failed to delete session');
            }
          },
        },
      ]
    );
  };

  // UPDATE - Save focus settings
  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.FOCUS_SETTINGS,
        JSON.stringify(settings)
      );

      // Update current timer if not active
      if (!isActive) {
        setMinutes(settings.defaultFocusTime);
        setSeconds(0);
      }

      setShowSettingsModal(false);
      Alert.alert('Success', 'Settings saved! ⚙️');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const toggleTimer = () => {
    if (!isActive && mode === 'focus') {
      // Start new session
      setCurrentSession({
        startTime: new Date(),
        distractionsCount: 0,
      });
    }
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    const duration =
      mode === 'focus'
        ? settings.defaultFocusTime
        : mode === 'short_break'
        ? settings.shortBreakTime
        : settings.longBreakTime;
    setMinutes(duration);
    setSeconds(0);
    setCurrentSession(null);
  };

  const openEditSessionModal = (session: FocusSession) => {
    setEditingSession(session);
    setSessionNotes(session.notes || '');
    setSessionMood(session.mood);
    setShowSessionModal(true);
  };

  const closeSessionModal = () => {
    setShowSessionModal(false);
    setEditingSession(null);
    setSessionNotes('');
    setSessionMood('focused');
  };

  const formatTime = (mins: number, secs: number) => {
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const todaySessions = sessions.filter(
    (session) => session.startTime.toDateString() === new Date().toDateString()
  );

  const totalFocusToday = todaySessions.reduce(
    (acc, session) => acc + session.duration,
    0
  );
  const averageFocusScore =
    todaySessions.length > 0
      ? Math.round(
          todaySessions.reduce((acc, session) => acc + session.focusScore, 0) /
            todaySessions.length
        )
      : 0;

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#87A96B" />
        <Text style={styles.loadingText}>Loading focus data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={
          mode === 'focus' ? ['#E8F4E6', '#F0F8EE'] : ['#FFF7ED', '#FEF3E2']
        }
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {mode === 'focus' ? 'Focus Time' : 'Break Time'}
            </Text>
            <Text style={styles.subtitle}>
              Session {todaySessions.length + 1} •{' '}
              {mode === 'focus' ? 'Grow your plants' : 'Rest and recharge'}
              {isConnected && ' • ⛓️ Synced'}
            </Text>
          </View>

          {/* Task Selection */}
          {mode === 'focus' && !isActive && (
            <View style={styles.taskSelection}>
              <Text style={styles.taskSelectionTitle}>
                Focus on a task (optional)
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[
                    styles.taskOption,
                    !selectedTask && styles.selectedTaskOption,
                  ]}
                  onPress={() => setSelectedTask(null)}
                >
                  <Text style={styles.taskOptionText}>Free Focus</Text>
                </TouchableOpacity>
                {tasks.slice(0, 5).map((task) => (
                  <TouchableOpacity
                    key={task.id}
                    style={[
                      styles.taskOption,
                      selectedTask?.id === task.id && styles.selectedTaskOption,
                    ]}
                    onPress={() => setSelectedTask(task)}
                  >
                    <Text style={styles.taskOptionText}>{task.title}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Timer Circle */}
          <View style={styles.timerContainer}>
            <View style={styles.timerCircle}>
              <Animated.View
                style={[
                  styles.progressRing,
                  {
                    transform: [
                      {
                        rotate: progressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                    ],
                  },
                ]}
              />

              {/* Plant Growth Animation */}
              <Animated.View
                style={[
                  styles.plantContainer,
                  {
                    transform: [
                      {
                        scale: plantGrowthAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.2],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Text style={styles.plantEmoji}>
                  {progress < 0.3 ? '🌱' : progress < 0.7 ? '🌿' : '🌳'}
                </Text>
              </Animated.View>

              <Text style={styles.timerText}>
                {formatTime(minutes, seconds)}
              </Text>

              <Text style={styles.modeText}>
                {mode === 'focus' ? 'Focus deeply' : 'Take a break'}
              </Text>

              {selectedTask && mode === 'focus' && (
                <Text style={styles.selectedTaskText}>
                  {selectedTask.title}
                </Text>
              )}
            </View>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity style={styles.controlButton} onPress={resetTimer}>
              <RotateCcw size={24} color="#8B7355" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.mainButton, isActive && styles.pauseButton]}
              onPress={toggleTimer}
            >
              {isActive ? (
                <Pause size={32} color="#F5F1E8" />
              ) : (
                <Play size={32} color="#F5F1E8" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => setShowSettingsModal(true)}
            >
              <Settings size={24} color="#8B7355" />
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={styles.stats}>
            <TouchableOpacity
              style={styles.statCard}
              onPress={() => setShowHistoryModal(true)}
            >
              <Text style={styles.statNumber}>{todaySessions.length}</Text>
              <Text style={styles.statLabel}>Sessions Today</Text>
            </TouchableOpacity>

            <View style={styles.statCard}>
              <View style={styles.compostReward}>
                <Leaf size={16} color="#87A96B" />
                <Text style={styles.compostText}>
                  +{Math.floor(totalFocusToday / 60) * 2}
                </Text>
              </View>
              <Text style={styles.statLabel}>Compost Earned</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{averageFocusScore}</Text>
              <Text style={styles.statLabel}>Focus Score</Text>
            </View>
          </View>

          {/* Recent Sessions */}
          {todaySessions.length > 0 && (
            <View style={styles.recentSessions}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Today's Sessions</Text>
                <TouchableOpacity onPress={() => setShowHistoryModal(true)}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>
              {todaySessions.slice(0, 3).map((session) => (
                <TouchableOpacity
                  key={session.id}
                  style={styles.sessionCard}
                  onPress={() => openEditSessionModal(session)}
                >
                  <View style={styles.sessionLeft}>
                    <Clock size={16} color="#87A96B" />
                    <View style={styles.sessionInfo}>
                      <Text style={styles.sessionDuration}>
                        {formatDuration(session.duration)}
                      </Text>
                      <Text style={styles.sessionTime}>
                        {session.startTime.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.sessionRight}>
                    <Text style={styles.sessionScore}>
                      {session.focusScore}%
                    </Text>
                    <View style={styles.sessionActions}>
                      <TouchableOpacity
                        style={styles.sessionActionButton}
                        onPress={() => openEditSessionModal(session)}
                      >
                        <Edit size={12} color="#8B7355" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.sessionActionButton}
                        onPress={() => deleteSession(session.id)}
                      >
                        <Trash2 size={12} color="#D97757" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Focus Tips */}
          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>🧘‍♀️ Focus Tip</Text>
            <Text style={styles.tipText}>
              Remove distractions from your workspace. Put your phone in another
              room or use app blockers.
            </Text>
          </View>
        </ScrollView>

        {/* Settings Modal */}
        <Modal
          visible={showSettingsModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                <X size={24} color="#8B7355" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Focus Settings</Text>
              <TouchableOpacity onPress={saveSettings}>
                <Save size={24} color="#87A96B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Focus Duration (minutes)</Text>
                <TextInput
                  style={styles.numberInput}
                  value={settings.defaultFocusTime.toString()}
                  onChangeText={(text) =>
                    setSettings({
                      ...settings,
                      defaultFocusTime: parseInt(text) || 25,
                    })
                  }
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Short Break (minutes)</Text>
                <TextInput
                  style={styles.numberInput}
                  value={settings.shortBreakTime.toString()}
                  onChangeText={(text) =>
                    setSettings({
                      ...settings,
                      shortBreakTime: parseInt(text) || 5,
                    })
                  }
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Long Break (minutes)</Text>
                <TextInput
                  style={styles.numberInput}
                  value={settings.longBreakTime.toString()}
                  onChangeText={(text) =>
                    setSettings({
                      ...settings,
                      longBreakTime: parseInt(text) || 15,
                    })
                  }
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.toggleGroup}>
                <Text style={styles.inputLabel}>Auto-start breaks</Text>
                <TouchableOpacity
                  style={[
                    styles.toggle,
                    settings.autoStartBreaks && styles.toggleActive,
                  ]}
                  onPress={() =>
                    setSettings({
                      ...settings,
                      autoStartBreaks: !settings.autoStartBreaks,
                    })
                  }
                >
                  <Text
                    style={[
                      styles.toggleText,
                      settings.autoStartBreaks && styles.toggleActiveText,
                    ]}
                  >
                    {settings.autoStartBreaks ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Modal>

        {/* Session History Modal */}
        <Modal
          visible={showHistoryModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                <X size={24} color="#8B7355" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Focus History</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalContent}>
              {sessions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No focus sessions yet</Text>
                  <Text style={styles.emptySubtext}>
                    Complete your first session to see it here!
                  </Text>
                </View>
              ) : (
                sessions.map((session) => (
                  <View key={session.id} style={styles.historyCard}>
                    <View style={styles.historyLeft}>
                      <View style={styles.historyIcon}>
                        <Target size={16} color="#87A96B" />
                      </View>
                      <View style={styles.historyInfo}>
                        <Text style={styles.historyDuration}>
                          {formatDuration(session.duration)}
                        </Text>
                        <Text style={styles.historyDate}>
                          {session.startTime.toLocaleDateString()} at{' '}
                          {session.startTime.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                        {session.notes && (
                          <Text style={styles.historyNotes}>
                            {session.notes}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.historyRight}>
                      <Text style={styles.historyScore}>
                        {session.focusScore}%
                      </Text>
                      <View style={styles.historyActions}>
                        <TouchableOpacity
                          style={styles.historyActionButton}
                          onPress={() => openEditSessionModal(session)}
                        >
                          <Edit size={12} color="#8B7355" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.historyActionButton}
                          onPress={() => deleteSession(session.id)}
                        >
                          <Trash2 size={12} color="#D97757" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </Modal>

        {/* Edit Session Modal */}
        <Modal
          visible={showSessionModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeSessionModal}>
                <X size={24} color="#8B7355" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Edit Session</Text>
              <TouchableOpacity onPress={updateSession}>
                <Save size={24} color="#87A96B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>How did you feel?</Text>
                <View style={styles.moodSelector}>
                  {(
                    ['focused', 'distracted', 'tired', 'energized'] as const
                  ).map((mood) => (
                    <TouchableOpacity
                      key={mood}
                      style={[
                        styles.moodOption,
                        sessionMood === mood && styles.moodSelected,
                      ]}
                      onPress={() => setSessionMood(mood)}
                    >
                      <Text style={styles.moodEmoji}>
                        {mood === 'focused'
                          ? '🎯'
                          : mood === 'distracted'
                          ? '😵‍💫'
                          : mood === 'tired'
                          ? '😴'
                          : '⚡'}
                      </Text>
                      <Text
                        style={[
                          styles.moodText,
                          sessionMood === mood && styles.moodSelectedText,
                        ]}
                      >
                        {mood.charAt(0).toUpperCase() + mood.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Session Notes (optional)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="How was your focus session? Any insights?"
                  value={sessionNotes}
                  onChangeText={setSessionNotes}
                  multiline
                  numberOfLines={4}
                />
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
    marginTop: 16,
    fontSize: 16,
    color: '#8B7355',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2C5F41',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  taskSelection: {
    marginBottom: 24,
  },
  taskSelectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C5F41',
    marginBottom: 12,
  },
  taskOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(229, 221, 208, 0.6)',
  },
  selectedTaskOption: {
    backgroundColor: 'rgba(135, 169, 107, 0.1)',
    borderColor: '#87A96B',
  },
  taskOptionText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  timerCircle: {
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 8,
    borderColor: 'rgba(229, 221, 208, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  progressRing: {
    position: 'absolute',
    width: 296,
    height: 296,
    borderRadius: 148,
    borderWidth: 4,
    borderColor: '#87A96B',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  plantContainer: {
    position: 'absolute',
    top: 40,
  },
  plantEmoji: {
    fontSize: 48,
  },
  timerText: {
    fontSize: 48,
    fontWeight: '300',
    color: '#2C5F41',
    marginTop: 20,
  },
  modeText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
    fontWeight: '500',
  },
  selectedTaskText: {
    fontSize: 12,
    color: '#87A96B',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginBottom: 48,
    justifyContent: 'center',
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(229, 221, 208, 0.6)',
  },
  mainButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#87A96B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  pauseButton: {
    backgroundColor: '#D97757',
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
    justifyContent: 'center',
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 1,
    borderColor: 'rgba(229, 221, 208, 0.6)',
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
    textAlign: 'center',
    lineHeight: 16,
  },
  compostReward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  compostText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#87A96B',
  },
  recentSessions: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C5F41',
  },
  viewAllText: {
    fontSize: 14,
    color: '#87A96B',
    fontWeight: '500',
  },
  sessionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(229, 221, 208, 0.6)',
  },
  sessionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDuration: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C5F41',
    marginBottom: 2,
  },
  sessionTime: {
    fontSize: 12,
    color: '#8B7355',
  },
  sessionRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  sessionScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#87A96B',
  },
  sessionActions: {
    flexDirection: 'row',
    gap: 4,
  },
  sessionActionButton: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  tipCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(229, 221, 208, 0.6)',
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C5F41',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
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
  numberInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(229, 221, 208, 0.6)',
    color: '#2C5F41',
    textAlign: 'center',
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
    height: 100,
    textAlignVertical: 'top',
  },
  toggleGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggle: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(229, 221, 208, 0.6)',
  },
  toggleActive: {
    backgroundColor: '#87A96B',
    borderColor: '#87A96B',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  toggleActiveText: {
    color: '#F5F1E8',
  },
  moodSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  moodOption: {
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
  moodSelected: {
    backgroundColor: 'rgba(135, 169, 107, 0.1)',
    borderColor: '#87A96B',
  },
  moodEmoji: {
    fontSize: 16,
  },
  moodText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  moodSelectedText: {
    color: '#87A96B',
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
  historyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(229, 221, 208, 0.6)',
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  historyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(135, 169, 107, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyInfo: {
    flex: 1,
  },
  historyDuration: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C5F41',
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 12,
    color: '#8B7355',
    marginBottom: 2,
  },
  historyNotes: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  historyRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  historyScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#87A96B',
  },
  historyActions: {
    flexDirection: 'row',
    gap: 4,
  },
  historyActionButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
});

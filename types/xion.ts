// XION Mobile Development Kit Types
export interface XIONWallet {
  address: string;
  isConnected: boolean;
  network: 'testnet' | 'mainnet';
}

export interface XIONTransaction {
  hash: string;
  type:
    | 'task_completion'
    | 'achievement_unlock'
    | 'compost_transfer'
    | 'plant_growth'
    | 'focus_session';
  data: any;
  timestamp: Date;
  verified: boolean;
}

export interface zkTLSProof {
  proof: string;
  publicSignals: string[];
  verificationKey: string;
  timestamp: Date;
}

export interface SmartContractState {
  userLevel: number;
  totalCompost: number;
  plantsGrown: number;
  achievements: string[];
  lastUpdate: Date;
}

// Core Tendly Types
export interface User {
  id: string;
  walletAddress?: string;
  name: string;
  level: number;
  totalCompost: number;
  currentStreak: number;
  longestStreak: number;
  totalFocusHours: number;
  totalTasksCompleted: number;
  twitterFollowersVerified?: number;
  twitterVerifiedAt?: Date;
  unlockedSeedTypes: string[];
  twitterFollowersVerified?: number;
  twitterVerifiedAt?: Date;
  unlockedSeedTypes: string[];
  joinedAt: Date;
  lastActiveAt: Date;
  preferences: UserPreferences;
}

export interface UserPreferences {
  defaultFocusTime: number; // in minutes
  breakTime: number; // in minutes
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  theme: 'light' | 'dark' | 'auto';
  gardenWeather: 'sunny' | 'cloudy' | 'rainy';
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  category: 'work' | 'personal' | 'health' | 'learning';
  status: 'pending' | 'in_progress' | 'completed' | 'archived';
  plantType: 'sprout' | 'flower' | 'tree';
  compostReward: number;
  estimatedFocusTime?: number; // in minutes
  actualFocusTime?: number; // in minutes
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  dueDate?: Date;
  tags: string[];
  blockchainHash?: string;
  zkProof?: zkTLSProof;
}

export interface Plant {
  id: string;
  userId: string;
  taskId: string;
  type: 'sprout' | 'sapling' | 'flower' | 'tree';
  species: PlantSpecies;
  growth: number; // 0-100
  health: number; // 0-100
  position: { x: number; y: number };
  plantedAt: Date;
  lastWatered?: Date;
  lastFertilized?: Date;
  isRare: boolean;
  specialTraits: string[];
  blockchainHash?: string;
}

export interface PlantSpecies {
  id: string;
  name: string;
  emoji: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  growthRate: number; // multiplier for growth speed
  compostRequirement: number; // compost needed to unlock
  description: string;
  unlockConditions: string[];
}

export interface FocusSession {
  id: string;
  userId: string;
  taskId?: string;
  duration: number; // in seconds
  plannedDuration: number; // in seconds
  startTime: Date;
  endTime: Date;
  distractionsCount: number;
  focusScore: number; // 0-100
  compostEarned: number;
  plantGrowthContributed: number;
  sessionType: 'pomodoro' | 'deep_work' | 'break';
  mood: 'focused' | 'distracted' | 'tired' | 'energized';
  notes?: string;
  blockchainHash?: string;
  zkProof?: zkTLSProof;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'tasks' | 'focus' | 'streak' | 'social' | 'garden' | 'special';
  rarity: 'bronze' | 'silver' | 'gold' | 'platinum' | 'legendary';
  requirements: AchievementRequirement[];
  rewards: AchievementReward[];
  isHidden: boolean; // secret achievements
  unlockedBy: string[]; // user IDs who unlocked this
}

export interface AchievementRequirement {
  type:
    | 'task_count'
    | 'focus_hours'
    | 'streak_days'
    | 'plant_count'
    | 'compost_amount'
    | 'social_interaction';
  value: number;
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'all_time';
}

export interface AchievementReward {
  type: 'compost' | 'rare_seed' | 'title' | 'theme' | 'special_plant';
  value: number | string;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt: Date;
  progress: number; // 0-100
  isCompleted: boolean;
  blockchainHash?: string;
}

export interface Garden {
  id: string;
  userId: string;
  name: string;
  description?: string;
  plants: Plant[];
  layout: GardenLayout;
  weather: 'sunny' | 'cloudy' | 'rainy';
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  isPublic: boolean;
  likes: number;
  views: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GardenLayout {
  width: number;
  height: number;
  theme: 'forest' | 'desert' | 'tropical' | 'zen' | 'mystical';
  decorations: GardenDecoration[];
}

export interface GardenDecoration {
  id: string;
  type: 'rock' | 'fountain' | 'bench' | 'path' | 'fence';
  position: { x: number; y: number };
  rotation: number;
  scale: number;
}

export interface SocialPost {
  id: string;
  userId: string;
  type:
    | 'achievement'
    | 'garden_showcase'
    | 'milestone'
    | 'challenge_completion';
  content: string;
  imageUrl?: string;
  gardenSnapshot?: Garden;
  achievementId?: string;
  likes: number;
  comments: Comment[];
  shares: number;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: string;
  userId: string;
  postId: string;
  content: string;
  likes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'seasonal' | 'special';
  category: 'tasks' | 'focus' | 'social' | 'garden';
  requirements: ChallengeRequirement[];
  rewards: ChallengeReward[];
  startDate: Date;
  endDate: Date;
  participants: string[]; // user IDs
  leaderboard: ChallengeLeaderboardEntry[];
  isActive: boolean;
}

export interface ChallengeRequirement {
  type:
    | 'complete_tasks'
    | 'focus_minutes'
    | 'maintain_streak'
    | 'grow_plants'
    | 'earn_compost';
  target: number;
  description: string;
}

export interface ChallengeReward {
  type: 'compost' | 'rare_seed' | 'achievement' | 'title' | 'theme';
  value: number | string;
  tier: 'participation' | 'bronze' | 'silver' | 'gold';
}

export interface ChallengeLeaderboardEntry {
  userId: string;
  progress: number;
  rank: number;
  completedAt?: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type:
    | 'achievement_unlocked'
    | 'plant_ready'
    | 'streak_reminder'
    | 'challenge_update'
    | 'social_interaction';
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: Date;
}

export interface CompostTransaction {
  id: string;
  userId: string;
  type: 'earned' | 'spent' | 'transferred';
  amount: number;
  source:
    | 'task_completion'
    | 'focus_session'
    | 'achievement'
    | 'challenge'
    | 'purchase'
    | 'gift';
  description: string;
  relatedId?: string; // task ID, session ID, etc.
  createdAt: Date;
  blockchainHash?: string;
}

export interface Seed {
  id: string;
  speciesId: string;
  userId: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  isUsed: boolean;
  acquiredAt: Date;
  usedAt?: Date;
  source: 'achievement' | 'purchase' | 'challenge' | 'gift' | 'special_event';
}

// Smart contract interaction types
export interface TaskCompletionData {
  taskId: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  completedAt: Date;
  focusTime?: number;
  zkProof?: zkTLSProof;
}

export interface PlantGrowthData {
  plantId: string;
  growthStage: number;
  plantType: string;
  compostEarned: number;
  healthBonus: number;
}

export interface FocusSessionData {
  sessionId: string;
  duration: number;
  startTime: Date;
  endTime: Date;
  distractionsCount: number;
  focusScore: number;
  taskId?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Hook Types
export interface UseTasksOptions {
  status?: Task['status'];
  category?: Task['category'];
  priority?: Task['priority'];
  sortBy?: 'createdAt' | 'dueDate' | 'priority' | 'title';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

export interface UseTasksReturn {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  createTask: (
    task: Omit<Task, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'status'>
  ) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  archiveTask: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

// Form Types
export interface CreateTaskForm {
  title: string;
  description: string;
  priority: Task['priority'];
  category: Task['category'];
  dueDate?: Date;
  estimatedFocusTime?: number;
  tags: string[];
}

export interface UpdateTaskForm extends Partial<CreateTaskForm> {
  status?: Task['status'];
}

// Filter and Search Types
export interface TaskFilters {
  status: Task['status'][];
  category: Task['category'][];
  priority: Task['priority'][];
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags: string[];
  hasPlant: boolean;
}

export interface SearchOptions {
  query: string;
  filters: Partial<TaskFilters>;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

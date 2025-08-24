import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Settings,
  Trophy,
  Star,
  Calendar,
  Zap,
  Leaf,
  Crown,
  Gift,
  LogIn,
  LogOut,
  Wallet,
} from 'lucide-react-native';
import {
  useAbstraxionAccount,
  useAbstraxionSigningClient,
  useAbstraxionClient,
} from '@burnt-labs/abstraxion-react-native';

export default function ProfileScreen() {
  const { 
    data: account, 
    isConnected, 
    isConnecting 
  } = useAbstraxionAccount();
  
  const { 
    client: signingClient
  } = useAbstraxionSigningClient();
  
  const { 
    client: queryClient 
  } = useAbstraxionClient();

  const [isConnectingState, setIsConnectingState] = useState(false);

  const [stats] = useState({
    level: 8,
    compost: 128,
    totalTasks: 142,
    focusHours: 45,
    streak: 7,
    plantsGrown: 28,
    rareSeeds: 3,
  });

  const handleLogin = async () => {
    try {
      setIsConnectingState(true);
      await signingClient?.signIn();
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Connection Error', 'Failed to connect wallet');
    } finally {
      setIsConnectingState(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signingClient?.signOut();
      Alert.alert('Success', 'Wallet disconnected successfully');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Logout Error', 'Failed to disconnect wallet');
    }
  };

  // View blockchain transactions
  const viewOnExplorer = () => {
    if (account?.bech32Address) {
      const explorerUrl = `https://explorer.burnt.com/xion-testnet-1/account/${account.bech32Address}`;
      Alert.alert(
        'View on Explorer',
        `Address: ${account.bech32Address}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open Explorer', 
            onPress: () => {
              // In a real app, you'd open the URL
              console.log('Opening explorer:', explorerUrl);
            }
          }
        ]
      );
    }
  };
  const [achievements] = useState([
    {
      id: '1',
      name: 'First Sprout',
      description: 'Completed your first task',
      icon: '🌱',
      unlocked: true,
    },
    {
      id: '2',
      name: 'Focus Master',
      description: 'Complete 50 focus sessions',
      icon: '🧘‍♀️',
      unlocked: true,
    },
    {
      id: '3',
      name: 'Green Thumb',
      description: 'Grow 25 plants',
      icon: '👍',
      unlocked: true,
    },
    {
      id: '4',
      name: 'Streak Warrior',
      description: 'Maintain a 30-day streak',
      icon: '🔥',
      unlocked: false,
    },
    {
      id: '5',
      name: 'Garden Guardian',
      description: 'Complete 500 tasks',
      icon: '🛡️',
      unlocked: false,
    },
    {
      id: '6',
      name: 'Zen Master',
      description: 'Complete 200 focus sessions',
      icon: '☯️',
      unlocked: false,
    },
  ]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#E8F4E6', '#F5F1E8']} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.profileSection}>
              {isConnected ? (
                <View style={styles.connectedAvatar}>
                  <Wallet size={32} color="#87A96B" />
                </View>
              ) : (
                <View style={styles.disconnectedAvatar}>
                  <Wallet size={32} color="#C4B59A" />
                </View>
              )}
              <View style={styles.profileInfo}>
                <Text style={styles.name}>
                  {isConnected ? 'Garden Keeper' : 'Guest Gardener'}
                </Text>
                <View style={styles.levelContainer}>
                  <Star size={16} color="#F59E0B" />
                  <Text style={styles.level}>Level {stats.level}</Text>
                </View>
                <Text style={styles.subtitle}>
                  {isConnected
                    ? 'Cultivating focus and growth'
                    : 'Connect wallet to save progress'}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.settingsButton}>
              <Settings size={24} color="#8B7355" />
            </TouchableOpacity>
          </View>

          {/* XION Wallet Connection */}
          <View style={styles.walletSection}>
            {!isConnected ? (
              <View style={styles.walletCard}>
                <View style={styles.walletHeader}>
                  <Wallet size={24} color="#87A96B" />
                  <Text style={styles.walletTitle}>Connect XION Wallet</Text>
                </View>
                <Text style={styles.walletDescription}>
                  Connect your XION wallet to save your garden progress on-chain
                  and earn verified achievements
                </Text>
                <TouchableOpacity
                  style={[
                    styles.walletButton,
                    (isConnecting || isConnectingState) && styles.walletButtonDisabled,
                  ]}
                  onPress={handleLogin}
                  disabled={isConnecting || isConnectingState}
                >
                  <LogIn size={20} color="#F5F1E8" />
                  <Text style={styles.walletButtonText}>
                    {(isConnecting || isConnectingState) ? 'Connecting...' : 'Connect Wallet'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.walletCard}>
                <View style={styles.walletHeader}>
                  <Wallet size={24} color="#87A96B" />
                  <Text style={styles.walletTitle}>XION Wallet Connected</Text>
                </View>
                <View style={styles.walletInfo}>
                  <Text style={styles.walletLabel}>Address:</Text>
                  <Text style={styles.walletAddress}>
                    {account?.bech32Address
                      ? `${account.bech32Address.slice(
                          0,
                          12
                        )}...${account.bech32Address.slice(-8)}`
                      : 'Loading...'}
                  </Text>
                </View>
                <View style={styles.walletActions}>
                  <TouchableOpacity style={styles.explorerButton}>
                    <Text style={styles.explorerButtonText}>
                    onPress={viewOnExplorer}
                      View on Explorer
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={handleLogout}
                  >
                    <LogOut size={16} color="#D97757" />
                    <Text style={styles.logoutButtonText}>Disconnect</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Leaf size={24} color="#87A96B" />
              <Text style={styles.statNumber}>{stats.compost}</Text>
              <Text style={styles.statLabel}>Compost</Text>
            </View>

            <View style={styles.statCard}>
              <Calendar size={24} color="#87A96B" />
              <Text style={styles.statNumber}>{stats.streak}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>

            <View style={styles.statCard}>
              <Zap size={24} color="#87A96B" />
              <Text style={styles.statNumber}>{stats.focusHours}</Text>
              <Text style={styles.statLabel}>Focus Hours</Text>
            </View>

            <View style={styles.statCard}>
              <Trophy size={24} color="#87A96B" />
              <Text style={styles.statNumber}>{stats.plantsGrown}</Text>
              <Text style={styles.statLabel}>Plants Grown</Text>
            </View>
          </View>

          {/* Inventory */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seed Inventory</Text>
            <View style={styles.inventoryGrid}>
              <TouchableOpacity style={styles.seedCard}>
                <Text style={styles.seedEmoji}>🌱</Text>
                <Text style={styles.seedName}>Basic Seeds</Text>
                <Text style={styles.seedCount}>∞</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.seedCard}>
                <Text style={styles.seedEmoji}>🌺</Text>
                <Text style={styles.seedName}>Rare Orchid</Text>
                <Text style={styles.seedCount}>2</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.seedCard}>
                <Text style={styles.seedEmoji}>🌳</Text>
                <Text style={styles.seedName}>Ancient Oak</Text>
                <Text style={styles.seedCount}>1</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.shopCard}>
                <Gift size={20} color="#87A96B" />
                <Text style={styles.shopText}>Shop</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Achievements */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            <View style={styles.achievementsList}>
              {achievements.map((achievement) => (
                <View
                  key={achievement.id}
                  style={[
                    styles.achievementCard,
                    !achievement.unlocked && styles.lockedAchievement,
                  ]}
                >
                  <Text
                    style={[
                      styles.achievementIcon,
                      !achievement.unlocked && styles.lockedIcon,
                    ]}
                  >
                    {achievement.unlocked ? achievement.icon : '🔒'}
                  </Text>
                  <View style={styles.achievementContent}>
                    <Text
                      style={[
                        styles.achievementName,
                        !achievement.unlocked && styles.lockedText,
                      ]}
                    >
                      {achievement.name}
                    </Text>
                    <Text
                      style={[
                        styles.achievementDescription,
                        !achievement.unlocked && styles.lockedText,
                      ]}
                    >
                      {achievement.description}
                    </Text>
                  </View>
                  {achievement.unlocked && <Crown size={16} color="#F59E0B" />}
                </View>
              ))}
            </View>
          </View>

          {/* XION Integration Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Blockchain Integration</Text>
            <View style={styles.blockchainCard}>
              <View style={styles.blockchainHeader}>
                <Text style={styles.blockchainTitle}>
                  Achievement Verification
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    isConnected
                      ? styles.connectedBadge
                      : styles.disconnectedBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      isConnected
                        ? styles.connectedText
                        : styles.disconnectedText,
                    ]}
                  >
                    {isConnected ? 'Verified' : 'Offline'}
                  </Text>
                </View>
              </View>
              <Text style={styles.blockchainDescription}>
                {isConnected
                  ? 'Your achievements are secured on-chain with zkTLS verification'
                  : 'Connect your wallet to enable blockchain verification of achievements'}
              </Text>
              {isConnected && (
                <TouchableOpacity style={styles.blockchainButton}>
                  <Text style={styles.blockchainButtonText}>
                    View Verified Achievements
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
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
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: '#87A96B',
  },
  connectedAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(135, 169, 107, 0.1)',
    borderWidth: 3,
    borderColor: '#87A96B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disconnectedAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(196, 181, 154, 0.1)',
    borderWidth: 3,
    borderColor: '#C4B59A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C5F41',
    marginBottom: 4,
  },
  levelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  level: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  settingsButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(229, 221, 208, 0.6)',
  },
  walletSection: {
    marginBottom: 32,
  },
  walletCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(229, 221, 208, 0.6)',
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  walletTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C5F41',
  },
  walletDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  walletButton: {
    backgroundColor: '#87A96B',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  walletButtonDisabled: {
    backgroundColor: '#C4B59A',
    opacity: 0.7,
  },
  walletButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F5F1E8',
  },
  walletInfo: {
    backgroundColor: 'rgba(135, 169, 107, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  walletLabel: {
    fontSize: 12,
    color: '#8B7355',
    fontWeight: '500',
    marginBottom: 4,
  },
  walletAddress: {
    fontSize: 14,
    color: '#2C5F41',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  walletActions: {
    flexDirection: 'row',
    gap: 12,
  },
  explorerButton: {
    flex: 1,
    backgroundColor: 'rgba(135, 169, 107, 0.1)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#87A96B',
  },
  explorerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#87A96B',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(217, 119, 87, 0.1)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D97757',
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D97757',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    width: '47%',
    borderWidth: 1,
    borderColor: 'rgba(229, 221, 208, 0.6)',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C5F41',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C5F41',
    marginBottom: 16,
  },
  inventoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  seedCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    width: '47%',
    borderWidth: 1,
    borderColor: 'rgba(229, 221, 208, 0.6)',
  },
  seedEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  seedName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2C5F41',
    textAlign: 'center',
    marginBottom: 4,
  },
  seedCount: {
    fontSize: 12,
    color: '#87A96B',
    fontWeight: '600',
  },
  shopCard: {
    backgroundColor: 'rgba(135, 169, 107, 0.1)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    width: '47%',
    borderWidth: 2,
    borderColor: '#87A96B',
    borderStyle: 'dashed',
  },
  shopText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#87A96B',
    marginTop: 4,
  },
  achievementsList: {
    gap: 12,
  },
  achievementCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(229, 221, 208, 0.6)',
  },
  lockedAchievement: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderColor: 'rgba(229, 221, 208, 0.3)',
  },
  achievementIcon: {
    fontSize: 24,
  },
  lockedIcon: {
    opacity: 0.3,
  },
  achievementContent: {
    flex: 1,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C5F41',
    marginBottom: 2,
  },
  achievementDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  lockedText: {
    opacity: 0.5,
  },
  blockchainCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(229, 221, 208, 0.6)',
  },
  blockchainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  blockchainTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C5F41',
  },
  statusBadge: {
    backgroundColor: 'rgba(135, 169, 107, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  connectedBadge: {
    backgroundColor: 'rgba(135, 169, 107, 0.1)',
  },
  disconnectedBadge: {
    backgroundColor: 'rgba(196, 181, 154, 0.1)',
  },
  connectedText: {
    color: '#87A96B',
  },
  disconnectedText: {
    color: '#8B7355',
  },
  blockchainDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  blockchainButton: {
    backgroundColor: '#87A96B',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  blockchainButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F5F1E8',
  },
});

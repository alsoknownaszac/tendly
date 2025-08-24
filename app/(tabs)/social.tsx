import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Heart,
  MessageCircle,
  Share2,
  Trophy,
  Star,
  Users,
  Plus,
  X,
  Send,
  Edit,
  Trash2,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SocialPost, Comment, Challenge, User } from '@/types/xion';

const STORAGE_KEYS = {
  POSTS: 'tendly_social_posts',
  CHALLENGES: 'tendly_challenges',
  USER_PROFILE: 'tendly_user_profile',
};

export default function SocialScreen() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<SocialPost | null>(null);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [newPost, setNewPost] = useState({
    content: '',
    type: 'achievement' as const,
  });
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    loadSocialData();
  }, []);

  useEffect(() => {
    if (!loading) {
      saveSocialData();
    }
  }, [posts, challenges]);

  const loadSocialData = async () => {
    try {
      setLoading(true);

      const [storedPosts, storedChallenges, storedProfile] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.POSTS),
        AsyncStorage.getItem(STORAGE_KEYS.CHALLENGES),
        AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE),
      ]);

      // Parse stored data or use defaults
      const parsedPosts = storedPosts ? JSON.parse(storedPosts) : [];
      const parsedChallenges = storedChallenges
        ? JSON.parse(storedChallenges)
        : [];
      const parsedProfile = storedProfile ? JSON.parse(storedProfile) : null;

      // If no data exists, load sample data
      if (parsedPosts.length === 0) {
        const sampleData = getSampleSocialData();
        setPosts(sampleData.posts);
        setChallenges(sampleData.challenges);
        setUserProfile(sampleData.userProfile);
      } else {
        // Parse dates
        const postsWithDates = parsedPosts.map((post: any) => ({
          ...post,
          createdAt: new Date(post.createdAt),
          updatedAt: new Date(post.updatedAt),
          comments: post.comments.map((comment: any) => ({
            ...comment,
            createdAt: new Date(comment.createdAt),
            updatedAt: new Date(comment.updatedAt),
          })),
        }));

        const challengesWithDates = parsedChallenges.map((challenge: any) => ({
          ...challenge,
          startDate: new Date(challenge.startDate),
          endDate: new Date(challenge.endDate),
        }));

        const profileWithDates = parsedProfile
          ? {
              ...parsedProfile,
              joinedAt: new Date(parsedProfile.joinedAt),
              lastActiveAt: new Date(parsedProfile.lastActiveAt),
            }
          : null;

        setPosts(postsWithDates);
        setChallenges(challengesWithDates);
        setUserProfile(profileWithDates);
      }
    } catch (error) {
      console.error('Error loading social data:', error);
      Alert.alert('Error', 'Failed to load social data');
      // Load sample data as fallback
      const sampleData = getSampleSocialData();
      setPosts(sampleData.posts);
      setChallenges(sampleData.challenges);
      setUserProfile(sampleData.userProfile);
    } finally {
      setLoading(false);
    }
  };

  const saveSocialData = async () => {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(posts)),
        AsyncStorage.setItem(
          STORAGE_KEYS.CHALLENGES,
          JSON.stringify(challenges)
        ),
        userProfile &&
          AsyncStorage.setItem(
            STORAGE_KEYS.USER_PROFILE,
            JSON.stringify(userProfile)
          ),
      ]);
    } catch (error) {
      console.error('Error saving social data:', error);
    }
  };

  const getSampleSocialData = () => {
    const sampleUserProfile: User = {
      id: 'user1',
      name: 'Garden Keeper',
      level: 8,
      totalCompost: 128,
      currentStreak: 7,
      longestStreak: 15,
      totalFocusHours: 45,
      totalTasksCompleted: 142,
      joinedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      lastActiveAt: new Date(),
      preferences: {
        defaultFocusTime: 25,
        breakTime: 5,
        soundEnabled: true,
        notificationsEnabled: true,
        theme: 'auto',
        gardenWeather: 'sunny',
      },
    };

    const samplePosts: SocialPost[] = [
      {
        id: '1',
        userId: 'user2',
        type: 'achievement',
        content:
          'Just completed my 50th focus session! My garden is thriving! 🎉',
        likes: 24,
        comments: [
          {
            id: 'c1',
            userId: 'user3',
            postId: '1',
            content: 'Amazing progress! Keep it up! 🌱',
            likes: 3,
            createdAt: new Date(Date.now() - 30 * 60 * 1000),
            updatedAt: new Date(Date.now() - 30 * 60 * 1000),
          },
        ],
        shares: 5,
        isPublic: true,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
      {
        id: '2',
        userId: 'user3',
        type: 'garden_showcase',
        content:
          'Check out my rare Midnight Orchid! Finally unlocked after 30 days of consistent focus sessions 🌺',
        likes: 18,
        comments: [],
        shares: 2,
        isPublic: true,
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      },
    ];

    const sampleChallenges: Challenge[] = [
      {
        id: 'weekly1',
        title: 'Focus Marathon',
        description: 'Complete 20 focus sessions this week',
        type: 'weekly',
        category: 'focus',
        requirements: [
          {
            type: 'focus_minutes',
            target: 500,
            description: 'Complete 500 minutes of focused work',
          },
        ],
        rewards: [
          {
            type: 'rare_seed',
            value: 'midnight_orchid',
            tier: 'gold',
          },
        ],
        startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        participants: ['user1', 'user2', 'user3'],
        leaderboard: [
          { userId: 'user2', progress: 85, rank: 1 },
          { userId: 'user1', progress: 65, rank: 2 },
          { userId: 'user3', progress: 45, rank: 3 },
        ],
        isActive: true,
      },
    ];

    return {
      posts: samplePosts,
      challenges: sampleChallenges,
      userProfile: sampleUserProfile,
    };
  };

  // CREATE - Add new post
  const createPost = async () => {
    if (!newPost.content.trim()) {
      Alert.alert('Error', 'Please enter some content for your post');
      return;
    }

    if (!userProfile) {
      Alert.alert('Error', 'User profile not found');
      return;
    }

    try {
      const post: SocialPost = {
        id: Date.now().toString(),
        userId: userProfile.id,
        type: newPost.type,
        content: newPost.content.trim(),
        likes: 0,
        comments: [],
        shares: 0,
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedPosts = [post, ...posts];
      setPosts(updatedPosts);

      setNewPost({ content: '', type: 'achievement' });
      setShowCreateModal(false);

      Alert.alert('Success', 'Post shared with the community! 🌱');
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post');
    }
  };

  // UPDATE - Edit existing post
  const updatePost = async () => {
    if (!editingPost || !newPost.content.trim()) {
      Alert.alert('Error', 'Please enter some content for your post');
      return;
    }

    try {
      const updatedPost: SocialPost = {
        ...editingPost,
        content: newPost.content.trim(),
        type: newPost.type,
        updatedAt: new Date(),
      };

      const updatedPosts = posts.map((post) =>
        post.id === editingPost.id ? updatedPost : post
      );

      setPosts(updatedPosts);

      setEditingPost(null);
      setNewPost({ content: '', type: 'achievement' });
      setShowCreateModal(false);

      Alert.alert('Success', 'Post updated successfully! 🌿');
    } catch (error) {
      console.error('Error updating post:', error);
      Alert.alert('Error', 'Failed to update post');
    }
  };

  // DELETE - Remove post
  const deletePost = async (postId: string) => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const updatedPosts = posts.filter((post) => post.id !== postId);
            setPosts(updatedPosts);
            Alert.alert('Success', 'Post deleted successfully');
          } catch (error) {
            console.error('Error deleting post:', error);
            Alert.alert('Error', 'Failed to delete post');
          }
        },
      },
    ]);
  };

  // TOGGLE LIKE - Like/unlike post
  const toggleLike = async (postId: string) => {
    if (!userProfile) return;

    try {
      const updatedPosts = posts.map((post) => {
        if (post.id === postId) {
          const isCurrentlyLiked = post.likes > 0; // Simplified like check
          return {
            ...post,
            likes: isCurrentlyLiked ? post.likes - 1 : post.likes + 1,
            updatedAt: new Date(),
          };
        }
        return post;
      });

      setPosts(updatedPosts);
    } catch (error) {
      console.error('Error toggling like:', error);
      Alert.alert('Error', 'Failed to update like');
    }
  };

  // CREATE COMMENT - Add comment to post
  const addComment = async () => {
    if (!newComment.trim() || !selectedPost || !userProfile) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }

    try {
      const comment: Comment = {
        id: Date.now().toString(),
        userId: userProfile.id,
        postId: selectedPost.id,
        content: newComment.trim(),
        likes: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedPosts = posts.map((post) => {
        if (post.id === selectedPost.id) {
          return {
            ...post,
            comments: [...post.comments, comment],
            updatedAt: new Date(),
          };
        }
        return post;
      });

      setPosts(updatedPosts);
      setNewComment('');
      setShowCommentModal(false);
      setSelectedPost(null);

      Alert.alert('Success', 'Comment added! 💬');
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment');
    }
  };

  // DELETE COMMENT - Remove comment
  const deleteComment = async (postId: string, commentId: string) => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedPosts = posts.map((post) => {
                if (post.id === postId) {
                  return {
                    ...post,
                    comments: post.comments.filter((c) => c.id !== commentId),
                    updatedAt: new Date(),
                  };
                }
                return post;
              });

              setPosts(updatedPosts);
              Alert.alert('Success', 'Comment deleted');
            } catch (error) {
              console.error('Error deleting comment:', error);
              Alert.alert('Error', 'Failed to delete comment');
            }
          },
        },
      ]
    );
  };

  const openEditModal = (post: SocialPost) => {
    setEditingPost(post);
    setNewPost({
      content: post.content,
      type: post.type,
    });
    setShowCreateModal(true);
  };

  const openCommentModal = (post: SocialPost) => {
    setSelectedPost(post);
    setShowCommentModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setEditingPost(null);
    setNewPost({ content: '', type: 'achievement' });
  };

  const closeCommentModal = () => {
    setShowCommentModal(false);
    setSelectedPost(null);
    setNewComment('');
  };

  const formatTimeAgo = (date: Date) => {
    const hours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return days === 1 ? '1 day ago' : `${days} days ago`;
  };

  const getPostTypeEmoji = (type: SocialPost['type']) => {
    switch (type) {
      case 'achievement':
        return '🏆';
      case 'garden_showcase':
        return '🌺';
      case 'milestone':
        return '🎯';
      case 'challenge_completion':
        return '🔥';
      default:
        return '📝';
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#87A96B" />
        <Text style={styles.loadingText}>Loading community...</Text>
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
              <Text style={styles.title}>Garden Community</Text>
              <Text style={styles.subtitle}>Share your growth journey</Text>
            </View>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Plus size={20} color="#F5F1E8" />
            </TouchableOpacity>
          </View>

          {/* Weekly Challenge */}
          {challenges.length > 0 && (
            <View style={styles.challengeCard}>
              <LinearGradient
                colors={['#87A96B', '#6B8E5A']}
                style={styles.challengeGradient}
              >
                <View style={styles.challengeHeader}>
                  <Trophy size={24} color="#F5F1E8" />
                  <Text style={styles.challengeTitle}>
                    {challenges[0].title}
                  </Text>
                </View>
                <Text style={styles.challengeDescription}>
                  {challenges[0].description}
                </Text>
                <View style={styles.challengeProgress}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${
                            challenges[0].leaderboard.find(
                              (entry) => entry.userId === userProfile?.id
                            )?.progress || 0
                          }%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {challenges[0].leaderboard.find(
                      (entry) => entry.userId === userProfile?.id
                    )?.progress || 0}
                    % complete
                  </Text>
                </View>
              </LinearGradient>
            </View>
          )}

          {/* Leaderboard Preview */}
          {challenges.length > 0 && (
            <View style={styles.leaderboardCard}>
              <View style={styles.leaderboardHeader}>
                <Users size={20} color="#87A96B" />
                <Text style={styles.leaderboardTitle}>This Week's Leaders</Text>
              </View>
              <View style={styles.leaderboardList}>
                {challenges[0].leaderboard.slice(0, 3).map((entry, index) => (
                  <View key={entry.userId} style={styles.leaderItem}>
                    <View style={styles.leaderLeft}>
                      <Text style={styles.leaderRank}>#{entry.rank}</Text>
                      <Text style={styles.leaderName}>
                        {entry.userId === userProfile?.id
                          ? 'You'
                          : `User ${entry.userId.slice(-4)}`}
                      </Text>
                      <View style={styles.levelBadge}>
                        <Star size={12} color="#F59E0B" />
                        <Text style={styles.levelText}>
                          {userProfile?.level || 8}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.leaderProgress}>{entry.progress}%</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Community Posts */}
          <View style={styles.postsSection}>
            <Text style={styles.sectionTitle}>Community Gardens</Text>

            {posts.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No posts yet</Text>
                <Text style={styles.emptySubtext}>
                  Be the first to share your garden progress!
                </Text>
              </View>
            ) : (
              posts.map((post) => (
                <View key={post.id} style={styles.postCard}>
                  <View style={styles.postHeader}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {post.userId === userProfile?.id ? '🌱' : '👤'}
                      </Text>
                    </View>
                    <View style={styles.userInfo}>
                      <View style={styles.userNameRow}>
                        <Text style={styles.userName}>
                          {post.userId === userProfile?.id
                            ? userProfile.name
                            : `Gardener ${post.userId.slice(-4)}`}
                        </Text>
                        <Text style={styles.postType}>
                          {getPostTypeEmoji(post.type)}
                        </Text>
                      </View>
                      <Text style={styles.timestamp}>
                        {formatTimeAgo(post.createdAt)}
                      </Text>
                    </View>
                    {post.userId === userProfile?.id && (
                      <View style={styles.postActions}>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => openEditModal(post)}
                        >
                          <Edit size={16} color="#8B7355" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => deletePost(post.id)}
                        >
                          <Trash2 size={16} color="#D97757" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  <Text style={styles.postContent}>{post.content}</Text>

                  <View style={styles.postInteractions}>
                    <TouchableOpacity
                      style={styles.interactionButton}
                      onPress={() => toggleLike(post.id)}
                    >
                      <Heart
                        size={20}
                        color={post.likes > 0 ? '#D97757' : '#8B7355'}
                        fill={post.likes > 0 ? '#D97757' : 'transparent'}
                      />
                      <Text
                        style={[
                          styles.interactionText,
                          post.likes > 0 && styles.likedText,
                        ]}
                      >
                        {post.likes}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.interactionButton}
                      onPress={() => openCommentModal(post)}
                    >
                      <MessageCircle size={20} color="#8B7355" />
                      <Text style={styles.interactionText}>
                        {post.comments.length}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.interactionButton}>
                      <Share2 size={20} color="#8B7355" />
                      <Text style={styles.interactionText}>{post.shares}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Show recent comments */}
                  {post.comments.length > 0 && (
                    <View style={styles.commentsPreview}>
                      {post.comments.slice(-2).map((comment) => (
                        <View key={comment.id} style={styles.commentItem}>
                          <Text style={styles.commentUser}>
                            {comment.userId === userProfile?.id
                              ? 'You'
                              : `User ${comment.userId.slice(-4)}`}
                          </Text>
                          <Text style={styles.commentContent}>
                            {comment.content}
                          </Text>
                          {comment.userId === userProfile?.id && (
                            <TouchableOpacity
                              onPress={() => deleteComment(post.id, comment.id)}
                            >
                              <Trash2 size={12} color="#D97757" />
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        </ScrollView>

        {/* Create/Edit Post Modal */}
        <Modal
          visible={showCreateModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeCreateModal}>
                <X size={24} color="#8B7355" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingPost ? 'Edit Post' : 'Share Achievement'}
              </Text>
              <TouchableOpacity onPress={editingPost ? updatePost : createPost}>
                <Text style={styles.saveButton}>
                  {editingPost ? 'Update' : 'Share'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Post Type</Text>
                <View style={styles.typeSelector}>
                  {(
                    [
                      'achievement',
                      'garden_showcase',
                      'milestone',
                      'challenge_completion',
                    ] as const
                  ).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeOption,
                        newPost.type === type && styles.typeSelected,
                      ]}
                      onPress={() => setNewPost({ ...newPost, type })}
                    >
                      <Text style={styles.typeEmoji}>
                        {getPostTypeEmoji(type)}
                      </Text>
                      <Text
                        style={[
                          styles.typeText,
                          newPost.type === type && styles.typeSelectedText,
                        ]}
                      >
                        {type.replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Share your progress</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="What would you like to share with the community?"
                  value={newPost.content}
                  onChangeText={(text) =>
                    setNewPost({ ...newPost, content: text })
                  }
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>
          </View>
        </Modal>

        {/* Comments Modal */}
        <Modal
          visible={showCommentModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeCommentModal}>
                <X size={24} color="#8B7355" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Comments</Text>
              <TouchableOpacity onPress={addComment}>
                <Send size={24} color="#87A96B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {selectedPost?.comments.map((comment) => (
                <View key={comment.id} style={styles.commentCard}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentUser}>
                      {comment.userId === userProfile?.id
                        ? 'You'
                        : `User ${comment.userId.slice(-4)}`}
                    </Text>
                    <Text style={styles.commentTime}>
                      {formatTimeAgo(comment.createdAt)}
                    </Text>
                    {comment.userId === userProfile?.id && (
                      <TouchableOpacity
                        onPress={() =>
                          deleteComment(selectedPost.id, comment.id)
                        }
                      >
                        <Trash2 size={14} color="#D97757" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.commentContent}>{comment.content}</Text>
                </View>
              ))}

              <View style={styles.addCommentSection}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Add a comment..."
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
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
  },
  createButton: {
    backgroundColor: '#87A96B',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  challengeCard: {
    borderRadius: 20,
    marginBottom: 24,
    overflow: 'hidden',
  },
  challengeGradient: {
    padding: 20,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  challengeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F5F1E8',
  },
  challengeDescription: {
    fontSize: 14,
    color: 'rgba(245, 241, 232, 0.9)',
    marginBottom: 16,
  },
  challengeProgress: {
    gap: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(245, 241, 232, 0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F5F1E8',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#F5F1E8',
    fontWeight: '500',
  },
  leaderboardCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(229, 221, 208, 0.6)',
  },
  leaderboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  leaderboardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C5F41',
  },
  leaderboardList: {
    gap: 12,
  },
  leaderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  leaderRank: {
    fontSize: 16,
    fontWeight: '700',
    color: '#87A96B',
    width: 24,
  },
  leaderName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2C5F41',
    flex: 1,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#F59E0B',
  },
  leaderProgress: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  postsSection: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
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
  postCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(229, 221, 208, 0.6)',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(135, 169, 107, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C5F41',
  },
  postType: {
    fontSize: 14,
  },
  timestamp: {
    fontSize: 12,
    color: '#8B7355',
  },
  postActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  postContent: {
    fontSize: 14,
    color: '#2C5F41',
    marginBottom: 12,
    lineHeight: 20,
  },
  postInteractions: {
    flexDirection: 'row',
    gap: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(229, 221, 208, 0.3)',
  },
  interactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  interactionText: {
    fontSize: 14,
    color: '#8B7355',
    fontWeight: '500',
  },
  likedText: {
    color: '#D97757',
  },
  commentsPreview: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(229, 221, 208, 0.3)',
  },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  commentUser: {
    fontSize: 12,
    fontWeight: '600',
    color: '#87A96B',
  },
  commentContent: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
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
    height: 120,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeOption: {
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
  typeSelected: {
    backgroundColor: 'rgba(135, 169, 107, 0.1)',
    borderColor: '#87A96B',
  },
  typeEmoji: {
    fontSize: 16,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  typeSelectedText: {
    color: '#87A96B',
  },
  commentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(229, 221, 208, 0.6)',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentTime: {
    fontSize: 12,
    color: '#8B7355',
  },
  addCommentSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(229, 221, 208, 0.6)',
  },
  commentInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(229, 221, 208, 0.6)',
    color: '#2C5F41',
    minHeight: 80,
    textAlignVertical: 'top',
  },
});

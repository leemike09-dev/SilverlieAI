import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useLanguage } from '../i18n/LanguageContext';
import { HEADER_PADDING_TOP } from '../utils/layout';

const API_URL = 'https://silverlieai.onrender.com';

type Post = {
  id: string;
  author_name: string;
  content: string;
  created_at: string;
};

type Comment = {
  id: string;
  author_name: string;
  content: string;
  created_at: string;
};

export default function GroupBoardScreen({ navigation, route }: any) {
  const { groupId, groupName, userId, userName } = route.params;
  const { t } = useLanguage();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPostForm, setShowPostForm] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [postSubmitting, setPostSubmitting] = useState(false);

  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentSubmitting, setCommentSubmitting] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/community/${groupId}/posts`);
      const data = await res.json();
      setPosts(Array.isArray(data) ? data : []);
    } catch {}
    finally { setLoading(false); }
  };

  const fetchComments = async (postId: string) => {
    try {
      const res = await fetch(`${API_URL}/community/posts/${postId}/comments`);
      const data = await res.json();
      setComments(prev => ({ ...prev, [postId]: Array.isArray(data) ? data : [] }));
    } catch {}
  };

  const handleExpandPost = (postId: string) => {
    if (expandedPost === postId) {
      setExpandedPost(null);
    } else {
      setExpandedPost(postId);
      if (!comments[postId]) fetchComments(postId);
    }
  };

  const handleSubmitPost = async () => {
    if (!newPostContent.trim()) return;
    setPostSubmitting(true);
    try {
      await fetch(`${API_URL}/community/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: groupId,
          user_id: userId,
          author_name: userName,
          content: newPostContent.trim(),
        }),
      });
      setNewPostContent('');
      setShowPostForm(false);
      fetchPosts();
    } catch {}
    finally { setPostSubmitting(false); }
  };

  const handleSubmitComment = async (postId: string) => {
    const content = commentInputs[postId]?.trim();
    if (!content) return;
    setCommentSubmitting(postId);
    try {
      await fetch(`${API_URL}/community/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          author_name: userName,
          content,
        }),
      });
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      fetchComments(postId);
    } catch {}
    finally { setCommentSubmitting(null); }
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString();

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>{t.back}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{groupName}</Text>
        <Text style={styles.subtitle}>{t.communityBoard}</Text>
      </View>

      {/* 글쓰기 버튼 */}
      <TouchableOpacity style={styles.newPostBtn} onPress={() => setShowPostForm(!showPostForm)}>
        <Text style={styles.newPostBtnText}>✏️ {t.communityNewPost}</Text>
      </TouchableOpacity>

      {showPostForm && (
        <View style={styles.postForm}>
          <TextInput
            style={styles.postInput}
            placeholder={t.communityPostPlaceholder}
            value={newPostContent}
            onChangeText={setNewPostContent}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[styles.postSubmitBtn, !newPostContent.trim() && styles.postSubmitBtnDisabled]}
            onPress={handleSubmitPost}
            disabled={postSubmitting || !newPostContent.trim()}
          >
            {postSubmitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.postSubmitBtnText}>{t.communityPostBtn}</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      {/* 게시글 목록 */}
      {loading ? (
        <ActivityIndicator size="large" color="#2D6A4F" style={{ marginTop: 40 }} />
      ) : posts.length === 0 ? (
        <Text style={styles.emptyText}>{t.communityNoPosts}</Text>
      ) : (
        posts.map(post => (
          <View key={post.id} style={styles.postCard}>
            <View style={styles.postHeader}>
              <Text style={styles.postAuthor}>👤 {post.author_name}</Text>
              <Text style={styles.postDate}>{formatDate(post.created_at)}</Text>
            </View>
            <Text style={styles.postContent}>{post.content}</Text>

            {/* 댓글 토글 버튼 */}
            <TouchableOpacity style={styles.commentToggle} onPress={() => handleExpandPost(post.id)}>
              <Text style={styles.commentToggleText}>
                💬 {t.communityComment} {expandedPost === post.id ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>

            {/* 댓글 섹션 */}
            {expandedPost === post.id && (
              <View style={styles.commentsSection}>
                {(comments[post.id] || []).length === 0 ? null : (
                  (comments[post.id] || []).map(comment => (
                    <View key={comment.id} style={styles.commentCard}>
                      <Text style={styles.commentAuthor}>{comment.author_name}</Text>
                      <Text style={styles.commentContent}>{comment.content}</Text>
                      <Text style={styles.commentDate}>{formatDate(comment.created_at)}</Text>
                    </View>
                  ))
                )}
                <View style={styles.commentInputRow}>
                  <TextInput
                    style={styles.commentInput}
                    placeholder={t.communityCommentPlaceholder}
                    value={commentInputs[post.id] || ''}
                    onChangeText={text => setCommentInputs(prev => ({ ...prev, [post.id]: text }))}
                  />
                  <TouchableOpacity
                    style={styles.commentSubmitBtn}
                    onPress={() => handleSubmitComment(post.id)}
                    disabled={commentSubmitting === post.id}
                  >
                    {commentSubmitting === post.id
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.commentSubmitText}>{t.communityCommentBtn}</Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        ))
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F4EF' },
  header: {
    backgroundColor: '#2D6A4F',
    padding: 20,
    paddingTop: HEADER_PADDING_TOP,
  },
  backBtn: { marginBottom: 8 },
  backText: { color: '#B7E4C7', fontSize: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 14, color: '#B7E4C7', marginTop: 4 },
  newPostBtn: {
    margin: 16,
    backgroundColor: '#2D6A4F',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  newPostBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  postForm: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  postInput: {
    backgroundColor: '#F7F4EF',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginBottom: 10,
    minHeight: 100,
  },
  postSubmitBtn: {
    backgroundColor: '#2D6A4F',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  postSubmitBtnDisabled: { backgroundColor: '#aaa' },
  postSubmitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
    fontSize: 16,
    paddingHorizontal: 24,
  },
  postCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  postAuthor: { fontSize: 14, color: '#2D6A4F', fontWeight: 'bold' },
  postDate: { fontSize: 13, color: '#aaa' },
  postContent: { fontSize: 16, color: '#333', lineHeight: 24 },
  commentToggle: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0ede7',
  },
  commentToggleText: { fontSize: 14, color: '#888' },
  commentsSection: { marginTop: 10 },
  commentCard: {
    backgroundColor: '#F7F4EF',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  commentAuthor: { fontSize: 13, fontWeight: 'bold', color: '#2D6A4F' },
  commentContent: { fontSize: 14, color: '#444', marginTop: 4 },
  commentDate: { fontSize: 12, color: '#aaa', marginTop: 4 },
  commentInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#F7F4EF',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  commentSubmitBtn: {
    backgroundColor: '#2D6A4F',
    borderRadius: 8,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  commentSubmitText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});

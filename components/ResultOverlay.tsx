import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  Share
} from 'react-native';
import { X, Copy, Share2, Star } from 'lucide-react-native';
import { OCRResult, AIResponse } from '@/types';

const { width, height } = Dimensions.get('window');

interface ResultOverlayProps {
  ocrResult: OCRResult;
  aiResponse: AIResponse;
  visible: boolean;
  onClose: () => void;
}

export default function ResultOverlay({
  ocrResult,
  aiResponse,
  visible,
  onClose
}: ResultOverlayProps) {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(height));

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `問題: ${ocrResult.text}\n\n答え: ${aiResponse.answer}\n\n解説: ${aiResponse.explanation}`,
        title: 'AIカメラ先生の解答'
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return '#34C759';
    if (confidence >= 0.6) return '#FF9500';
    return '#FF3B30';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return '高信頼度';
    if (confidence >= 0.6) return '中信頼度';
    return '低信頼度';
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>解析結果</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* 検出されたテキスト */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>検出されたテキスト</Text>
              <View style={[
                styles.confidenceBadge,
                { backgroundColor: getConfidenceColor(ocrResult.confidence) }
              ]}>
                <Text style={styles.confidenceText}>
                  {getConfidenceText(ocrResult.confidence)}
                </Text>
              </View>
            </View>
            <View style={styles.textCard}>
              <Text style={styles.detectedText}>{ocrResult.text}</Text>
            </View>
          </View>

          {/* AI解答 */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>AI解答</Text>
              <View style={[
                styles.confidenceBadge,
                { backgroundColor: getConfidenceColor(aiResponse.confidence) }
              ]}>
                <Star size={12} color="#fff" />
                <Text style={styles.confidenceText}>
                  {Math.round(aiResponse.confidence * 100)}%
                </Text>
              </View>
            </View>
            <View style={styles.answerCard}>
              <Text style={styles.answerTitle}>答え</Text>
              <Text style={styles.answerText}>{aiResponse.answer}</Text>
            </View>
          </View>

          {/* 解説 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>詳しい解説</Text>
            <View style={styles.explanationCard}>
              <Text style={styles.explanationText}>{aiResponse.explanation}</Text>
            </View>
          </View>

          {/* タイムスタンプ */}
          <View style={styles.timestamp}>
            <Text style={styles.timestampText}>
              解析時刻: {aiResponse.timestamp.toLocaleString('ja-JP')}
            </Text>
          </View>
        </ScrollView>

        {/* アクションボタン */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Share2 size={20} color="#007AFF" />
            <Text style={styles.actionButtonText}>共有</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Copy size={20} color="#007AFF" />
            <Text style={styles.actionButtonText}>コピー</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: height * 0.1,
    flex: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1D1D1F',
  },
  closeButton: {
    padding: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  confidenceText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  textCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
  },
  detectedText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1D1D1F',
  },
  answerCard: {
    backgroundColor: '#E8F4FD',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  answerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  answerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    lineHeight: 26,
  },
  explanationCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  explanationText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1D1D1F',
  },
  timestamp: {
    alignItems: 'center',
    marginTop: 10,
  },
  timestampText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7',
    backgroundColor: '#FBFBFD',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
});
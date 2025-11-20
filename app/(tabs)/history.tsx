import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  RefreshControl
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Trash2, Clock, Brain, FileText } from 'lucide-react-native';
import { HistoryItem } from '@/types';
import ResultOverlay from '@/components/ResultOverlay';

const STORAGE_KEYS = {
  HISTORY: 'analysis_history'
};

export default function HistoryScreen() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const storedHistory = await AsyncStorage.getItem(STORAGE_KEYS.HISTORY);
      if (storedHistory) {
        const parsed = JSON.parse(storedHistory);
        const processedHistory = parsed.map((item: any) => ({
          ...item,
          ocrResult: {
            ...item.ocrResult,
            timestamp: new Date(item.ocrResult.timestamp)
          },
          aiResponse: {
            ...item.aiResponse,
            timestamp: new Date(item.aiResponse.timestamp)
          }
        }));
        setHistory(processedHistory);
      }
    } catch (error) {
      console.error('履歴読み込みエラー:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const clearHistory = () => {
    Alert.alert(
      '履歴を削除',
      '全ての履歴を削除しますか？この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(STORAGE_KEYS.HISTORY);
              setHistory([]);
            } catch (error) {
              console.error('履歴削除エラー:', error);
            }
          }
        }
      ]
    );
  };

  const deleteItem = (itemId: string) => {
    Alert.alert(
      '項目を削除',
      'この項目を削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedHistory = history.filter(item => item.id !== itemId);
              setHistory(updatedHistory);
              await AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updatedHistory));
            } catch (error) {
              console.error('項目削除エラー:', error);
            }
          }
        }
      ]
    );
  };

  const handleItemPress = (item: HistoryItem) => {
    setSelectedItem(item);
    setShowResult(true);
  };

  const handleCloseResult = () => {
    setShowResult(false);
    setSelectedItem(null);
  };

  const renderHistoryItem = ({ item }: { item: HistoryItem }) => (
    <TouchableOpacity style={styles.historyItem} onPress={() => handleItemPress(item)}>
      <View style={styles.itemHeader}>
        <View style={styles.itemIcon}>
          <Brain size={20} color="#007AFF" />
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={2}>
            {item.ocrResult.text}
          </Text>
          <View style={styles.itemMeta}>
            <Clock size={12} color="#8E8E93" />
            <Text style={styles.itemTime}>
              {item.aiResponse.timestamp.toLocaleDateString('ja-JP')} {item.aiResponse.timestamp.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteItem(item.id)}
        >
          <Trash2 size={18} color="#FF3B30" />
        </TouchableOpacity>
      </View>
      <View style={styles.itemPreview}>
        <Text style={styles.previewAnswer} numberOfLines={3}>
          {item.aiResponse.answer}
        </Text>
      </View>
      <View style={styles.confidenceContainer}>
        <View style={[
          styles.confidenceBadge,
          { 
            backgroundColor: item.aiResponse.confidence >= 0.8 ? '#34C759' : 
                           item.aiResponse.confidence >= 0.6 ? '#FF9500' : '#FF3B30'
          }
        ]}>
          <Text style={styles.confidenceText}>
            信頼度 {Math.round(item.aiResponse.confidence * 100)}%
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <FileText size={64} color="#C7C7CC" />
      <Text style={styles.emptyTitle}>履歴がありません</Text>
      <Text style={styles.emptyDescription}>
        カメラで問題を撮影すると解析結果がここに保存されます
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FBFBFD" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>解析履歴</Text>
        {history.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={clearHistory}>
            <Trash2 size={20} color="#FF3B30" />
            <Text style={styles.clearButtonText}>全削除</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={history}
        renderItem={renderHistoryItem}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={history.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {selectedItem && (
        <ResultOverlay
          ocrResult={selectedItem.ocrResult}
          aiResponse={selectedItem.aiResponse}
          visible={showResult}
          onClose={handleCloseResult}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBFBFD',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1D1D1F',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clearButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1D1D1F',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
  },
  historyItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemIcon: {
    backgroundColor: '#E8F4FD',
    borderRadius: 10,
    padding: 8,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    lineHeight: 22,
    marginBottom: 4,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemTime: {
    fontSize: 12,
    color: '#8E8E93',
  },
  deleteButton: {
    padding: 4,
  },
  itemPreview: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  previewAnswer: {
    fontSize: 14,
    color: '#1D1D1F',
    lineHeight: 20,
  },
  confidenceContainer: {
    alignItems: 'flex-end',
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  confidenceText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
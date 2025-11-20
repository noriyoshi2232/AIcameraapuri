import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  SafeAreaView,
  StatusBar,
  TouchableOpacity
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Settings } from 'lucide-react-native';
import { router } from 'expo-router';
import CameraViewComponent from '@/components/CameraView';
import ResultOverlay from '@/components/ResultOverlay';
import { OCRResult, AIResponse, HistoryItem } from '@/types';
import { OpenAIService } from '@/services/openai';

const STORAGE_KEYS = {
  OPENAI_API_KEY: 'openai_api_key',
  HISTORY: 'analysis_history'
};

export default function CameraScreen() {
  const [apiKey, setApiKey] = useState<string>('');
  const [currentResult, setCurrentResult] = useState<{
    ocrResult: OCRResult;
    aiResponse: AIResponse;
  } | null>(null);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    loadApiKey();
  }, []);

  const loadApiKey = async () => {
    try {
      console.log('Loading API key from storage...');
      const storedApiKey = await AsyncStorage.getItem(STORAGE_KEYS.OPENAI_API_KEY);
      
      if (storedApiKey) {
        console.log('API key found in storage');
        setApiKey(storedApiKey);
        OpenAIService.getInstance().setApiKey(storedApiKey);
      } else {
        console.log('No API key found in storage');
        setApiKey('');
        OpenAIService.getInstance().clearApiKey();
      }
    } catch (error) {
      console.error('APIキー読み込みエラー:', error);
      setApiKey('');
      OpenAIService.getInstance().clearApiKey();
    }
  };

  const handleResult = async (ocrResult: OCRResult, aiResponse: AIResponse) => {
    console.log('結果を処理中:', { ocrResult, aiResponse });
    setCurrentResult({ ocrResult, aiResponse });
    setShowResult(true);

    // 履歴に保存
    try {
      const existingHistory = await AsyncStorage.getItem(STORAGE_KEYS.HISTORY);
      const history: HistoryItem[] = existingHistory ? JSON.parse(existingHistory) : [];
      
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        ocrResult,
        aiResponse
      };

      history.unshift(newItem);
      
      // 最新20件のみ保持
      const trimmedHistory = history.slice(0, 20);
      
      await AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(trimmedHistory));
      console.log('履歴に保存完了');
    } catch (error) {
      console.error('履歴保存エラー:', error);
    }
  };

  const handleCloseResult = () => {
    setShowResult(false);
    setCurrentResult(null);
  };

  const navigateToSettings = () => {
    router.push('/settings');
  };

  // APIキーの状態をチェック
  const hasValidApiKey = apiKey && apiKey.length > 0 && OpenAIService.getInstance().hasApiKey();

  if (!hasValidApiKey) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1D1D1F" />
        <View style={styles.noApiKeyContainer}>
          <Text style={styles.noApiKeyTitle}>AIカメラ先生</Text>
          <Text style={styles.noApiKeyText}>
            OpenAI APIキーが設定されていません。{'\n'}
            設定画面からAPIキーを入力してください。
          </Text>
          <View style={styles.statusInfo}>
            <Text style={styles.statusInfoText}>
              現在の状態: {apiKey ? 'APIキー設定済み（無効）' : 'APIキー未設定'}
            </Text>
          </View>
          <TouchableOpacity style={styles.settingsButton} onPress={navigateToSettings}>
            <Settings size={20} color="#fff" />
            <Text style={styles.settingsButtonText}>設定画面を開く</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AIカメラ先生</Text>
        <Text style={styles.headerSubtitle}>問題文を撮影してAIが解答します</Text>
      </View>

      <CameraViewComponent onResult={handleResult} apiKey={apiKey} />

      {currentResult && (
        <ResultOverlay
          ocrResult={currentResult.ocrResult}
          aiResponse={currentResult.aiResponse}
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
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 100,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headerSubtitle: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  noApiKeyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#1D1D1F',
  },
  noApiKeyTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  noApiKeyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  statusInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 30,
  },
  statusInfoText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  settingsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
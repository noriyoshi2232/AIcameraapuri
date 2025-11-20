import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
  Switch,
  Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Key, Eye, EyeOff, ExternalLink, Info, Shield, Trash2 } from 'lucide-react-native';
import { OpenAIService } from '@/services/openai';

const STORAGE_KEYS = {
  OPENAI_API_KEY: 'openai_api_key',
  AUTO_CAPTURE: 'auto_capture',
  SAVE_HISTORY: 'save_history'
};

export default function SettingsScreen() {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [autoCapture, setAutoCapture] = useState(false);
  const [saveHistory, setSaveHistory] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      console.log('Loading settings...');
      const [storedApiKey, storedAutoCapture, storedSaveHistory] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.OPENAI_API_KEY),
        AsyncStorage.getItem(STORAGE_KEYS.AUTO_CAPTURE),
        AsyncStorage.getItem(STORAGE_KEYS.SAVE_HISTORY)
      ]);

      console.log('Loaded API key:', storedApiKey ? 'Present' : 'Not found');
      
      if (storedApiKey) {
        setApiKey(storedApiKey);
        OpenAIService.getInstance().setApiKey(storedApiKey);
      }
      if (storedAutoCapture) setAutoCapture(JSON.parse(storedAutoCapture));
      if (storedSaveHistory !== null) setSaveHistory(JSON.parse(storedSaveHistory));
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveApiKey = async () => {
    if (!apiKey.trim()) {
      Alert.alert('エラー', 'APIキーを入力してください');
      return;
    }

    if (!apiKey.startsWith('sk-')) {
      Alert.alert('エラー', '正しいOpenAI APIキーを入力してください（sk-で始まる）');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Saving API key...');
      await AsyncStorage.setItem(STORAGE_KEYS.OPENAI_API_KEY, apiKey.trim());
      OpenAIService.getInstance().setApiKey(apiKey.trim());
      console.log('API key saved successfully');
      Alert.alert('成功', 'APIキーが保存されました');
    } catch (error) {
      console.error('Error saving API key:', error);
      Alert.alert('エラー', 'APIキーの保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteApiKey = async () => {
    Alert.alert(
      'APIキーを削除',
      'APIキーを完全に削除しますか？この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Deleting API key...');
              
              // AsyncStorageから削除
              await AsyncStorage.removeItem(STORAGE_KEYS.OPENAI_API_KEY);
              console.log('API key removed from AsyncStorage');
              
              // OpenAIServiceから削除
              OpenAIService.getInstance().clearApiKey();
              console.log('API key cleared from OpenAI service');
              
              // 状態をクリア
              setApiKey('');
              console.log('API key state cleared');
              
              Alert.alert('成功', 'APIキーが完全に削除されました');
            } catch (error) {
              console.error('Error deleting API key:', error);
              Alert.alert('エラー', 'APIキーの削除に失敗しました');
            }
          }
        }
      ]
    );
  };

  const clearAllData = async () => {
    Alert.alert(
      'すべてのデータを削除',
      'APIキー、設定、履歴をすべて削除しますか？この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Clearing all data...');
              
              // すべてのストレージをクリア
              await AsyncStorage.multiRemove([
                STORAGE_KEYS.OPENAI_API_KEY,
                STORAGE_KEYS.AUTO_CAPTURE,
                STORAGE_KEYS.SAVE_HISTORY,
                'analysis_history'
              ]);
              
              // OpenAIServiceをクリア
              OpenAIService.getInstance().clearApiKey();
              
              // 状態をリセット
              setApiKey('');
              setAutoCapture(false);
              setSaveHistory(true);
              
              Alert.alert('成功', 'すべてのデータが削除されました');
            } catch (error) {
              console.error('Error clearing all data:', error);
              Alert.alert('エラー', 'データの削除に失敗しました');
            }
          }
        }
      ]
    );
  };

  const toggleAutoCapture = async (value: boolean) => {
    setAutoCapture(value);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.AUTO_CAPTURE, JSON.stringify(value));
    } catch (error) {
      console.error('Error saving auto capture setting:', error);
    }
  };

  const toggleSaveHistory = async (value: boolean) => {
    setSaveHistory(value);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SAVE_HISTORY, JSON.stringify(value));
    } catch (error) {
      console.error('Error saving history setting:', error);
    }
  };

  const openApiKeyHelp = () => {
    Linking.openURL('https://platform.openai.com/api-keys');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FBFBFD" />
      
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>設定</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* API設定 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Key size={20} color="#007AFF" />
            <Text style={styles.sectionTitle}>OpenAI API設定</Text>
          </View>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="OpenAI APIキーを入力"
              value={apiKey}
              onChangeText={setApiKey}
              secureTextEntry={!showApiKey}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowApiKey(!showApiKey)}
            >
              {showApiKey ? (
                <EyeOff size={20} color="#8E8E93" />
              ) : (
                <Eye size={20} color="#8E8E93" />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={saveApiKey}
              disabled={isLoading}
            >
              <Text style={styles.primaryButtonText}>
                {isLoading ? '保存中...' : 'APIキーを保存'}
              </Text>
            </TouchableOpacity>

            {apiKey && (
              <TouchableOpacity
                style={[styles.button, styles.deleteButton]}
                onPress={deleteApiKey}
              >
                <Trash2 size={16} color="#fff" />
                <Text style={styles.deleteButtonText}>削除</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.helpButton} onPress={openApiKeyHelp}>
            <ExternalLink size={16} color="#007AFF" />
            <Text style={styles.helpButtonText}>APIキーの取得方法</Text>
          </TouchableOpacity>

          {/* 現在の状態表示 */}
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>現在の状態</Text>
            <Text style={styles.statusText}>
              APIキー: {apiKey ? '設定済み' : '未設定'}
            </Text>
            <Text style={styles.statusText}>
              サービス: {OpenAIService.getInstance().hasApiKey() ? '利用可能' : '利用不可'}
            </Text>
          </View>
        </View>

        {/* アプリ設定 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Shield size={20} color="#34C759" />
            <Text style={styles.sectionTitle}>アプリ設定</Text>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>自動撮影</Text>
              <Text style={styles.settingDescription}>
                問題文を検出すると自動的に撮影
              </Text>
            </View>
            <Switch
              value={autoCapture}
              onValueChange={toggleAutoCapture}
              trackColor={{ false: '#E5E5E7', true: '#007AFF' }}
              thumbColor={autoCapture ? '#fff' : '#fff'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>履歴を保存</Text>
              <Text style={styles.settingDescription}>
                解析結果を履歴に保存する
              </Text>
            </View>
            <Switch
              value={saveHistory}
              onValueChange={toggleSaveHistory}
              trackColor={{ false: '#E5E5E7', true: '#007AFF' }}
              thumbColor={saveHistory ? '#fff' : '#fff'}
            />
          </View>
        </View>

        {/* 危険な操作 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Trash2 size={20} color="#FF3B30" />
            <Text style={styles.sectionTitle}>危険な操作</Text>
          </View>

          <TouchableOpacity style={styles.dangerButton} onPress={clearAllData}>
            <Trash2 size={20} color="#FF3B30" />
            <Text style={styles.dangerButtonText}>すべてのデータを削除</Text>
          </TouchableOpacity>
        </View>

        {/* アプリ情報 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Info size={20} color="#FF9500" />
            <Text style={styles.sectionTitle}>アプリについて</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.appName}>AIカメラ先生</Text>
            <Text style={styles.appVersion}>バージョン 1.0.0</Text>
            <Text style={styles.appDescription}>
              カメラで問題文を撮影してAIが即座に解答・解説を提供するアプリです。
              算数の文章問題、クイズ、謎解きなど様々な問題に対応しています。
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBFBFD',
  },
  header: {
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
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E7',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#1D1D1F',
  },
  eyeButton: {
    padding: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  helpButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  statusCard: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#1D1D1F',
    marginBottom: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF3B30',
    gap: 8,
    justifyContent: 'center',
  },
  dangerButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16,
  },
  appDescription: {
    fontSize: 16,
    color: '#1D1D1F',
    lineHeight: 24,
  },
});
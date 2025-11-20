import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Camera, FlashlightOff as FlashOff, Slash as FlashOn, RotateCcw, Upload, Zap, ZapOff } from 'lucide-react-native';
import { OCRService } from '@/services/ocr';
import { OpenAIService } from '@/services/openai';
import { OCRResult, AIResponse } from '@/types';

const { width, height } = Dimensions.get('window');

interface CameraViewProps {
  onResult: (ocrResult: OCRResult, aiResponse: AIResponse) => void;
  apiKey: string;
}

export default function CameraViewComponent({ onResult, apiKey }: CameraViewProps) {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  const [lastProcessTime, setLastProcessTime] = useState(0);
  const cameraRef = useRef<CameraView>(null);
  const processingRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const ocrService = OCRService.getInstance();
  const openaiService = OpenAIService.getInstance();

  useEffect(() => {
    openaiService.setApiKey(apiKey);
  }, [apiKey]);

  useEffect(() => {
    if (realtimeEnabled) {
      startRealtimeProcessing();
    } else {
      stopRealtimeProcessing();
    }

    return () => {
      stopRealtimeProcessing();
    };
  }, [realtimeEnabled]);

  const startRealtimeProcessing = () => {
    if (intervalRef.current) return;
    
    intervalRef.current = setInterval(async () => {
      if (!processingRef.current && !isProcessing) {
        await processCurrentFrame();
      }
    }, 3000); // 3秒間隔で処理
  };

  const stopRealtimeProcessing = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const processCurrentFrame = async () => {
    if (!cameraRef.current || processingRef.current) return;

    const now = Date.now();
    if (now - lastProcessTime < 2000) return; // 最低2秒間隔

    processingRef.current = true;
    setLastProcessTime(now);
    
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.6,
        base64: false,
        skipProcessing: true
      });

      if (!photo?.uri) return;

      // OCR処理（軽量化）
      const ocrResult = await ocrService.recognizeText(photo.uri);
      
      // 問題文らしいテキストかチェック
      if (ocrResult.text && ocrResult.text.length > 10 && 
          (ocrResult.text.includes('?') || ocrResult.text.includes('？') || 
           ocrResult.text.includes('=') || ocrResult.text.includes('＝') ||
           /\d+/.test(ocrResult.text))) {
        
        setIsProcessing(true);
        
        // AI解析
        const aiResponse = await openaiService.analyzeText(ocrResult.text);

        const ocrData: OCRResult = {
          id: Date.now().toString(),
          text: ocrResult.text,
          confidence: ocrResult.confidence,
          timestamp: new Date()
        };

        const aiData: AIResponse = {
          id: Date.now().toString(),
          question: ocrResult.text,
          answer: aiResponse.answer,
          explanation: aiResponse.explanation,
          confidence: aiResponse.confidence,
          timestamp: new Date()
        };

        onResult(ocrData, aiData);
        setRealtimeEnabled(false); // 結果が出たらリアルタイムを停止
      }

    } catch (error) {
      console.error('リアルタイム処理エラー:', error);
      
      // OpenAI API エラーの場合はユーザーに通知
      if (error instanceof Error) {
        if (error.message.includes('API利用制限') || error.message.includes('APIキーが無効')) {
          Alert.alert('API エラー', error.message);
          setRealtimeEnabled(false); // リアルタイムを停止
        }
      }
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  };

  const takePictureAndAnalyze = async () => {
    if (!cameraRef.current || isProcessing) return;

    setIsProcessing(true);
    
    try {
      console.log('撮影開始...');
      
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: false
      });

      if (!photo?.uri) {
        Alert.alert('エラー', '写真の撮影に失敗しました');
        return;
      }

      console.log('写真撮影完了:', photo.uri);

      // OCR処理
      console.log('OCR処理開始...');
      const ocrResult = await ocrService.recognizeText(photo.uri);
      console.log('OCR結果:', ocrResult);

      if (!ocrResult.text || ocrResult.text.length < 2) {
        Alert.alert('エラー', 'テキストが検出されませんでした。もう一度お試しください。');
        return;
      }

      // AI解析
      console.log('AI解析開始...');
      const aiResponse = await openaiService.analyzeText(ocrResult.text);
      console.log('AI解析完了:', aiResponse);

      // 結果を作成
      const ocrData: OCRResult = {
        id: Date.now().toString(),
        text: ocrResult.text,
        confidence: ocrResult.confidence,
        timestamp: new Date()
      };

      const aiData: AIResponse = {
        id: Date.now().toString(),
        question: ocrResult.text,
        answer: aiResponse.answer,
        explanation: aiResponse.explanation,
        confidence: aiResponse.confidence,
        timestamp: new Date()
      };

      onResult(ocrData, aiData);

    } catch (error) {
      console.error('解析エラー:', error);
      Alert.alert('エラー', '解析に失敗しました。もう一度お試しください。');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Camera size={64} color="#8E8E93" />
          <Text style={styles.permissionTitle}>カメラの許可が必要です</Text>
          <Text style={styles.permissionText}>
            問題文を撮影して解析するために、カメラへのアクセスを許可してください。
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>カメラを許可</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    setFlashEnabled(!flashEnabled);
  };

  const toggleRealtime = () => {
    setRealtimeEnabled(!realtimeEnabled);
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        flash={flashEnabled ? 'on' : 'off'}
      >
        {/* フレームオーバーレイ */}
        <View style={styles.overlay}>
          <View style={styles.frame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          
          <Text style={styles.instructionText}>
            {realtimeEnabled 
              ? '問題文をフレーム内に収めてください（自動検出中）'
              : '問題文をフレーム内に収めて撮影ボタンを押してください'
            }
          </Text>

          {realtimeEnabled && (
            <View style={styles.realtimeIndicator}>
              <ActivityIndicator size="small" color="#34C759" />
              <Text style={styles.realtimeText}>リアルタイム検出中...</Text>
            </View>
          )}
        </View>

        {/* 処理中オーバーレイ */}
        {isProcessing && (
          <View style={styles.processingOverlay}>
            <View style={styles.processingCard}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.processingText}>解析中...</Text>
              <Text style={styles.processingSubtext}>
                テキストを認識してAIが解答を生成しています
              </Text>
            </View>
          </View>
        )}

        {/* コントロールボタン */}
        <View style={styles.controls}>
          <View style={styles.topControls}>
            <TouchableOpacity 
              style={[
                styles.realtimeButton,
                realtimeEnabled && styles.realtimeButtonActive
              ]} 
              onPress={toggleRealtime}
              disabled={isProcessing}
            >
              {realtimeEnabled ? (
                <Zap size={20} color="#fff" />
              ) : (
                <ZapOff size={20} color="#fff" />
              )}
              <Text style={styles.realtimeButtonText}>
                {realtimeEnabled ? 'リアルタイム ON' : 'リアルタイム OFF'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomControls}>
            <TouchableOpacity 
              style={styles.controlButton} 
              onPress={toggleFlash}
              disabled={isProcessing}
            >
              {flashEnabled ? (
                <FlashOn size={24} color="#fff" />
              ) : (
                <FlashOff size={24} color="#fff" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.captureButton,
                isProcessing && styles.captureButtonDisabled
              ]}
              onPress={takePictureAndAnalyze}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size={32} color="#fff" />
              ) : (
                <Camera size={32} color="#fff" />
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.controlButton} 
              onPress={toggleCameraFacing}
              disabled={isProcessing}
            >
              <RotateCcw size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ヒント */}
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>
            💡 明るい場所で、文字がはっきり見えるように撮影してください
          </Text>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#1D1D1F',
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frame: {
    width: width * 0.85,
    height: height * 0.4,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#007AFF',
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 8,
  },
  instructionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  realtimeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
    gap: 8,
  },
  realtimeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    marginHorizontal: 40,
  },
  processingText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1D1D1F',
    marginTop: 16,
  },
  processingSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  controls: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
  },
  topControls: {
    alignItems: 'center',
    marginBottom: 20,
  },
  realtimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  realtimeButtonActive: {
    backgroundColor: 'rgba(52, 199, 89, 0.8)',
  },
  realtimeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 60,
  },
  controlButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 30,
    padding: 15,
  },
  captureButton: {
    backgroundColor: '#007AFF',
    borderRadius: 40,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  captureButtonDisabled: {
    backgroundColor: '#8E8E93',
  },
  hintContainer: {
    position: 'absolute',
    bottom: 180,
    left: 20,
    right: 20,
  },
  hintText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 12,
    borderRadius: 8,
  },
});
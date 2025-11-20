import Tesseract, { createWorker } from 'tesseract.js';

export class OCRService {
  private static instance: OCRService;
  private worker: Tesseract.Worker | null = null;
  private isInitialized = false;
  private isInitializing = false;

  private constructor() {}

  static getInstance(): OCRService {
    if (!OCRService.instance) {
      OCRService.instance = new OCRService();
    }
    return OCRService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.isInitializing) {
      // 初期化中の場合は完了まで待機
      while (this.isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    this.isInitializing = true;
    console.log('OCRサービスを初期化中...');

    try {
      this.worker = await createWorker('eng+jpn', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR進行状況: ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      // OCRの設定を最適化（リアルタイム処理用）
      await this.worker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzあいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽゃゅょっァィゥェォャュョッアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポ＋－×÷＝（）？！。、',
        tessedit_pageseg_mode: '6', // 単一のテキストブロック
        tessedit_ocr_engine_mode: '1', // LSTM OCRエンジン（高速）
      });

      this.isInitialized = true;
      console.log('OCRサービスの初期化完了');
    } catch (error) {
      console.error('OCR初期化エラー:', error);
      throw new Error('OCRの初期化に失敗しました');
    } finally {
      this.isInitializing = false;
    }
  }

  async recognizeText(imageUri: string, isRealtime: boolean = false): Promise<{
    text: string;
    confidence: number;
  }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.worker) {
      throw new Error('OCRワーカーが初期化されていません');
    }

    console.log('OCR認識開始...', isRealtime ? '(リアルタイム)' : '(手動)');
    
    try {
      const startTime = Date.now();
      
      // リアルタイム処理の場合は低品質で高速処理
      const options = isRealtime ? {
        rectangle: { top: 0, left: 0, width: 0, height: 0 }
      } : {};
      
      const { data } = await this.worker.recognize(imageUri, options);
      const endTime = Date.now();
      
      console.log(`OCR認識完了 (${endTime - startTime}ms):`, {
        text: data.text.substring(0, 100) + (data.text.length > 100 ? '...' : ''),
        confidence: data.confidence,
        length: data.text.length,
        isRealtime
      });

      // テキストをクリーンアップ
      const cleanText = data.text
        .replace(/\s+/g, ' ') // 複数の空白を1つに
        .replace(/[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u002B\u002D\u00D7\u00F7\u003D\u0028\u0029\u003F\u0021\u3002\u3001]/g, '') // 不要な文字を除去
        .trim();

      return {
        text: cleanText,
        confidence: Math.max(0.1, data.confidence / 100) // 最低信頼度を0.1に設定
      };
    } catch (error) {
      console.error('OCR認識エラー:', error);
      throw new Error('テキスト認識に失敗しました');
    }
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      try {
        await this.worker.terminate();
        console.log('OCRサービス終了');
      } catch (error) {
        console.error('OCR終了エラー:', error);
      } finally {
        this.worker = null;
        this.isInitialized = false;
        this.isInitializing = false;
      }
    }
  }
}
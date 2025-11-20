export interface OCRResult {
  id: string;
  text: string;
  confidence: number;
  timestamp: Date;
}

export interface AIResponse {
  id: string;
  question: string;
  answer: string;
  explanation: string;
  confidence: number;
  timestamp: Date;
}

export interface HistoryItem {
  id: string;
  ocrResult: OCRResult;
  aiResponse: AIResponse;
  image?: string;
}

export interface CameraSettings {
  flashEnabled: boolean;
  autoCapture: boolean;
  language: 'jpn' | 'eng';
}
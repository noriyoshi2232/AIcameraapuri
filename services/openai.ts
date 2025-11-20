export class OpenAIService {
  private static instance: OpenAIService;
  private apiKey: string = '';

  private constructor() {}

  static getInstance(): OpenAIService {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService();
    }
    return OpenAIService.instance;
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    console.log('OpenAI API key updated:', apiKey ? 'Set' : 'Cleared');
  }

  clearApiKey(): void {
    this.apiKey = '';
    console.log('OpenAI API key cleared');
  }

  hasApiKey(): boolean {
    return this.apiKey.length > 0;
  }

  getApiKey(): string {
    return this.apiKey;
  }

  async analyzeText(text: string): Promise<{
    answer: string;
    explanation: string;
    confidence: number;
  }> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not set');
    }

    console.log('Analyzing text with OpenAI:', text.substring(0, 50) + '...');
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `あなたは優秀な先生です。以下のテキストが問題文の場合は、詳しい解答と解説を日本語で提供してください。問題文でない場合は、テキストの内容について説明してください。

回答は以下のJSON形式で返してください：
{
  "answer": "簡潔な答え",
  "explanation": "詳しい解説",
  "confidence": 0.95
}

日本語で回答し、数学問題、文章問題、クイズ、謎解きなど様々な問題に対応してください。`
            },
            {
              role: 'user',
              content: text
            }
          ],
          max_tokens: 1000,
          temperature: 0.7
        })
      });

      console.log('OpenAI response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('OpenAI API error:', errorData);
        
        if (response.status === 401) {
          throw new Error('APIキーが無効です。正しいOpenAI APIキーを設定してください。');
        } else if (response.status === 429) {
          if (errorData.error?.code === 'insufficient_quota') {
            throw new Error('OpenAI APIの利用枠を超過しました。プランと請求詳細を確認してください。');
          } else {
            throw new Error('API利用制限に達しました。しばらく待ってから再試行してください。');
          }
        } else if (response.status === 403) {
          throw new Error('APIアクセスが拒否されました。APIキーの権限を確認してください。');
        } else {
          throw new Error(`API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }
      }

      const data = await response.json();
      console.log('OpenAI response received:', data);
      
      const content = data.choices[0].message.content;
      
      try {
        const parsed = JSON.parse(content);
        return {
          answer: parsed.answer || 'No answer provided',
          explanation: parsed.explanation || 'No explanation provided',
          confidence: parsed.confidence || 0.5
        };
      } catch (parseError) {
        console.log('JSON parse failed, using raw content:', content);
        return {
          answer: content,
          explanation: 'GPT-4による回答',
          confidence: 0.8
        };
      }
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }
}
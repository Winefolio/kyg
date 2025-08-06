import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface TextAnalysisResult {
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number; // 1-10 scale (1 = very negative, 10 = very positive)
  confidence: number; // 0-1 scale
  keywords: string[];
  summary?: string;
}

export interface WineTextAnalysis {
  wineId: string;
  participantId: string;
  textResponses: Array<{
    slideId: string;
    questionTitle: string;
    textContent: string;
    analysis: TextAnalysisResult;
  }>;
  overallSentiment: TextAnalysisResult;
}

/**
 * Analyze sentiment of a single text response using ChatGPT
 */
export async function analyzeSingleTextSentiment(
  textContent: string,
  questionContext: string
): Promise<TextAnalysisResult> {
  try {
    // Skip empty or very short text
    if (!textContent || textContent.trim().length < 3) {
      return {
        sentiment: 'neutral',
        sentimentScore: 5,
        confidence: 0.2,
        keywords: [],
        summary: 'Text too short for analysis'
      };
    }

    const prompt = `Analyze the sentiment of the following wine tasting note for the question "${questionContext}":

Text: "${textContent}"

Please provide:
1. Overall sentiment (positive, neutral, or negative)
2. A sentiment score from 1-10 where:
   - 1-3: Very negative (harsh criticism, strong dislike)
   - 4-5: Somewhat negative (mild criticism, lukewarm response)
   - 6: Neutral (balanced, objective description)
   - 7-8: Positive (appreciation, enjoyment expressed)
   - 9-10: Very positive (high praise, exceptional experience)
3. Confidence level (0-1) based on clarity of sentiment indicators
4. Key descriptive words/phrases (maximum 5)
5. A brief summary if the text is long (maximum 50 words)

Focus on wine-specific language and context. Consider that technical descriptions might be neutral even if they mention challenging aspects.

Respond in JSON format only:
{
  "sentiment": "positive|neutral|negative",
  "sentimentScore": 1-10,
  "confidence": 0-1,
  "keywords": ["word1", "word2"],
  "summary": "brief summary if needed"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert wine sommelier and sentiment analysis specialist. Analyze wine tasting notes objectively, considering that wine appreciation is subjective and technical language may be neutral. Focus on emotional indicators and evaluative language rather than descriptive terminology. Provide accurate sentiment scores that reflect the writer's actual experience and satisfaction level."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 350,
      temperature: 0.2, // Very low temperature for consistent analysis
      response_format: { type: "json_object" } // Ensure JSON response
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    // Parse JSON response with better error handling
    let analysis: TextAnalysisResult;
    try {
      analysis = JSON.parse(response) as TextAnalysisResult;
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', response);
      throw new Error('Invalid JSON response from OpenAI');
    }
    
    // Validate and sanitize the response with improved bounds checking
    return {
      sentiment: ['positive', 'neutral', 'negative'].includes(analysis.sentiment) 
        ? analysis.sentiment as 'positive' | 'neutral' | 'negative'
        : 'neutral',
      sentimentScore: Math.min(10, Math.max(1, Math.round(analysis.sentimentScore || 5))),
      confidence: Math.min(1, Math.max(0, analysis.confidence || 0.5)),
      keywords: Array.isArray(analysis.keywords) 
        ? analysis.keywords.slice(0, 5).filter(k => typeof k === 'string' && k.length > 0)
        : [],
      summary: typeof analysis.summary === 'string' 
        ? analysis.summary.substring(0, 100) 
        : undefined
    };

  } catch (error) {
    console.error('Error analyzing text sentiment:', error);
    
    // Fallback analysis based on simple keyword detection
    return getFallbackSentimentAnalysis(textContent);
  }
}

/**
 * Analyze multiple text responses for a wine and provide overall sentiment
 */
export async function analyzeWineTextResponses(
  textResponses: Array<{
    slideId: string;
    questionTitle: string;
    textContent: string;
  }>,
  wineId: string,
  participantId: string
): Promise<WineTextAnalysis> {
  try {
    console.log(`🤖 Analyzing ${textResponses.length} text responses for wine ${wineId}`);

    // Analyze each text response individually
    const analyzedResponses = await Promise.all(
      textResponses.map(async (response) => ({
        ...response,
        analysis: await analyzeSingleTextSentiment(response.textContent, response.questionTitle)
      }))
    );

    // Calculate overall sentiment
    const totalScore = analyzedResponses.reduce((sum, r) => sum + r.analysis.sentimentScore, 0);
    const averageScore = totalScore / analyzedResponses.length;
    
    const overallSentiment = averageScore <= 4 ? 'negative' : 
                           averageScore >= 7 ? 'positive' : 'neutral';
    
    const averageConfidence = analyzedResponses.reduce((sum, r) => sum + r.analysis.confidence, 0) / analyzedResponses.length;
    
    // Collect all keywords
    const allKeywords = analyzedResponses.flatMap(r => r.analysis.keywords);
    const keywordCounts = allKeywords.reduce((acc: Record<string, number>, keyword) => {
      acc[keyword] = (acc[keyword] || 0) + 1;
      return acc;
    }, {});
    
    // Get most frequent keywords
    const topKeywords = Object.entries(keywordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8)
      .map(([keyword]) => keyword);

    const overallAnalysis: TextAnalysisResult = {
      sentiment: overallSentiment,
      sentimentScore: Math.round(averageScore * 10) / 10, // Round to 1 decimal
      confidence: Math.round(averageConfidence * 100) / 100, // Round to 2 decimals
      keywords: topKeywords,
      summary: `Overall ${overallSentiment} sentiment based on ${analyzedResponses.length} responses`
    };

    return {
      wineId,
      participantId,
      textResponses: analyzedResponses,
      overallSentiment: overallAnalysis
    };

  } catch (error) {
    console.error('Error analyzing wine text responses:', error);
    
    // Return fallback analysis
    return {
      wineId,
      participantId,
      textResponses: textResponses.map(response => ({
        ...response,
        analysis: getFallbackSentimentAnalysis(response.textContent)
      })),
      overallSentiment: {
        sentiment: 'neutral',
        sentimentScore: 5,
        confidence: 0.3,
        keywords: [],
        summary: 'Analysis unavailable - using fallback'
      }
    };
  }
}

/**
 * Fallback sentiment analysis using enhanced keyword matching
 */
export function getFallbackSentimentAnalysis(textContent: string): TextAnalysisResult {
  const positiveWords = [
    'excellent', 'amazing', 'wonderful', 'great', 'love', 'beautiful', 'perfect', 'fantastic', 
    'delicious', 'smooth', 'elegant', 'complex', 'rich', 'vibrant', 'balanced', 'exceptional',
    'outstanding', 'impressive', 'lovely', 'refreshing', 'crisp', 'fruity', 'aromatic',
    'well-structured', 'harmonious', 'sophisticated', 'refined', 'remarkable', 'divine',
    'exquisite', 'superb', 'magnificent', 'brilliant', 'marvelous'
  ];
  
  const negativeWords = [
    'terrible', 'awful', 'hate', 'disgusting', 'bad', 'poor', 'unpleasant', 'harsh', 
    'bitter', 'sour', 'off', 'flat', 'bland', 'boring', 'disappointing', 'weak',
    'thin', 'watery', 'metallic', 'corked', 'oxidized', 'musty', 'stale', 'dull',
    'unbalanced', 'cloying', 'overpowering', 'astringent', 'acidic', 'rough'
  ];
  
  const neutralWords = [
    'dry', 'sweet', 'medium', 'light', 'dark', 'red', 'white', 'oak', 'tannin',
    'acidity', 'finish', 'nose', 'palate', 'grape', 'vintage', 'region'
  ];
  
  const text = textContent.toLowerCase();
  const words = text.split(/\s+/);
  
  const positiveCount = positiveWords.filter(word => text.includes(word)).length;
  const negativeCount = negativeWords.filter(word => text.includes(word)).length;
  const neutralCount = neutralWords.filter(word => text.includes(word)).length;
  
  // Enhanced scoring algorithm
  let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
  let sentimentScore = 5;
  let confidence = 0.3; // Base confidence for fallback
  
  // Calculate total emotional indicators
  const totalEmotionalWords = positiveCount + negativeCount;
  const textLength = words.length;
  
  if (totalEmotionalWords > 0) {
    // Increase confidence based on emotional word density
    confidence = Math.min(0.7, 0.3 + (totalEmotionalWords / textLength) * 2);
    
    if (positiveCount > negativeCount) {
      sentiment = 'positive';
      sentimentScore = Math.min(10, 5 + (positiveCount * 1.5) + (positiveCount - negativeCount) * 0.5);
    } else if (negativeCount > positiveCount) {
      sentiment = 'negative';
      sentimentScore = Math.max(1, 5 - (negativeCount * 1.5) - (negativeCount - positiveCount) * 0.5);
    } else {
      // Equal positive and negative - stay neutral but adjust slightly
      sentimentScore = neutralCount > 2 ? 5 : 4.5;
    }
  }
  
  // Extract found keywords
  const foundKeywords = [
    ...positiveWords.filter(word => text.includes(word)),
    ...negativeWords.filter(word => text.includes(word))
  ].slice(0, 5);
  
  return {
    sentiment,
    sentimentScore: Math.round(sentimentScore * 10) / 10, // Round to 1 decimal
    confidence: Math.round(confidence * 100) / 100, // Round to 2 decimals
    keywords: foundKeywords,
    summary: `Fallback analysis based on ${totalEmotionalWords} sentiment indicators`
  };
}

/**
 * Check if OpenAI is configured
 */
export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

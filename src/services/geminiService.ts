import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const genAI  = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export const getEquipmentSuggestions = async (
  eventType: string,
  eventName: string,
  existingItems: string[]
): Promise<{ name: string; category: string; reason: string }[]> => {
  if (!genAI) {
    console.warn('Gemini API key missing — set VITE_GEMINI_API_KEY in .env');
    return [];
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              name:     { type: SchemaType.STRING, description: 'שם הפריט בעברית' },
              category: { type: SchemaType.STRING, description: 'קטגוריה בעברית' },
              reason:   { type: SchemaType.STRING, description: 'הסבר קצר בעברית' },
            },
            required: ['name', 'category', 'reason'],
          },
        },
      },
    });

    const prompt = `
      אני מנהל אירועים בבר קוקטיילים BNP.
      סוג אירוע: ${eventType}
      שם האירוע: ${eventName}
      פריטים שכבר קיימים ברשימה: ${existingItems.join(', ')}

      בהתבסס על הניסיון של בר קוקטיילים מקצועי, הצע 3 פריטים חשובים שחסרים ברשימת הציוד.
      החזר את התשובה בעברית בפורמט JSON.
    `;

    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text() || '[]');
  } catch (error) {
    console.error('Gemini suggestions error:', error);
    return [];
  }
};

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
export const getEquipmentSuggestions = async (
  eventType: string,
  eventName: string,
  existingItems: string[]
): Promise<{ name: string; category: string; reason: string }[]> => {
  try {
    // שימוש במודל Gemini 3 Flash כפי שמוגדר בחשבון שלך
    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              name: { type: SchemaType.STRING, description: "שם הפריט בעברית" },
              category: { type: SchemaType.STRING, description: "קטגוריה בעברית" },
              reason: { type: SchemaType.STRING, description: "הסבר קצר בעברית" }
            },
            required: ["name", "category", "reason"]
          }
        }
      }
    });

    const prompt = `
      אני מנהל אירועים בבר קוקטיילים BNP.
      סוג אירוע: ${eventType}
      שם האירוע: ${eventName}
      פריטים שכבר קיימים ברשימה: ${existingItems.join(', ')}

      בהתבסס על הניסיון של בר קוקטיילים מקצועי, הצע 3 פריטים חשובים שחסרים ברשימה הציוד הזו.
      החזר את התשובה בעברית בפורמט JSON.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    return JSON.parse(responseText || "[]");

  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return [];
  }
};

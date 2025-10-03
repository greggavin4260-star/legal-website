const functions = require("firebase-functions");
const { onCall } = require("firebase-functions/v2/https");
const { defineString } = require('firebase-functions/params');
const admin = require("firebase-admin");
const OpenAI = require("openai");
const { getStorage } = require("firebase-admin/storage");

admin.initializeApp();
const openai = new OpenAI({ apiKey: defineString("OPENAI_API_KEY").value() });

exports.analyzeMicrobiomePDF = onCall(async (request) => {
  const fileUrl = request.data?.fileUrl;
  if (!fileUrl) {
    throw new functions.https.HttpsError("invalid-argument", "Missing fileUrl");
  }

  try {
    const bucket = getStorage().bucket();
    const fileName = fileUrl.split("/").pop();
    const file = bucket.file(fileName);
    const [buffer] = await file.download();

    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "You are a medical expert. Analyze this microbiome PDF and summarize key insights: diversity, dominant species, deficiencies, and actionable recommendations." },
            {
              type: "image_url",
              image_url: { url: `data:application/pdf;base64,${buffer.toString('base64')}` },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    const analysis = response.choices[0].message.content;
    return { summary: analysis };

  } catch (error) {
    console.error("Error analyzing PDF:", error);
    throw new functions.https.HttpsError("internal", "PDF analysis failed.");
  }
});

require("dotenv").config();
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testOpenAI() {
  try {
    console.log("🔍 Test de la clé OpenAI...");
    console.log("Clé trouvée:", process.env.OPENAI_API_KEY ? "OUI" : "NON");

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: "Dis-moi bonjour en français",
        },
      ],
      max_tokens: 50,
    });

    console.log("✅ Test réussi !");
    console.log("Réponse:", completion.choices[0].message.content);
  } catch (error) {
    console.error("❌ Erreur:", error.message);
  }
}

testOpenAI();

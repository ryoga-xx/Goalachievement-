import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_INSTRUCTION = `あなたは心理学（認知行動療法、行動心理学）に基づいた目標達成支援の伴走コーチです。
トーン＆マナー：「徹底的に寄り添うコーチ」。ユーザーを否定せず、共感と受容を示した上で、科学的かつ具体的な行動を優しく提案する包容力のあるトーン。`;

export async function getEmpathyAndNextQuestion(history: {role: string, text: string}[], currentQuestionIndex: number) {
  const questions = [
    "現状、どのような働き方、生活に『モヤモヤ』を感じていますか？ 具体的に、何が一番の不満ですか？",
    "将来、どのような『自分のビジネス』を立ち上げたい、または『FIRE』をどう実現したいですか？ 数字やイメージで教えてください。",
    "これまでに目標達成のために何を試し、なぜ『成果が出ていない』と感じていますか？",
    "今、最も『不安』や『焦り』を感じている具体的な状況は何ですか？",
    "目標達成のために使える時間、資金、スキル（得意なこと）はどのくらいありますか？"
  ];

  if (currentQuestionIndex >= questions.length) {
    return "ありがとうございます。すべての質問にお答えいただきました。あなた専用のダッシュボードを作成します...";
  }

  const nextQuestion = questions[currentQuestionIndex];

  if (history.length === 0) {
    return nextQuestion;
  }

  const formattedHistory = history.map(h => ({
    role: h.role === 'user' ? 'user' : 'model',
    parts: [{ text: h.text }]
  }));

  const prompt = `ユーザーが質問に回答しました。まずはユーザーの最新の回答に対して「共感・受容」のメッセージを1〜2文で返してください。その後、次の質問を提示してください。
  次の質問: ${nextQuestion}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: [...formattedHistory, { role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      }
    });

    return response.text || nextQuestion;
  } catch (e: any) {
    console.error("API Error in getEmpathyAndNextQuestion:", e);
    if (e?.status === 429 || e?.message?.includes("429") || e?.message?.includes("quota")) {
      return "（APIの利用制限に達しました。しばらく経ってから再度お試しください。）\n\n" + nextQuestion;
    }
    return nextQuestion;
  }
}

export async function generateDashboardData(history: {role: string, text: string}[]) {
  const formattedHistory = history.map(h => `${h.role === 'user' ? 'ユーザー' : 'コーチ'}: ${h.text}`).join('\n');

  const prompt = `以下の対話履歴をもとに、ユーザー専用の目標達成ダッシュボードのデータをJSON形式で生成してください。
  対話履歴:
  ${formattedHistory}

  出力JSONフォーマット:
  {
    "vision": {
      "title": "未来のビジョンタイトル（例：2029年 ポルトガルの海岸線）",
      "description": "ビジョンの詳細な説明（ビジュアライゼーション・アンカー）"
    },
    "goals": [
      {
        "title": "目標タイトル",
        "description": "SMARTの法則に基づいた具体的な説明",
        "ifThen": "もし〜〜が起きたら、〜〜する（If-Thenプランニング）",
        "category": "ビジネス / 経済的自由 など"
      }
    ],
    "habits": [
      {
        "title": "習慣タイトル（極小ステップ）",
        "description": "習慣の目的"
      }
    ]
  }
  必ず上記のJSONフォーマットのみを出力してください。マークダウンブロック（\`\`\`json など）は含めないでください。`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.7,
      }
    });

    try {
      return JSON.parse(response.text || "{}");
    } catch (e) {
      console.error("Failed to parse JSON:", response.text);
      return {};
    }
  } catch (e: any) {
    console.error("API Error in generateDashboardData:", e);
    // Return empty object on quota error to let the UI create an empty dashboard
    return {};
  }
}

export async function generateVisionImageKeyword(title: string, description: string) {
  const prompt = `以下のビジョンを表す、最も適切で美しい高品質な写真を表す英単語を1語だけ出力してください。余計な記号や説明は一切含めないでください。
  タイトル: ${title}
  説明: ${description}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        temperature: 0.7,
      }
    });
    const keyword = response.text?.trim().replace(/[^a-zA-Z]/g, '') || "landscape";
    return keyword || "landscape";
  } catch (e) {
    console.error("Failed to generate image keyword:", e);
    return "nature";
  }
}

export async function analyzeGoalsAndHabits(goals: any[], habits: any[]) {
  const prompt = `あなたは認知行動心理学に基づくプロの目標達成コーチです。ユーザーの以下の目標と習慣の組み合わせを分析し、達成度予測や軌道修正のための具体的で温かいアドバイスを150〜200文字のテキストで提供してください。記号や不要な改行を含まないプレーンキストのみで返してください。
  目標: ${JSON.stringify(goals)}
  習慣: ${JSON.stringify(habits)}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: { temperature: 0.7 }
    });
    return response.text || "現在の目標と習慣は素晴らしいバランスです。このまま小さな一歩を積み重ねていきましょう。";
  } catch (e) {
    console.error("AI Analysis Failed:", e);
    return "現在の目標と習慣は素晴らしいバランスです。このまま小さな一歩を積み重ねていきましょう。";
  }
}

export async function generateCelebrationNote(goalTitle: string) {
  const prompt = `目標「${goalTitle}」を見事達成したユーザーに対して、心から称える150文字以内の「コーチ・ノート（受容と共感のメッセージ）」を作成してください。結果だけでなく、プロセスや心の成長を静かに讃え、内面から湧き出る喜びを表現してください。プレーンテキストのみで出力してください。`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: { temperature: 0.8 }
    });
    return response.text || "おめでとうございます。この大きなマイルストーンに到達するまでのあなたの地道な努力を、私はずっと見てきました。自分自身の成長を、今日はゆっくりと讃えてあげてください。";
  } catch (e) {
    console.error("Celebration Note Failed:", e);
    return "おめでとうございます。この大きなマイルストーンに到達するまでのあなたの地道な努力を、私はずっと見てきました。自分自身の成長を、今日はゆっくりと讃えてあげてください。";
  }
}

export async function chatWithSosCoach(history: {role: string, text: string}[], message: string) {
  const formattedHistory = history.map(h => ({
    role: h.role === 'user' ? 'user' : 'model',
    parts: [{ text: h.text }]
  }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: [...formattedHistory, { role: 'user', parts: [{ text: message }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION + "\\n現在はSOSモードです。ユーザーの不安や焦りを受容し、感情を吐き出させ、客観視させるための短い対話を行ってください。",
        temperature: 0.7,
      }
    });

    return response.text || "エラーが発生しました。";
  } catch (e: any) {
    console.error("API Error in chatWithSosCoach:", e);
    if (e?.status === 429 || e?.message?.includes("429") || e?.message?.includes("quota")) {
      return "（現在APIの利用制限に達しているため、AIの応答ができません。深呼吸して、少し時間を置いてから再度お話ししましょう。）";
    }
    return "エラーが発生しました。";
  }
}

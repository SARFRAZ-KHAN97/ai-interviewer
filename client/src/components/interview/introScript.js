const several = {
  en: 'several',
  es: 'varias',
  fr: 'plusieurs',
  de: 'mehrere',
  pt: 'várias',
  it: 'varie',
  hi: 'कई',
  ar: 'عدة',
  ja: 'いくつか',
  zh: '几个',
}

const scripts = {
  en: ({ name, targetRole, count }) =>
    `Hello${name ? `, ${name}` : ''}. Welcome to your mock interview${
      targetRole ? ` for the ${targetRole} role` : ''
    }. I am an AI interviewer, and I will be asking you ${count} questions today. ` +
    'Take a breath — there are no trick questions, and you can take your time with each answer. ' +
    'When you hear a question, you can answer out loud by speaking, or type your answer below. ' +
    'Let us begin.',

  es: ({ name, targetRole, count }) =>
    `Hola${name ? `, ${name}` : ''}. Te damos la bienvenida a tu entrevista de práctica${
      targetRole ? ` para el puesto de ${targetRole}` : ''
    }. Soy tu entrevistador de inteligencia artificial y hoy te haré ${count} preguntas. ` +
    'Respira — no hay preguntas trampa y puedes tomarte tu tiempo con cada respuesta. ' +
    'Cuando escuches una pregunta, puedes responder en voz alta o escribir tu respuesta abajo. ' +
    'Comencemos.',

  fr: ({ name, targetRole, count }) =>
    `Bonjour${name ? `, ${name}` : ''}. Bienvenue dans votre entretien blanc${
      targetRole ? ` pour le poste de ${targetRole}` : ''
    }. Je suis votre recruteur IA et je vous poserai ${count} questions aujourd'hui. ` +
    'Prenez votre temps — il n’y a pas de question piège et chaque réponse mérite réflexion. ' +
    'À chaque question, vous pouvez répondre à voix haute ou écrire votre réponse ci-dessous. ' +
    'Commenceons.',

  de: ({ name, targetRole, count }) =>
    `Hallo${name ? `, ${name}` : ''}. Willkommen zu deinem Probeinterview${
      targetRole ? ` für die Position ${targetRole}` : ''
    }. Ich bin deine KI und stelle dir heute ${count} Fragen. ` +
    'Bleib ruhig — es gibt keine Fangfragen und du kannst dir mit jeder Antwort Zeit lassen. ' +
    'Wenn du eine Frage hörst, kannst du laut antworten oder deine Antwort unten eintippen. ' +
    'Fangen wir an.',

  pt: ({ name, targetRole, count }) =>
    `Olá${name ? `, ${name}` : ''}. Bem-vindo à sua entrevista de simulação${
      targetRole ? ` para a vaga de ${targetRole}` : ''
    }. Sou sua entrevistadora de inteligência artificial e vou te fazer ${count} perguntas hoje. ` +
    'Respire — não há perguntas capciosas e você pode responder com calma. ' +
    'Ao ouvir uma pergunta, você pode falar ou digitar sua resposta abaixo. ' +
    'Vamos começar.',

  it: ({ name, targetRole, count }) =>
    `Ciao${name ? `, ${name}` : ''}. Benvenuto nel tuo colloquio di prova${
      targetRole ? ` per la posizione di ${targetRole}` : ''
    }. Sono il tuo intervistatore IA e oggi ti farò ${count} domande. ` +
    'Prendi fiato — non ci sono domande tranello e puoi prenderti il tuo tempo con ogni risposta. ' +
    'Quando senti una domanda, puoi rispondere a voce alta o scrivere la risposta qui sotto. ' +
    'Iniziamo.',

  hi: ({ name, targetRole, count }) =>
    `नमस्ते${name ? `, ${name}` : ''}। आपके मॉक इंटरव्यू में आपका स्वागत है${
      targetRole ? ` — ${targetRole} पद के लिए` : ''
    }। मैं आपका एआई इंटरव्यूअर हूँ और आज मैं आपसे ${count} प्रश्न पूछूँगा। ` +
    'गहरी साँस लें — यहाँ कोई छिपा हुआ सवाल नहीं है, और आप हर उत्तर के लिए अपना समय ले सकते हैं। ' +
    'जब आप सवाल सुनें, तो बोलकर उत्तर दें या नीचे टाइप करें। ' +
    'चलिए शुरू करते हैं।',

  ar: ({ name, targetRole, count }) =>
    `مرحباً${name ? `، ${name}` : ''}! أهلاً بك في مقابلتك التدريبية${
      targetRole ? ` لوظيفة ${targetRole}` : ''
    }. أنا مقابلك الذكي وسأطرح عليك ${count} أسئلة اليوم. ` +
    'خذ نفساً عميقاً — لا توجد أسئلة خبيئة ويمكنك التأنّي في إجابتك. ' +
    'عند سماع السؤال، يمكنك الإجابة بصوتك أو كتابة إجابتك في الأسفل. ' +
    'لنبدأ.',

  ja: ({ name, targetRole, count }) =>
    `${name ? `${name}さん、` : ''}こんにちは。模擬面接へようこそ${
      targetRole ? ` — ${targetRole}職の準備のため` : ''
    }。私はAI面接官です。今日は${count}つの質問をします。 ` +
    '深呼吸してください。意地悪な質問はありませんので、落ち着いて答えてください。 ' +
    '質問を聞いたら、声に出して答えるか、下に文字で入力できます。 ' +
    'それでは始めましょう。',

  zh: ({ name, targetRole, count }) =>
    `你好${name ? `，${name}` : ''}！欢迎参加你的模拟面试${
      targetRole ? `，应聘${targetRole}职位` : ''
    }。我是你的AI面试官，今天会问你${count}个问题。 ` +
    '先深呼吸——这里没有陷阱题，你可以从容作答。 ' +
    '听到问题后，你可以直接开口回答，也可以在下方输入文字。 ' +
    '我们开始吧。',
}

const previewTexts = {
  en: 'Hello, and welcome to your interview. This is how your interviewer will sound.',
  es: 'Hola, y bienvenida a tu entrevista. Así sonará tu entrevistador.',
  fr: 'Bonjour, et bienvenue pour votre entretien. Voici la voix de votre recruteur.',
  de: 'Hallo und willkommen zu deinem Interview. So wird sich dein Interviewer anhören.',
  pt: 'Olá, e bem-vindo à sua entrevista. É assim que sua entrevistadora vai soar.',
  it: 'Ciao, e benvenuto al tuo colloquio. Ecco come sentirai il tuo intervistatore.',
  hi: 'नमस्ते, आपके इंटरव्यू में स्वागत है। आपका इंटरव्यूअर ऐसे बोलेगा।',
  ar: 'مرحباً، أهلاً بك في مقابلتك. هكذا سيبدو صوت مقابلك.',
  ja: 'こんにちは。面接へようこそ。面接官の声はこのようになります。',
  zh: '你好，欢迎参加面试。你的面试官会这样说话。',
}

const langKey = (lang) => {
  const key = String(lang || 'en').toLowerCase().replace('_', '-').split('-')[0]
  return scripts[key] ? key : 'en'
}

export function buildIntroScript({ name, targetRole, questionCount, language } = {}) {
  const key = langKey(language)
  const count = questionCount || several[key]
  return scripts[key]({
    name: name?.trim(),
    targetRole: targetRole?.trim(),
    count,
  })
}

export function buildPreviewText(language) {
  return previewTexts[langKey(language)]
}

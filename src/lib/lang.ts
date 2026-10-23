/**
 * Language handling. The engine always reasons in English over the center's
 * own data; a parent's language only changes how the answer is worded.
 */

/** Languages the parent interface itself is translated into (answers work in any language). */
export const UI_LANGS = ['en', 'es', 'zh', 'vi'] as const
export type UiLang = (typeof UI_LANGS)[number]
export const isUiLang = (code: string): code is UiLang => (UI_LANGS as readonly string[]).includes(code)

export const LANGUAGE_NAMES: Record<string, { en: string; native: string }> = {
  en: { en: 'English', native: 'English' },
  es: { en: 'Spanish', native: 'Español' },
  zh: { en: 'Chinese', native: '中文' },
  vi: { en: 'Vietnamese', native: 'Tiếng Việt' },
  fr: { en: 'French', native: 'Français' },
  pt: { en: 'Portuguese', native: 'Português' },
  ar: { en: 'Arabic', native: 'العربية' },
  ko: { en: 'Korean', native: '한국어' },
  tl: { en: 'Tagalog', native: 'Tagalog' },
  ru: { en: 'Russian', native: 'Русский' },
}

export const languageName = (code: string) => LANGUAGE_NAMES[code]?.en ?? code.toUpperCase()

const ES =
  /\b(que|qué|mi|mis|hija|hijo|niñ[oa]s?|puede|pueden|está|tiene|fiebre|almuerzo|comida|mañana|hoy|abiert[oa]s?|cerrad[oa]s?|cuánto|cuanto|cuesta|para|por|el|la|los|las|del|con|gracias|hola|se|sí|día|una?|ustedes|ir|venir|olvidé|matrícula|colegiatura|visita|recorrido)\b/g
const EN = /\b(the|is|are|my|can|what|do|does|you|have|has|for|to|of|and|when|how|will|she|he|it|i|we|our|today|tomorrow)\b/g

/**
 * A cheap first pass so English questions never pay for an LLM round-trip.
 * Returns 'en', 'es', or 'other' (anything else; the LLM identifies it).
 */
export function detectLang(text: string): 'en' | 'es' | 'other' {
  const t = text.toLowerCase()
  if (/[^\p{Script=Latin}\p{N}\p{P}\p{S}\s]/u.test(t)) return 'other'
  const es = (t.match(ES) ?? []).length + (/[¿¡ñ]/.test(t) ? 2 : 0) + (/[áéíóú]/.test(t) ? 1 : 0)
  const en = (t.match(EN) ?? []).length
  if (es >= 2 && es > en) return 'es'
  if (en >= 1) return 'en'
  return t.split(/\s+/).length <= 2 ? 'en' : 'other'
}

/**
 * Emergency instructions are written ahead of time, never machine-translated:
 * a translation glitch here is the one error we can't afford.
 */
export const URGENT: Record<string, (phone: string) => string> = {
  en: (p) => `If this is an emergency, call 911 now. Then call us at ${p} and we'll pick up right away.`,
  es: (p) => `Si es una emergencia, llame al 911 ahora. Después llámenos al ${p} y le atenderemos de inmediato.`,
  zh: (p) => `如果是紧急情况，请立即拨打 911。然后请拨打 ${p} 联系我们，我们会马上接听。`,
  vi: (p) => `Nếu đây là trường hợp khẩn cấp, hãy gọi 911 ngay. Sau đó gọi cho chúng tôi theo số ${p}, chúng tôi sẽ nghe máy ngay.`,
  fr: (p) => `S'il s'agit d'une urgence, appelez le 911 maintenant. Appelez-nous ensuite au ${p}, nous répondrons tout de suite.`,
  pt: (p) => `Se for uma emergência, ligue para o 911 agora. Depois ligue para nós no ${p} e atenderemos imediatamente.`,
  ko: (p) => `응급 상황이라면 지금 바로 911에 전화하세요. 그다음 ${p}(으)로 저희에게 전화 주시면 바로 받겠습니다.`,
  ar: (p) => `إذا كانت هذه حالة طارئة، اتصل بالرقم 911 الآن. ثم اتصل بنا على ${p} وسنرد فورًا.`,
  tl: (p) => `Kung ito ay emergency, tumawag agad sa 911. Pagkatapos, tawagan kami sa ${p} at sasagot kami kaagad.`,
  ru: (p) => `Если это экстренная ситуация, немедленно позвоните 911. Затем позвоните нам по номеру ${p}, мы сразу ответим.`,
}

/** Shown when a translation fails the guard: say so, in their language, and give the verified English. */
export const UNVERIFIED_NOTE: Record<string, string> = {
  es: 'No pude verificar la traducción, así que aquí está la respuesta exacta en inglés:',
  zh: '我们无法核实译文，以下是准确的英文回答：',
  vi: 'Chúng tôi không thể xác minh bản dịch, đây là câu trả lời chính xác bằng tiếng Anh:',
  fr: "Nous n'avons pas pu vérifier la traduction ; voici la réponse exacte en anglais :",
  pt: 'Não conseguimos verificar a tradução; aqui está a resposta exata em inglês:',
}

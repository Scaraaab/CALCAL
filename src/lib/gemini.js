// Shim de compatibilidad. La implementación real está en claude.js,
// que es nuestro cliente unificado de Gemini (texto + visión).
// Una sola API key controla todas las capacidades.

export {
  getApiKey as getGeminiKey,
  setApiKey as setGeminiKey,
  hasApiKey as hasGeminiKey,
  analyzeFood
} from './claude';

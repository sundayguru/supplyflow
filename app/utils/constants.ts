export const GROQ_MODELS = {
  LLAMA31_8B: 'llama-3.1-8b-instant',
  LLAMA33_70B: 'llama-3.3-70b-versatile',
  QWEN3_32B: 'qwen/qwen3-32b',
  META_LLAMA_4_SCOUT_17B_16E_INSTRUCT:
    'meta-llama/llama-4-scout-17b-16e-instruct',
  GPT_OSS_120B: 'openai/gpt-oss-120b',
  GPT_OSS_20B: 'openai/gpt-oss-20b',
} as const;

export const GROQ_AUDIO_MODELS = {
  WHISPER_LARGE_V3: 'whisper-large-v3',
  WHISPER_LARGE_V3_TURBO: 'whisper-large-v3-turbo',
} as const;

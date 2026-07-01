export interface Trial {
  id: string;
  title: string;
  condition: string;
  phase: string;
  sponsor: string;
  protocolFile: string;
}

export interface Chunk {
  id: string;
  text: string;
  page: number;
  section: string;
  embedding: number[];
}

export interface TrialIndex {
  trialId: string;
  chunks: Chunk[];
  pages: Record<string, string>;
}

export interface SourceReference {
  chunkId: string;
  page: number;
  section: string;
  excerpt: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

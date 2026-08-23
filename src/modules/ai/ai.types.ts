import { IntentEnum } from '../common/enums/intent.enum';
import { SuggestedActionEnum } from '../common/enums/suggested-action.enum';
import { MediaClassificationEnum } from '../common/enums/media-classification.enum';

export interface IntentClassificationRequest {
  phone?: string;
  message: string;
  currentState?: string | null;
  waitingFor?: string | null;
  availableOptions?: string[];
  context?: Record<string, unknown>;
}

export interface IntentClassificationResult {
  intent: IntentEnum;
  confidence: number;
  entities: Record<string, unknown>;
  suggestedAction: SuggestedActionEnum;
  targetFlow?: string | null;
  provider: string;
}

export interface RecoveryRequest {
  phone?: string;
  message: string;
  currentState?: string | null;
  waitingFor?: string | null;
  availableOptions?: string[];
  context?: Record<string, unknown>;
}

export interface RecoveryResult {
  action: SuggestedActionEnum;
  message: string;
  matchedOption?: string | null;
  intent: string;
  confidence: number;
  provider: string;
}

export interface MediaClassificationRequest {
  phone?: string;
  mediaType: string;
  mimeType?: string;
  fileName?: string;
  caption?: string;
  url?: string;
}

export interface MediaClassificationResult {
  classification: MediaClassificationEnum;
  confidence: number;
  suggestedAction: SuggestedActionEnum;
  provider: string;
}

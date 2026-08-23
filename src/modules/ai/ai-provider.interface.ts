import {
  IntentClassificationRequest,
  IntentClassificationResult,
  RecoveryRequest,
  RecoveryResult,
  MediaClassificationRequest,
  MediaClassificationResult,
} from './ai.types';

export interface AiProvider {
  readonly name: string;

  isAvailable(): Promise<boolean>;

  classifyIntent(
    request: IntentClassificationRequest
  ): Promise<IntentClassificationResult>;

  recoverConversation(
    request: RecoveryRequest
  ): Promise<RecoveryResult>;

  classifyMedia(
    request: MediaClassificationRequest
  ): Promise<MediaClassificationResult>;
}

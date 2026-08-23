import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'wuzmind_provider_events' })
export class ProviderEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'correlation_id', type: 'varchar', length: 100, nullable: true })
  @Index('idx_wuzmind_provider_events_corr')
  correlationId!: string | null;

  @Column({ name: 'operation', type: 'varchar', length: 50 })
  operation!: string;

  @Column({ name: 'provider', type: 'varchar', length: 50 })
  provider!: string;

  @Column({ name: 'model', type: 'varchar', length: 100, nullable: true })
  model!: string | null;

  @Column({ name: 'status', type: 'varchar', length: 30 })
  status!: string;

  @Column({ name: 'duration_ms', type: 'int' })
  durationMs!: number;

  @Column({ name: 'error_code', type: 'varchar', length: 100, nullable: true })
  errorCode!: string | null;

  @Column({ name: 'metadata', type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

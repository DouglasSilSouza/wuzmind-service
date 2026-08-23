import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('wuzmind_provider_events')
export class ProviderEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'correlation_id' })
  @Index()
  correlationId?: string | null;

  @Column({ type: 'varchar', length: 50 })
  operation!: string;

  @Column({ type: 'varchar', length: 30 })
  provider!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  model?: string | null;

  @Column({ type: 'varchar', length: 20 })
  status!: string;

  @Column({ type: 'integer', name: 'duration_ms' })
  durationMs!: number;

  @Column({ type: 'text', nullable: true, name: 'error_code' })
  errorCode?: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

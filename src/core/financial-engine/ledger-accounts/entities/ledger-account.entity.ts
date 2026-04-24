import { ApiProperty } from '@nestjs/swagger';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AccountType } from '../constants/account-type.enum';

@Entity('ledger_accounts')
@Index(['company_id', 'code'], { unique: true })
export class LedgerAccount {
  @ApiProperty({ example: 1, description: 'Ledger Account ID' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1, description: 'Company ID' })
  @Column({ type: 'int' })
  company_id: number;

  @ApiProperty({
    example: '1000',
    description: 'Account code (e.g. 1000, 2000)',
  })
  @Column({ type: 'varchar', length: 50 })
  code: string;

  @ApiProperty({ example: 'Cash', description: 'Name of the ledger account' })
  @Column({ type: 'varchar', length: 150 })
  name: string;

  @ApiProperty({
    example: AccountType.ASSET,
    description: 'Account type',
    enum: AccountType,
  })
  @Column({ type: 'enum', enum: AccountType })
  type: AccountType;

  @ApiProperty({ example: true, description: 'Whether the account is active' })
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @ApiProperty({
    example: 1,
    description: 'Parent account ID for hierarchical structure',
    required: false,
    nullable: true,
  })
  @Column({ type: 'int', nullable: true })
  parent_account_id?: number;

  @ApiProperty({
    example: '2024-01-01T00:00:00Z',
    description: 'Creation date',
  })
  @CreateDateColumn()
  created_at: Date;

  @ApiProperty({
    example: '2024-01-01T00:00:00Z',
    description: 'Last update date',
  })
  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => LedgerAccount, (account) => account.children)
  @JoinColumn({ name: 'parent_account_id' })
  parent: LedgerAccount;

  @OneToMany(() => LedgerAccount, (account) => account.parent)
  children: LedgerAccount[];
}

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { Order } from './order.entity';
import { v4 as uuidv4 } from 'uuid';
import { Exclude } from 'class-transformer';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  uuid: string;

  @Column()
  productId: string;

  @Column()
  productName: string;

  @Column('int')
  price: number;

  @Column('int')
  quantity: number;

  @Column('int')
  subtotal: number;

  @Column({ name: 'order_uuid' })
  orderUuid: string;

  @Exclude() // Exclui o objeto completo da ordem para evitar recursão
  @ManyToOne(() => Order, (order) => order.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_uuid', referencedColumnName: 'uuid' })
  order: Order;

  @BeforeInsert()
  generateUuid() {
    if (!this.uuid) {
      this.uuid = uuidv4();
    }
  }
}

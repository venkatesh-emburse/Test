import {
    Entity,
    Column,
    ManyToOne,
    JoinColumn,
    Index,
    Unique,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { SwipeAction } from './enums';

@Entity('swipes')
@Unique(['swiperId', 'swipedId'])
@Index(['swiperId', 'createdAt'])
@Index(['swipedId', 'action'])
export class Swipe extends BaseEntity {
    @Column({ name: 'swiper_id' })
    swiperId: string;

    @ManyToOne(() => User, (user) => user.swipesMade, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'swiper_id' })
    swiper: User;

    @Column({ name: 'swiped_id' })
    swipedId: string;

    @ManyToOne(() => User, (user) => user.swipesReceived, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'swiped_id' })
    swiped: User;

    @Column({ type: 'enum', enum: SwipeAction })
    action: SwipeAction;
}
